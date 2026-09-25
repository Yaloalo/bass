import { chordById, chords } from '../data/chords';
import { degreeSemitones, mod, noteName, pitchClass, readableRoot, spellDegree } from './music';
import { PPQ, barTicks } from './rhythm';
import type { MeterId } from './rhythm';

/** Roots are stored international, shown German. Ticks are authoritative; bars remain for legacy data. */
export interface HarmonyStep {
  root: string;
  chordId: string;
  bars: number;
  durationTicks?: number;
}

export type HarmonyStyle = 'pad' | 'stabs' | 'offbeats';
export type HarmonyTimbre = 'warm' | 'bright';

export interface Harmony {
  enabled: boolean;
  style: HarmonyStyle;
  timbre: HarmonyTimbre;
  /** 0…1, independent of the drum mix. */
  volume: number;
  steps: HarmonyStep[];
}

export const emptyHarmony: Harmony = {
  enabled: false,
  style: 'pad',
  timbre: 'warm',
  volume: 0.45,
  steps: [],
};

/**
 * Progressions are stored as semitones above the key, so the global Grundton
 * transposes them instead of every preset having to exist in twelve versions.
 */
interface ProgressionStep {
  semitones: number;
  chordId: string;
  bars: number;
}

export interface Progression {
  id: string;
  name: string;
  hint: string;
  category: 'Jazz' | 'Funk' | 'R&B' | 'Weitere';
  steps: ProgressionStep[];
}

const step = (semitones: number, chordId: string, bars = 1): ProgressionStep => ({
  semitones,
  chordId,
  bars,
});

