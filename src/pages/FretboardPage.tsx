import { germanNoteName, textDe } from '../lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import { useNoteLabel, useStore } from '../lib/store';
import { scales } from '../data/catalog';
import { chords } from '../data/chords';
import { buildChordRoute } from '../lib/route';
import { chordFamilies, type ChordDefinition } from '../lib/chord-types';

/** The fretboard consumes scales; a chord supplies the same three fields. */
const chordAsScale = (chord: ChordDefinition) => ({
  name: chord.nameDe,
  degreeLabels: [...chord.formula],
  fingering: buildChordRoute(chord),
});
import {
  allPositions,
  chromaticDegreesFor,
  transposeRoute,
  isNote,
  tuning,
  mod,
  pitchClass,
  noteName,
  pretty,
  intervalNames,
  degreeSemitones,
  spellDegree,
  readableRoot,
} from '../lib/music';
import { instrumentProfile } from '../lib/instrument';
import { Fretboard, type FretboardPick } from '../components/Fretboard';
import { FretboardChordControls } from '../components/FretboardChordControls';
import { ChordPicker } from '../components/ChordPicker';
import {
  fretboardChordEvents,
  fretboardChordSelectionId,
  makeFretboardChordOverlays,
  type FretboardChordSelection,
} from '../lib/fretboard-chords';
import { PageHeading, Panel, Segmented, usePageTitle, Icon } from '../components/UI';
import { Score } from '../components/Score';
import { Playback } from '../components/Playback';
import { GuitarChordVoicings } from '../components/GuitarChordVoicings';
import { guitarScaleShapes } from '../lib/guitar-scales';
import {
  chordGuideEntries,
  fretboardGuidePath,
  type FretboardGuideEntry,
  type FretboardGuidePath,
} from '../lib/fretboard-guide';

interface GuideSpec {
  source: string;
  label: string;
  rootPitch: number;
  color: string;
  entries: FretboardGuideEntry[];
}

