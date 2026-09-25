import type { Degree } from './chord-types';
import { instrumentProfiles } from './instrument';
import { degreeSemitones, mod, pitchClass, spellDegree } from './music';
import type { FingeringNote } from './music';

export interface GuitarScaleShape {
  id: string;
  name: string;
  rootString: 'E' | 'A';
  events: FingeringNote[];
  range: [number, number];
}

const stringsLowToHigh = [...instrumentProfiles.guitar.stringsHighToLow].reverse();

const fingerAt = (fret: number, start: number) => {
  if (fret === 0) return 0;
  const offset = fret - start;
  if (offset <= 0) return 1;
  if (offset === 1) return 2;
  if (offset <= 3) return 3;
  return 4;
};

/** Two compact position systems that use all six strings and retain exact scale spelling. */
export function guitarScaleShapes(root: string, degrees: readonly Degree[]): GuitarScaleShape[] {
  const rootPitch = pitchClass(root);
  return (['E', 'A'] as const).map((rootString) => {
    const rootIndex = rootString === 'E' ? 0 : 1;
    const start = mod(rootPitch - stringsLowToHigh[rootIndex].midi);
    const end = start + 4;
    const events = stringsLowToHigh.flatMap((string, stringIndex) => {
      if (stringIndex < rootIndex) return [];
      return Array.from({ length: 5 }, (_, offset) => start + offset).flatMap((fret) => {
        const pitch = mod(string.midi + fret - rootPitch);
        const degree = degrees.find((candidate) => mod(degreeSemitones(candidate)) === pitch);
        if (!degree) return [];
        return [
          {
            string: string.exerciseString ?? ('E' as const),
            stringId: string.id,
            fret,
            finger: fingerAt(fret, start),
            midi: string.midi + fret,
            degree,
            name: spellDegree(root, degree),
            duration: '8',
          } satisfies FingeringNote,
        ];
      });
    });
    return {
      id: `${rootString}-${start}`,
      name: `Grundton auf ${rootString === 'E' ? 'tiefer E' : 'A'}-Saite`,
      rootString,
      events: events.sort((a, b) => (a.midi ?? 0) - (b.midi ?? 0)),
      range: [Math.max(0, start - 1), Math.min(24, end + 1)] as [number, number],
    };
  });
}