export const progressions: Progression[] = [
  {
    id: 'ii-v-i',
    name: 'II–V–I in Dur',
    hint: 'Die häufigste Kadenz im Jazz. Ziel: die Terz und die Septime sauber verbinden.',
    category: 'Jazz',
    steps: [step(2, 'minor-7'), step(7, 'dominant-7'), step(0, 'major-7', 2)],
  },
  {
    id: 'ii-v-i-minor',
    name: 'II–V–i in Moll',
    hint: 'Halbvermindert, alterierte Dominante, Moll mit großer Septime.',
    category: 'Jazz',
    steps: [step(2, 'minor-7b5'), step(7, 'dominant-7b9'), step(0, 'minor-major-7', 2)],
  },
  {
    id: 'blues',
    name: 'Blues über 12 Takte',
    hint: 'Alle drei Stufen als Dominantseptakkorde. Die Standardform zum Üben.',
    category: 'Weitere',
    steps: [
      step(0, 'dominant-7'),
      step(5, 'dominant-7'),
      step(0, 'dominant-7', 2),
      step(5, 'dominant-7', 2),
      step(0, 'dominant-7', 2),
      step(7, 'dominant-7'),
      step(5, 'dominant-7'),
      step(0, 'dominant-7'),
      step(7, 'dominant-7'),
    ],
  },
  {
    id: 'jazz-blues',
    name: 'Jazz-Blues',
    hint: 'Blues mit II–V-Einschüben. Mehr Wechsel, weniger Platz zum Ausruhen.',
    category: 'Jazz',
    steps: [
      step(0, 'dominant-7'),
      step(5, 'dominant-7'),
      step(0, 'dominant-7'),
      step(7, 'minor-7'),
      step(5, 'dominant-7', 2),
      step(0, 'dominant-7'),
      step(9, 'dominant-7b9'),
      step(2, 'minor-7'),
      step(7, 'dominant-7'),
      step(0, 'dominant-7'),
      step(7, 'dominant-7'),
    ],
  },
  {
    id: 'pop',
    name: 'I–V–vi–IV',
    hint: 'Die Pop-Kadenz. Gut, um Achtel und Oktavsprünge im Tempo zu halten.',
    category: 'Weitere',
    steps: [step(0, 'major'), step(7, 'major'), step(9, 'minor'), step(5, 'major')],
  },
  {
    id: 'turnaround',
    name: 'I–vi–ii–V',
    hint: 'Die klassische Rückführung. Je ein Takt, dann von vorn.',
    category: 'Jazz',
    steps: [step(0, 'major-7'), step(9, 'minor-7'), step(2, 'minor-7'), step(7, 'dominant-7')],
  },
  {
    id: 'dorian-vamp',
    name: 'Dorischer Vamp',
    hint: 'Zwei Akkorde, viel Platz. Zum Improvisieren über eine Tonart.',
    category: 'Funk',
    steps: [step(0, 'minor-7', 2), step(5, 'dominant-7', 2)],
  },
  {
    id: 'modal-minor',
    name: 'Moll-Vamp mit Sexte',
    hint: 'Ein Akkord über vier Takte – hör auf den Unterschied zwischen 6 und ♭7.',
    category: 'Funk',
    steps: [step(0, 'minor-6', 2), step(0, 'minor-7', 2)],
  },
  {
    id: 'jazz-ii-v-colour',
    name: 'II–V–I mit Nonen',
    hint: 'Die vertraute Kadenz mit mehr Farbe: m9, 13 und maj9.',
    category: 'Jazz',
    steps: [step(2, 'minor-9'), step(7, 'dominant-13'), step(0, 'major-9', 2)],
  },
  {
    id: 'minor-turnaround',
    name: 'Moll-Turnaround',
    hint: 'i–♭VI–iiø–V: Zielnoten durch eine Mollkadenz verbinden.',
    category: 'Jazz',
    steps: [step(0, 'minor-7'), step(8, 'major-7'), step(2, 'minor-7b5'), step(7, 'dominant-7b9')],
  },
  {
    id: 'tritone-sub',
    name: 'II–♭II–I',
    hint: 'Tritonusersatz der Dominante: der Bass bewegt sich chromatisch zum Ziel.',
    category: 'Jazz',
    steps: [step(2, 'minor-7'), step(1, 'dominant-7-sharp11'), step(0, 'major-7', 2)],
  },
  {
    id: 'backdoor',
    name: 'Backdoor-Kadenz',
    hint: 'ivm7–♭VII7–Imaj7 statt des direkten V–I.',
    category: 'Jazz',
    steps: [step(5, 'minor-7'), step(10, 'dominant-7'), step(0, 'major-7', 2)],
  },
  {
    id: 'rhythm-changes-a',
    name: 'Rhythm Changes · A',
    hint: 'I–VI7–ii–V: vier Takte, die sich immer wieder neu phrasieren lassen.',
    category: 'Jazz',
    steps: [step(0, 'major-7'), step(9, 'dominant-7'), step(2, 'minor-7'), step(7, 'dominant-7')],
  },
  {
    id: 'funk-dominant',
    name: 'Dominant-Vamp',
    hint: 'Ein 9er-Akkord mit 13er-Farbe. Halte einen starken Pocket ohne viele Wechsel.',
    category: 'Funk',
    steps: [step(0, 'dominant-9', 2), step(0, 'dominant-13', 2)],
  },
  {
    id: 'funk-flat-seven',
    name: 'Funk · ♭VII–IV',
    hint: 'I9–♭VII9–IV9–I9: kurze Antworten und viel Raum für Synkopen.',
    category: 'Funk',
    steps: [
      step(0, 'dominant-9'),
      step(10, 'dominant-9'),
      step(5, 'dominant-9'),
      step(0, 'dominant-9'),
    ],
  },
  {
    id: 'funk-minor-pocket',
    name: 'Moll-Pocket',
    hint: 'Moll-Septakkord, ♭VII und IV9. Gut für Ghost Notes und Offbeats.',
    category: 'Funk',
    steps: [step(0, 'minor-7', 2), step(10, 'dominant-9'), step(5, 'dominant-9')],
  },
  {
    id: 'funk-suspension',
    name: 'Sus → Dominante',
    hint: 'Der Vorhalt löst sich auf demselben Grundton: kleine Änderung, große Wirkung.',
    category: 'Funk',
    steps: [step(0, 'dominant-7sus4', 2), step(0, 'dominant-7', 2)],
  },
  {
    id: 'rnb-six-four-one-five',
    name: 'vi–IV–I–V mit Farben',
    hint: 'Ein warmer R&B-Zyklus mit Nonen und Dominant-13.',
    category: 'R&B',
    steps: [step(9, 'minor-9'), step(5, 'major-9'), step(0, 'major-9'), step(7, 'dominant-13')],
  },
  {
    id: 'rnb-borrowed-four',
    name: 'I–iii–IV–iv',
    hint: 'Die Mollsubdominante bringt den weichen Rückweg zum Anfang.',
    category: 'R&B',
    steps: [step(0, 'major-9'), step(4, 'minor-7'), step(5, 'major-9'), step(5, 'minor-6')],
  },
  {
    id: 'rnb-minor',
    name: 'Moll · i–♭VI–♭III–♭VII',
    hint: 'Vier weite Bassgrundtöne unter einer dichten Moll-Harmonie.',
    category: 'R&B',
    steps: [step(0, 'minor-9'), step(8, 'major-9'), step(3, 'major-9'), step(10, 'dominant-13')],
  },
  {
    id: 'neo-soul-backdoor',
    name: 'Neo-Soul · Rückweg',
    hint: 'Imaj9–♭VII13–IVmaj9–ivm9: ein chromatischer, weicher Schluss.',
    category: 'R&B',
    steps: [step(0, 'major-9'), step(10, 'dominant-13'), step(5, 'major-9'), step(5, 'minor-9')],
  },
  {
    id: 'rnb-descending',
    name: 'R&B · fallende Stufen',
    hint: 'IVmaj9–iii7–ii9–V13: eine absteigende Linie zur Dominante.',
    category: 'R&B',
    steps: [step(5, 'major-9'), step(4, 'minor-7'), step(2, 'minor-9'), step(7, 'dominant-13')],
  },
  {
    id: 'rnb-ballad',
    name: 'Ballade · I–IV',
    hint: 'Zwei lange Maj9-Akkorde. Lass den Bass singen, statt jede Lücke zu füllen.',
    category: 'R&B',
    steps: [step(0, 'major-9', 2), step(5, 'major-9', 2)],
  },
];

