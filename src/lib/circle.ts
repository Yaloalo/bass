import { harmony, keySignature, mod, pitchClass, spellDegree } from './music';

/**
 * One of the twelve o'clock positions. Going clockwise adds a fifth and one sharp;
 * going anticlockwise adds a fourth and one flat. Three positions have a second
 * spelling, which is where the circle actually closes.
 */
export interface CirclePosition {
  /** 0 = C at twelve o'clock, counted clockwise. */
  index: number;
  major: string;
  minor: string;
  /** Sharps as a positive number, flats as a negative one. */
  accidentals: number;
  /** The enharmonic reading of the same position, where one is conventional. */
  alternative?: { major: string; minor: string; accidentals: number };
}

export const circle: CirclePosition[] = [
  { index: 0, major: 'C', minor: 'A', accidentals: 0 },
  { index: 1, major: 'G', minor: 'E', accidentals: 1 },
  { index: 2, major: 'D', minor: 'B', accidentals: 2 },
  { index: 3, major: 'A', minor: 'F#', accidentals: 3 },
  { index: 4, major: 'E', minor: 'C#', accidentals: 4 },
  {
    index: 5,
    major: 'B',
    minor: 'G#',
    accidentals: 5,
    alternative: { major: 'Cb', minor: 'Ab', accidentals: -7 },
  },
  {
    index: 6,
    major: 'F#',
    minor: 'D#',
    accidentals: 6,
    alternative: { major: 'Gb', minor: 'Eb', accidentals: -6 },
  },
  {
    index: 7,
    major: 'Db',
    minor: 'Bb',
    accidentals: -5,
    alternative: { major: 'C#', minor: 'A#', accidentals: 7 },
  },
  { index: 8, major: 'Ab', minor: 'F', accidentals: -4 },
  { index: 9, major: 'Eb', minor: 'C', accidentals: -3 },
  { index: 10, major: 'Bb', minor: 'G', accidentals: -2 },
  { index: 11, major: 'F', minor: 'D', accidentals: -1 },
];

/** The order accidentals are written in, which is itself a run of fifths. */
export const sharpOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const flatOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

export function signatureNotes(accidentals: number): string[] {
  const count = Math.abs(accidentals);
  return accidentals >= 0
    ? sharpOrder.slice(0, count).map((letter) => `${letter}#`)
    : flatOrder.slice(0, count).map((letter) => `${letter}b`);
}

export function signatureLabel(accidentals: number): string {
  if (accidentals === 0) return 'keine Vorzeichen';
  const count = Math.abs(accidentals);
  const word = accidentals > 0 ? 'Kreuz' : 'Be';
  return `${count} ${count === 1 ? word : accidentals > 0 ? 'Kreuze' : 'Be'}`;
}

export const positionFor = (index: number) => circle[mod(index, 12)];

/** Where a key sits on the circle, whichever of its two spellings was given. */
export function findPosition(root: string, minor = false): CirclePosition | undefined {
  const target = pitchClass(root);
  return circle.find((item) => {
    const name = minor ? item.minor : item.major;
    const alt = minor ? item.alternative?.minor : item.alternative?.major;
    return pitchClass(name) === target || (alt !== undefined && pitchClass(alt) === target);
  });
}

export interface CircleKeyDetail {
  major: string;
  minor: string;
  accidentals: number;
  /** The altered notes in writing order. */
  signature: string[];
  /** Subdominant and dominant: the neighbours either side on the circle. */
  subdominant: string;
  dominant: string;
  /** The seven diatonic seventh chords of the major key. */
  chords: ReturnType<typeof harmony>;
  /** The scale notes, so the detail panel can name them. */
  notes: string[];
}

/** Everything the detail panel shows, derived rather than tabulated. */
export function keyDetail(position: CirclePosition, useAlternative = false): CircleKeyDetail {
  const spelling = useAlternative && position.alternative ? position.alternative : position;
  const major = spelling.major;
  return {
    major,
    minor: spelling.minor,
    accidentals: spelling.accidentals,
    signature: signatureNotes(spelling.accidentals),
    subdominant: spellDegree(major, '4'),
    dominant: spellDegree(major, '5'),
    chords: harmony(major),
    notes: keySignature(major).notes,
  };
}
