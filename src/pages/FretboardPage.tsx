import { germanNoteName, textDe } from '../lib/i18n';
import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { scales } from '../data/catalog';
import { chords } from '../data/chords';
import { buildChordRoute } from '../lib/route';
import type { ChordDefinition } from '../lib/chord-types';

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
  strings,
  tuning,
  mod,
  pitchClass,
  noteName,
  pretty,
  intervalNames,
  degreeSemitones,
  readableRoot,
} from '../lib/music';
import { Fretboard } from '../components/Fretboard';
import {
  PageHeading,
  Panel,
  Segmented,
  Notice,
  usePageTitle,
  Icon,
  Konzept,
} from '../components/UI';
import { Score } from '../components/Score';
import { Playback } from '../components/Playback';
export function FretboardPage() {
  const { root: selectedRoot, scaleId, setScaleId } = useStore();
  usePageTitle('Interaktives Griffbrett');
  const [mode, setMode] = useState('Notes'),
    [rangeName, setRangeName] = useState('0–24'),
    [view, setView] = useState('All positions'),
    [arpId, setArpId] = useState('major'),
    [noteFilter, setNoteFilter] = useState('All notes'),
    [selectedNote, setSelectedNote] = useState('C'),
    [labels, setLabels] = useState('Degrees'),
    [trainer, setTrainer] = useState(false);
  const ranges: Record<string, [number, number]> = {
    '0–12': [0, 12],
    '0–24': [0, 24],
    '5–12': [5, 12],
    '12–24': [12, 24],
  };
  const range = ranges[rangeName];
  const item =
    mode === 'Arpeggio'
      ? chordAsScale(chords.find((c) => c.id === arpId) ?? chords[0])
      : scales.find((s) => s.id === scaleId)!;
  const root = readableRoot(
    selectedRoot,
    mode === 'Scale' || mode === 'Arpeggio' ? item.degreeLabels : chromaticDegreesFor(selectedRoot),
  );
  const route = useMemo(() => transposeRoute(item.fingering, root), [item, root]);
  const events = useMemo(() => {
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
  }, [mode, view, route, root, item, rangeName, noteFilter, selectedNote]);
  const activeFingering = (mode === 'Scale' || mode === 'Arpeggio') && view === 'Fingering';
  const visibleRange: [number, number] = activeFingering
    ? [
        Math.max(0, Math.min(...route.filter(isNote).map((n) => n.fret)) - 1),
        Math.min(24, Math.max(...route.filter(isNote).map((n) => n.fret)) + 1),
      ]
    : range;
  return (
    <>
      <PageHeading
        eyebrow="BASS / DAS GRIFFBRETT"
        title="Interaktives Griffbrett"
        description="Jeder Ton, jedes Intervall, jede Lage. Lerne das Griffbrett kennen."
        actions={
          <button className={trainer ? 'primary' : ''} onClick={() => setTrainer((v) => !v)}>
            <Icon name="grid" />
            {trainer ? 'Lernmodus schließen' : 'Lernmodus'}
          </button>
        }
      />
      <Konzept title="Was ein Intervall ist – und warum es auf dem Bass eine Form hat">
        <p>
          Ein Intervall ist der Abstand zwischen zwei Tönen, gemessen in Halbtonschritten: ein Bund
          ist ein Halbtonschritt, zwei Bünde sind ein Ganztonschritt. Weil der Bass in Quarten
          gestimmt ist, hat jedes Intervall auf dem Griffbrett eine feste <b>Form</b>, die sich
          verschieben lässt, ohne sich zu verändern.
        </p>
        <p>
          Drei Formen tragen fast alles: Die <b>Oktave</b> liegt zwei Saiten höher und zwei Bünde
          weiter. Die <b>Quinte</b> liegt eine Saite höher und zwei Bünde weiter. Die <b>Quarte</b>
          liegt einfach eine Saite höher im selben Bund. Wenn du diese drei kennst, findest du jeden
          Grundton doppelt und jede Quinte blind.
        </p>
        <p>
          Die Terz entscheidet über Dur und Moll: vier Halbtonschritte über dem Grundton ist sie
          groß, drei Halbtonschritte klein. Stell oben auf <b>Intervalle</b> um, um die Abstände vom
          gewählten Grundton aus direkt auf dem Griffbrett zu sehen.
        </p>
      </Konzept>
      <div className="fretboard-toolbar">
        <Segmented
          label="Griffbrettmodus"
          value={mode}
          onChange={setMode}
          options={['Notes', 'Intervals', 'Scale', 'Arpeggio']}
        />
        <div className="field-row">
          {mode === 'Scale' && (
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
            <label>
              Arpeggio
              <select value={arpId} onChange={(e) => setArpId(e.target.value)}>
                {chords
                  .filter((c) => !c.voicingFamily)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameDe}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {mode === 'Notes' ? (
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
          ) : (
            <Segmented
              label="Griffbrettbeschriftung"
              value={labels}
              onChange={setLabels}
              options={['Degrees', 'Notes']}
            />
          )}
        </div>
      </div>
      <Panel
        title={
          trainer
            ? 'Griffbrett lernen'
            : mode === 'Notes'
              ? 'Alle Töne im Blick'
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
          <Fretboard
            key={root + mode + view}
            events={events}
            range={visibleRange}
            root={root}
            labels={mode === 'Notes' ? 'Notes' : (labels as 'Degrees' | 'Notes')}
            title={textDe(mode)}
            route={activeFingering}
          />
        )}
      </Panel>
      {activeFingering && !trainer && (
        <>
          <Score events={route} />
          <div className="reference-play-row">
            <Playback events={route} scale />
          </div>
        </>
      )}
      <div className="three-col">
        <Panel title="Orientierung">
          <p>
            G ist die höchste Saite und steht oben. E ist die tiefste. Bund 0 bedeutet leere Saite;
            jeder Bund erhöht den Ton um einen Halbton.
          </p>
        </Panel>
        <Panel title="Oktaven finden">
          <p>
            Gehe zwei Saiten Richtung G und zwei Bünde höher. Oder zwölf Bünde auf derselben Saite.
            Der Notenname bleibt gleich.
          </p>
        </Panel>
        <Panel title="Alle Positionen oder ein Fingersatz?">
          <p>
            „Alle Positionen“ zeigt den gesamten Tonvorrat. „Fingersatz“ zeigt genau den Weg aus der
            zugehörigen Notation und TAB.
          </p>
        </Panel>
      </div>
      {mode === 'Intervals' && (
        <Notice>
          Der Tritonus heißt je nach Funktion ♯4 oder ♭5. Diese chromatische Karte nutzt ♭5;
          Tonleiterseiten verwenden die genaue Stufenschreibweise.
        </Notice>
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
  const [kind, setKind] = useState('Find the note'),
    [stringConstraint, setStringConstraint] = useState('Any string'),
    [round, setRound] = useState(0),
    [feedback, setFeedback] = useState(''),
    [correct, setCorrect] = useState(false);
  const scale = scales.find((s) => s.id === scaleId)!;
  const question = useMemo(() => {
    const all = allPositions(
      root,
      kind === 'Find scale degree' ? scale.degreeLabels : chromaticDegreesFor(root),
      ...range,
    ).filter((n) => stringConstraint === 'Any string' || n.string === stringConstraint);
    const n =
      all[Math.floor(Math.random() * all.length)] ??
      allPositions(root, chromaticDegreesFor(root), ...range)[0];
    const pc = mod(tuning[n.string] + n.fret),
      interval = mod(pc - pitchClass(root));
    const answers = [pc, mod(pc + 1), mod(pc + 5), mod(pc + 9)].sort(() => Math.random() - 0.5);
    return { n, pc, interval, answers };
  }, [root, range[0], range[1], kind, round, stringConstraint, scale]);
  const next = () => {
    setRound((n) => n + 1);
    setFeedback('');
    setCorrect(false);
  };
  const answer = (pc: number, string?: string) => {
    const yes =
      pc === question.pc &&
      (kind === 'Identify the note' ||
        stringConstraint === 'Any string' ||
        string === stringConstraint);
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
            {strings.map((s) => (
              <option key={s}>{s}</option>
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
        {stringConstraint !== 'Any string' && <p>Auf der {stringConstraint}-Saite.</p>}
      </div>
      <Fretboard
        events={[]}
        range={range}
        root={root}
        conceal
        marked={
          kind === 'Identify the note' ? `${question.n.string}:${question.n.fret}` : undefined
        }
        onPick={(n) => {
          if (kind !== 'Identify the note') answer(mod(tuning[n.string] + n.fret), n.string);
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