/** Materialises a preset in the given key, spelling each root from its own chord. */
export function buildProgression(
  progression: Progression,
  key: string,
  meter: MeterId = '4/4',
): HarmonyStep[] {
  return progression.steps.map((item) => {
    const chord = chordById(item.chordId);
    const plain = noteName(mod(pitchClass(key) + item.semitones), true);
    return {
      root: chord ? readableRoot(plain, [...chord.formula]) : plain,
      chordId: item.chordId,
      bars: item.bars,
      durationTicks: item.bars * barTicks(meter),
    };
  });
}

export const harmonyStepTicks = (step: HarmonyStep, meter: MeterId = '4/4') =>
  Math.max(PPQ / 2, step.durationTicks ?? step.bars * barTicks(meter));

export const harmonyTicks = (steps: readonly HarmonyStep[], meter: MeterId = '4/4') =>
  steps.reduce((sum, item) => sum + harmonyStepTicks(item, meter), 0);

/** Which chord sounds at an absolute musical tick, independent of tempo and drum-loop length. */
export function harmonyAtTick(steps: readonly HarmonyStep[], tick: number, meter: MeterId = '4/4') {
  const totalTicks = harmonyTicks(steps, meter);
  if (!totalTicks) return undefined;
  const cycle = Math.floor(Math.max(0, tick) / totalTicks);
  const formTick = mod(tick, totalTicks);
  let position = formTick;
  for (let index = 0; index < steps.length; index++) {
    const durationTicks = harmonyStepTicks(steps[index], meter);
    if (position < durationTicks)
      return {
        index,
        step: steps[index],
        first: position === 0,
        localTick: position,
        durationTicks,
        remainingTicks: durationTicks - position,
        totalTicks,
        formTick,
        cycle,
      };
    position -= durationTicks;
  }
  return undefined;
}

/** Which chord sounds in a given bar, and whether that bar is where it starts. */
export function harmonyAt(steps: readonly HarmonyStep[], bar: number, meter: MeterId = '4/4') {
  const at = harmonyAtTick(steps, bar * barTicks(meter), meter);
  return at ? { ...at, localBar: Math.floor(at.localTick / barTicks(meter)) } : undefined;
}

export const harmonyBars = (steps: readonly HarmonyStep[], meter: MeterId = '4/4') =>
  harmonyTicks(steps, meter) / barTicks(meter);

export interface HarmonyTimelineSegment {
  index: number;
  step: HarmonyStep;
  /** Position and width inside this bar, from 0 to 1. */
  start: number;
  width: number;
  startsHere: boolean;
}

/** Splits a tick-based form into visual bars without losing changes inside a bar. */
export function harmonyTimeline(steps: readonly HarmonyStep[], meter: MeterId = '4/4') {
  const bar = barTicks(meter);
  const total = harmonyTicks(steps, meter);
  const starts: number[] = [];
  steps.reduce((tick, item) => {
    starts.push(tick);
    return tick + harmonyStepTicks(item, meter);
  }, 0);
  return Array.from({ length: Math.ceil(total / bar) }, (_, barIndex) => {
    const from = barIndex * bar;
    const to = Math.min(total, from + bar);
    const segments = steps.flatMap((step, index) => {
      const chordFrom = starts[index];
      const chordTo = chordFrom + harmonyStepTicks(step, meter);
      const overlapFrom = Math.max(from, chordFrom);
      const overlapTo = Math.min(to, chordTo);
      return overlapTo > overlapFrom
        ? [
            {
              index,
              step,
              start: (overlapFrom - from) / bar,
              width: (overlapTo - overlapFrom) / bar,
              startsHere: chordFrom >= from && chordFrom < to,
            },
          ]
        : [];
    });
    return { number: barIndex + 1, segments };
  });
}

export function harmonyDurationLabel(step: HarmonyStep, meter: MeterId = '4/4'): string {
  const ticks = harmonyStepTicks(step, meter);
  const bar = barTicks(meter);
  if (ticks % bar === 0) {
    const bars = ticks / bar;
    return `${bars} ${bars === 1 ? 'Takt' : 'Takte'}`;
  }
  if (ticks === PPQ * 2) return '1/2 Note';
  if (ticks === PPQ) return '1/4 Note';
  if (ticks === PPQ / 2) return '1/8 Note';
  return `${Math.round((ticks / bar) * 100) / 100} Takte`;
}

