import { chords } from '../data/chords';
import type { ChordDefinition } from './chord-types';
import {
  allPositions,
  chromaticDegreesFor,
  degreeSemitones,
  mod,
  noteName,
  pitchClass,
  readableRoot,
  spellDegree,
  tuning,
} from './music';
import type { FingeringNote } from './music';

export const pianoRange: { first: number; last: number } = { first: 48, last: 72 };
const blackPitchClasses = new Set([1, 3, 6, 8, 10]);

export interface PianoKey {
  midi: number;
  black: boolean;
  /** White keys precede this key; black keys sit on that boundary. */
  whiteIndex: number;
}

export function pianoKeys(first = pianoRange.first, last = pianoRange.last): PianoKey[] {
  let whiteIndex = 0;
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const midi = first + index;
    const black = blackPitchClasses.has(mod(midi));
    return { midi, black, whiteIndex: black ? whiteIndex : whiteIndex++ };
  });
}

export function midiFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function selectedPitches(values: readonly number[]): number[] {
  return [
    ...new Set(values.filter((value) => Number.isInteger(value) && value >= 0 && value <= 127)),
  ].sort((a, b) => a - b);
}

/** Prefer the scale's functional spelling; other keys remain freely selectable. */
export function pianoNoteName(midi: number, scaleNotes: readonly string[]): string {
  return scaleNotes.find((name) => pitchClass(name) === mod(midi)) ?? noteName(midi, true);
}

export interface DiatonicPianoChord {
  /** One-based scale degree, kept in scale order for the picker. */
  degree: number;
  kind: ChordDefinition['family'];
  root: string;
  notes: string[];
  chord?: ChordDefinition;
}

/**
 * Stack every other degree of a seven-note scale. The shared chord catalogue names
 * recognized sounds; less common stacks remain available under their note names.
 */
export function diatonicPianoChords(scaleNotes: readonly string[]): DiatonicPianoChord[] {
  const classes = scaleNotes.map(pitchClass);
  if (scaleNotes.length < 5 || new Set(classes).size !== scaleNotes.length) return [];
  const inScale = new Set(classes);
  const result: DiatonicPianoChord[] = [];
  for (let index = 0; index < scaleNotes.length; index++) {
    const root = scaleNotes[index];
    for (const chord of chords) {
      // Every chord the catalogue knows whose tones all belong to this key, not just
      // the seven stacked triads and sevenths.
      if (chord.voicingFamily || chord.formula.length < 3) continue;
      const wanted = chord.formula.map((degree) => mod(pitchClass(root) + degreeSemitones(degree)));
      if (!wanted.every((value) => inScale.has(value))) continue;
      result.push({
        degree: index + 1,
        kind: chord.family,
        root,
        notes: chord.formula.map((degree) => spellDegree(root, degree)),
        chord,
      });
    }
  }
  return result;
}

/** Keep chosen chords inside the existing C3–C5 keyboard, in close root position. */
export function pianoChordMidis(chord: DiatonicPianoChord): number[] {
  const base = pianoRange.first + pitchClass(chord.root);
  const offsets = chord.notes.map((note) => mod(pitchClass(note) - pitchClass(chord.root)));
  return selectedPitches(offsets.map((offset) => base + offset));
}

/** Reuse the bass position model to mark every selected pitch class on the neck. */
export function pianoFretboardEvents(
  selected: readonly number[],
  root: string,
  scaleNotes: readonly string[],
  lastFret = 12,
): FingeringNote[] {
  const wanted = new Set(selectedPitches(selected).map((midi) => mod(midi)));
  if (!wanted.size) return [];
  const degrees = chromaticDegreesFor(root).filter((_, interval) =>
    wanted.has(mod(pitchClass(root) + interval)),
  );
  return allPositions(root, degrees, 0, lastFret).map((note) => ({
    ...note,
    name: pianoNoteName(tuning[note.string] + note.fret, scaleNotes),
  }));
}

export interface PianoChordMatch {
  chord: ChordDefinition;
  root: string;
  bass: string;
  inversion: number;
  internationalSymbol: string;
  notes: string[];
}

export interface PianoAnalysis {
  kind: 'empty' | 'single' | 'interval' | 'chord' | 'unknown';
  midis: number[];
  pitchClasses: number[];
  matches: PianoChordMatch[];
  intervalSemitones?: number;
}

/**
 * Recognize complete pitch-class sets from the application's chord catalogue.
 * Doublings never add chord tones, and the actual lowest MIDI determines inversion.
 * A voicing family such as 7alt is deliberately not treated as one fixed chord.
 */
export function analyzePiano(
  selected: readonly number[],
  preferredRoot = 'C',
  scaleNotes: readonly string[] = [],
): PianoAnalysis {
  const midis = selectedPitches(selected);
  const pitchClasses = [...new Set(midis.map((midi) => mod(midi)))];
  const result: PianoAnalysis = { kind: 'empty', midis, pitchClasses, matches: [] };
  if (!midis.length) return result;
  if (pitchClasses.length === 1) return { ...result, kind: 'single' };
  const bassPitch = mod(midis[0]);
  const matches: PianoChordMatch[] = [];

  for (const rootPitch of pitchClasses) {
    for (const chord of chords) {
      if (chord.voicingFamily) continue;
      const intervals = [...new Set(chord.formula.map((degree) => mod(degreeSemitones(degree))))];
      if (intervals.length !== pitchClasses.length) continue;
      if (!intervals.every((interval) => pitchClasses.includes(mod(rootPitch + interval))))
        continue;

      const suggestedRoot =
        rootPitch === pitchClass(preferredRoot)
          ? preferredRoot
          : pianoNoteName(rootPitch, scaleNotes);
      const root = readableRoot(suggestedRoot, [...chord.formula]);
      const notes = chord.formula.map((degree) => spellDegree(root, degree));
      const inversion = notes.findIndex((note) => pitchClass(note) === bassPitch);
      const bass = notes[inversion];
      matches.push({
        chord,
        root,
        bass,
        inversion,
        internationalSymbol: root + chord.symbol + (inversion > 0 ? `/${bass}` : ''),
        notes,
      });
    }
  }

  // A root in the bass is the clearest first reading. The selected key only
  // breaks ties; it does not force an unrelated chord into that key.
  matches.sort((a, b) => {
    const score = (match: PianoChordMatch) =>
      (match.inversion === 0 ? 0 : 10) +
      (pitchClass(match.root) === pitchClass(preferredRoot) ? 0 : 1);
    return score(a) - score(b);
  });
  const upper = midis.find((midi) => mod(midi) !== bassPitch)!;
  return {
    ...result,
    kind: matches.length ? 'chord' : pitchClasses.length === 2 ? 'interval' : 'unknown',
    matches,
    ...(pitchClasses.length === 2 ? { intervalSemitones: upper - midis[0] } : {}),
  };
}
