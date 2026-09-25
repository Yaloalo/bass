import { chordById } from '../data/chords';
import { allPositions, chromaticDegreesFor, mod, pitchClass, spellDegree, tuning } from './music';
import type { FingeringNote } from './music';

export interface FretboardChordSelection {
  id: string;
  root: string;
  chordId: string;
  roman?: string;
}

export interface FretboardChordOverlay {
  id: string;
  label: string;
  detail: string;
  color: string;
  rootPitch: number;
  pitchClasses: readonly number[];
}

/** Deliberately distinct at small marker sizes and in both application themes. */
export const fretboardChordColors = [
  '#147d92',
  '#b15a16',
  '#6d55ad',
  '#2f7c4f',
  '#b03f67',
  '#946d08',
  '#3566a8',
  '#8b4a3b',
] as const;

export const fretboardChordSelectionId = (root: string, chordId: string) => `${root}:${chordId}`;

export function fretboardChordNotes(selection: FretboardChordSelection): string[] {
  const chord = chordById(selection.chordId);
  return chord?.formula.map((degree) => spellDegree(selection.root, degree)) ?? [];
}

export function makeFretboardChordOverlays(
  selections: readonly FretboardChordSelection[],
  chordLabel: (root: string, symbol: string) => string,
  noteLabel: (note: string) => string,
): FretboardChordOverlay[] {
  return selections.flatMap((selection, index) => {
    const chord = chordById(selection.chordId);
    if (!chord) return [];
    const notes = fretboardChordNotes(selection);
    return [
      {
        id: selection.id,
        label: chordLabel(selection.root, chord.symbol),
        detail: notes.map(noteLabel).join(' · '),
        color: fretboardChordColors[index % fretboardChordColors.length],
        rootPitch: pitchClass(selection.root),
        pitchClasses: [...new Set(notes.map(pitchClass))],
      },
    ];
  });
}

/**
 * Turn a collection of chords into the same position events every existing fretboard
 * view consumes. Enharmonic spelling follows the first selected chord that contains
 * a pitch; overlap membership itself remains available through the overlays.
 */
export function fretboardChordEvents(
  selections: readonly FretboardChordSelection[],
  referenceRoot: string,
  firstFret: number,
  lastFret: number,
): FingeringNote[] {
  const spelling = new Map<number, string>();
  for (const selection of selections) {
    for (const note of fretboardChordNotes(selection)) {
      if (!spelling.has(pitchClass(note))) spelling.set(pitchClass(note), note);
    }
  }
  if (!spelling.size) return [];
  const degrees = chromaticDegreesFor(referenceRoot).filter((_, interval) =>
    spelling.has(mod(pitchClass(referenceRoot) + interval)),
  );
  return allPositions(referenceRoot, degrees, firstFret, lastFret).map((event) => ({
    ...event,
    name: spelling.get(mod(tuning[event.string] + event.fret)) ?? event.name,
  }));
}
