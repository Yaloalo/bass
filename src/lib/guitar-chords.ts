import type { ChordDefinition } from './chord-types';
import { practicalVoicing } from './chord-practice';
import { instrumentProfiles } from './instrument';
import { degreeSemitones, mod, pitchClass } from './music';

type Fret = number | null;

interface ShapeTemplate {
  id: string;
  name: string;
  rootString: 'E' | 'A';
  anchorPitch: number;
  offsets: readonly Fret[];
}

export interface GuitarChordShape {
  id: string;
  name: string;
  rootString: 'E' | 'A';
  frets: readonly Fret[];
  /** 0=open, 1–4=left-hand finger, null=muted. */
  fingers: readonly Fret[];
  midis: readonly number[];
  startFret: number;
  barreFret?: number;
}

export const guitarStringsLowToHigh = [...instrumentProfiles.guitar.stringsHighToLow].reverse();

function fingersFor(frets: readonly Fret[], barreFret?: number): Fret[] {
  const result: Fret[] = frets.map((fret) => (fret === null ? null : fret === 0 ? 0 : -1));
  if (barreFret)
    frets.forEach((fret, index) => {
      if (fret === barreFret) result[index] = 1;
    });
  const remaining = frets
    .map((fret, index) => ({ fret, index }))
    .filter((item) => item.fret !== null && item.fret! > 0 && result[item.index] === -1)
    .sort((a, b) => a.fret! - b.fret! || a.index - b.index);
  const first = barreFret ? 2 : 1;
  remaining.forEach((item, index) => {
    result[item.index] = Math.min(4, first + index);
  });
  return result;
}

function generatedShape(
  root: string,
  chord: ChordDefinition,
  rootString: 'E' | 'A',
): GuitarChordShape | undefined {
  const rootIndex = rootString === 'E' ? 0 : 1;
  const rootPitch = pitchClass(root);
  const rootFret = mod(rootPitch - guitarStringsLowToHigh[rootIndex].midi);
  const source = chord.voicingFamily && chord.practiceSet ? chord.practiceSet : chord.formula;
  const selected = chord.voicingFamily ? source.slice(0, 4) : practicalVoicing(chord, 4);
  const wanted = new Set(selected.map((degree) => mod(rootPitch + degreeSemitones(degree))));
  let best: { frets: Fret[]; score: number } | undefined;

  for (const span of [4, 5, 6]) {
    const from = rootFret;
    const options = guitarStringsLowToHigh.map((string, stringIndex): Fret[] => {
      if (stringIndex < rootIndex) return [null];
      if (stringIndex === rootIndex) return [rootFret];
      const matches = Array.from({ length: span + 1 }, (_, offset) => from + offset).filter(
        (fret) => fret <= 17 && wanted.has(mod(string.midi + fret)),
      );
      return [null, ...matches];
    });
    const frets: Fret[] = Array(6).fill(null);
    const visit = (stringIndex: number) => {
      if (stringIndex === options.length) {
        const sounding = frets.flatMap((fret, index) =>
          fret === null ? [] : [guitarStringsLowToHigh[index].midi + fret],
        );
        const actual = new Set(sounding.map((midi) => mod(midi)));
        if ([...wanted].some((pitch) => !actual.has(pitch))) return;
        if (sounding.length < wanted.size || sounding.length > 6) return;
        const used = frets.filter((fret): fret is number => fret !== null && fret > 0);
        const width = used.length ? Math.max(...used) - Math.min(...used) : 0;
        const mutedInside = frets
          .slice(rootIndex + 1)
          .filter(
            (fret, index, all) =>
              fret === null && all.slice(index + 1).some((next) => next !== null),
          ).length;
        const duplicates = sounding.length - actual.size;
        const score = width * 20 + mutedInside * 14 + duplicates * 3 + span + rootFret * 0.05;
        if (!best || score < best.score) best = { frets: [...frets], score };
        return;
      }
      for (const fret of options[stringIndex]) {
        frets[stringIndex] = fret;
        visit(stringIndex + 1);
      }
    };
    visit(0);
    if (best) break;
  }
  if (!best) return undefined;
  const frets = best.frets;
  const used = frets.filter((fret): fret is number => fret !== null && fret > 0);
  const baseCount = frets.filter((fret) => fret === rootFret).length;
  const barreFret = rootFret > 0 && baseCount > 1 ? rootFret : undefined;
  return {
    id: `generated-${chord.id}-${rootString}-${rootFret}`,
    name: `${rootString}-Saiten-Voicing`,
    rootString,
    frets,
    fingers: fingersFor(frets, barreFret),
    midis: frets.flatMap((fret, index) =>
      fret === null ? [] : [guitarStringsLowToHigh[index].midi + fret],
    ),
    startFret: used.length && Math.max(...used) > 4 ? Math.min(...used) : 1,
    barreFret,
  };
}

