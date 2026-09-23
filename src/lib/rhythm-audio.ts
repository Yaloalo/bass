import { audioContext } from './audio';
import { harmonyAt, harmonyVoicing, harmonyVoicings } from './harmony-play';
import type { Harmony, HarmonyStep } from './harmony-play';
import {
  clickAt,
  instrumentSpec,
  instruments,
  isSilentBar,
  recoverScheduleTime,
  stepDuration,
  stepVelocity,
} from './rhythm';
import type {
  DrumPattern,
  DrumSound,
  Instrument,
  InstrumentSpec,
  RhythmMode,
  RhythmPreferences,
} from './rhythm';

export interface RhythmConfig {
  bpm: number;
  pattern: DrumPattern;
  preferences: RhythmPreferences;
  /** Chords to comp under the groove; absent or disabled means drums only. */
  harmony?: Harmony;
}
export interface RhythmPulse {
  step: number;
  beat: number;
  bar: number;
  countIn: boolean;
  silent: boolean;
  /** Index into the harmony progression, or -1 when no chords are playing. */
  chord: number;
}

/** The working pattern loops on its own bars; there is nothing else to resolve. */
export function drumPosition(config: RhythmConfig, bar: number) {
  return { pattern: config.pattern, localBar: bar % config.pattern.bars };
}
export interface RhythmStatus {
  running: boolean;
  starting: boolean;
  paused: boolean;
  mode: RhythmMode;
  pulse: RhythmPulse | null;
  error: string;
}
export const stoppedRhythm: RhythmStatus = {
  running: false,
  starting: false,
  paused: false,
  mode: 'metronome',
  pulse: null,
  error: '',
};

/* ------------------------------------------------------------- curves */

/** Linear below the knee, tanh above, with matching slope so there is no kink. */
function limiterCurve(n = 2049): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(n);
  const knee = 0.5;
  const soft = 0.62;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    const magnitude = Math.abs(x);
    curve[i] =
      magnitude <= knee ? x : Math.sign(x) * (knee + soft * Math.tanh((magnitude - knee) / soft));
  }
  return curve;
}

/** Peak-normalised saturation, so raising drive adds harmonics without adding level. */
function driveCurve(drive: number, n = 1025): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(n);
  const k = 0.4 + drive * 9.6;
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) curve[i] = Math.tanh((k * (i * 2)) / (n - 1) - k) / norm;
  return curve;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
/** One second of noise per context, reused forever; regenerating it per hit is audible as jank. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

interface LiveVoice {
  start: number;
  gate: GainNode;
  sources: AudioScheduledSourceNode[];
}

interface TrackChain {
  input: GainNode;
  shaper: WaveShaperNode;
  fader: GainNode;
  panner: StereoPannerNode;
  drive: number;
}

/* --------------------------------------------------------------- synth */

export class Percussion {
  private master: GainNode;
  private limiter: WaveShaperNode;
  private tracks: Record<Instrument, TrackChain>;
  private noise: AudioBuffer;
  private sources = new Set<AudioScheduledSourceNode>();
  private groups = new Map<string, Set<LiveVoice>>();
  private curves = new Map<number, Float32Array<ArrayBuffer>>();

  constructor(private ctx: BaseAudioContext) {
    this.noise = noiseBuffer(ctx);
    this.limiter = ctx.createWaveShaper();
    this.limiter.curve = limiterCurve();
    this.limiter.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(this.limiter);
    this.tracks = Object.fromEntries(
      instruments.map(({ id }) => {
        const input = ctx.createGain();
        const shaper = ctx.createWaveShaper();
        const fader = ctx.createGain();
        const panner = ctx.createStereoPanner();
        input.connect(shaper);
        shaper.connect(fader);
        fader.connect(panner);
        panner.connect(this.master);
        return [id, { input, shaper, fader, panner, drive: 0 }];
      }),
    ) as Record<Instrument, TrackChain>;
  }

  /** Quantised so a slider drag reuses curves instead of allocating one per frame. */
  private curveFor(drive: number): Float32Array<ArrayBuffer> | null {
    if (drive <= 0) return null;
    const key = Math.round(drive * 20);
    let curve = this.curves.get(key);
    if (!curve) {
      curve = driveCurve(key / 20);
      this.curves.set(key, curve);
    }
    return curve;
  }

  configure(config: RhythmConfig) {
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(config.preferences.volume * 0.65, now, 0.015);
    // The working pattern owns the mix.
    const pattern = config.pattern;
    const solo = instruments.some(({ id }) => pattern.tracks[id].solo);
    for (const { id } of instruments) {
      const track = pattern.tracks[id];
      const chain = this.tracks[id];
      chain.fader.gain.setTargetAtTime(
        track.mute || (solo && !track.solo) ? 0 : track.volume,
        now,
        0.015,
      );
      chain.panner.pan.setTargetAtTime(track.sound.pan, now, 0.02);
      if (chain.drive !== track.sound.drive) {
        chain.drive = track.sound.drive;
        chain.shaper.curve = this.curveFor(track.sound.drive);
      }
    }
  }

