import { Percussion } from './rhythm-audio';
import { instrumentSpec } from './rhythm';
import type { DrumSound, Instrument } from './rhythm';

/**
 * A picture of the voice that cannot drift from the sound: the real synth graph is
 * rendered through an OfflineAudioContext and the returned samples are the ones the
 * speakers would produce. Drawing an idealised curve instead would eventually lie.
 */
export interface VoiceScope {
  /** Peak magnitude per pixel column, 0…1, over the whole hit. */
  peaks: Float32Array;
  /** Raw samples of the first milliseconds, for the oscillation itself. */
  head: Float32Array;
  /** Seconds the rendered hit actually lasts. */
  duration: number;
  /** Seconds covered by `head`. */
  headDuration: number;
  /** Loudest sample in the render, before any normalisation for display. */
  peak: number;
  engine: DrumSound['engine'];
  carrierHz: number;
  modulatorHz: number;
  /** Modulation index at the attack: depth in hertz over the modulator frequency. */
  index: number;
  /** Analog engine: the voice filter's opening cutoff and its resonance. */
  cutoffHz: number;
  q: number;
}

const rate = 44100;
/** Long enough for the longest voice at decay 2.5 plus its release. */
const window = 3;

function offline(length: number): OfflineAudioContext {
  return new OfflineAudioContext({ numberOfChannels: 1, length, sampleRate: rate });
}

export function canRenderScope(): boolean {
  return typeof OfflineAudioContext !== 'undefined';
}

/**
 * Renders one hit at full velocity. The caller is expected to debounce: a render is
 * cheap but not free, and a knob drag would otherwise queue dozens of them.
 */
export async function renderVoiceScope(
  id: Instrument,
  sound: DrumSound,
  columns = 240,
  headMs = 12,
): Promise<VoiceScope> {
  const spec = instrumentSpec(id);
  const ctx = offline(Math.ceil(window * rate));
  const synth = new Percussion(ctx);
  synth.hit(id, 1, 0, sound);
  const buffer = await ctx.startRendering();
  const samples = buffer.getChannelData(0);

  let last = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const magnitude = Math.abs(samples[i]);
    if (magnitude > peak) peak = magnitude;
    if (magnitude > 1e-4) last = i;
  }
  const used = Math.max(Math.round(rate * 0.02), last + 1);

  const peaks = new Float32Array(columns);
  const per = used / columns;
  for (let column = 0; column < columns; column++) {
    const from = Math.floor(column * per);
    const to = Math.min(used, Math.max(from + 1, Math.floor((column + 1) * per)));
    let local = 0;
    for (let i = from; i < to; i++) local = Math.max(local, Math.abs(samples[i]));
    peaks[column] = local;
  }

  const headLength = Math.min(used, Math.round((headMs / 1000) * rate));
  const head = samples.slice(0, headLength);

  // The same numbers the synth used, so the readout matches what is drawn.
  const tune = 2 ** (sound.pitch / 12);
  const carrierHz = spec.from * tune;
  const modulatorHz = carrierHz * sound.fmRatio;
  const depth = carrierHz * sound.fmAmount;
  const cutoffHz = Math.min(
    rate * 0.45,
    Math.max(120, spec.noiseHz * (0.4 + sound.tone * 1.6) * tune),
  );
  return {
    peaks,
    head: Float32Array.from(head),
    duration: used / rate,
    headDuration: headLength / rate,
    peak,
    carrierHz,
    modulatorHz,
    index: modulatorHz > 0 ? depth / modulatorHz : 0,
    engine: sound.engine,
    cutoffHz,
    q: 0.7 + sound.resonance * 21.3,
  };
}
