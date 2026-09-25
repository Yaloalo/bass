import { chordById } from '../data/chords';
import { germanNoteName } from './i18n';
import { harmonyNotes } from './harmony-play';
import type { HarmonyStep } from './harmony-play';

export type ImprovisationMode =
  'free' | 'root' | 'root-fifth' | 'chord-tones' | 'guide-tones' | 'target' | 'rhythm' | 'motif';
export type TargetTone = 'root' | 'third' | 'fifth' | 'seventh' | 'random';
export type RhythmRule = 'with-kick' | 'between-kick' | 'copy-kick' | 'copy-snare' | 'subdivision';
export type PhrasingRule = 'free' | '1-1' | '2-2' | '4-4' | 'call-response';
export type DropoutDisplay = 'audio' | 'audio-names' | 'position-only';

export interface VisualAids {
  currentChord: boolean;
  chordTones: boolean;
  intervals: boolean;
  nextChord: boolean;
  targetTone: boolean;
  progression: boolean;
  position: boolean;
}

export interface ImprovisationTrainer {
  mode: ImprovisationMode;
  targetTone: TargetTone;
  rhythmRule: RhythmRule;
  subdivision: 'quarters' | 'eighths' | 'sixteenths';
  phrasing: PhrasingRule;
  dropout: {
    enabled: boolean;
    audibleCycles: number;
    silentCycles: number;
    display: DropoutDisplay;
  };
  aids: VisualAids;
}

export const defaultImprovisationTrainer: ImprovisationTrainer = {
  mode: 'free',
  targetTone: 'third',
  rhythmRule: 'with-kick',
  subdivision: 'eighths',
  phrasing: 'free',
  dropout: { enabled: false, audibleCycles: 2, silentCycles: 2, display: 'audio' },
  aids: {
    currentChord: true,
    chordTones: true,
    intervals: true,
    nextChord: true,
    targetTone: true,
    progression: true,
    position: true,
  },
};

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
const smallInteger = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.min(8, Math.round(value)))
    : fallback;

export function normalizeImprovisationTrainer(value: unknown): ImprovisationTrainer {
  const data = object(value);
  const dropout = object(data.dropout);
  const aids = object(data.aids);
  return {
    mode: oneOf(
      data.mode,
      ['free', 'root', 'root-fifth', 'chord-tones', 'guide-tones', 'target', 'rhythm', 'motif'],
      'free',
    ),
    targetTone: oneOf(data.targetTone, ['root', 'third', 'fifth', 'seventh', 'random'], 'third'),
    rhythmRule: oneOf(
      data.rhythmRule,
      ['with-kick', 'between-kick', 'copy-kick', 'copy-snare', 'subdivision'],
      'with-kick',
    ),
    subdivision: oneOf(data.subdivision, ['quarters', 'eighths', 'sixteenths'], 'eighths'),
    phrasing: oneOf(data.phrasing, ['free', '1-1', '2-2', '4-4', 'call-response'], 'free'),
    dropout: {
      enabled: dropout.enabled === true,
      audibleCycles: smallInteger(dropout.audibleCycles, 2),
      silentCycles: smallInteger(dropout.silentCycles, 2),
      display: oneOf(dropout.display, ['audio', 'audio-names', 'position-only'], 'audio'),
    },
    aids: Object.fromEntries(
      Object.entries(defaultImprovisationTrainer.aids).map(([key, fallback]) => [
        key,
        typeof aids[key] === 'boolean' ? aids[key] : fallback,
      ]),
    ) as unknown as VisualAids,
  };
}

export function dropoutActive(trainer: ImprovisationTrainer, formCycle: number): boolean {
  if (!trainer.dropout.enabled) return false;
  const length = trainer.dropout.audibleCycles + trainer.dropout.silentCycles;
  return (Math.max(1, formCycle) - 1) % length >= trainer.dropout.audibleCycles;
}

export function phrasingState(
  trainer: ImprovisationTrainer,
  absoluteBar: number,
): 'play' | 'listen' {
  if (trainer.phrasing === 'free') return 'play';
  const size = trainer.phrasing === '1-1' ? 1 : trainer.phrasing === '2-2' ? 2 : 4;
  return Math.floor(Math.max(0, absoluteBar) / size) % 2 === 0 ? 'play' : 'listen';
}

const wantedDegree = (formula: readonly string[], target: Exclude<TargetTone, 'random'>) => {
  const starts =
    target === 'root'
      ? ['1']
      : target === 'third'
        ? ['3', 'b3', '#3']
        : target === 'fifth'
          ? ['5', 'b5', '#5']
          : ['7', 'b7', 'bb7'];
  return formula.findIndex((degree) => starts.includes(degree));
};

export function targetForChord(
  step: HarmonyStep | undefined,
  target: TargetTone,
  seed = 0,
): { note: string; interval: string } | undefined {
  if (!step) return undefined;
  const chord = chordById(step.chordId);
  const notes = harmonyNotes(step);
  if (!chord || !notes.length) return undefined;
  const index =
    target === 'random' ? Math.abs(seed) % notes.length : wantedDegree(chord.formula, target);
  if (index < 0) return undefined;
  return { note: germanNoteName(notes[index]), interval: chord.formula[index] ?? '1' };
}

export function relevantToneIndices(
  step: HarmonyStep | undefined,
  mode: ImprovisationMode,
): number[] {
  const chord = step ? chordById(step.chordId) : undefined;
  if (!chord) return [];
  if (mode === 'root') return [0];
  if (mode === 'root-fifth')
    return chord.formula.flatMap((degree, index) =>
      degree === '1' || degree === '5' ? [index] : [],
    );
  if (mode === 'guide-tones')
    return chord.formula.flatMap((degree, index) =>
      ['3', 'b3', '7', 'b7', 'bb7'].includes(degree) ? [index] : [],
    );
  return chord.formula.map((_, index) => index);
}

export const modeInstruction = (
  trainer: ImprovisationTrainer,
  instrumentNotes = 'Bassnoten',
): string => {
  if (trainer.mode === 'rhythm')
    return {
      'with-kick': `Spiele ${instrumentNotes} nur gemeinsam mit den Kick-Hits.`,
      'between-kick': 'Spiele nur in den Lücken zwischen den Kick-Hits.',
      'copy-kick': 'Übernimm den Kick-Rhythmus; die Tonhöhe wählst du selbst.',
      'copy-snare': 'Übernimm den Snare-Rhythmus; die Tonhöhe wählst du selbst.',
      subdivision: `Spiele ausschließlich auf ${
        trainer.subdivision === 'quarters'
          ? 'Vierteln'
          : trainer.subdivision === 'eighths'
            ? 'Achteln'
            : 'Sechzehnteln'
      }.`,
    }[trainer.rhythmRule];
  return {
    free: 'Spiele frei und höre auf Form, Groove und Pausen.',
    root: 'Verwende ausschließlich den Grundton des aktuellen Akkords.',
    'root-fifth': 'Baue deine Linie nur aus Grundton und Quinte.',
    'chord-tones': 'Verwende nur die eingeblendeten Akkordtöne.',
    'guide-tones': 'Verbinde Terzen und Septimen möglichst mit kleinen Bewegungen.',
    target: 'Führe deine Phrase gezielt in den angezeigten Ton des nächsten Akkords.',
    rhythm: '',
    motif: 'Erfinde ein kurzes Motiv und entwickle es über die Akkordwechsel weiter.',
  }[trainer.mode];
};
