/** Standard tuning and the two variants worth offering, lowest string first. */
export interface TuningPreset {
  id: string;
  name: string;
  hint: string;
  /** MIDI notes of the open strings. */
  strings: number[];
}

export const tunings: TuningPreset[] = [
  {
    id: 'standard4',
    name: 'Viersaiter · E A D G',
    hint: 'Die Standardstimmung. E1 ist 41,2 Hz.',
    strings: [28, 33, 38, 43],
  },
  {
    id: 'standard5',
    name: 'Fünfsaiter · H E A D G',
    hint: 'Mit tiefer H-Saite bei 30,9 Hz.',
    strings: [23, 28, 33, 38, 43],
  },
  {
    id: 'dropd',
    name: 'Drop D · D A D G',
    hint: 'Die E-Saite einen Ganzton tiefer.',
    strings: [26, 33, 38, 43],
  },
];

export const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export interface PitchReading {
  frequency: number;
  /** Nearest equal-tempered note. */
  midi: number;
  /** Deviation from that note, −50…+50. */
  cents: number;
}

export function readPitch(frequency: number): PitchReading {
  const exact = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(exact);
  return { frequency, midi, cents: (exact - midi) * 100 };
}

/** The string of the chosen tuning that the reading is closest to. */
export function nearestString(midi: number, strings: readonly number[]): number {
  let best = 0;
  for (let index = 1; index < strings.length; index++)
    if (Math.abs(strings[index] - midi) < Math.abs(strings[best] - midi)) best = index;
  return best;
}

/** Enough for two periods of the lowest string this has to recognise. */
export const analysisSize = 8192;
/** Bass fundamentals only; harmonics above this are what confuse a naive detector. */
export const decimation = 4;

/**
 * Normalised square difference, the McLeod pitch method. A plain autocorrelation
 * locks onto the second harmonic of a bass string often enough to be useless, because
 * on a low E the first overtone is frequently louder than the fundamental; normalising
 * by the signal's own energy and taking the *first* peak near the maximum avoids that.
 */
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  { minHz = 26, maxHz = 420, minRms = 0.008 } = {},
): number | null {
  const size = buffer.length;
  let rms = 0;
  for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / size);
  if (rms < minRms) return null;

  const maxLag = Math.min(size - 2, Math.floor(sampleRate / minHz));
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  if (maxLag <= minLag + 2) return null;

  const nsdf = new Float32Array(maxLag + 2);
  let peak = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let correlation = 0;
    let energy = 0;
    for (let i = 0; i + lag < size; i++) {
      correlation += buffer[i] * buffer[i + lag];
      energy += buffer[i] * buffer[i] + buffer[i + lag] * buffer[i + lag];
    }
    nsdf[lag] = energy > 0 ? (2 * correlation) / energy : 0;
    if (nsdf[lag] > peak) peak = nsdf[lag];
  }
  // Below this the window holds noise or a decayed note rather than a pitch.
  if (peak < 0.5) return null;

  const threshold = peak * 0.88;
  let chosen = -1;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (nsdf[lag] >= threshold && nsdf[lag] > nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1]) {
      chosen = lag;
      break;
    }
  }
  if (chosen < 0) return null;

  // Parabolic interpolation, so the reading resolves far finer than one sample.
  const before = nsdf[chosen - 1];
  const centre = nsdf[chosen];
  const after = nsdf[chosen + 1];
  const curve = before - 2 * centre + after;
  const shift = curve === 0 ? 0 : (0.5 * (before - after)) / curve;
  const frequency = sampleRate / (chosen + shift);
  return frequency >= minHz && frequency <= maxHz ? frequency : null;
}

/**
 * Averages `decimation` samples at a time. The signal is already low-passed in the
 * graph, so this only cuts the work the detector has to do — by sixteen times, since
 * the cost grows with the square of the window.
 */
export function decimate(input: Float32Array, factor = decimation): Float32Array {
  const size = Math.floor(input.length / factor);
  const output = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    let sum = 0;
    for (let j = 0; j < factor; j++) sum += input[i * factor + j];
    output[i] = sum / factor;
  }
  return output;
}