  /** Collects the sources of the hit currently being built, so a choke cuts only that voice. */
  private building: AudioScheduledSourceNode[] | undefined;
  /** Every source of the hit being built, choked or not; used to release the voice filter. */
  private parts: AudioScheduledSourceNode[] | undefined;

  private register(
    source: AudioScheduledSourceNode,
    nodes: AudioNode[],
    time: number,
    until: number,
    offset?: number,
  ) {
    this.sources.add(source);
    this.building?.push(source);
    this.parts?.push(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      nodes.forEach((node) => node.disconnect());
    };
    if (offset !== undefined && source instanceof AudioBufferSourceNode) source.start(time, offset);
    else source.start(time);
    source.stop(until + 0.002);
  }

  /**
   * Linear attack from true zero, exponential decay to a relative floor, then an
   * explicit linear ramp to zero. Exponential ramps to or from zero are invalid.
   */
  private envelope(
    param: AudioParam,
    peak: number,
    time: number,
    decay: number,
    bursts = 1,
    spacing = 0.012,
  ): number {
    param.setValueAtTime(0, time);
    const attack = 0.0015;
    let silent = time;
    for (let burst = 0; burst < bursts; burst++) {
      const at = time + burst * spacing;
      const level = peak * (1 - burst * 0.18);
      const floor = Math.max(1e-4, level * 0.06);
      if (burst > 0) param.setValueAtTime(floor, at);
      param.linearRampToValueAtTime(level, at + attack);
      if (burst < bursts - 1) {
        param.exponentialRampToValueAtTime(floor, at + spacing - 0.0005);
      } else {
        param.exponentialRampToValueAtTime(Math.max(1e-4, level * 1e-4), at + attack + decay);
        silent = at + attack + decay;
      }
    }
    param.linearRampToValueAtTime(0, silent + 0.004);
    return silent + 0.004;
  }

