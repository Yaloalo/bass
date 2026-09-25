import type { ChordDefinition } from './chord-types';
import { instrumentProfiles } from './instrument';
import { mod, pitchClass } from './music';

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
  midis: readonly number[];
  startFret: number;
  barreFret?: number;
}

export const guitarStringsLowToHigh = [...instrumentProfiles.guitar.stringsHighToLow].reverse();

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
  return (templates[chord.id] ?? []).map((template) => {
    const base = mod(pitchClass(root) - template.anchorPitch);
    const frets = template.offsets.map((offset) => (offset === null ? null : base + offset));
    const positive = frets.filter((fret): fret is number => fret !== null && fret > 0);
    const highest = Math.max(0, ...positive);
    const startFret = highest <= 4 ? 1 : Math.min(...positive);
    return {
      id: `${template.id}-${base}`,
      name: template.name,
      rootString: template.rootString,
      frets,
      midis: frets.flatMap((fret, index) =>
        fret === null ? [] : [guitarStringsLowToHigh[index].midi + fret],
      ),
      startFret,
      barreFret: base > 0 ? base : undefined,
    };
  });
}
