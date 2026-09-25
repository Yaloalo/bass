import type { ChordDefinition } from './chord-types';
import type { InstrumentProfile } from './instrument';
import { degreeSemitones, spellDegree } from './music';

export interface FretboardGuideEntry {
  interval: number;
  degree: string;
  note: string;
}

export interface FretboardGuideTarget {
  positionId: string;
  color: string;
  label: string;
}

export interface FretboardGuidePathPoint extends FretboardGuidePosition {
  positionId: string;
  label: string;
}

export interface FretboardGuidePath {
  id: string;
  color: string;
  label: string;
  points: FretboardGuidePathPoint[];
}

export interface FretboardGuidePosition {
  fret: number;
  stringLabel: string;
}

/** Keep the catalogue's musical order and complete ordinary chords at the octave. */
export function chordGuideEntries(root: string, chord: ChordDefinition): FretboardGuideEntry[] {
  const entries: FretboardGuideEntry[] = chord.formula.map((degree) => ({
    interval: degreeSemitones(degree),
    degree,
    note: spellDegree(root, degree),
  }));
  if ((entries.at(-1)?.interval ?? 0) < 12) entries.push({ interval: 12, degree: '8', note: root });
  return entries;
}

/** Find the physically closest position for one exact ascending chord tone. */
export function nextFretboardGuideTarget(
  profile: InstrumentProfile,
  range: [number, number],
  rootMidi: number,
  entry: FretboardGuideEntry,
  previous: FretboardGuidePosition,
  color: string,
  label: string,
): FretboardGuideTarget | null {
  const targetMidi = rootMidi + entry.interval;
  const previousString = profile.stringsHighToLow.findIndex(
    (string) => string.spokenLabel === previous.stringLabel,
  );
  const candidates = profile.stringsHighToLow.flatMap((string, stringIndex) => {
    const fret = targetMidi - string.midi;
    if (!Number.isInteger(fret) || fret < range[0] || fret > range[1]) return [];
    return [
      {
        positionId: `${string.exerciseString ?? string.id}:${fret}`,
        score: Math.abs(fret - previous.fret) + Math.abs(stringIndex - previousString) * 3,
      },
    ];
  });
  const target = candidates.sort((a, b) => a.score - b.score)[0];
  return target ? { positionId: target.positionId, color, label } : null;
}

/** Build one complete ascending, physically connected route after a root was chosen. */
export function fretboardGuidePath(
  id: string,
  pathLabel: string,
  profile: InstrumentProfile,
  range: [number, number],
  rootMidi: number,
  entries: readonly FretboardGuideEntry[],
  start: FretboardGuidePathPoint,
  color: string,
  noteLabel: (note: string) => string,
): FretboardGuidePath {
  const points = [start];
  let previous: FretboardGuidePosition = start;
  for (const entry of entries.slice(1)) {
    const label = `${noteLabel(entry.note)} · Stufe ${entry.degree}`;
    const target = nextFretboardGuideTarget(
      profile,
      range,
      rootMidi,
      entry,
      previous,
      color,
      label,
    );
    if (!target) break;
    const string = profile.stringsHighToLow.find(
      (candidate) =>
        `${candidate.exerciseString ?? candidate.id}:` === target.positionId.split(/\d+$/)[0],
    );
    const fret = Number(target.positionId.split(':').at(-1));
    if (!string || !Number.isFinite(fret)) break;
    const point = {
      positionId: target.positionId,
      stringLabel: string.spokenLabel,
      fret,
      label,
    };
    points.push(point);
    previous = point;
  }
  return { id, color, label: pathLabel, points };
}
