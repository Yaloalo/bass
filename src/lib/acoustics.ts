/**
 * The arithmetic behind the theory article. Everything the prose quotes as a number is
 * computed here, so a figure in the text and the frequency you actually hear can never
 * drift apart.
 *
 * The article's spine is one question — where does our scale come from — so this file
 * follows it: ratios, a scale grown out of stacked fifths, the gap that stack leaves, and
 * what tempering costs. It holds no opinion about which intervals are beautiful.
 */

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Concert pitch, and the C the fifth walk starts from. */
export const referenceA = 440;
export const middleC = referenceA * 2 ** ((60 - 69) / 12);

export const midiToHz = (midi: number) => referenceA * 2 ** ((midi - 69) / 12);

/** A pitch distance in cents: 100 per equal semitone, 1200 per octave. */
export const cents = (ratio: number) => 1200 * Math.log2(ratio);

/** Equal-temperament ratio for a number of semitones. */
export const equalRatio = (semitones: number) => 2 ** (semitones / 12);

export interface PureInterval {
  id: string;
  name: string;
  /** Frequency ratio of the upper tone to the lower one. */
  p: number;
  q: number;
  /** Where twelve equal steps put the same interval. */
  semitones: number;
}

/** The five intervals the article works with, simplest ratio first. */
export const pureIntervals: PureInterval[] = [
  { id: 'octave', name: 'Oktave', p: 2, q: 1, semitones: 12 },
  { id: 'fifth', name: 'Quinte', p: 3, q: 2, semitones: 7 },
  { id: 'fourth', name: 'Quarte', p: 4, q: 3, semitones: 5 },
  { id: 'major-third', name: 'Große Terz', p: 5, q: 4, semitones: 4 },
  { id: 'minor-third', name: 'Kleine Terz', p: 6, q: 5, semitones: 3 },
];

export const intervalById = (id: string) =>
  pureIntervals.find((interval) => interval.id === id) ?? pureIntervals[1];

export const ratioValue = (interval: PureInterval) => interval.p / interval.q;

export interface TuningRow {
  name: string;
  pure: number;
  equal: number;
  /** How far equal temperament sits from the pure ratio, in cents. */
  offset: number;
}

/** What twelve equal steps cost on the two intervals the article compares. */
export const tuningComparison: TuningRow[] = pureIntervals
  .filter((interval) => interval.id === 'fifth' || interval.id === 'major-third')
  .map((interval) => {
    const pure = ratioValue(interval);
    const equal = equalRatio(interval.semitones);
    return { name: interval.name, pure, equal, offset: cents(equal / pure) };
  });

/**
 * Twelve pure fifths overshoot seven octaves by this factor, about 23.46 cents. No amount
 * of careful tuning removes it, which is the whole reason a keyboard needs a compromise.
 */
export const commaFactor = (3 / 2) ** 12 / 2 ** 7;
export const commaCents = cents(commaFactor);

/** Note names along a walk in pure fifths from C; His is the twelfth step, not C. */
export const fifthWalkNames = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'H',
  'Fis',
  'Cis',
  'Gis',
  'Dis',
  'Ais',
  'Eis',
  'His',
];

/** The piano key each of those names is played on — the equation the article questions. */
export const fifthWalkKeys = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'H',
  'Fis',
  'Cis',
  'Gis',
  'Dis',
  'Ais',
  'F',
  'C',
];

export interface WalkStep {
  index: number;
  name: string;
  key: string;
  /** Where the step lands before any octave is taken off. */
  raw: number;
  /** The same pitch folded into one octave above the start, which is what you hear. */
  folded: number;
  /** Position on the pitch-class circle, 0 to 1. */
  turn: number;
  /** Distance from the starting pitch class, in cents, signed and within ±600. */
  drift: number;
}

/**
 * A walk of twelve fifths from `start`. In `pure` mode each step multiplies by 3/2 and the
 * circle fails to close; in `equal` mode it multiplies by 2^(7/12) and the circle closes
 * exactly, which is the trade the article is about.
 */