  private sweep(
    oscillator: OscillatorNode,
    from: number,
    to: number,
    time: number,
    duration: number,
  ) {
    oscillator.frequency.setValueAtTime(Math.max(20, from), time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), time + duration);
  }

  /** True FM: the modulator drives the carrier's frequency AudioParam in hertz. */
  private modulate(
    carrier: OscillatorNode,
    frequency: number,
    sound: DrumSound,
    velocity: number,
    time: number,
    duration: number,
    output: AudioNode[],
  ) {
    if (sound.engine !== 'fm' || sound.fmAmount <= 0) return;
    const modulator = this.ctx.createOscillator();
    const index = this.ctx.createGain();
    const ratio = sound.fmRatio;
    const nyquist = this.ctx.sampleRate * 0.45;
    const depth = Math.min(
      frequency * sound.fmAmount * (1 + 0.6 * (velocity - 0.7)),
      nyquist - frequency * ratio,
    );
    modulator.frequency.setValueAtTime(Math.min(nyquist, Math.max(20, frequency * ratio)), time);
    index.gain.setValueAtTime(Math.max(1, depth), time);
    index.gain.exponentialRampToValueAtTime(
      Math.max(1, depth * 0.02),
      time + duration * sound.fmDecay,
    );
    index.gain.linearRampToValueAtTime(0, time + duration);
    modulator.connect(index);
    index.connect(carrier.frequency);
    this.register(modulator, [index], time, time + duration);
    output.push(index);
  }

  /**
   * The analog engine's voice filter: everything the voice produces passes through one
   * resonant low-pass whose cutoff falls with the hit. That sweep plus the resonant peak
   * is what gives a classic analog drum machine its body, exactly as FM gives the other
   * engine its metal. Returns the node the voice should be built into.
   */
  private voiceFilter(
    spec: InstrumentSpec,
    sound: DrumSound,
    time: number,
    duration: number,
    destination: AudioNode,
  ): BiquadFilterNode | undefined {
    if (sound.engine !== 'analog') return undefined;
    const filter = this.ctx.createBiquadFilter();
    const ceiling = this.ctx.sampleRate * 0.45;
    const tune = 2 ** (sound.pitch / 12);
    // Open at the attack, settle just above the body so the fundamental survives.
    const open = Math.min(ceiling, Math.max(120, spec.noiseHz * (0.4 + sound.tone * 1.6) * tune));
    const rest = Math.min(open, Math.max(60, spec.to * tune * 1.6));
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(0.7 + sound.resonance * 21.3, time);
    filter.frequency.setValueAtTime(open, time);
    filter.frequency.exponentialRampToValueAtTime(
      rest,
      time + Math.max(0.005, duration * sound.fmDecay),
    );
    filter.connect(destination);
    return filter;
  }

  private body(
    spec: InstrumentSpec,
    sound: DrumSound,
    velocity: number,
    time: number,
    amplitude: number,
    duration: number,
    destination: AudioNode,
    type: OscillatorType,
  ) {
    const tune = 2 ** (sound.pitch / 12);
    const bend = 1 + sound.bend * (1.2 + 0.5 * (velocity - 0.7)) * 2;
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = type;
    this.sweep(oscillator, spec.from * tune * bend, spec.to * tune, time, duration);
    const silent = this.envelope(envelope.gain, amplitude, time, duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    const extra: AudioNode[] = [envelope];
    this.modulate(oscillator, spec.from * tune, sound, velocity, time, duration, extra);
    this.register(oscillator, extra, time, silent);
    return silent;
  }

  private hiss(
    time: number,
    duration: number,
    amplitude: number,
    destination: AudioNode,
    filter: { type: BiquadFilterType; frequency: number; q: number; to?: number },
    bursts = 1,
  ) {
    const source = this.ctx.createBufferSource();
    const shape = this.ctx.createBiquadFilter();
    const envelope = this.ctx.createGain();
    source.buffer = this.noise;
    source.loop = true;
    shape.type = filter.type;
    shape.frequency.setValueAtTime(
      Math.min(this.ctx.sampleRate * 0.45, Math.max(40, filter.frequency)),
      time,
    );
    if (filter.to !== undefined)
      shape.frequency.exponentialRampToValueAtTime(
        Math.min(this.ctx.sampleRate * 0.45, Math.max(40, filter.to)),
        time + duration,
      );
    shape.Q.value = filter.q;
    source.connect(shape);
    shape.connect(envelope);
    envelope.connect(destination);
    const silent = this.envelope(envelope.gain, amplitude, time, duration, bursts);
    // A fresh read offset each hit stops repeated hats from being sample-identical.
    this.register(
      source,
      [shape, envelope],
      time,
      silent,
      Math.random() * (this.noise.duration - 0.5),
    );
    return silent;
  }

  click(time: number, accent: boolean, subdivision = false) {
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(accent ? 1200 : subdivision ? 650 : 850, time);
    const silent = this.envelope(envelope.gain, subdivision ? 0.18 : 0.35, time, 0.035);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    this.register(oscillator, [envelope], time, silent);
  }

  hit(id: Instrument, velocity: number, time: number, sound: DrumSound) {
    if (velocity <= 0) return;
    const spec = instrumentSpec(id);
    const chain = this.tracks[id];
    const tune = 2 ** (sound.pitch / 12);
    const bright = 0.55 + sound.tone * 0.9;
    // Velocity is perceptual: amplitude, filter opening and FM index move together.
    const amplitude = 0.1 + 0.9 * velocity ** 1.8;
    const openness = 2 ** (velocity - 0.7);
    const duration = Math.max(0.01, spec.duration * sound.decay * (1 + 0.25 * (velocity - 0.7)));
    const colour = Math.min(this.ctx.sampleRate * 0.45, spec.noiseHz * bright * tune * openness);

    let destination: AudioNode = chain.input;
    let live: LiveVoice | undefined;
    if (spec.choke) {
      const gate = this.ctx.createGain();
      gate.gain.setValueAtTime(1, time);
      gate.connect(chain.input);
      destination = gate;
      live = { start: time, gate, sources: [] };
      // A new hit silences everything already ringing in its group, including itself.
      const group = this.groups.get(spec.choke) ?? new Set<LiveVoice>();
      for (const other of group) this.chokeVoice(other, time);
      group.clear();
      group.add(live);
      this.groups.set(spec.choke, group);
      this.building = live.sources;
    }

    this.parts = [];
    const filter = this.voiceFilter(spec, sound, time, duration, destination);
    if (filter) destination = filter;
    // Analog mode dials the noise against the body; FM keeps the instrument's own share.
    const share = spec.noiseMix * (sound.engine === 'analog' ? sound.noise : 1);
    const noiseLevel = amplitude * share;
    const bodyLevel = amplitude * (1 - Math.min(0.95, share) * 0.75);

    switch (spec.engine) {
      case 'membrane':
        this.body(spec, sound, velocity, time, bodyLevel * 0.9, duration, destination, 'sine');
        if (spec.noiseMix > 0.02)
          this.hiss(time, Math.min(0.02, duration), noiseLevel * 0.5, destination, {
            type: 'highpass',
            frequency: colour,
            q: 0.8,
          });
        break;
      case 'snare':
        this.body(
          spec,
          sound,
          velocity,
          time,
          bodyLevel * 0.55,
          duration * 0.62,
          destination,
          'triangle',
        );
        this.hiss(time, duration, noiseLevel * 0.8, destination, {
          type: 'highpass',
          frequency: colour,
          q: 0.7,
        });
        break;
      case 'slap':
        this.body(
          spec,
          sound,
          velocity,
          time,
          bodyLevel * 0.7,
          duration * 0.5,
          destination,
          'triangle',
        );
        this.hiss(time, duration * 0.7, noiseLevel * 0.9, destination, {
          type: 'bandpass',
          frequency: colour,
          q: 1.4,
        });
        break;
      case 'metal':
        this.hiss(time, duration, noiseLevel * 0.42, destination, {
          type: 'highpass',
          frequency: colour,
          q: 0.9,
        });
        if (sound.engine === 'fm' && sound.fmAmount > 0)
          this.body(spec, sound, velocity, time, bodyLevel * 0.35, duration, destination, 'sine');
        break;
      case 'wood':
        this.body(spec, sound, velocity, time, bodyLevel * 0.8, duration, destination, 'triangle');
        if (spec.noiseMix > 0.05)
          this.hiss(time, Math.min(0.012, duration), noiseLevel * 0.6, destination, {
            type: 'bandpass',
            frequency: colour,
            q: 2,
          });
        break;
      case 'bell':
        this.body(
          spec,
          sound,
          velocity,
          time,
          bodyLevel * 0.5,
          duration,
          destination,
          sound.engine === 'fm' ? 'sine' : 'square',
        );
        this.hiss(time, 0.006, noiseLevel * 0.9, destination, {
          type: 'bandpass',
          frequency: colour,
          q: 3,
        });
        break;
      case 'clap':
        this.hiss(
          time,
          duration,
          noiseLevel * 0.75,
          destination,
          { type: 'bandpass', frequency: colour, q: 1.1 },
          3,
        );
        if (sound.engine === 'fm' && sound.fmAmount > 0)
          this.body(
            spec,
            sound,
            velocity,
            time,
            bodyLevel * 0.3,
            duration * 0.5,
            destination,
            'sine',
          );
        break;
      case 'shaker':
        this.hiss(time, duration, noiseLevel * 0.6, destination, {
          type: 'bandpass',
          frequency: colour,
          q: 1.6,
        });
        if (sound.engine === 'fm' && sound.fmAmount > 0)
          this.body(spec, sound, velocity, time, bodyLevel * 0.2, duration, destination, 'sine');
        break;
      case 'scrape':
        this.hiss(time, duration, noiseLevel * 0.55, destination, {
          type: 'bandpass',
          frequency: colour * 0.5,
          to: colour * 1.6,
          q: 2.4,
        });
        if (sound.engine === 'fm' && sound.fmAmount > 0)
          this.body(spec, sound, velocity, time, bodyLevel * 0.18, duration, destination, 'sine');
        break;
    }
    // The filter has no source of its own, so it is released once every part has ended.
    if (filter) {
      let open = this.parts.length;
      if (!open) filter.disconnect();
      for (const source of this.parts) {
        const ended = source.onended;
        source.onended = (event) => {
          ended?.call(source, event);
          if (--open === 0) filter.disconnect();
        };
      }
    }
    this.parts = undefined;
    this.building = undefined;
  }

  /** Portable choke: a dedicated gate node no one else automates, so no cancelAndHold is needed. */
  private chokeVoice(live: LiveVoice, at: number) {
    const cut = at <= live.start;
    const time = Math.max(at, live.start);
    const release = cut ? 0.001 : 0.005;
    live.gate.gain.cancelScheduledValues(time);
    live.gate.gain.setValueAtTime(cut ? 0 : 1, time);
    live.gate.gain.linearRampToValueAtTime(0, time + release);
    for (const source of live.sources) {
      try {
        source.stop(time + release + 0.003);
      } catch {
        /* Already finished. */
      }
    }
  }

  dispose() {
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0, now, 0.004);
    this.sources.forEach((source) => {
      try {
        source.stop(now + 0.02);
      } catch {
        /* Already finished. */
      }
    });
    this.groups.clear();
    window.setTimeout(() => {
      this.sources.forEach((source) => source.disconnect());
      this.sources.clear();
      Object.values(this.tracks).forEach((chain) => {
        chain.input.disconnect();
        chain.shaper.disconnect();
        chain.fader.disconnect();
        chain.panner.disconnect();
      });
      this.master.disconnect();
      this.limiter.disconnect();
    }, 60);
  }
}