/** Keep bar-based chords attached to bars when the meter changes; note values stay absolute. */
export function retimeHarmonyForMeter(
  steps: readonly HarmonyStep[],
  from: MeterId,
  to: MeterId,
): HarmonyStep[] {
  const oldBar = barTicks(from);
  const nextBar = barTicks(to);
  return steps.map((step) => {
    const ticks = harmonyStepTicks(step, from);
    const durationTicks = ticks % oldBar === 0 ? (ticks / oldBar) * nextBar : ticks;
    return { ...step, durationTicks, bars: durationTicks / nextBar };
  });
}

/** Move a working progression without overwriting its chord choices or durations. */
export function transposeHarmony(steps: readonly HarmonyStep[], semitones: number): HarmonyStep[] {
  return steps.map((item) => {
    const chord = chordById(item.chordId);
    const root = noteName(mod(pitchClass(item.root) + semitones), true);
    return { ...item, root: chord ? readableRoot(root, [...chord.formula]) : root };
  });
}

/** Close-position inversions above the bass register, with optional voice leading. */
export function harmonyVoicing(
  step: HarmonyStep,
  lowest = 60,
  previous: readonly number[] = [],
): number[] {
  const chord = chordById(step.chordId);
  if (!chord) return [];
  // A bass player supplies the fifth where it is optional; keep the colour tones.
  const degrees =
    chord.formula.length > 4
      ? chord.formula.filter((degree) => !chord.omissible.includes(degree))
      : chord.formula;
  const pcs = [
    ...new Set(degrees.map((degree) => mod(pitchClass(step.root) + degreeSemitones(degree)))),
  ];
  if (!pcs.length) return [];
  const candidates = Array.from({ length: 12 }, (_, offset) => {
    const first = lowest + offset;
    return pcs.map((pc) => first + mod(pc - first)).sort((a, b) => a - b);
  }).filter((notes) => notes[notes.length - 1] <= Math.min(96, lowest + 23));
  const score = (notes: number[]) => {
    const centre = notes.reduce((sum, note) => sum + note, 0) / notes.length;
    // In a new phrase prefer the middle octave, not an unnecessarily high inversion.
    if (!previous.length) return Math.abs(centre - (lowest + 8));
    const motion = notes.reduce(
      (sum, note, i) =>
        sum +
        (previous.length === notes.length
          ? Math.abs(note - previous[i])
          : Math.min(...previous.map((old) => Math.abs(note - old)))),
      0,
    );
    return motion + Math.abs(centre - (lowest + 8)) * 0.05;
  };
  return candidates.sort((a, b) => score(a) - score(b))[0] ?? [];
}

/** Recompute each phrase from the same starting point so the loop is deterministic. */
export function harmonyVoicings(steps: readonly HarmonyStep[]): number[][] {
  let previous: number[] = [];
  return steps.map((step) => (previous = harmonyVoicing(step, 60, previous)));
}

/** The chord's spelled notes, for the display and the fretboard. */
export function harmonyNotes(step: HarmonyStep): string[] {
  const chord = chordById(step.chordId);
  return chord ? chord.formula.map((degree) => spellDegree(step.root, degree)) : [];
}

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

export function normalizeHarmony(value: unknown): Harmony {
  const data = (typeof value === 'object' && value ? value : {}) as Record<string, unknown>;
  const steps = Array.isArray(data.steps)
    ? data.steps.slice(0, 32).flatMap((item) => {
        const entry = (typeof item === 'object' && item ? item : {}) as Record<string, unknown>;
        const chord = typeof entry.chordId === 'string' ? chordById(entry.chordId) : undefined;
        if (!chord || typeof entry.root !== 'string') return [];
        const root = readableRoot(entry.root, [...chord.formula]);
        if (pitchClass(root) < 0) return [];
        const bars = clamp(entry.bars, 1 / 8, 8, 1);
        return [
          {
            root,
            chordId: chord.id,
            bars,
            durationTicks: Math.round(
              clamp(entry.durationTicks, PPQ / 2, PPQ * 64, bars * PPQ * 4),
            ),
          },
        ];
      })
    : [];
  return {
    enabled: data.enabled === true && steps.length > 0,
    style: data.style === 'stabs' || data.style === 'offbeats' ? data.style : 'pad',
    timbre: data.timbre === 'bright' ? 'bright' : 'warm',
    volume: clamp(data.volume, 0, 1, emptyHarmony.volume),
    steps,
  };
}

/** Chords offered in the editor, grouped the same way the catalogue is. */
export const compingChords = chords.filter((chord) => !chord.voicingFamily);
