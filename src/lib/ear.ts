import { chordById } from '../data/chords';
import type { ChordDefinition } from './chord-types';
import {
  degreeSemitones,
  intervalNames,
  mod,
  noteName,
  pitchClass,
  readableRoot,
  spellDegree,
} from './music';

export type EarMode = 'intervals' | 'chords';

export interface EarLevel {
  id: string;
  name: string;
  hint: string;
  /** Semitones for interval levels, chord ids for chord levels. */
  answers: number[] | string[];
}

/**
 * Levels build on each other: every level contains the previous one, so moving up
 * adds sounds to tell apart rather than replacing the ones already learned.
 */
export const intervalLevels: EarLevel[] = [
  {
    id: 'basics',
    name: 'Grundlagen',
    hint: 'Terzen, Quarte, Quinte, Oktave – die Intervalle, aus denen Basslinien bestehen.',
    answers: [3, 4, 5, 7, 12],
  },
  {
    id: 'diatonic',
    name: 'Alle diatonischen',
    hint: 'Dazu Sekunden, Sexten und Septimen.',
    answers: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 'all',
    name: 'Mit Tritonus',
    hint: 'Alle zwölf Intervalle innerhalb der Oktave.',
    answers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
];

export const chordLevels: EarLevel[] = [
  {
    id: 'triads',
    name: 'Dreiklänge',
    hint: 'Dur, Moll, vermindert, übermäßig.',
    answers: ['major', 'minor', 'diminished', 'augmented'],
  },
  {
    id: 'sevenths',
    name: 'Septakkorde',
    hint: 'Dazu die fünf Septakkorde, die fast jede Tonart trägt.',
    answers: [
      'major',
      'minor',
      'diminished',
      'augmented',
      'major-7',
      'dominant-7',
      'minor-7',
      'minor-7b5',
      'diminished-7',
    ],
  },
  {
    id: 'jazz',
    name: 'Jazz-Farben',
    hint: 'Dazu Sexten, None-Akkorde und eine alterierte Dominante.',
    answers: [
      'major-7',
      'dominant-7',
      'minor-7',
      'minor-7b5',
      'diminished-7',
      'six',
      'minor-6',
      'major-9',
      'dominant-9',
      'minor-9',
      'dominant-7b9',
      'dominant-7-sharp5',
      'sus4',
    ],
  },
];

export interface EarQuestion {
  mode: EarMode;
  /** Lowest sounding note of the question. */
  root: number;
  /** The correct answer: a semitone count, or a chord id. */
  answer: string;
  /** MIDI notes, ascending. */
  midis: number[];
  /** Spelled note names for the reveal. */
  notes: string[];
}

/**
 * Roots stay low enough that even a thirteenth chord — twenty-one semitones from the
 * bottom note — still fits on the C3–C6 keyboard the answer is revealed on.
 */
const lowest = 55;
const highest = 60;
export const earRange = { first: 48, last: 84 };

/**
 * The degree each interval is written as, so a major third above D reads F♯ and not
 * G♭. Spelling by pitch class alone would contradict the name of the interval.
 */
const intervalDegrees = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7', '8'];

export function intervalLabel(semitones: number): string {
  return semitones === 12 ? 'Oktave' : intervalNames[semitones];
}

export function chordLabel(id: string): string {
  return chordById(id)?.nameDe ?? id;
}

export function answerLabel(mode: EarMode, answer: string): string {
  return mode === 'intervals' ? intervalLabel(Number(answer)) : chordLabel(answer);
}

export function answerSymbol(mode: EarMode, answer: string): string {
  return mode === 'intervals' ? `${answer} HT` : (chordById(answer)?.symbol ?? '');
}

/**
 * Builds a question. `avoid` is the previous answer, so the same sound is never asked
 * twice in a row — a repeat is guessable without listening.
 */
export function nextQuestion(mode: EarMode, level: EarLevel, avoid?: string): EarQuestion {
  const pool = (level.answers as (number | string)[]).map(String);
  const choices = pool.length > 1 && avoid ? pool.filter((item) => item !== avoid) : pool;
  const answer = choices[Math.floor(Math.random() * choices.length)];
  const root = lowest + Math.floor(Math.random() * (highest - lowest + 1));
  const plain = noteName(mod(root), true);

  if (mode === 'intervals') {
    const semitones = Number(answer);
    const degree = intervalDegrees[semitones];
    const rootName = readableRoot(plain, [degree]);
    return {
      mode,
      root,
      answer,
      midis: [root, root + semitones],
      notes: [rootName, spellDegree(rootName, degree)],
    };
  }

  const chord = chordById(answer) as ChordDefinition;
  const rootName = readableRoot(plain, [...chord.formula]);
  let previous = -1;
  const midis = chord.formula.map((degree) => {
    let midi = root + mod(degreeSemitones(degree));
    while (midi <= previous) midi += 12;
    previous = midi;
    return midi;
  });
  return {
    mode,
    root,
    answer,
    midis,
    notes: chord.formula.map((degree) => spellDegree(rootName, degree)),
  };
}

/** Pitch classes of the question, for lighting up the keyboard and the fretboard. */
export const questionPitches = (question: EarQuestion) =>
  [...new Set(question.notes.map(pitchClass))].sort((a, b) => a - b);