/* ------------------------------------------------------------- comping */

/**
 * A soft mid-register pad for the chord progression. It deliberately starts at C4:
 * the whole point is to accompany a bass player, so it never occupies the register
 * the player is working in. Two detuned oscillators per tone go through a low-pass,
 * with a gentler waveform available for practice under an acoustic bass.
 */
class Comping {
  private out: GainNode;
  private filter: BiquadFilterNode;
  private live = new Set<AudioScheduledSourceNode>();
  private voices = new Set<{ envelope: GainNode; oscillators: OscillatorNode[] }>();

  constructor(
    private ctx: BaseAudioContext,
    destination: AudioNode,
  ) {
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2600;
    this.filter.Q.value = 0.4;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.filter.connect(this.out);
    this.out.connect(destination);
  }

  setVolume(value: number, at: number) {
    // Keep the progression below the drummer; chord size is balanced per hit.
    this.out.gain.setTargetAtTime(value * 0.09, at, 0.02);
  }

  play(midis: readonly number[], time: number, duration: number, timbre: Harmony['timbre']) {
    const attack = 0.02;
    // The chord holds for its whole span and only then releases, so the tail runs past
    // the bar line and under the next chord's attack. Fading out before the boundary
    // left an audible gap at every change.
    const release = Math.min(0.18, duration * 0.35);
    const voiceLevel = Math.min(1, 3.5 / Math.max(1, midis.length));
    for (const midi of midis) {
      const frequency = 440 * 2 ** ((midi - 69) / 12);
      const envelope = this.ctx.createGain();
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(voiceLevel, time + attack);
      envelope.gain.setValueAtTime(voiceLevel, time + Math.max(attack, duration));
      envelope.gain.linearRampToValueAtTime(0, time + duration + release);
      envelope.connect(this.filter);
      const voice = { envelope, oscillators: [] as OscillatorNode[] };
      this.voices.add(voice);
      // Subtle detuning gives width without adding a separate chorus or delay.
      for (const cents of [-4, 4]) {
        const oscillator = this.ctx.createOscillator();
        oscillator.type = timbre === 'bright' ? 'sawtooth' : cents < 0 ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency * 2 ** (cents / 1200), time);
        oscillator.connect(envelope);
        oscillator.start(time);
        oscillator.stop(time + duration + release + 0.01);
        this.live.add(oscillator);
        voice.oscillators.push(oscillator);
        oscillator.onended = () => {
          this.live.delete(oscillator);
          oscillator.disconnect();
          if (voice.oscillators.every((part) => !this.live.has(part))) {
            this.voices.delete(voice);
            envelope.disconnect();
          }
        };
      }
    }
  }

  /** Release a sustained chord at the next chord boundary, including scheduled voices. */
  release(at: number) {
    for (const { envelope, oscillators } of this.voices) {
      envelope.gain.cancelScheduledValues(at);
      envelope.gain.setTargetAtTime(0, at, 0.025);
      for (const oscillator of oscillators) {
        try {
          oscillator.stop(at + 0.16);
        } catch {
          /* A very short stab may have ended already. */
        }
      }
    }
  }

  dispose() {
    for (const source of this.live) {
      try {
        source.stop();
      } catch {
        /* Already finished. */
      }
    }
    this.live.clear();
    this.out.disconnect();
    this.filter.disconnect();
  }
}

