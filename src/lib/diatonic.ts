import { chords } from '../data/chords';
import type { ChordDefinition } from './chord-types';
import { degreeSemitones, mod, pitchClass } from './music';

export interface DiatonicStackedChord {
  degree: number;
  roman: string;
  root: string;
  notes: string[];
  chord: ChordDefinition;
}

const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function romanFor(degree: number, chord: ChordDefinition): string {
  const upper = romans[degree - 1];
  const lower = upper.toLowerCase();
  return (
    (
      {
        major: upper,
        minor: lower,
        diminished: `${lower}°`,
        augmented: `${upper}+`,
        'major-7': `${upper}maj7`,
        'minor-7': `${lower}7`,
        'dominant-7': `${upper}7`,
        'minor-7b5': `${lower}ø7`,
        'diminished-7': `${lower}°7`,
        'minor-major-7': `${lower}(maj7)`,
        'major-7-sharp5': `${upper}maj7♯5`,
      } as Record<string, string>
    )[chord.id] ?? `${upper}${chord.symbol}`
  );
}

/**
 * Build the ordinary tertian chord on every degree of a seven-note scale.
 * Identification comes from the shared chord catalogue, so symbol, formula and
 * German name cannot drift away from the rest of the application.
 */
export function diatonicStackedChords(
  scaleNotes: readonly string[],
  size: 3 | 4,
): DiatonicStackedChord[] {
  if (scaleNotes.length !== 7 || new Set(scaleNotes.map(pitchClass)).size !== 7) return [];
  const family = size === 3 ? 'triad' : 'seventh';
  return scaleNotes.flatMap((root, index) => {
    const notes = Array.from({ length: size }, (_, chordIndex) => {
      const noteIndex = index + chordIndex * 2;
      return scaleNotes[mod(noteIndex, scaleNotes.length)];
    });
    const wanted = notes
      .map((note) => mod(pitchClass(note) - pitchClass(root)))
      .sort((a, b) => a - b);
    const chord = chords.find(
      (candidate) =>
        candidate.family === family &&
        !candidate.voicingFamily &&
        candidate.formula.length === size &&
        candidate.formula
          .map((degree) => mod(degreeSemitones(degree)))
          .sort((a, b) => a - b)
          .every((interval, intervalIndex) => interval === wanted[intervalIndex]),
    );
    if (!chord) return [];
    return [{ degree: index + 1, roman: romanFor(index + 1, chord), root, notes, chord }];
  });
}
