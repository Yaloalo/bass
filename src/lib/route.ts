import { degreeSemitones, pitchClass, spellDegree, strings, tuning } from './music';
import type { BassString, FingeringNote } from './music';
import type { ChordDefinition, Degree } from './chord-types';

export interface ChordRouteOptions {
  /** Spelling and pitch anchor of the stored fingering. 'D' matches transposeRoute's default. */
  baseRoot?: string;
  /** Append the root an octave up. Default: only when the whole chord fits inside one octave. */
  addOctave?: boolean;
  /** Largest acceptable fret window. */
  maxSpan?: number;
  minFret?: number;
  maxFret?: number;
}

const stringsLowToHigh: BassString[] = ['E', 'A', 'D', 'G'];

/**
 * One strictly ascending fingering for a degree list, inside the smallest fret window
 * that can hold it. Exhaustive but tiny: the search space is a few thousand candidates
 * and it runs once at module load, exactly where the old arpeggioRoute() ran.
 */
export function chordRoute(degrees: Degree[], options: ChordRouteOptions = {}): FingeringNote[] {
  const { baseRoot = 'D', maxSpan = 7, minFret = 0, maxFret = 24 } = options;
  const offsets = degrees.map(degreeSemitones);
  const addOctave = options.addOctave ?? Math.max(...offsets) < 12;
  const plan = addOctave ? [...degrees, '1'] : degrees;
  const planOffsets = addOctave ? [...offsets, 12] : offsets;

  let best: { notes: FingeringNote[]; score: number } | undefined;
  for (let rootMidi = 24; rootMidi <= 60; rootMidi++) {
    if (((rootMidi % 12) + 12) % 12 !== pitchClass(baseRoot)) continue;
    for (let span = 0; span <= maxSpan; span++) {
      for (let low = minFret; low + span <= maxFret; low++) {
        const notes: FingeringNote[] = [];
        let previous = -Infinity;
        let ok = true;
        for (let index = 0; index < plan.length; index++) {
          const midi = rootMidi + planOffsets[index];
          // Prefer the lowest string that reaches the pitch: it anchors the hand and
          // leaves the higher strings free for whatever the chord still has to place.
          const found = stringsLowToHigh
            .map((string) => ({ string, fret: midi - tuning[string] }))
            .find((option) => option.fret >= low && option.fret <= low + span);
          if (!found || midi <= previous) {
            ok = false;
            break;
          }
          previous = midi;
          notes.push({
            string: found.string,
            fret: found.fret,
            degree: plan[index],
            name: spellDegree(baseRoot, plan[index]),
            duration: 'q',
          });
        }
        if (!ok) continue;
        const score = span * 100 + Math.abs(low - 3);
        if (!best || score < best.score) best = { notes, score };
      }
      if (best) break;
    }
    if (best) break;
  }
  if (!best) throw new Error(`Kein spielbarer Fingersatz für ${degrees.join(' ')}`);
  return best.notes;
}

/**
 * Ordered line that stays in one hand position as long as it can and marks each shift.
 * Used where a route spans more than one octave and no single window can hold it.
 */
export function walkRoute(
  degrees: Degree[],
  options: ChordRouteOptions & { hand?: number } = {},
): FingeringNote[] {
  const { baseRoot = 'D', hand = 4, minFret = 0, maxFret = 24 } = options;
  const offsets = degrees.map(degreeSemitones);
  const rootMidi = Array.from({ length: 128 }, (_, midi) => midi).find(
    (candidate) =>
      ((candidate % 12) + 12) % 12 === pitchClass(baseRoot) &&
      candidate + Math.min(...offsets) >= tuning.E + minFret &&
      candidate + Math.max(...offsets) <= tuning.G + maxFret,
  );
  if (rootMidi === undefined) throw new Error(`Keine spielbare Oktave für ${degrees.join(' ')}`);

  const notes: FingeringNote[] = [];
  let anchor = minFret;
  for (let index = 0; index < degrees.length; index++) {
    const midi = rootMidi + offsets[index];
    const reachable = [...stringsLowToHigh]
      .reverse()
      .map((string) => ({ string, fret: midi - tuning[string] }))
      .filter(
        (option) => option.fret >= anchor && option.fret <= anchor + hand && option.fret <= maxFret,
      );
    if (reachable.length && index > 0) {
      const pick = reachable[0];
      notes.push({
        ...pick,
        degree: degrees[index],
        name: spellDegree(baseRoot, degrees[index]),
        duration: 'q',
      });
      continue;
    }
    // Nothing in the current box: move the hand and say so, rather than silently stretching.
    const jump = stringsLowToHigh
      .map((string) => ({ string, fret: midi - tuning[string] }))
      .filter((option) => option.fret >= minFret && option.fret <= maxFret)
      .sort((a, b) => Math.abs(a.fret - anchor) - Math.abs(b.fret - anchor))[0];
    if (!jump) throw new Error(`Keine spielbare Oktave für ${degrees.join(' ')}`);
    anchor = Math.max(minFret, jump.fret - 1);
    notes.push({
      ...jump,
      degree: degrees[index],
      name: spellDegree(baseRoot, degrees[index]),
      duration: 'q',
      role: index === 0 ? undefined : 'Lagenwechsel',
    });
  }
  return notes;
}

/** A voicing family names a pitch supply, so its fingering comes from that, not from the symbol. */
export const buildChordRoute = (chord: ChordDefinition): FingeringNote[] =>
  chordRoute(
    chord.voicingFamily && chord.practiceSet ? [...chord.practiceSet] : [...chord.formula],
  );

/** Falls back to a position-shifting line when a transformation outgrows one hand position. */
export function practiceRoute(degrees: Degree[], options: ChordRouteOptions = {}): FingeringNote[] {
  try {
    return chordRoute(degrees, { ...options, addOctave: false });
  } catch {
    return walkRoute(degrees, options);
  }
}

export { strings };