/* ----------------------------------------------------------- transport */

/** One transport shared by the footer and both tools. Timers only feed the audio clock. */
export class RhythmEngine {
  private generation = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private frame = 0;
  private synth: Percussion | undefined;
  private ctx: AudioContext | undefined;
  private queue: { time: number; pulse: RhythmPulse }[] = [];
  private status: RhythmStatus = stoppedRhythm;
  private next = 0;
  private sequence = 0;
  private absoluteBar = 0;
  private countInBars = 0;
  private pausedPosition: {
    mode: RhythmMode;
    bar: number;
    step: number;
    pulse: RhythmPulse | null;
  } | null = null;
  private comping: Comping | undefined;
  private chordVoicings: number[][];
  private pendingPad = false;
  private previewSynth: Percussion | undefined;
  private previewTimer: ReturnType<typeof setTimeout> | undefined;
  private previewComping: Comping | undefined;
  private chordPreviewTimer: ReturnType<typeof setTimeout> | undefined;
  private config: RhythmConfig;
  /** The tempo the trainer has reached, so scheduling never waits for a React render. */
  private ramped: number | undefined;
  /** Bars played since the transport started, count-in excluded. */
  private rampBar = 0;
  /** When the current bar began, so anything else can line up with the next one. */
  private barStart = 0;

  constructor(
    config: RhythmConfig,
    private onStatus: (status: RhythmStatus) => void,
    private onTempo?: (bpm: number) => void,
  ) {
    this.config = config;
    this.chordVoicings = harmonyVoicings(config.harmony?.steps ?? []);
  }

