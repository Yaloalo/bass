import { scales } from '../data/catalog';
import { chordById, chords } from '../data/chords';
import type { ChordDefinition } from './chord-types';
import { mod, noteName, pitchClass, readableRoot, roots, spellDegree } from './music';

export type MemoryTopic = 'scales' | 'chords';
export type RootScope = 'current' | 'selection';
export type ScaleScope = 'current' | 'core' | 'all';
export type ChordLevel = 'basic' | 'triads' | 'sevenths' | 'all';

export interface MemoryQuestion {
  key: string;
  topic: MemoryTopic;
  root: string;
  itemId: string;
  degrees: readonly string[];
  notes: string[];
  pitchClasses: number[];
  chord?: ChordDefinition;
}

const basicChordIds = ['major', 'minor'];
const triadChordIds = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'];
const seventhChordIds = [
  ...triadChordIds,
  'major-7',
  'minor-7',
  'dominant-7',
  'minor-7b5',
  'diminished-7',
];
const coreScaleIds = ['major', 'natural-minor', 'major-pentatonic', 'minor-pentatonic', 'blues'];

export function memoryChordPool(level: ChordLevel): ChordDefinition[] {
  const ids =
    level === 'basic' ? basicChordIds : level === 'triads' ? triadChordIds : seventhChordIds;
  if (level !== 'all') return ids.flatMap((id) => (chordById(id) ? [chordById(id)!] : []));
  return chords.filter((chord) => !chord.voicingFamily);
}

export function memoryScalePool(globalScaleId: string, scope: ScaleScope) {
  if (scope === 'current') {
    const selected = scales.find((scale) => scale.id === globalScaleId);
    return [selected ?? scales[0]];
  }
  if (scope === 'core') return scales.filter((scale) => coreScaleIds.includes(scale.id));
  return scales;
}

export function scaleMemoryQuestion(root: string, scaleId: string): MemoryQuestion {
  const scale = scales.find((item) => item.id === scaleId) ?? scales[0];
  const spelledRoot = readableRoot(root, scale.degreeLabels);
  const notes = scale.degreeLabels.map((degree) => spellDegree(spelledRoot, degree));
  return {
    key: `scale:${spelledRoot}:${scale.id}`,
    topic: 'scales',
    root: spelledRoot,
    itemId: scale.id,
    degrees: scale.degreeLabels,
    notes,
    pitchClasses: [...new Set(notes.map(pitchClass))].sort((a, b) => a - b),
  };
}

export function chordMemoryQuestion(root: string, chordId: string): MemoryQuestion {
  const chord = chordById(chordId) ?? chordById('major')!;
  const spelledRoot = readableRoot(root, [...chord.formula]);
  const notes = chord.formula.map((degree) => spellDegree(spelledRoot, degree));
  return {
    key: `chord:${spelledRoot}:${chord.id}`,
    topic: 'chords',
    root: spelledRoot,
    itemId: chord.id,
    degrees: chord.formula,
    notes,
    pitchClasses: [...new Set(notes.map(pitchClass))].sort((a, b) => a - b),
    chord,
  };
}

const pick = <T>(values: readonly T[], random: () => number): T =>
  values[Math.min(values.length - 1, Math.floor(random() * values.length))];

export function nextMemoryQuestion(
  options: {
    topic: MemoryTopic;
    globalRoot: string;
    rootScope: RootScope;
    rootSelection: readonly string[];
    scaleSelection: readonly string[];
    chordSelection: readonly string[];
  },
  previousKey = '',
  random: () => number = Math.random,
): MemoryQuestion {
  const selectedRoots = options.rootSelection.filter((root) => roots.includes(root));
  const rootPool =
    options.rootScope === 'current'
      ? [options.globalRoot]
      : selectedRoots.length
        ? selectedRoots
        : [options.globalRoot];
  const itemPool =
    options.topic === 'scales'
      ? scales.filter((scale) => options.scaleSelection.includes(scale.id))
      : memoryChordPool('all').filter((chord) => options.chordSelection.includes(chord.id));
  const safeItemPool = itemPool.length
    ? itemPool
    : options.topic === 'scales'
      ? [scales[0]]
      : [memoryChordPool('basic')[0]];
  const candidates = rootPool.flatMap((root) =>
    safeItemPool.map((item) =>
      options.topic === 'scales'
        ? scaleMemoryQuestion(root, item.id)
        : chordMemoryQuestion(root, item.id),
    ),
  );
  const alternatives = candidates.filter((question) => question.key !== previousKey);
  return pick(alternatives.length ? alternatives : candidates, random);
}

/** One chromatic set, but the expected tones keep their functional spelling (E♯, C♭ …). */
export function memoryNoteChoices(question: MemoryQuestion): string[] {
  const preferFlats =
    question.root.includes('b') || question.notes.some((note) => note.includes('b'));
  return Array.from(
    { length: 12 },
    (_, value) =>
      question.notes.find((note) => pitchClass(note) === value) ?? noteName(value, preferFlats),
  );
}

export function memoryAnswer(
  question: MemoryQuestion,
  selected: ReadonlySet<number> | readonly number[],
) {
  const chosen = new Set(Array.isArray(selected) ? selected.map((value) => mod(value)) : selected);
  const wanted = new Set(question.pitchClasses);
  const wrong = [...chosen].filter((value) => !wanted.has(value)).sort((a, b) => a - b);
  const missing = [...wanted].filter((value) => !chosen.has(value)).sort((a, b) => a - b);
  return { correct: wrong.length === 0 && missing.length === 0, wrong, missing };
}