export function fifthWalk(start = middleC, mode: 'pure' | 'equal' = 'pure'): WalkStep[] {
  const step = mode === 'pure' ? 3 / 2 : equalRatio(7);
  return fifthWalkNames.map((name, index) => {
    const raw = start * step ** index;
    const octaves = Math.floor(Math.log2(raw / start));
    const folded = raw / 2 ** octaves;
    const turn = Math.log2(folded / start);
    const half = cents(folded / start);
    return {
      index,
      name,
      key: fifthWalkKeys[index],
      raw,
      folded,
      turn,
      drift: half > 600 ? half - 1200 : half,
    };
  });
}

/** Major scale as semitone offsets above its own root. */
export const majorSteps = [0, 2, 4, 5, 7, 9, 11];

/**
 * Seven consecutive fifths, in the order they are built, and sorted into a scale. Note
 * names are international here so the rest of the app can look them up; the article puts
 * them through `germanNoteName`, which turns this B into H.
 */
export const chainOfFifths = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const cMajorScale = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Whole or half step between neighbouring scale degrees, in semitones. */
export const scaleGaps = majorSteps.map(
  (step, index) => (index === majorSteps.length - 1 ? 12 : majorSteps[index + 1]) - step,
);

export interface Triad {
  degree: number;
  /** Suffix after the root name: '', 'm' or 'dim'. */
  suffix: string;
  quality: 'Dur' | 'Moll' | 'vermindert';
  /** Semitones above the scale root, one per chord tone. */
  offsets: number[];
  notes: string[];
}

/**
 * Stacking every other scale degree. The qualities are read off the semitone gaps rather
 * than typed out, so they stay correct if the scale ever changes.
 */
export const diatonicTriads: Triad[] = majorSteps.map((_, degree) => {
  const picked = [0, 2, 4].map((skip) => (degree + skip) % 7);
  const offsets = picked.map((index, position) => {
    const octaves = Math.floor((degree + position * 2) / 7);
    return majorSteps[index] + 12 * octaves;
  });
  const [third, fifth] = [offsets[1] - offsets[0], offsets[2] - offsets[0]];
  const quality: Triad['quality'] = fifth === 6 ? 'vermindert' : third === 4 ? 'Dur' : 'Moll';
  const notes = picked.map((index) => cMajorScale[index]);
  const suffix = quality === 'Dur' ? '' : quality === 'Moll' ? 'm' : 'dim';
  return { degree, suffix, quality, offsets, notes };
});

/** The two short melodies that share one set of notes but settle on different centres. */
export const centreExamples = [
  { id: 'c', label: 'C als Zentrum', bass: 'C', melody: [0, 4, 7, 5, 4, 2, 0] },
  { id: 'a', label: 'A als Zentrum', bass: 'A', melody: [9, 12, 16, 14, 12, 11, 9] },
] as const;

/* ------------------------------------------------ the conflict, in numbers */

export const pureFifthCents = cents(3 / 2);

/**
 * Why no chain of pure fifths ever lands back on a pure octave, without needing any
 * machinery: twelve fifths against seven octaves means 3¹² = 2¹⁹, and 3ⁿ is odd for every
 * n while 2ᵐ is even for every m ≥ 1. The two sides can never meet.
 */
export const oddSide = 3 ** 12;
export const evenSide = 2 ** 19;

/**
 * Pythagorean tuning: twelve notes from one unbroken chain of pure fifths, three below
 * the starting note and eight above, each folded into a single octave.
 */
const foldToOctave = (ratio: number) => ratio / 2 ** Math.floor(Math.log2(ratio));

export const pythagoreanChain = ['Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#'];

export interface PythagoreanNote {
  name: string;
  /** Position in the chain of fifths relative to C. */
  fifths: number;
  /** Frequency ratio above the starting C. */
  ratio: number;
}

export const pythagoreanNotes: PythagoreanNote[] = pythagoreanChain.map((name, index) => {
  const fifths = index - 3;
  return { name, fifths, ratio: foldToOctave((3 / 2) ** fifths) };
});

export interface CircleFifth {
  from: string;
  to: string;
  ratio: number;
  cents: number;
  /**
   * The chain has eleven links; closing it into a circle needs a twelfth interval that
   * was never tuned. It absorbs the whole comma and is the interval that howls.
   */
  wolf: boolean;
}