  update(config: RhythmConfig) {
    const before = this.config;
    this.config = config;
    if (before.bpm !== config.bpm && config.bpm !== this.ramped) this.ramped = undefined;
    this.synth?.configure(config);
    const changedChords =
      JSON.stringify(before.harmony?.steps) !== JSON.stringify(config.harmony?.steps);
    const retimePad = before.bpm !== config.bpm && config.harmony?.style === 'pad';
    if (changedChords) this.chordVoicings = harmonyVoicings(config.harmony?.steps ?? []);
    if (
      this.ctx &&
      this.comping &&
      before.harmony?.enabled &&
      (!config.harmony?.enabled ||
        changedChords ||
        retimePad ||
        before.harmony.style !== config.harmony.style ||
        before.harmony.timbre !== config.harmony.timbre)
    )
      this.comping.release(this.ctx.currentTime);
    if (
      config.harmony?.enabled &&
      config.harmony.style === 'pad' &&
      (changedChords ||
        retimePad ||
        !before.harmony?.enabled ||
        before.harmony.style !== 'pad' ||
        before.harmony.timbre !== config.harmony.timbre)
    )
      this.pendingPad = true;
    if (this.ctx)
      this.comping?.setVolume(
        config.harmony?.enabled ? config.harmony.volume : 0,
        this.ctx.currentTime,
      );
    const drums = this.status.mode === 'drums';
    const structuralChange = drums
      ? before.pattern.subdivision !== config.pattern.subdivision ||
        before.pattern.bars !== config.pattern.bars
      : before.preferences.metronome.beats !== config.preferences.metronome.beats ||
        before.preferences.metronome.subdivision !== config.preferences.metronome.subdivision;
    // Restart only for meter/grid changes. Editing chords never stops the drummer.
    if ((this.status.running || this.status.paused) && structuralChange) this.stop();
  }

  async preview(instrument: Instrument, soundOverride?: DrumSound) {
    const generation = this.generation;
    try {
      const ctx = await audioContext();
      if (generation !== this.generation || ctx.state !== 'running') return;
      // A dedicated chain avoids the running track's mute, solo or pan automation
      // immediately cancelling the preview before its scheduled attack.
      const synth = this.previewSynth ?? new Percussion(ctx);
      this.previewSynth = synth;
      clearTimeout(this.previewTimer);
      this.previewTimer = setTimeout(() => {
        synth.dispose();
        if (this.previewSynth === synth) this.previewSynth = undefined;
      }, 4000);
      const pattern = this.config.pattern;
      const sound = soundOverride ?? pattern.tracks[instrument].sound;
      // Preview must be audible even when the track is muted or another track is soloed.
      synth.configure({
        ...this.config,
        pattern: {
          ...pattern,
          tracks: Object.fromEntries(
            instruments.map(({ id }) => [
              id,
              {
                ...pattern.tracks[id],
                sound: id === instrument ? sound : pattern.tracks[id].sound,
                mute: false,
                solo: false,
              },
            ]),
          ) as DrumPattern['tracks'],
        },
      });
      synth.hit(instrument, 1, ctx.currentTime + 0.01, sound);
    } catch {
      this.publish({
        error:
          'Die Klangvorschau konnte nicht starten. Prüfe die Audio-Einstellungen deines Browsers.',
      });
    }
  }

  /** Audition a progression step without starting or changing the drum transport. */
  async previewChord(step: HarmonyStep, index: number) {
    const generation = this.generation;
    try {
      const ctx = await audioContext();
      if (generation !== this.generation || ctx.state !== 'running') return;
      clearTimeout(this.chordPreviewTimer);
      this.previewComping?.dispose();
      const comping = new Comping(ctx, ctx.destination);
      this.previewComping = comping;
      comping.setVolume(this.config.harmony?.volume ?? 0.45, ctx.currentTime);
      comping.play(
        this.chordVoicings[index] ?? harmonyVoicing(step),
        ctx.currentTime + 0.03,
        1.1,
        this.config.harmony?.timbre ?? 'warm',
      );
      this.chordPreviewTimer = setTimeout(() => {
        comping.dispose();
        if (this.previewComping === comping) this.previewComping = undefined;
      }, 1400);
    } catch {
      this.publish({
        error: 'Der Akkord konnte nicht vorgespielt werden. Prüfe die Audio-Einstellungen.',
      });
    }
  }

  private publish(patch: Partial<RhythmStatus>) {
    this.status = { ...this.status, ...patch };
    this.onStatus(this.status);
  }