const templates: Record<string, readonly ShapeTemplate[]> = {
  major: [
    { id: 'major-e', name: 'E-Form', rootString: 'E', anchorPitch: 4, offsets: [0, 2, 2, 1, 0, 0] },
    {
      id: 'major-a',
      name: 'A-Form',
      rootString: 'A',
      anchorPitch: 9,
      offsets: [null, 0, 2, 2, 2, 0],
    },
  ],
  minor: [
    {
      id: 'minor-e',
      name: 'E-Moll-Form',
      rootString: 'E',
      anchorPitch: 4,
      offsets: [0, 2, 2, 0, 0, 0],
    },
    {
      id: 'minor-a',
      name: 'A-Moll-Form',
      rootString: 'A',
      anchorPitch: 9,
      offsets: [null, 0, 2, 2, 1, 0],
    },
  ],
  diminished: [
    {
      id: 'dim-e',
      name: 'E-Saiten-Form',
      rootString: 'E',
      anchorPitch: 4,
      offsets: [0, 1, 2, 0, null, null],
    },
    {
      id: 'dim-a',
      name: 'A-Saiten-Form',
      rootString: 'A',
      anchorPitch: 9,
      offsets: [null, 0, 1, 2, 1, null],
    },
  ],
  augmented: [
    { id: 'aug-e', name: 'E-Form', rootString: 'E', anchorPitch: 4, offsets: [0, 3, 2, 1, 1, 0] },
    {
      id: 'aug-a',
      name: 'A-Form',
      rootString: 'A',
      anchorPitch: 9,
      offsets: [null, 0, 3, 2, 2, 1],
    },
  ],
  'major-7': [
    {
      id: 'maj7-e',
      name: 'Emaj7-Form',
      rootString: 'E',
      anchorPitch: 4,
      offsets: [0, 2, 1, 1, 0, 0],
    },
    {
      id: 'maj7-a',
      name: 'Amaj7-Form',
      rootString: 'A',
      anchorPitch: 9,
      offsets: [null, 0, 2, 1, 2, 0],
    },
  ],
  'minor-7': [
    { id: 'm7-e', name: 'Em7-Form', rootString: 'E', anchorPitch: 4, offsets: [0, 2, 0, 0, 0, 0] },
    {
      id: 'm7-a',
      name: 'Am7-Form',
      rootString: 'A',
      anchorPitch: 9,
      offsets: [null, 0, 2, 0, 1, 0],
    },
  ],
  'dominant-7': [
    { id: '7-e', name: 'E7-Form', rootString: 'E', anchorPitch: 4, offsets: [0, 2, 0, 1, 0, 0] },
    { id: '7-a', name: 'A7-Form', rootString: 'A', anchorPitch: 9, offsets: [null, 0, 2, 0, 2, 0] },
  ],
  'minor-7b5': [
    {
      id: 'm7b5-e',
      name: 'E-Saiten-Form',
      rootString: 'E',
      anchorPitch: 4,
      offsets: [0, 1, 0, 0, null, null],
    },
    {
      id: 'm7b5-a',
      name: 'A-Saiten-Form',
      rootString: 'A',
      anchorPitch: 9,
      offsets: [null, 0, 1, 0, 1, null],
    },
  ],
  'minor-major-7': [
    {
      id: 'mmaj7-e',
      name: 'Em(maj7)-Form',
      rootString: 'E',
      anchorPitch: 4,
      offsets: [0, 2, 1, 0, 0, 0],
    },
    {
      id: 'mmaj7-a',
      name: 'Am(maj7)-Form',
      rootString: 'A',
      anchorPitch: 9,
      offsets: [null, 0, 2, 1, 1, 0],
    },
  ],
  'diminished-7': [
    {
      id: 'dim7-e',
      name: 'E-Saiten-Form',
      rootString: 'E',
      anchorPitch: 4,
      offsets: [0, 1, 2, 0, 2, null],
    },
    {
      id: 'dim7-a',
      name: 'A-Saiten-Form',
      rootString: 'A',
      anchorPitch: 9,
      offsets: [null, 0, 1, 2, 1, 2],
    },
  ],
  'major-7-sharp5': [
    {
      id: 'maj7s5-e',
      name: 'Emaj7♯5-Form',
      rootString: 'E',
      anchorPitch: 4,
      offsets: [0, 3, 1, 1, 1, 0],
    },
    {
      id: 'maj7s5-a',
      name: 'Amaj7♯5-Form',
      rootString: 'A',
      anchorPitch: 9,
      offsets: [null, 0, 3, 1, 2, 1],
    },
  ],
};

/** Two practical, movable shapes for the diatonic chord qualities used by the trainer. */
export function guitarChordShapes(root: string, chord: ChordDefinition): GuitarChordShape[] {
  const exact = (templates[chord.id] ?? []).map((template) => {
    const base = mod(pitchClass(root) - template.anchorPitch);
    const frets = template.offsets.map((offset) => (offset === null ? null : base + offset));
    const positive = frets.filter((fret): fret is number => fret !== null && fret > 0);
    const highest = Math.max(0, ...positive);
    const startFret = highest <= 4 ? 1 : Math.min(...positive);
    const barreFret = base > 0 ? base : undefined;
    return {
      id: `${template.id}-${base}`,
      name: template.name,
      rootString: template.rootString,
      frets,
      fingers: fingersFor(frets, barreFret),
      midis: frets.flatMap((fret, index) =>
        fret === null ? [] : [guitarStringsLowToHigh[index].midi + fret],
      ),
      startFret,
      barreFret,
    };
  });
  if (exact.length) return exact;
  return (['E', 'A'] as const).flatMap((string) => {
    const shape = generatedShape(root, chord, string);
    return shape ? [shape] : [];
  });
}
