import { audioContext } from './audio';

/**
 * The sound engine for the theory article. The rest of the app plays notes; this plays
 * frequencies, because every experiment in that article is about a frequency or a ratio
 * rather than about a note name.
 *
 * Three things matter here and are not negotiable:
 *  - one experiment sounds at a time, so starting anything stops whatever ran before;
 *  - a held sound can be retuned while it sounds, because half the experiments are
 *    "move this slider and listen to what changes";
 *  - nothing is levelled automatically. An automatic gain control would iron out exactly
 *    the beating the article asks you to listen for.
 */

export interface Partial {
  frequency: number;
  /** Relative amplitude before the master level; the sum is normalised on start. */
  amplitude: number;
}

/** Amplitudes proportional to 1/n, the default timbre for the tuning comparisons. */
export const softHarmonics = (count = 8) =>
  Array.from({ length: count }, (_, index) => 1 / (index + 1));

export const partialsFor = (fundamental: number, amplitudes: readonly number[]): Partial[] =>
  amplitudes.map((amplitude, index) => ({
    frequency: fundamental * (index + 1),
    amplitude,
  }));

/** Above this a partial is inaudible at best and aliasing at worst, so it is dropped. */
const ceiling = 11000;
const fade = 0.012;

let context: AudioContext | undefined;
let master: GainNode | undefined;
let level = 0.35;
const running = new Set<{ stop: (when?: number) => void }>();
const timers = new Set<ReturnType<typeof setTimeout>>();
let unavailable = false;

export const labLevel = () => level;
export const audioUnavailable = () => unavailable;

async function bus() {
  const ctx = await audioContext();
  if (context !== ctx || !master) {
    context = ctx;
    master = ctx.createGain();
    master.gain.value = level;
    master.connect(ctx.destination);
  }
  return { ctx, master };
}

export function setLabLevel(next: number) {
  level = Math.max(0, Math.min(1, next));
  if (master && context) master.gain.setTargetAtTime(level, context.currentTime, 0.02);
}

/** Silences every experiment at once. Safe to call when nothing is playing. */
export function stopLab() {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  for (const voice of [...running]) voice.stop();
  running.clear();
}

function after(ms: number, run: () => void) {
  const timer = setTimeout(() => {
    timers.delete(timer);
    run();
  }, ms);
  timers.add(timer);
  return timer;
}

export interface Held {
  /** Retunes and rebalances while the sound continues. */
  update(partials: Partial[]): void;
  stop(): void;
}

/**
 * Starts a sustained stack of sines and hands back a handle that can retune it. All the
 * oscillators start at the same instant, so two equal frequencies stay in phase — which
 * is what makes "no beating at all" audible in the beating experiment.
 *
 * `onEnded` fires whenever the sound stops, including when another experiment or the
 * shared stop button takes over. Without it a button could keep claiming to be playing
 * after its sound had already been cut.
 */
export async function hold(partials: Partial[], onEnded?: () => void): Promise<Held | null> {
  stopLab();
  let ctx: AudioContext;
  let out: GainNode;
  try {
    ({ ctx, master: out } = await bus());
  } catch {
    unavailable = true;
    return null;
  }
  const start = ctx.currentTime + 0.02;
  const voices: { oscillator: OscillatorNode; gain: GainNode }[] = [];
  let stopped = false;

  const scale = (list: Partial[]) => {
    const sum = list.reduce((total, partial) => total + Math.abs(partial.amplitude), 0);
    return sum > 1 ? 1 / sum : 1;
  };

  const handle: Held = {
    update(next) {
      if (stopped) return;
      const now = ctx.currentTime;
      const norm = scale(next);
      next.forEach((partial, index) => {
        const voice = voices[index];
        if (!voice) return;
        const audible = partial.frequency > 0 && partial.frequency < ceiling;
        voice.oscillator.frequency.setTargetAtTime(audible ? partial.frequency : 1, now, 0.015);
        voice.gain.gain.setTargetAtTime(audible ? partial.amplitude * norm : 0, now, 0.02);
      });
    },
    stop() {
      if (stopped) return;
      stopped = true;
      running.delete(handle);
      onEnded?.();
      const now = ctx.currentTime;
      for (const { oscillator, gain } of voices) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
        gain.gain.linearRampToValueAtTime(0, now + fade);
        try {
          oscillator.stop(now + fade + 0.01);
        } catch {
          /* Already stopped. */
        }
      }
    },
  };

  const norm = scale(partials);
  for (const partial of partials) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const audible = partial.frequency > 0 && partial.frequency < ceiling;
    oscillator.type = 'sine';
    // Set the intrinsic value as well as scheduling it: an oscillator that has not
    // reached its scheduled time yet would otherwise still report the default 440 Hz.
    oscillator.frequency.value = audible ? partial.frequency : 1;
    oscillator.frequency.setValueAtTime(audible ? partial.frequency : 1, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(audible ? partial.amplitude * norm : 0, start + fade);
    oscillator.connect(gain);
    gain.connect(out);
    oscillator.start(start);
    voices.push({ oscillator, gain });
  }
  running.add(handle);
  return handle;
}

export interface Step {
  partials: Partial[];
  /** How long this step sounds, in seconds. */
  seconds: number;
  /** Silence after it, so an A/B comparison does not cross-fade two tunings. */
  gap?: number;
}

export interface Sequence {
  stop(): void;
  /** Total length including gaps, in milliseconds. */
  ms: number;
}

/**
 * Plays steps back to back. `onStep` reports which one is sounding so a figure can mark
 * it, and is called with null when the sequence finishes.
 */
export async function playSteps(
  steps: Step[],
  onStep?: (index: number | null) => void,
): Promise<Sequence | null> {
  stopLab();
  let ctx: AudioContext;
  let out: GainNode;
  try {
    ({ ctx, master: out } = await bus());
  } catch {
    unavailable = true;
    onStep?.(null);
    return null;
  }
  const begin = ctx.currentTime + 0.04;
  const nodes: OscillatorNode[] = [];
  let offset = 0;
  let stopped = false;

  const sequence: Sequence = {
    ms: 0,
    stop() {
      if (stopped) return;
      stopped = true;
      running.delete(sequence);
      for (const oscillator of nodes) {
        try {
          oscillator.stop();
        } catch {
          /* Already finished. */
        }
      }
      onStep?.(null);
    },
  };

  steps.forEach((step, index) => {
    const at = begin + offset;
    const sum = step.partials.reduce((total, partial) => total + Math.abs(partial.amplitude), 0);
    const norm = sum > 1 ? 1 / sum : 1;
    for (const partial of step.partials) {
      if (!(partial.frequency > 0) || partial.frequency >= ceiling) continue;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = partial.frequency;
      oscillator.frequency.setValueAtTime(partial.frequency, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(partial.amplitude * norm, at + fade);
      gain.gain.setValueAtTime(partial.amplitude * norm, at + step.seconds - fade);
      gain.gain.linearRampToValueAtTime(0, at + step.seconds);
      oscillator.connect(gain);
      gain.connect(out);
      oscillator.start(at);
      oscillator.stop(at + step.seconds + 0.01);
      nodes.push(oscillator);
    }
    if (onStep) after(offset * 1000, () => onStep(index));
    offset += step.seconds + (step.gap ?? 0);
  });

  sequence.ms = offset * 1000;
  running.add(sequence);
  after(sequence.ms, () => {
    running.delete(sequence);
    onStep?.(null);
  });
  return sequence;
}