  async start(mode: RhythmMode, resume = false) {
    const continuation = resume && this.pausedPosition?.mode === mode ? this.pausedPosition : null;
    this.stop();
    const generation = this.generation;
    this.publish({ starting: true, paused: false, mode, error: '' });
    try {
      const ctx = await audioContext();
      if (generation !== this.generation) return;
      if (ctx.state !== 'running') throw new Error('Audio did not resume');
      this.ctx = ctx;
      this.synth = new Percussion(ctx);
      this.synth.configure(this.config);
      this.comping = new Comping(ctx, ctx.destination);
      this.comping.setVolume(
        this.config.harmony?.enabled ? this.config.harmony.volume : 0,
        ctx.currentTime,
      );
      this.pendingPad = !!continuation;
      this.sequence = continuation?.step ?? 0;
      this.absoluteBar = continuation?.bar ?? 0;
      this.countInBars = continuation ? 0 : this.config.preferences.countIn;
      this.next = ctx.currentTime + 0.04;
      this.publish({
        running: true,
        starting: false,
        paused: false,
        pulse: continuation?.pulse ?? null,
      });
      this.schedule();
      this.timer = setInterval(() => this.schedule(), 25);
      const draw = () => {
        if (generation !== this.generation) return;
        let pulse: RhythmPulse | undefined;
        while (this.queue.length && this.queue[0].time <= ctx.currentTime)
          pulse = this.queue.shift()!.pulse;
        if (pulse) this.publish({ pulse });
        this.frame = requestAnimationFrame(draw);
      };
      this.frame = requestAnimationFrame(draw);
    } catch {
      if (generation !== this.generation) return;
      this.stop();
      this.publish({
        error:
          'Audio konnte nicht starten. Prüfe die Audio-Einstellungen deines Browsers und versuche es erneut.',
      });
    }
  }

  /** Stop the audio graph while remembering the next unsounded step of this phrase. */
  pause() {
    if (!this.status.running || !this.ctx) return;
    const mode = this.status.mode;
    const upcoming = this.queue.find((entry) => entry.time >= this.ctx!.currentTime);
    const subdivision =
      mode === 'drums'
        ? this.config.pattern.subdivision
        : this.config.preferences.metronome.subdivision;
    const beats = mode === 'drums' ? 4 : this.config.preferences.metronome.beats;
    const position = {
      mode,
      bar: upcoming
        ? upcoming.pulse.countIn
          ? 0
          : upcoming.pulse.bar
        : Math.max(0, this.absoluteBar - this.countInBars),
      step: upcoming ? upcoming.pulse.step % (beats * subdivision) : this.sequence,
      pulse: this.status.pulse,
    };
    this.stop();
    this.pausedPosition = position;
    this.publish({ paused: true, mode, pulse: position.pulse });
  }

  resume(mode: RhythmMode) {
    void this.start(mode, true);
  }

  /**
   * Sounds the progression from the same look-ahead clock as the drums, so the pad can
   * never drift against the groove. Returns the chord index for the pulse, or -1.
   */
  private comp(bar: number, step: number, subdivision: number, beats: number, bpm: number) {
    const harmony = this.config.harmony;
    if (!harmony?.enabled || !harmony.steps.length) return -1;
    const at = harmonyAt(harmony.steps, bar);
    if (!at) return -1;
    const beatSeconds = 60 / bpm;
    // Sustains start with the chord (or at the next beat when switched on mid-bar).
    const stabs = harmony.style === 'stabs';
    const offbeats = harmony.style === 'offbeats';
    const hit = stabs
      ? step % (subdivision * 2) === 0
      : offbeats
        ? step % subdivision === (subdivision === 3 ? 2 : subdivision / 2)
        : (step === 0 && at.first) || (this.pendingPad && step % subdivision === 0);
    if (this.comping && step === 0 && at.first) this.comping.release(this.next);
    if (this.comping && hit) {
      const remainingBeats = (at.step.bars - at.localBar) * beats - Math.floor(step / subdivision);
      this.comping.play(
        this.chordVoicings[at.index] ?? harmonyVoicing(at.step),
        this.next,
        stabs ? beatSeconds * 1.3 : offbeats ? beatSeconds * 0.4 : beatSeconds * remainingBeats,
        harmony.timbre,
      );
      this.pendingPad = false;
    }
    return at.index;
  }

  /**
   * Called once per completed bar. The engine owns the new tempo so the very next bar is
   * already scheduled with it; the callback only keeps the visible BPM in step.
   */
  private advanceRamp(bpm: number) {
    const ramp = this.config.preferences.ramp;
    this.rampBar++;
    if (!ramp.enabled || !ramp.step || this.rampBar % ramp.every !== 0) return;
    const next =
      ramp.step > 0
        ? Math.min(ramp.target, bpm + ramp.step)
        : Math.max(ramp.target, bpm + ramp.step);
    if (next === bpm) return;
    this.ramped = next;
    this.onTempo?.(next);
  }