export function FretboardPage() {
  const { root: selectedRoot, scaleId, setScaleId, instrument } = useStore();
  const noteLabel = useNoteLabel();
  const profile = instrumentProfile(instrument);
  usePageTitle('Interaktives Griffbrett');
  const [mode, setMode] = useState('Notes'),
    [rangeName, setRangeName] = useState('0–24'),
    [view, setView] = useState('All positions'),
    [arpId, setArpId] = useState('major'),
    [noteFilter, setNoteFilter] = useState('All notes'),
    [selectedNote, setSelectedNote] = useState('C'),
    [showNoteLabels, setShowNoteLabels] = useState(true),
    [showDegreeLabels, setShowDegreeLabels] = useState(true),
    [guitarScaleIndex, setGuitarScaleIndex] = useState(0),
    [trainer, setTrainer] = useState(false),
    [selectedChords, setSelectedChords] = useState<FretboardChordSelection[]>(() => [
      {
        id: fretboardChordSelectionId(selectedRoot, 'major'),
        root: selectedRoot,
        chordId: 'major',
      },
    ]);
  const [guideSources, setGuideSources] = useState<string[]>([]);
  const [guidePaths, setGuidePaths] = useState<FretboardGuidePath[]>([]);
  const [guideMessage, setGuideMessage] = useState('Wähle einen Grundton auf dem Griffbrett.');
  const ranges: Record<string, [number, number]> = {
    '0–12': [0, 12],
    '0–24': [0, 24],
    '5–12': [5, 12],
    '12–24': [12, 24],
  };
  const range = ranges[rangeName];
  const selectedScale = scales.find((s) => s.id === scaleId) ?? scales[0];
  const item =
    mode === 'Arpeggio'
      ? chordAsScale(chords.find((c) => c.id === arpId) ?? chords[0])
      : selectedScale;
  const selectedArpeggio = chords.find((chord) => chord.id === arpId) ?? chords[0];
  const root = readableRoot(
    selectedRoot,
    mode === 'Scale' || mode === 'Arpeggio' ? item.degreeLabels : chromaticDegreesFor(selectedRoot),
  );
  const latestChordSelection = selectedChords[selectedChords.length - 1];
  const guitarGrip =
    mode === 'Arpeggio'
      ? { root, chord: selectedArpeggio }
      : mode === 'Chords' && latestChordSelection
        ? {
            root: latestChordSelection.root,
            chord: chords.find((chord) => chord.id === latestChordSelection.chordId),
          }
        : undefined;
  const arpeggioPickerItems = useMemo(
    () =>
      chords
        .filter((chord) => !chord.voicingFamily)
        .map((chord) => ({
          id: chord.id,
          symbol: noteLabel.chord(root, chord.symbol),
          name: chord.nameDe,
          detail: chord.formula
            .map((degree) => noteLabel.note(spellDegree(root, degree)))
            .join(' · '),
          family: chord.family,
          keywords: chord.aliases,
        })),
    [root, noteLabel],
  );
  const baseRoute = useMemo(() => transposeRoute(item.fingering, root), [item, root]);
  const guitarScalePositions = useMemo(
    () => guitarScaleShapes(root, selectedScale.degreeLabels),
    [root, selectedScale],
  );
  const route =
    instrument === 'guitar' && mode === 'Scale'
      ? (guitarScalePositions[Math.min(guitarScaleIndex, guitarScalePositions.length - 1)]?.events ??
        baseRoute)
      : baseRoute;
  const chordOverlays = useMemo(
    () => makeFretboardChordOverlays(selectedChords, noteLabel.chord, noteLabel.note),
    [selectedChords, noteLabel],
  );
  const guideSpecs = useMemo<GuideSpec[]>(() => {
    const specs: GuideSpec[] = [];
    if (guideSources.includes('arpeggio')) {
      specs.push({
        source: 'arpeggio',
        label: noteLabel.chord(root, selectedArpeggio.symbol),
        rootPitch: pitchClass(root),
        color: '#4bb8d0',
        entries: chordGuideEntries(root, selectedArpeggio),
      });
    }
    for (const source of guideSources.filter((item) => item.startsWith('chord:'))) {
      const selectionId = source.slice('chord:'.length);
      const selection = selectedChords.find((item) => item.id === selectionId);
      const index = selectedChords.findIndex((item) => item.id === selectionId);
      const chord = selection ? chords.find((item) => item.id === selection.chordId) : undefined;
      if (!selection || !chord || index < 0) continue;
      specs.push({
        source,
        label: noteLabel.chord(selection.root, chord.symbol),
        rootPitch: pitchClass(selection.root),
        color: chordOverlays[index]?.color ?? '#147d92',
        entries: chordGuideEntries(selection.root, chord),
      });
    }
    return specs;
  }, [guideSources, selectedArpeggio, root, selectedChords, chordOverlays, noteLabel]);

  const resetGuidePaths = (message = 'Wähle einen Grundton auf dem Griffbrett.') => {
    setGuidePaths([]);
    setGuideMessage(message);
  };
  const stopGuide = () => {
    setGuideSources([]);
    resetGuidePaths();
  };
  const toggleGuide = (source: string) => {
    const active = guideSources.includes(source);
    if (source === 'arpeggio') {
      setGuideSources(active ? [] : ['arpeggio']);
      setGuidePaths([]);
      if (!active) setView('All positions');
    } else {
      setGuideSources((current) =>
        active
          ? current.filter((item) => item !== source)
          : [...current.filter((item) => item !== 'arpeggio'), source],
      );
      if (active) setGuidePaths((current) => current.filter((path) => path.id !== source));
    }
    setGuideMessage('Wähle einen farbigen Grundton auf dem Griffbrett.');
  };
  const handleGuidePick = (picked: FretboardPick) => {
    if (!guideSpecs.length) return;
    const matching = guideSpecs.filter((spec) => spec.rootPitch === mod(picked.midi));
    if (!matching.length) {
      setGuideMessage(
        `Wähle einen Grundton von ${guideSpecs.map((spec) => spec.label).join(' oder ')}.`,
      );
      return;
    }
    const paths = matching.map((spec) =>
      fretboardGuidePath(
        spec.source,
        spec.label,
        profile,
        range,
        picked.midi,
        spec.entries,
        {
          positionId: picked.positionId,
          fret: picked.fret,
          stringLabel: picked.stringLabel,
          label: `${noteLabel.note(picked.name ?? root)} · Grundton`,
        },
        spec.color,
        noteLabel.note,
      ),
    );
    setGuidePaths((current) => [
      ...current.filter((path) => !matching.some((spec) => spec.source === path.id)),
      ...paths,
    ]);
    const complete = paths.filter(
      (path, index) => path.points.length === matching[index].entries.length,
    );
    setGuideMessage(
      complete.length === paths.length
        ? `${paths.map((path) => path.label).join(' · ')} vollständig eingezeichnet.`
        : 'Die erreichbare Tonfolge ist eingezeichnet; ändere Lage oder Bundbereich für den Rest.',
    );
  };
  const changeSelectedChords = (next: FretboardChordSelection[]) => {
    const valid = new Set(next.map((item) => `chord:${item.id}`));
    setGuideSources((current) =>
      current.filter((source) => !source.startsWith('chord:') || valid.has(source)),
    );
    setGuidePaths((current) =>
      current.filter((path) => !path.id.startsWith('chord:') || valid.has(path.id)),
    );
    setSelectedChords(next);
  };
  useEffect(() => {
    if (guideSources.length) resetGuidePaths('Wähle einen Grundton auf dem Griffbrett.');
  }, [selectedRoot, instrument, rangeName, arpId]);
  useEffect(() => setGuitarScaleIndex(0), [root, selectedScale.id]);
  const events = useMemo(() => {
    if (mode === 'Chords')
      return fretboardChordEvents(selectedChords, selectedRoot, range[0], range[1]);
    if (mode === 'Scale' || mode === 'Arpeggio')
      return view === 'Fingering' ? route : allPositions(root, item.degreeLabels, ...range);
    let all = allPositions(root, chromaticDegreesFor(root), ...range);
    if (mode === 'Notes') {
      all = all.map((n) => ({
        ...n,
        name: noteName(tuning[n.string] + n.fret, root.includes('b')),
      }));
      if (noteFilter === 'Natural notes') all = all.filter((n) => !/[#b]/.test(n.name!));
      if (noteFilter === 'One note')
        all = all.filter((n) => mod(tuning[n.string] + n.fret) === pitchClass(selectedNote));
    }
    return all;
  }, [
    mode,
    view,
    route,
    root,
    item,
    rangeName,
    noteFilter,
    selectedNote,
    selectedChords,
    selectedRoot,
  ]);
  const activeFingering = (mode === 'Scale' || mode === 'Arpeggio') && view === 'Fingering';
  const fretboardLabels: 'Degrees' | 'Notes' | 'Both' | 'Fingers' =
    instrument === 'guitar' && mode === 'Scale' && activeFingering
      ? 'Fingers'
      : showNoteLabels
        ? showDegreeLabels
          ? 'Both'
          : 'Notes'
        : 'Degrees';
  const toggleLabels = (kind: 'notes' | 'degrees') => {
    if (kind === 'notes') {
      if (showNoteLabels && !showDegreeLabels) return;
      setShowNoteLabels((visible) => !visible);
      return;
    }
    if (showDegreeLabels && !showNoteLabels) return;
    setShowDegreeLabels((visible) => !visible);
  };
  const visibleRange: [number, number] = activeFingering
    ? [
        Math.max(0, Math.min(...route.filter(isNote).map((n) => n.fret)) - 1),
        Math.min(24, Math.max(...route.filter(isNote).map((n) => n.fret)) + 1),
      ]
    : range;
  return (
    <>
      <PageHeading
        eyebrow={`${profile.nameUpper} / DAS GRIFFBRETT`}
        title="Interaktives Griffbrett"
        description={`Jeder Ton, jedes Intervall, jede Lage. Lerne das ${profile.name}-Griffbrett kennen.`}
        actions={
          mode !== 'Chords' && (
            <button className={trainer ? 'primary' : ''} onClick={() => setTrainer((v) => !v)}>
              <Icon name="grid" />
              {trainer ? 'Lernmodus schließen' : 'Lernmodus'}
            </button>
          )
        }
      />
      <div className="fretboard-toolbar">
        <Segmented
          label="Griffbrettmodus"
          value={mode}
          onChange={(next) => {
            setMode(next);
            stopGuide();
            if (next === 'Chords') setTrainer(false);
          }}
          options={['Notes', 'Intervals', 'Scale', 'Arpeggio', 'Chords']}
        />
        <div className="field-row">
          {(mode === 'Scale' || mode === 'Chords') && (
            <label>
              Tonleiter
              <select value={scaleId} onChange={(e) => setScaleId(e.target.value)}>
                {scales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'Arpeggio' && (
            <div className="fretboard-picker-field">
              <span>Arpeggio</span>
              <ChordPicker
                label="Arpeggio auswählen"
                value={arpId}
                items={arpeggioPickerItems}
                groups={chordFamilies.map((family) => ({ id: family.id, name: family.name }))}
                onPick={(id) => {
                  setArpId(id);
                  resetGuidePaths();
                }}
              />
            </div>
          )}
          {mode === 'Notes' && (
            <>
              <label>
                Anzeigen
                <select value={noteFilter} onChange={(e) => setNoteFilter(e.target.value)}>
                  {['All notes', 'Natural notes', 'One note'].map((n) => (
                    <option key={n} value={n}>
                      {(
                        {
                          'All notes': 'Alle Töne',
                          'Natural notes': 'Stammtöne',
                          'One note': 'Ein Ton',
                        } as Record<string, string>
                      )[n] ?? germanNoteName(n)}
                    </option>
                  ))}
                </select>
              </label>
              {noteFilter === 'One note' && (
                <label>
                  Ton
                  <select value={selectedNote} onChange={(e) => setSelectedNote(e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => noteName(i)).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          {!trainer && (
            <div
              className="fretboard-label-controls"
              role="group"
              aria-label="Griffbrettbeschriftung"
            >
              <span>Beschriftung</span>
              <button
                type="button"
                className={showNoteLabels ? 'active' : ''}
                aria-pressed={showNoteLabels}
                onClick={() => toggleLabels('notes')}
              >
                Noten
              </button>
              <button
                type="button"
                className={showDegreeLabels ? 'active' : ''}
                aria-pressed={showDegreeLabels}
                onClick={() => toggleLabels('degrees')}
              >
                Stufen / Nummern
              </button>
            </div>
          )}
        </div>
      </div>
      {mode === 'Arpeggio' && (
        <div className="arpeggio-selection-summary" aria-live="polite">
          <div className="arpeggio-selection-title">
            <span className="eyebrow">AUSGEWÄHLTES ARPEGGIO</span>
            <strong>{noteLabel.chord(root, selectedArpeggio.symbol)}</strong>
            <small>{selectedArpeggio.nameDe}</small>
          </div>
          <div>
            <span>Stufen</span>
            <strong>{selectedArpeggio.formula.map(pretty).join(' · ')}</strong>
          </div>
          <div>
            <span>Noten</span>
            <strong>
              {selectedArpeggio.formula
                .map((degree) => noteLabel.note(spellDegree(root, degree)))
                .join(' · ')}
            </strong>
          </div>
          <button
            type="button"
            className={guideSources.includes('arpeggio') ? 'active' : ''}
            aria-pressed={guideSources.includes('arpeggio')}
            onClick={() => toggleGuide('arpeggio')}
          >
            <Icon name="arrow" size={15} />
            {guideSources.includes('arpeggio') ? 'Pfeile ausblenden' : 'Tonfolge mit Pfeilen'}
          </button>
        </div>
      )}
      {mode === 'Chords' && (
        <FretboardChordControls
          root={readableRoot(selectedRoot, item.degreeLabels)}
          scale={selectedScale}
          selected={selectedChords}
          onChange={changeSelectedChords}
          guideChordIds={guideSources
            .filter((source) => source.startsWith('chord:'))
            .map((source) => source.slice(6))}
          onToggleGuide={(id) => toggleGuide(`chord:${id}`)}
        />
      )}
      <Panel
        title={
          trainer
            ? 'Griffbrett lernen'
            : mode === 'Notes'
              ? 'Alle Töne im Blick'
              : mode === 'Chords'
                ? selectedChords.length === 0
                  ? 'Akkord wählen'
                  : selectedChords.length === 1
                    ? 'Akkordtöne auf dem ganzen Griffbrett'
                    : `${selectedChords.length} Akkorde vergleichen`
                : `${germanNoteName(root)} ${mode === 'Intervals' ? 'Intervalle' : item.name}`
        }
        aside={
          <div className="field-row">
            {(mode === 'Scale' || mode === 'Arpeggio') && !trainer && (
              <Segmented
                label="Lagenanzeige"
                value={view}
                onChange={setView}
                options={['All positions', 'Fingering']}
              />
            )}
            <select
              aria-label="Bundbereich"
              value={rangeName}
              onChange={(e) => setRangeName(e.target.value)}
              disabled={activeFingering && !trainer}
            >
              {Object.keys(ranges).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
        }
      >
        {trainer ? (
          <Trainer key={root + rangeName + scaleId} root={root} range={range} scaleId={scaleId} />
        ) : (
          <>
            {instrument === 'guitar' && mode === 'Scale' && activeFingering && (
              <div className="guitar-scale-position-picker">
                <div>
                  <span className="eyebrow">GRIFFMUSTER</span>
                  <strong>Große Zahlen zeigen die Greiffinger</strong>
                </div>
                <div className="guitar-shape-tabs" role="group" aria-label="Tonleiterlage wählen">
                  {guitarScalePositions.map((shape, index) => (
                    <button
                      type="button"
                      className={index === guitarScaleIndex ? 'active' : ''}
                      aria-pressed={index === guitarScaleIndex}
                      onClick={() => setGuitarScaleIndex(index)}
                      key={shape.id}
                    >
                      {shape.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {guideSpecs.length > 0 && (
              <div
                className="fretboard-guide-status"
                style={{ '--guide-color': guideSpecs[0].color } as React.CSSProperties}
                role="status"
              >
                <Icon name="arrow" size={16} />
                <strong>{guideSpecs.map((spec) => spec.label).join(' · ')}</strong>
                <span>{guideMessage}</span>
                <button type="button" onClick={stopGuide}>
                  Beenden
                </button>
              </div>
            )}
            <Fretboard
              key={root + mode + view}
              events={events}
              range={visibleRange}
              root={root}
              labels={fretboardLabels}
              title={textDe(mode)}
              route={activeFingering}
              overlays={mode === 'Chords' ? chordOverlays : undefined}
              onPick={handleGuidePick}
              guidePaths={guidePaths}
            />
          </>
        )}
      </Panel>
      {instrument === 'guitar' && guitarGrip?.chord && !trainer && (
        <GuitarChordVoicings
          key={`${guitarGrip.root}-${guitarGrip.chord.id}`}
          root={guitarGrip.root}
          chord={guitarGrip.chord}
          title={`${noteLabel.chord(guitarGrip.root, guitarGrip.chord.symbol)} · Griff wählen`}
        />
      )}
      {activeFingering && !trainer && (
        <>
          <Score events={route} />
          <div className="reference-play-row">
            <Playback events={route} scale />
          </div>
        </>
      )}
    </>
  );
}
function Trainer({
  root,
  range,
  scaleId,
}: {
  root: string;
  range: [number, number];
  scaleId: string;
}) {
  const { instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const [kind, setKind] = useState('Find the note'),
    [stringConstraint, setStringConstraint] = useState('Any string'),
    [round, setRound] = useState(0),
    [feedback, setFeedback] = useState(''),
    [correct, setCorrect] = useState(false);
  const scale = scales.find((s) => s.id === scaleId)!;
  const question = useMemo(() => {
    const degrees = kind === 'Find scale degree' ? scale.degreeLabels : chromaticDegreesFor(root);
    const candidates = profile.stringsHighToLow.flatMap((string) =>
      Array.from({ length: range[1] - range[0] + 1 }, (_, offset) => {
        const fret = range[0] + offset;
        const midi = string.midi + fret;
        const degree = degrees.find(
          (candidate) => mod(degreeSemitones(candidate)) === mod(midi - pitchClass(root)),
        );
        if (!degree) return [];
        return [
          {
            string: string.exerciseString ?? ('E' as const),
            stringId: string.id,
            stringLabel: string.spokenLabel,
            positionId: `${string.exerciseString ?? string.id}:${fret}`,
            fret,
            duration: 'q',
            degree,
            name: spellDegree(root, degree),
            midi,
          },
        ];
      }).flat(),
    );
    const filtered = candidates.filter(
      (candidate) => stringConstraint === 'Any string' || candidate.stringId === stringConstraint,
    );
    const n = filtered[Math.floor(Math.random() * filtered.length)] ?? candidates[0];
    const pc = mod(n.midi),
      interval = mod(pc - pitchClass(root));
    const answers = [pc, mod(pc + 1), mod(pc + 5), mod(pc + 9)].sort(() => Math.random() - 0.5);
    return { n, pc, interval, answers };
  }, [root, range[0], range[1], kind, round, stringConstraint, scale, profile]);
  const next = () => {
    setRound((n) => n + 1);
    setFeedback('');
    setCorrect(false);
  };
  const answer = (pc: number, stringId?: string) => {
    const yes =
      pc === question.pc &&
      (kind === 'Identify the note' ||
        stringConstraint === 'Any string' ||
        stringId === stringConstraint);
    setCorrect(yes);
    setFeedback(
      yes
        ? `Richtig · ${germanNoteName(question.n.name ?? noteName(pc))}.`
        : 'Versuche es erneut. Höre das Intervall und prüfe die Saite.',
    );
  };
  return (
    <div className="trainer">
      <div className="trainer-controls">
        <label>
          Lernaufgabe
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setFeedback('');
              setCorrect(false);
            }}
          >
            {['Find the note', 'Find the interval', 'Find scale degree', 'Identify the note'].map(
              (x) => (
                <option key={x} value={x}>
                  {
                    (
                      {
                        'Find the note': 'Ton finden',
                        'Find the interval': 'Intervall finden',
                        'Find scale degree': 'Tonleiterstufe finden',
                        'Identify the note': 'Ton erkennen',
                      } as Record<string, string>
                    )[x]
                  }
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Saite
          <select
            value={stringConstraint}
            onChange={(e) => {
              setStringConstraint(e.target.value);
              setFeedback('');
              setCorrect(false);
            }}
          >
            <option value="Any string">Jede Saite</option>
            {profile.stringsHighToLow.map((string) => (
              <option key={string.id} value={string.id}>
                {string.spokenLabel}
              </option>
            ))}
          </select>
        </label>
        <span className="small-label">FRAGE {round + 1}</span>
      </div>
      <div className="trainer-prompt">
        <span className="eyebrow">
          {kind === 'Find scale degree'
            ? `${germanNoteName(root)} ${scale.name}`
            : `GRUNDTON ${germanNoteName(root)}`}
        </span>
        <h2>
          {kind === 'Identify the note'
            ? 'Welcher Ton ist markiert?'
            : kind === 'Find the interval'
              ? `Finde: ${intervalNames[question.interval].toLowerCase()}.`
              : kind === 'Find scale degree'
                ? `Finde Stufe ${pretty(question.n.degree!)}.`
                : `Finde ${germanNoteName(noteName(question.pc, root.includes('b')))}.`}
        </h2>
        {stringConstraint !== 'Any string' && (
          <p>
            Auf der{' '}
            {profile.stringsHighToLow.find((string) => string.id === stringConstraint)?.spokenLabel}
            -Saite.
          </p>
        )}
      </div>
      <Fretboard
        events={[]}
        range={range}
        root={root}
        conceal
        marked={kind === 'Identify the note' ? question.n.positionId : undefined}
        onPick={(n) => {
          if (kind !== 'Identify the note') {
            const string = profile.stringsHighToLow.find(
              (candidate) => candidate.spokenLabel === n.stringLabel,
            );
            answer(mod(n.midi), string?.id);
          }
        }}
      />
      {kind === 'Identify the note' && (
        <div className="trainer-answers">
          {question.answers.map((pc) => (
            <button key={pc} onClick={() => answer(pc)}>
              {pretty(noteName(pc, root.includes('b')))}
            </button>
          ))}
        </div>
      )}
      <div className="trainer-feedback">
        <span role="status" className={correct ? 'correct' : ''}>
          {feedback || 'Wähle eine Position auf dem Griffbrett.'}
        </span>
        <button onClick={next}>
          {correct ? 'Nächste Frage' : 'Frage überspringen'}
          <Icon name="arrow" />
        </button>
      </div>
      <span className="sr-only">
        Intervallgröße: {degreeSemitones(question.n.degree ?? '1')} Halbtöne
      </span>
    </div>
  );
}
