import { degreeSemitones } from './music';
import type { ChordDefinition, Degree } from './chord-types';

/** Keep every defining tone, then add colour up to the requested voicing size. */
export function practicalVoicing(chord: ChordDefinition, size = 4) {
  const keep = chord.formula.filter((degree) => chord.required.includes(degree));
  if (keep.length >= size) return keep;
  const extra = [...chord.formula]
    .filter((degree) => !keep.includes(degree))
    .sort((a, b) => degreeSemitones(b) - degreeSemitones(a))
    .slice(0, size - keep.length);
  return chord.formula.filter((degree) => keep.includes(degree) || extra.includes(degree));
}

/** Move a degree by whole octaves: the number moves by seven, the accidentals stay. */
export function shiftDegree(degree: Degree, octaves: number): Degree {
  const match = /^([b#]*)(\d+)$/.exec(degree);
  if (!match) throw new Error(`Ungültige Stufe ${degree}`);
  const number = Number(match[2]) + octaves * 7;
  if (number < 1)
    throw new Error(`Stufe ${degree} kann nicht um ${octaves} Oktaven verschoben werden`);
  return match[1] + number;
}

export const sortDegrees = (degrees: Degree[]): Degree[] =>
  [...degrees].sort((a, b) => degreeSemitones(a) - degreeSemitones(b));

export const ascending = (degrees: Degree[]): Degree[] => sortDegrees(degrees);
export const descending = (degrees: Degree[]): Degree[] => sortDegrees(degrees).reverse();

/** Up then back down. By default the top note is not sounded twice. */
export function upDown(degrees: Degree[], repeatTop = false): Degree[] {
  const up = sortDegrees(degrees);
  const down = [...up].reverse().slice(repeatTop ? 0 : 1);
  return [...up, ...down];
}

/** Raise each entry by whole octaves until the list ascends strictly. */
export function raiseToAscending(degrees: Degree[]): Degree[] {
  const result: Degree[] = [];
  let previous = -Infinity;
  for (const degree of degrees) {
    let current = degree;
    while (degreeSemitones(current) <= previous) current = shiftDegree(current, 1);
    previous = degreeSemitones(current);
    result.push(current);
  }
  return result;
}

/** Start on chord tone number `startIndex`; the wrapped tones move up an octave. */
export function rotateFrom(degrees: Degree[], startIndex: number): Degree[] {
  const ordered = sortDegrees(degrees);
  const index = ((startIndex % ordered.length) + ordered.length) % ordered.length;
  return raiseToAscending([...ordered.slice(index), ...ordered.slice(0, index)]);
}

const folded: Record<string, string> = {
  '9': '2',
  b9: 'b2',
  '#9': '#2',
  '11': '4',
  '#11': '#4',
  b13: 'b6',
  '13': '6',
};

/**
 * Fold extensions back inside the octave, so stacking octaves still ascends.
 * Without this, octave one's 9 (14 semitones) sits above octave two's root (12).
 */
export const foldToOctave = (degrees: Degree[]): Degree[] =>
  sortDegrees(degrees.map((degree) => folded[degree] ?? degree));

/** Stack `octaves` copies of the chord. */
export function multiOctave(degrees: Degree[], octaves: number, closeOnRoot = true): Degree[] {
  const base = foldToOctave(degrees);
  const result: Degree[] = [];
  for (let octave = 0; octave < octaves; octave++)
    result.push(...base.map((degree) => (octave === 0 ? degree : shiftDegree(degree, octave))));
  if (closeOnRoot) result.push(shiftDegree('1', octaves));
  return result;
}

/** Every ordering of the first `size` chord tones. Four tones give 24 patterns. */
export function permutations(degrees: Degree[], size = 4): Degree[][] {
  const pool = sortDegrees(degrees).slice(0, size);
  if (pool.length <= 1) return [pool];
  const result: Degree[][] = [];
  const walk = (current: Degree[], rest: Degree[]) => {
    if (!rest.length) {
      result.push(current);
      return;
    }
    rest.forEach((degree, index) =>
      walk([...current, degree], [...rest.slice(0, index), ...rest.slice(index + 1)]),
    );
  };
  walk([], pool);
  return result;
}

export type PracticeShape = 'ascending' | 'descending' | 'upDown' | 'rotate' | 'permutation';

export const practiceShapes: { id: PracticeShape; name: string; description: string }[] = [
  { id: 'ascending', name: 'Aufwärts', description: 'Vom Grundton nach oben – die Grundform.' },
  {
    id: 'descending',
    name: 'Abwärts',
    description: 'Von oben zum Grundton; hört sich anders an, als es aussieht.',
  },
  {
    id: 'upDown',
    name: 'Auf und ab',
    description: 'Hoch und zurück, ohne den höchsten Ton doppelt zu spielen.',
  },
  {
    id: 'rotate',
    name: 'Anderer Startton',
    description: 'Dieselben Töne, ab einem anderen Akkordton begonnen.',
  },
  {
    id: 'permutation',
    name: 'Umstellung',
    description: 'Die vier wichtigsten Töne in wechselnder Reihenfolge.',
  },
];

export interface PracticeOptions {
  shape: PracticeShape;
  /** Which chord tone the rotation starts on. */
  start: number;
  /** Which of the 24 four-note orderings to use. */
  permutation: number;
  octaves: number;
}

export function practiceDegrees(formula: Degree[], options: PracticeOptions): Degree[] {
  const base = options.octaves > 1 ? multiOctave(formula, options.octaves) : sortDegrees(formula);
  switch (options.shape) {
    case 'descending':
      return [...base].reverse();
    case 'upDown':
      return upDown(base);
    case 'rotate':
      return rotateFrom(base, options.start);
    case 'permutation': {
      const all = permutations(formula, Math.min(4, formula.length));
      return raiseToAscending(all[options.permutation % all.length]);
    }
    default:
      return base;
  }
}