  /**
   * The time of the next bar line on the audio clock, or undefined when nothing runs.
   * Swing moves notes inside a bar but never changes its length, so one multiplication
   * is enough — there is no need to walk the schedule.
   */
  nextDownbeat(): number | undefined {
    const ctx = this.ctx;
    if (!ctx || !this.status.running || !this.barStart) return undefined;
    const beats = this.status.mode === 'drums' ? 4 : this.config.preferences.metronome.beats;
    const bar = (60 / (this.ramped ?? this.config.bpm)) * beats;
    let target = this.barStart;
    // Far enough ahead that the notes can still be scheduled before it arrives.
    while (target < ctx.currentTime + 0.06) target += bar;
    return target;
  }

  private schedule() {
    const ctx = this.ctx;
    const synth = this.synth;
    if (!ctx || !synth) return;
    if (ctx.state !== 'running') {
      this.stop();
      this.publish({ error: 'Audio wurde unterbrochen. Drücke Start, um weiterzuspielen.' });
      return;
    }
    const { preferences } = this.config;
    const bpm = this.ramped ?? this.config.bpm;
    const metro = preferences.metronome;
    const drums = this.status.mode === 'drums';
    const beats = drums ? 4 : metro.beats;
    // Retain at most the latest elapsed pulse when animation frames are throttled.
    while (this.queue.length > 1 && this.queue[1].time <= ctx.currentTime) this.queue.shift();
    const recovered = recoverScheduleTime(this.next, ctx.currentTime);
    if (recovered !== this.next) {
      this.next = recovered;
      if (this.sequence > 0) this.absoluteBar++;
      this.sequence = 0;
      this.queue = [];
    }
    while (this.next < ctx.currentTime + 0.1) {
      if (this.sequence === 0) this.barStart = this.next;
      const absoluteBar = this.absoluteBar;
      const countIn = absoluteBar < this.countInBars;
      const bar = countIn ? absoluteBar : absoluteBar - this.countInBars;
      const position = drumPosition(this.config, countIn ? 0 : bar);
      const subdivision = drums ? position.pattern.subdivision : metro.subdivision;
      const stepsPerBar = beats * subdivision;
      const step = this.sequence;
      const beat = Math.floor(step / subdivision);
      let swing = 0.5;
      if (countIn) {
        if (step % subdivision === 0) synth.click(this.next, beat === 0);
      } else if (drums) {
        const pattern = position.pattern;
        swing = pattern.swing;
        const chordIndex = this.comp(bar, step, subdivision, beats, bpm);
        const mix = this.config.pattern;
        const solo = instruments.some(({ id }) => mix.tracks[id].solo);
        const patternStep = position.localBar * stepsPerBar + step;
        // Sustaining voices are scheduled first so a choking voice at the same step cuts them.
        for (const spec of [...instruments].sort(
          (a, b) => Number(!!b.sustain) - Number(!!a.sustain),
        )) {
          const value = pattern.tracks[spec.id].steps[patternStep];
          const track = mix.tracks[spec.id];
          if (value && !track.mute && (!solo || track.solo))
            synth.hit(spec.id, stepVelocity[value], this.next, track.sound);
        }
        this.queue.push({
          time: this.next,
          pulse: { step: patternStep, beat, bar, countIn: false, silent: false, chord: chordIndex },
        });
        this.next += stepDuration(bpm, subdivision, step, swing);
        this.sequence++;
        if (this.sequence >= stepsPerBar) {
          this.sequence = 0;
          this.absoluteBar++;
          this.advanceRamp(bpm);
        }
        continue;
      } else if (clickAt(step, bar, metro)) {
        synth.click(this.next, step === 0 && metro.accent, step % subdivision !== 0);
      }
      this.queue.push({
        time: this.next,
        pulse: {
          step,
          beat,
          bar,
          countIn,
          silent: !drums && !countIn && isSilentBar(bar, metro),
          chord: -1,
        },
      });
      this.next += stepDuration(bpm, subdivision, step, 0.5);
      this.sequence++;
      if (this.sequence >= stepsPerBar) {
        this.sequence = 0;
        this.absoluteBar++;
        if (!countIn) this.advanceRamp(bpm);
      }
    }
  }

  stop() {
    this.generation++;
    this.pausedPosition = null;
    this.pendingPad = false;
    clearInterval(this.timer);
    cancelAnimationFrame(this.frame);
    clearTimeout(this.previewTimer);
    clearTimeout(this.chordPreviewTimer);
    this.previewComping?.dispose();
    this.previewComping = undefined;
    this.previewSynth?.dispose();
    this.previewSynth = undefined;
    this.synth?.dispose();
    this.synth = undefined;
    this.ramped = undefined;
    this.comping?.dispose();
    this.comping = undefined;
    this.ctx = undefined;
    this.queue = [];
    this.publish({ running: false, starting: false, paused: false, pulse: null });
  }
}
