import { useEffect, useMemo, useState } from 'react';
import type { ChordDefinition } from '../lib/chord-types';
import { guitarChordShapes } from '../lib/guitar-chords';
import { spellDegree } from '../lib/music';
import { useNoteLabel } from '../lib/store';
import { usePiano } from '../lib/use-piano';
import { GuitarChordDiagram } from './GuitarChordDiagram';
import { Icon, Section } from './UI';

/** Reusable guitar-first presentation shared by chord pages and the fretboard workbench. */
export function GuitarChordVoicings({
  root,
  chord,
  title,
}: {
  root: string;
  chord: ChordDefinition;
  title?: string;
}) {
  const label = useNoteLabel();
  const piano = usePiano(58);
  const shapes = useMemo(() => guitarChordShapes(root, chord), [root, chord]);
  const [shapeIndex, setShapeIndex] = useState(0);
  useEffect(() => setShapeIndex(0), [root, chord.id]);
  if (!shapes.length) return null;
  const shape = shapes[Math.min(shapeIndex, shapes.length - 1)];
  const chordName = label.chord(root, chord.symbol);

  return (
    <Section
      className="guitar-voicings"
      title={title ?? `${chordName} greifen`}
      aside={<span className="small-label">{shapes.length} SPIELBARE GRIFFE</span>}
    >
      <div className="guitar-voicing-priority">
        <div
          className="guitar-shape-tabs"
          role="group"
          aria-label={`Griff für ${chordName} wählen`}
        >
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
        <p>
          Die große Zahl ist der Greiffinger. Der kleine Text zeigt Stufe und Ton. Beginne mit
          diesem Griff; alle Töne auf dem gesamten Griffbrett folgen weiter unten.
        </p>
      </div>
      <GuitarChordDiagram
        shape={shape}
        root={root}
        chord={chord}
        onPlayNote={(midi) => piano.playChord([midi])}
      />
      <div className="guitar-voicing-actions">
        <button type="button" className="primary" onClick={() => piano.playChord([...shape.midis])}>
          <Icon name="play" /> Diesen Griff spielen
        </button>
        <span>
          Akkordtöne:{' '}
          {chord.formula.map((degree) => label.note(spellDegree(root, degree))).join(' · ')}
        </span>
      </div>
      {piano.audioError && (
        <p className="error-text" role="alert">
          {piano.audioError}
        </p>
      )}
    </Section>
  );
}
