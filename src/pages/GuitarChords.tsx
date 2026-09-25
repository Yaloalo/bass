import { useEffect, useMemo, useState } from 'react';
import { Fretboard } from '../components/Fretboard';
import { GuitarChordDiagram } from '../components/GuitarChordDiagram';
import { Icon, PageHeading, Panel, Section, Segmented, usePageTitle } from '../components/UI';
import { scales } from '../data/catalog';
import { diatonicStackedChords } from '../lib/diatonic';
import { guitarChordShapes } from '../lib/guitar-chords';
import { germanNoteName, scaleName } from '../lib/i18n';
import { allPositions, pretty, readableRoot, roots, spellDegree } from '../lib/music';
import { usePiano } from '../lib/use-piano';
import { useNoteLabel, useStore } from '../lib/store';
import '../guitar.css';

const supportedScales = new Set([
  'major',
  'natural-minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'harmonic-minor',
  'melodic-minor',
]);

export function GuitarChords() {
  usePageTitle('Gitarrenakkorde einer Tonart');
  const {
    instrument,
    setInstrument,
    root: selectedRoot,
    setRoot,
    scaleId,
    setScaleId,
  } = useStore();
  const label = useNoteLabel();
  const piano = usePiano(58);
  const availableScales = scales.filter((scale) => supportedScales.has(scale.id));
  const fallbackScale = ['minor-pentatonic', 'blues'].includes(scaleId)
    ? availableScales.find((scale) => scale.id === 'natural-minor')!
    : availableScales[0];
  const activeScale = availableScales.find((scale) => scale.id === scaleId) ?? fallbackScale;
  const root = readableRoot(selectedRoot, activeScale.degreeLabels);
  const scaleNotes = useMemo(
    () => activeScale.degreeLabels.map((degree) => spellDegree(root, degree)),
    [activeScale, root],
  );
  const [chordSizeLabel, setChordSizeLabel] = useState('Dreiklänge');
  const chordSize = chordSizeLabel === 'Septakkorde' ? 4 : 3;
  const keyChords = useMemo(
    () => diatonicStackedChords(scaleNotes, chordSize),
    [scaleNotes, chordSize],
  );
  const [degree, setDegree] = useState(1);
  const selectedChord = keyChords.find((chord) => chord.degree === degree) ?? keyChords[0];
  const shapes = useMemo(
    () => (selectedChord ? guitarChordShapes(selectedChord.root, selectedChord.chord) : []),
    [selectedChord],
  );
  const [shapeIndex, setShapeIndex] = useState(0);
  const shape = shapes[Math.min(shapeIndex, shapes.length - 1)];
  const fretboardEvents = useMemo(
    () =>
      selectedChord
        ? allPositions(selectedChord.root, [...selectedChord.chord.formula], 0, 15)
        : [],
    [selectedChord],
  );

  useEffect(() => {
    setDegree(1);
  }, [root, activeScale.id, chordSize]);
  useEffect(() => {
    if (scaleId !== activeScale.id) setScaleId(activeScale.id);
  }, [activeScale.id, scaleId, setScaleId]);
  useEffect(() => setShapeIndex(0), [selectedChord?.root, selectedChord?.chord.id]);
  // A direct bookmark or restored tab must open the guitar feature instead of bouncing away.
  useEffect(() => {
    if (instrument !== 'guitar') setInstrument('guitar');
  }, [instrument, setInstrument]);

  return (
    <div className="guitar-chords-page">
      <PageHeading
        eyebrow="GITARRE / HARMONIE & GRIFFE"
        title="Akkorde einer Tonart"
        description="Sieh, welche Akkorde zur Tonart gehören, wo ihre Grundtöne liegen und wie du sie als verschiebbare Griffe spielst."
      />

      <Panel className="guitar-key-context">
        <div className="guitar-key-summary">
          <span className="eyebrow">TONART</span>
          <h2>
            {germanNoteName(root)} · {scaleName(activeScale.id)}
          </h2>
          <p>{scaleNotes.map(germanNoteName).join(' · ')}</p>
        </div>
        <div className="guitar-key-controls">
          <label>
            Grundton
            <select value={selectedRoot} onChange={(event) => setRoot(event.target.value)}>
              {roots.map((note) => (
                <option key={note} value={note}>
                  {germanNoteName(note)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tonleiter / Modus
            <select value={activeScale.id} onChange={(event) => setScaleId(event.target.value)}>
              {availableScales.map((scale) => (
                <option key={scale.id} value={scale.id}>
                  {scaleName(scale.id)}
                </option>
              ))}
            </select>
          </label>
          <Segmented
            label="Akkordumfang"
            value={chordSizeLabel}
            onChange={setChordSizeLabel}
            options={['Dreiklänge', 'Septakkorde']}
          />
        </div>
      </Panel>

      <Panel
        title="Akkorde der Tonart"
        aside={<span className="small-label">JEDE STUFE · EIN DIATONISCHER AKKORD</span>}
      >
        <div className="guitar-key-chords" role="group" aria-label="Diatonische Akkorde">
          {keyChords.map((item) => (
            <button
              type="button"
              className={item.degree === selectedChord?.degree ? 'is-selected' : ''}
              aria-pressed={item.degree === selectedChord?.degree}
              onClick={() => setDegree(item.degree)}
              key={`${item.degree}-${item.chord.id}`}
            >
              <small>{item.roman}</small>
              <strong>{label.chord(item.root, item.chord.symbol)}</strong>
              <span>{item.chord.nameDe}</span>
            </button>
          ))}
        </div>
      </Panel>

      {selectedChord && shape && (
        <div className="guitar-chord-workspace">
          <Panel
            className="guitar-shape-panel"
            title={`${label.chord(selectedChord.root, selectedChord.chord.symbol)} greifen`}
            aside={
              <div className="guitar-shape-tabs" role="group" aria-label="Gitarrengriff wählen">
                {shapes.map((candidate, index) => (
                  <button
                    type="button"
                    className={index === shapeIndex ? 'active' : ''}
                    aria-pressed={index === shapeIndex}
                    onClick={() => setShapeIndex(index)}
                    key={candidate.id}
                  >
                    {candidate.name}
                  </button>
                ))}
              </div>
            }
          >
            <GuitarChordDiagram
              shape={shape}
              root={selectedChord.root}
              chord={selectedChord.chord}
              onPlayNote={(midi) => piano.playChord([midi])}
            />
            <button
              type="button"
              className="primary guitar-chord-play"
              onClick={() => piano.playChord([...shape.midis])}
            >
              <Icon name="play" /> Griff spielen
            </button>
            {piano.audioError && <p className="error-text">{piano.audioError}</p>}
          </Panel>

          <Panel className="guitar-chord-explanation" title="Was du greifst">
            <dl>
              <div>
                <dt>Stufe</dt>
                <dd>{selectedChord.roman}</dd>
              </div>
              <div>
                <dt>Akkordtyp</dt>
                <dd>{selectedChord.chord.nameDe}</dd>
              </div>
              <div>
                <dt>Formel</dt>
                <dd>{selectedChord.chord.formula.map(pretty).join(' · ')}</dd>
              </div>
              <div>
                <dt>Akkordtöne</dt>
                <dd>{selectedChord.notes.map(germanNoteName).join(' · ')}</dd>
              </div>
            </dl>
            <p>
              Die beiden Formen enthalten denselben Akkord. Ihr Grundton liegt entweder auf der
              tiefen E- oder auf der A-Saite. Verschiebe die gesamte Form, um denselben Akkordtyp in
              einer anderen Tonart zu spielen.
            </p>
          </Panel>
        </div>
      )}

      {selectedChord && (
        <Section title="Alle Akkordtöne auf dem Griffbrett" defaultOpen={false}>
          <p className="guitar-all-tones-hint">
            Der Griff oben ist eine konkrete spielbare Auswahl. Hier siehst du zusätzlich jede
            Position der Akkordtöne bis zum 15. Bund.
          </p>
          <Fretboard
            events={fretboardEvents}
            range={[0, 15]}
            root={selectedChord.root}
            labels="Notes"
            title={`${label.chord(selectedChord.root, selectedChord.chord.symbol)} Akkordtöne`}
          />
        </Section>
      )}
    </div>
  );
}
