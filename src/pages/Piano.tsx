import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon, PageHeading, Panel, Segmented, usePageTitle } from '../components/UI';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { ChordPicker } from '../components/ChordPicker';
import { Fretboard } from '../components/Fretboard';
import { scales } from '../data/catalog';
import { chordById } from '../data/chords';
import { chordFamilies } from '../lib/chord-types';
import { germanNoteName, scaleName } from '../lib/i18n';
import {
  intervalNames,
  mod,
  pitchClass,
  pretty,
  readableRoot,
  roots,
  spellDegree,
} from '../lib/music';
import {
  analyzePiano,
  diatonicPianoChords,
  midiFrequency,
  pianoChordMidis,
  pianoFretboardEvents,
  pianoRange,
  pianoNoteName,
} from '../lib/piano';
import type { DiatonicPianoChord, PianoChordMatch } from '../lib/piano';
import { usePiano } from '../lib/use-piano';
import { useNoteLabel, useStore } from '../lib/store';
import '../piano.css';

const chordKey = (chord: DiatonicPianoChord) => `${chord.degree}-${chord.chord!.id}`;
const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export function PianoPage() {
  usePageTitle('Interaktives Piano');
  const { root: selectedRoot, setRoot, scaleId, setScaleId } = useStore();
  const label = useNoteLabel();
  const displayNote = (name: string) =>
    label.style === 'de' ? germanNoteName(name) : label.note(name);
  const scale = scales.find((item) => item.id === scaleId) ?? scales[0];
  const root = readableRoot(selectedRoot, scale.degreeLabels);
  const scaleNotes = useMemo(
    () => scale.degreeLabels.map((degree) => spellDegree(root, degree)),
    [scale, root],
  );
  const scalePitchClasses = useMemo(() => new Set(scaleNotes.map(pitchClass)), [scaleNotes]);
  const scaleChords = useMemo(() => diatonicPianoChords(scaleNotes), [scaleNotes]);
  const [selected, setSelected] = useState<number[]>([]);
  const [chordChoice, setChordChoice] = useState('');
  const [showFretboard, setShowFretboard] = useState(false);
  const [mode, setMode] = useState('Auswählen + spielen');
  const [volume, setVolume] = useState(55);
  const piano = usePiano(volume);
  const { held, audioError } = piano;
  const analysis = useMemo(
    () => analyzePiano(selected, root, scaleNotes),
    [selected, root, scaleNotes],
  );
  const mainMatch = analysis.matches[0];
  const fretboardEvents = useMemo(
    () => pianoFretboardEvents(selected, root, scaleNotes),
    [selected, root, scaleNotes],
  );

  const toggle = (midi: number) => {
    setChordChoice('');
    setSelected((old) =>
      old.includes(midi)
        ? old.filter((note) => note !== midi)
        : [...old, midi].sort((a, b) => a - b),
    );
  };
  const clear = () => {
    setChordChoice('');
    setSelected([]);
    piano.stopAll();
  };
  const chordTitle = (match: PianoChordMatch) => {
    const base =
      match.chord.id === 'major'
        ? `${displayNote(match.root)}-Dur`
        : match.chord.id === 'minor'
          ? `${displayNote(match.root)}-Moll`
          : label.chord(match.root, match.chord.symbol);
    return base + (match.inversion > 0 ? ` / ${displayNote(match.bass)}` : '');
  };
  const openChord = (match: PianoChordMatch) => setRoot(roots[pitchClass(match.root)]);
  const requested = new URLSearchParams(useLocation().search).get('akkord');
  useEffect(() => {
    const chord = requested ? chordById(requested) : undefined;
    if (!chord) return;
    // Sound the chord from the page you came from, in the key that is selected.
    const classes = chord.formula.map((degree) => pitchClass(spellDegree(root, degree)));
    let previous = -1;
    setSelected(
      classes.map((target) => {
        let midi = pianoRange.first + mod(target - pianoRange.first);
        while (midi <= previous) midi += 12;
        previous = midi;
        return midi;
      }),
    );
  }, [requested, root]);
  const pickerDegrees = useMemo(
    () =>
      [...new Set(scaleChords.map((chord) => chord.degree))]
        .sort((a, b) => a - b)
        .map((degree) => ({
          degree,
          label: `${romans[degree - 1]} ${displayNote(
            scaleChords.find((chord) => chord.degree === degree)!.root,
          )}`,
        })),
    [scaleChords, displayNote],
  );
  const pickerItems = useMemo(
    () =>
      scaleChords.map((chord) => ({
        id: chordKey(chord),
        symbol: label.chord(chord.root, chord.chord!.symbol),
        name: chord.chord!.nameDe,
        detail: chord.notes.map(displayNote).join(' · '),
        family: chord.kind,
        degree: chord.degree,
        keywords: chord.chord!.aliases,
      })),
    [scaleChords, label, displayNote],
  );
  const chooseChord = (choice: string) => {
    setChordChoice(choice);
    if (!choice) return;
    const separator = choice.indexOf('-');
    const degree = Number(choice.slice(0, separator));
    const id = choice.slice(separator + 1);
    const chord = scaleChords.find((item) => item.degree === degree && item.chord?.id === id);
    if (!chord) return;
    piano.stopAll();
    setSelected(pianoChordMidis(chord));
  };

  return (
    <div className="piano-page">
      <PageHeading
        eyebrow="MUSIKTHEORIE / HÖREN & VERSTEHEN"
        title="Interaktives Piano"
        description="Töne hören. Tonleitern sehen. Eigene Akkorde verstehen."
      />
      <Panel className="piano-context">
        <div className="piano-context-summary">
          <span className="eyebrow">TONLEITER</span>
          <h2>
            {displayNote(root)} · {scaleName(scale.id)}
          </h2>
          <p>{scaleNotes.map(displayNote).join(' · ')}</p>
        </div>
        <div className="piano-context-controls">
          <label>
            Grundton
            <select
              aria-label="Piano-Grundton"
              value={selectedRoot}
              onChange={(event) => {
                setChordChoice('');
                setRoot(event.target.value);
              }}
            >
              {roots.map((note) => (
                <option value={note} key={note}>
                  {displayNote(note)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tonleiter
            <select
              aria-label="Piano-Tonleiter"
              value={scale.id}
              onChange={(event) => {
                setChordChoice('');
                setScaleId(event.target.value);
              }}
            >
              {scales.map((item) => (
                <option key={item.id} value={item.id}>
                  {scaleName(item.id)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      <Panel
        className="piano-chord-pick"
        title="Akkorde der Tonart"
        aside={<span className="small-label">{scaleChords.length} AKKORDE</span>}
      >
        <div className="piano-chord-pick-row">
          <ChordPicker
            label="Akkorde der Tonart"
            value={chordChoice}
            items={pickerItems}
            groups={chordFamilies.map((family) => ({ id: family.id, name: family.name }))}
            degrees={{ label: 'Nach Stufe filtern', options: pickerDegrees }}
            emptyLabel="Akkord wählen"
            onPick={chooseChord}
          />
          {chordChoice && (
            <button type="button" onClick={() => chooseChord('')}>
              Auswahl aufheben
            </button>
          )}
        </div>
        <p className="piano-chord-pick-note">
          {scaleChords.length
            ? 'Jeder Akkord dieser Tonart, nach Stufe und Art filterbar. Die Tasten werden gesetzt, als hättest du sie selbst angetippt.'
            : 'Für diese Tonleiter sind keine Akkorde hinterlegt. Tasten kannst du weiterhin frei auswählen.'}
        </p>
      </Panel>

      <Panel
        className="piano-instrument"
        title="Tastatur"
        aside={<span className="small-label">C3–C5 · 2 Oktaven</span>}
      >
        <div className="piano-toolbar">
          <Segmented
            label="Piano-Spielmodus"
            value={mode}
            onChange={setMode}
            options={['Auswählen + spielen', 'Nur spielen']}
          />
          <label className="piano-volume">
            Lautstärke
            <input
              aria-label="Piano-Lautstärke"
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>
        </div>
        <PianoKeyboard
          scaleNotes={scaleNotes}
          scalePitchClasses={scalePitchClasses}
          rootPitch={pitchClass(root)}
          selected={new Set(selected)}
          pressed={new Set(held.values())}
          selecting={mode === 'Auswählen + spielen'}
          noteLabel={displayNote}
          onStart={piano.start}
          onEnd={piano.end}
          onToggle={toggle}
          onTap={(midi) => piano.playChord([midi])}
        />
        <div className="piano-fretboard-toggle">
          <button
            type="button"
            aria-expanded={showFretboard}
            aria-controls="piano-bass-fretboard"
            onClick={() => setShowFretboard((open) => !open)}
          >
            {showFretboard ? 'Bass-Griffbrett ausblenden' : 'Bass-Griffbrett anzeigen'}
          </button>
          <span>Die gewählten Tonhöhen auf allen Saiten · Bund 0–12</span>
        </div>
        <div className="piano-legend">
          <span>
            <i className="scale" />
            Skalenton · 1 = Grundton
          </span>
          <span>
            <i className="selected" />
            Ausgewählt
          </span>
          <span>
            <i className="outside" />
            Ausgewählt, skalenfremd
          </span>
        </div>
        <div className="piano-keyboard-help">
          <span>
            ↔ Seitlich scrollen · Pfeiltasten wechseln den Ton · Leertaste / Enter spielen
          </span>
          <span>
            {label.style === 'de'
              ? 'Deutsch: H = international B · B = international B♭'
              : 'Internationale Namen: B = deutsches H · B♭ = deutsches B'}
          </span>
        </div>
        {audioError && (
          <p className="error-text" role="alert">
            {audioError}
          </p>
        )}
      </Panel>

      {showFretboard && (
        <Panel id="piano-bass-fretboard" className="piano-bass-fretboard" title="Bass-Griffbrett">
          <p className="piano-fretboard-hint">
            {selected.length
              ? 'Markiert sind alle Positionen deiner gewählten Töne. Tippe einen Bund an, um seine Note zu sehen.'
              : 'Wähle Tasten oder einen Akkord aus, um die passenden Positionen zu sehen.'}
          </p>
          <Fretboard
            key={`${root}-${selected.join(',')}`}
            events={fretboardEvents}
            range={[0, 12]}
            root={root}
            labels="Notes"
            title="Pianoauswahl"
          />
        </Panel>
      )}

      <Panel
        className="piano-selection"
        title="Deine Töne"
        aside={
          <span className="small-label">
            {selected.length} Tasten · {analysis.pitchClasses.length} Tonhöhen
          </span>
        }
      >
        <div className="piano-selection-body">
          <div className="piano-selection-notes">
            {analysis.midis.length ? (
              analysis.midis.map((midi) => {
                const name = displayNote(pianoNoteName(midi, scaleNotes));
                const octave = Math.floor(midi / 12) - 1;
                const outside = !scalePitchClasses.has(mod(midi));
                return (
                  <button
                    key={midi}
                    className={`piano-selected-note ${outside ? 'is-outside' : ''}`}
                    aria-label={`${name}${octave} entfernen`}
                    onClick={() => toggle(midi)}
                  >
                    <strong>
                      {name}
                      <small>{octave}</small>
                    </strong>
                    {outside && <small>skalenfremd</small>}
                    <span aria-hidden="true">×</span>
                  </button>
                );
              })
            ) : (
              <p>Tippe auf Tasten, um einen Klang zusammenzustellen.</p>
            )}
          </div>
          <div className="piano-selection-actions">
            <button
              className="primary"
              disabled={!selected.length}
              onClick={() => piano.playChord(selected)}
            >
              <Icon name="play" />
              Auswahl spielen
            </button>
            <button disabled={!selected.length} onClick={clear}>
              Auswahl leeren
            </button>
          </div>
        </div>
        <p className="piano-context-hint">
          Ein Wechsel der Tonleiter ändert die Markierung. Deine gewählten Töne bleiben erhalten.
        </p>
      </Panel>

      <Panel className="piano-analysis" title="Akkordanalyse">
        <div className="piano-analysis-body">
          <div aria-live="polite" className="piano-analysis-result">
            {mainMatch ? (
              <>
                <span className="eyebrow">VOLLSTÄNDIGER TONVORRAT</span>
                <h2>{chordTitle(mainMatch)}</h2>
                <p>
                  {mainMatch.chord.nameDe} ·{' '}
                  {mainMatch.inversion ? `${mainMatch.inversion}. Umkehrung` : 'Grundstellung'}
                </p>
              </>
            ) : analysis.kind === 'empty' ? (
              <>
                <h2>Welche Töne passen zusammen?</h2>
                <p>
                  Wähle zum Beispiel C, E und G. Auch Töne außerhalb der markierten Tonleiter sind
                  erlaubt.
                </p>
              </>
            ) : analysis.kind === 'single' ? (
              <>
                <h2>Einzelton · {displayNote(pianoNoteName(analysis.midis[0], scaleNotes))}</h2>
                <p>
                  {analysis.midis.length > 1
                    ? 'Derselbe Ton in mehreren Oktaven. Für einen Akkord fehlen weitere Tonhöhen.'
                    : `${midiFrequency(analysis.midis[0]).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Hz · Wähle weitere Töne für die Akkordanalyse.`}
                </p>
              </>
            ) : analysis.kind === 'interval' ? (
              <>
                <h2>{intervalNames[mod(analysis.intervalSemitones!)]}</h2>
                <p>
                  {analysis.intervalSemitones} Halbtöne zwischen den beiden Tonhöhen. Zwei Töne
                  bestimmen häufig noch keinen eindeutigen Akkord.
                </p>
              </>
            ) : (
              <>
                <h2>Kein vollständiger Katalog-Akkord</h2>
                <p>
                  Dieser Tonvorrat hat hier keine exakte Zuordnung. Er kann ein unvollständiges
                  Voicing oder ein eigener Klang sein.
                </p>
              </>
            )}
          </div>
          {mainMatch && (
            <>
              <dl className="piano-chord-facts">
                <div>
                  <dt>Internationales Akkordsymbol</dt>
                  <dd>{mainMatch.internationalSymbol}</dd>
                </div>
                <div>
                  <dt>Formel</dt>
                  <dd>{mainMatch.chord.formula.map(pretty).join(' · ')}</dd>
                </div>
                <div>
                  <dt>Akkordtöne</dt>
                  <dd>{mainMatch.notes.map(displayNote).join(' · ')}</dd>
                </div>
                <div>
                  <dt>Tiefster gewählter Ton</dt>
                  <dd>
                    {displayNote(mainMatch.bass)}
                    {Math.floor(analysis.midis[0] / 12) - 1}
                  </dd>
                </div>
              </dl>
              <Link
                className="text-link"
                to={`/chords/${mainMatch.chord.id}`}
                onClick={() => openChord(mainMatch)}
              >
                Akkord verstehen und auf dem Bass üben <Icon name="arrow" />
              </Link>
              {analysis.matches.length > 1 && (
                <div className="piano-alternatives">
                  <h3>Weitere Deutungen desselben Tonvorrats</h3>
                  <p>
                    Der tiefste Ton hilft bei der Reihenfolge. Die musikalische Funktion ergibt sich
                    erst aus dem Zusammenhang.
                  </p>
                  <div>
                    {analysis.matches.slice(1).map((match) => (
                      <Link
                        key={`${match.root}-${match.chord.id}`}
                        to={`/chords/${match.chord.id}`}
                        onClick={() => openChord(match)}
                      >
                        <strong>{chordTitle(match)}</strong>
                        <small>{match.chord.nameDe}</small>
                        <span>{match.internationalSymbol}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