export const pythagoreanFifths: CircleFifth[] = pythagoreanChain.map((from, index) => {
  const wolf = index === pythagoreanChain.length - 1;
  const ratio = wolf ? 3 / 2 / commaFactor : 3 / 2;
  return {
    from,
    to: pythagoreanChain[(index + 1) % pythagoreanChain.length],
    ratio,
    cents: cents(ratio),
    wolf,
  };
});

export const wolfFifth = pythagoreanFifths[pythagoreanFifths.length - 1];

export interface NearMiss {
  fifths: number;
  octaves: number;
  /** How far the stack lands from a whole number of octaves, in cents. */
  miss: number;
  /**
   * The same miss shared out over every fifth. Narrowing each fifth by exactly this much
   * closes the circle — and that is what an equal division of the octave does.
   */
  perFifth: number;
  /** The tempered fifth that results, in cents. */
  tempered: number;
}

/** How close a stack of `count` pure fifths comes to a whole number of octaves. */
export function fifthNearMiss(count: number): NearMiss {
  const octaves = Math.round((count * pureFifthCents) / 1200);
  const miss = count * pureFifthCents - octaves * 1200;
  return {
    fifths: count,
    octaves,
    miss,
    perFifth: miss / count,
    tempered: (octaves * 1200) / count,
  };
}

export const nearMissCandidates = [3, 5, 7, 12, 19, 29, 41, 53];

/* ------------------------------------------------ growing a scale from fifths */

/**
 * The chain of fifths in build order. It starts one fifth below C, so that after seven
 * steps the collected notes are exactly C major rather than a mode of it. The starting
 * point only shifts the names; the pattern of steps is the same wherever you begin.
 */
export const buildOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];

export interface ScaleTone {
  name: string;
  /** Position in the chain: 0 is C, 1 is a fifth above, −1 a fifth below. */
  fifths: number;
  /** Cents above the C the scale is folded into. */
  cents: number;
  /** Frequency ratio above that C. */
  ratio: number;
  /** How many steps of the build it took for this note to appear. */
  step: number;
}

/**
 * Take `count` links of the chain, fold each into a single octave above C and sort them.
 * This is the whole construction the article rests on.
 */
export function fifthScale(count: number): ScaleTone[] {
  return buildOrder
    .slice(0, count)
    .map((name, index) => {
      const fifths = index - 1;
      const raw = (3 / 2) ** fifths;
      const ratio = raw / 2 ** Math.floor(Math.log2(raw));
      return { name, fifths, ratio, cents: cents(ratio), step: index + 1 };
    })
    .sort((a, b) => a.cents - b.cents);
}

/** The steps between neighbouring notes of such a scale, in cents, wrapping the octave. */
export function scaleStepSizes(count: number): number[] {
  const tones = fifthScale(count);
  return tones.map((tone, index) =>
    index + 1 < tones.length
      ? tones[index + 1].cents - tone.cents
      : 1200 + tones[0].cents - tone.cents,
  );
}

export interface Evenness {
  count: number;
  /** The distinct step sizes, smallest first, rounded to hundredths of a cent. */
  sizes: number[];
  /** Two sizes means the octave is filled as evenly as this chain can manage. */
  even: boolean;
  notes: string[];
}

export function scaleEvenness(count: number): Evenness {
  const sizes = [
    ...new Set(scaleStepSizes(count).map((step) => Math.round(step * 100) / 100)),
  ].sort((a, b) => a - b);
  return {
    count,
    sizes,
    even: sizes.length === 2,
    notes: fifthScale(count).map((tone) => tone.name),
  };
}

/**
 * Counts worth showing. Every one of 2, 3, 5, 7, 12, 17 and 29 fills the octave with just
 * two step sizes; everything between them needs three and is visibly lumpier.
 */
export const scaleSizes = [2, 3, 4, 5, 6, 7, 8, 9, 12];

/** The three that became scales people actually use. */
export const namedScaleSizes: Record<number, string> = {
  5: 'Pentatonik',
  7: 'Dur-Tonleiter',
  12: 'alle zwölf Töne',
};
