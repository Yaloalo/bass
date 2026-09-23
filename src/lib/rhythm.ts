/** Quarter-note BPM throughout. Swing divides pairs of the selected grid evenly in time. */
export type RhythmMode = 'drums' | 'metronome';

/** 0 silent · 1 ghost · 2 hit · 3 accent. Velocity is part of the pattern, not the mix. */
export type Step = 0 | 1 | 2 | 3;
export const stepWords = ['aus', 'Ghost', 'Schlag', 'Akzent'] as const;
export const stepVelocity = [0, 0.3, 0.62, 1] as const;
/** Click order puts the two everyday values first: off, hit, accent, then the quiet ghost. */
export const stepCycle: Step[] = [0, 2, 3, 1];
export function nextStep(value: Step, direction: 1 | -1 = 1): Step {
  const index = stepCycle.indexOf(value);
  return stepCycle[(index + direction + stepCycle.length) % stepCycle.length];
}

export type Instrument =
  | 'kick'
  | 'snare'
  | 'rim'
  | 'clap'
  | 'tom'
  | 'tomMid'
  | 'tomHigh'
  | 'closedHat'
  | 'openHat'
  | 'ride'
  | 'crash'
  | 'shaker'
  | 'maracas'
  | 'cabasa'
  | 'tambourine'
  | 'guiro'
  | 'clave'
  | 'cowbell'
  | 'timbaleShell'
  | 'congaHigh'
  | 'congaLow'
  | 'congaSlap'
  | 'bongoHigh'
  | 'bongoLow'
  | 'timbaleHigh'
  | 'timbaleLow';

/** Each engine is a different Web Audio graph; the sound parameters mean the same thing in all of them. */
export type VoiceEngine =
  'membrane' | 'snare' | 'slap' | 'metal' | 'wood' | 'bell' | 'clap' | 'shaker' | 'scrape';

export type InstrumentFamily =
  'Trommeln' | 'Becken' | 'Handpercussion' | 'Holz & Glocken' | 'Latin-Trommeln';

export interface InstrumentSpec {
  id: Instrument;
  name: string;
  /** Six characters or fewer, for the narrow sequencer rail on phones. */
  short: string;
  family: InstrumentFamily;
  engine: VoiceEngine;
  /** Body sweep in hertz, the untuned reference used by the synth and the envelope preview. */
  from: number;
  to: number;
  /** Seconds at decay 1. */
  duration: number;
  /** Noise colour and how much of the voice is noise rather than body. */
  noiseHz: number;
  noiseMix: number;
  level: number;
  /** Sounds in the same choke group cut each other; only `sustain` voices are held long enough to matter. */
  choke?: string;
  sustain?: boolean;
}

export const instruments: InstrumentSpec[] = [
  {
    id: 'kick',
    name: 'Kick',
    short: 'Kick',
    family: 'Trommeln',
    engine: 'membrane',
    from: 145,
    to: 42,
    duration: 0.26,
    noiseHz: 2200,
    noiseMix: 0.05,
    level: 0.8,
  },
  {
    id: 'snare',
    name: 'Snare',
    short: 'Snare',
    family: 'Trommeln',
    engine: 'snare',
    from: 190,
    to: 125,
    duration: 0.16,
    noiseHz: 1100,
    noiseMix: 0.7,
    level: 0.78,
  },
  {
    id: 'rim',
    name: 'Rimclick',
    short: 'Rim',
    family: 'Trommeln',
    engine: 'wood',
    from: 1750,
    to: 950,
    duration: 0.04,
    noiseHz: 3200,
    noiseMix: 0.25,
    level: 0.7,
  },
  {
    id: 'clap',
    name: 'Clap',
    short: 'Clap',
    family: 'Trommeln',
    engine: 'clap',
    from: 420,
    to: 350,
    duration: 0.17,
    noiseHz: 1400,
    noiseMix: 0.9,
    level: 0.72,
  },
  {
    id: 'tom',
    name: 'Tom tief',
    short: 'Tom t',
    family: 'Trommeln',
    engine: 'membrane',
    from: 150,
    to: 75,
    duration: 0.4,
    noiseHz: 1800,
    noiseMix: 0.12,
    level: 0.78,
  },
  {
    id: 'tomMid',
    name: 'Tom mittel',
    short: 'Tom m',
    family: 'Trommeln',
    engine: 'membrane',
    from: 205,
    to: 104,
    duration: 0.34,
    noiseHz: 2000,
    noiseMix: 0.12,
    level: 0.78,
  },
  {
    id: 'tomHigh',
    name: 'Tom hoch',
    short: 'Tom h',
    family: 'Trommeln',
    engine: 'membrane',
    from: 272,
    to: 140,
    duration: 0.28,
    noiseHz: 2300,
    noiseMix: 0.12,
    level: 0.78,
  },
  {
    id: 'closedHat',
    name: 'Hi-Hat zu',
    short: 'HiHat zu',
    family: 'Becken',
    engine: 'metal',
    from: 6500,
    to: 6200,
    duration: 0.055,
    noiseHz: 6500,
    noiseMix: 0.85,
    level: 0.55,
    choke: 'hat',
  },
  {
    id: 'openHat',
    name: 'Hi-Hat offen',
    short: 'HiHat auf',
    family: 'Becken',
    engine: 'metal',
    from: 6300,
    to: 5600,
    duration: 0.34,
    noiseHz: 6300,
    noiseMix: 0.85,
    level: 0.55,
    choke: 'hat',
    sustain: true,
  },
  {
    id: 'ride',
    name: 'Ride',
    short: 'Ride',
    family: 'Becken',
    engine: 'metal',
    from: 3300,
    to: 3100,
    duration: 0.75,
    noiseHz: 5200,
    noiseMix: 0.6,
    level: 0.52,
  },
  {
    id: 'crash',
    name: 'Crash',
    short: 'Crash',
    family: 'Becken',
    engine: 'metal',
    from: 4200,
    to: 3400,
    duration: 1.5,
    noiseHz: 4200,
    noiseMix: 0.88,
    level: 0.45,
  },
  {
    id: 'shaker',
    name: 'Shaker',
    short: 'Shaker',
    family: 'Handpercussion',
    engine: 'shaker',
    from: 7200,
    to: 7000,
    duration: 0.07,
    noiseHz: 7200,
    noiseMix: 1,
    level: 0.45,
  },
  {
    id: 'maracas',
    name: 'Maracas',
    short: 'Maracas',
    family: 'Handpercussion',
    engine: 'shaker',
    from: 8600,
    to: 8200,
    duration: 0.045,
    noiseHz: 8600,
    noiseMix: 1,
    level: 0.45,
  },
  {
    id: 'cabasa',
    name: 'Cabasa',
    short: 'Cabasa',
    family: 'Handpercussion',
    engine: 'shaker',
    from: 9200,
    to: 8600,
    duration: 0.06,
    noiseHz: 9200,
    noiseMix: 1,
    level: 0.42,
  },
  {
    id: 'tambourine',
    name: 'Tamburin',
    short: 'Tamburin',
    family: 'Handpercussion',
    engine: 'metal',
    from: 7600,
    to: 7200,
    duration: 0.11,
    noiseHz: 7600,
    noiseMix: 0.8,
    level: 0.45,
  },
  {
    id: 'guiro',
    name: 'Güiro',
    short: 'Güiro',
    family: 'Handpercussion',
    engine: 'scrape',
    from: 2400,
    to: 5200,
    duration: 0.2,
    noiseHz: 2400,
    noiseMix: 1,
    level: 0.5,
    choke: 'guiro',
    sustain: true,
  },
  {
    id: 'clave',
    name: 'Clave',
    short: 'Clave',
    family: 'Holz & Glocken',
    engine: 'wood',
    from: 2400,
    to: 2200,
    duration: 0.07,
    noiseHz: 4000,
    noiseMix: 0.12,
    level: 0.82,
  },
  {
    id: 'cowbell',
    name: 'Cowbell',
    short: 'Cowbell',
    family: 'Holz & Glocken',
    engine: 'bell',
    from: 560,
    to: 545,
    duration: 0.22,
    noiseHz: 3000,
    noiseMix: 0.06,
    level: 0.68,
  },
  {
    id: 'timbaleShell',
    name: 'Timbales-Kessel',
    short: 'Kessel',
    family: 'Holz & Glocken',
    engine: 'wood',
    from: 1250,
    to: 900,
    duration: 0.05,
    noiseHz: 3600,
    noiseMix: 0.3,
    level: 0.62,
  },
  {
    id: 'congaHigh',
    name: 'Conga hoch (offen)',
    short: 'Conga h',
    family: 'Latin-Trommeln',
    engine: 'membrane',
    from: 310,
    to: 250,
    duration: 0.24,
    noiseHz: 2600,
    noiseMix: 0.16,
    level: 0.74,
  },
  {
    id: 'congaLow',
    name: 'Conga tief (offen)',
    short: 'Conga t',
    family: 'Latin-Trommeln',
    engine: 'membrane',
    from: 205,
    to: 168,
    duration: 0.3,
    noiseHz: 2200,
    noiseMix: 0.16,
    level: 0.74,
  },
  {
    id: 'congaSlap',
    name: 'Conga Slap',
    short: 'Slap',
    family: 'Latin-Trommeln',
    engine: 'slap',
    from: 430,
    to: 300,
    duration: 0.11,
    noiseHz: 3400,
    noiseMix: 0.62,
    level: 0.74,
  },
  {
    id: 'bongoHigh',
    name: 'Bongo · macho',
    short: 'Bongo h',
    family: 'Latin-Trommeln',
    engine: 'membrane',
    from: 620,
    to: 520,
    duration: 0.14,
    noiseHz: 3800,
    noiseMix: 0.2,
    level: 0.68,
  },
  {
    id: 'bongoLow',
    name: 'Bongo · hembra',
    short: 'Bongo t',
    family: 'Latin-Trommeln',
    engine: 'membrane',
    from: 430,
    to: 360,
    duration: 0.17,
    noiseHz: 3200,
    noiseMix: 0.2,
    level: 0.68,
  },
  {
    id: 'timbaleHigh',
    name: 'Timbale hoch',
    short: 'Timbale h',
    family: 'Latin-Trommeln',
    engine: 'membrane',
    from: 720,
    to: 600,
    duration: 0.16,
    noiseHz: 4200,
    noiseMix: 0.3,
    level: 0.68,
  },
  {
    id: 'timbaleLow',
    name: 'Timbale tief',
    short: 'Timbale t',
    family: 'Latin-Trommeln',
    engine: 'membrane',
    from: 520,
    to: 430,
    duration: 0.2,
    noiseHz: 3600,
    noiseMix: 0.3,
    level: 0.68,
  },
];

const byId = new Map(instruments.map((spec) => [spec.id, spec]));
export const instrumentSpec = (id: Instrument): InstrumentSpec => byId.get(id)!;
export const families: InstrumentFamily[] = [
  'Trommeln',
  'Becken',
  'Handpercussion',
  'Holz & Glocken',
  'Latin-Trommeln',
];

/** Sustaining voices are scheduled first so a choking voice at the same step can cut them. */
export const scheduleOrder: Instrument[] = [
  ...instruments.filter((spec) => spec.sustain).map((spec) => spec.id),
  ...instruments.filter((spec) => !spec.sustain).map((spec) => spec.id),
];

/**
 * Two synthesis models. `fm` modulates the body oscillator with a second oscillator.
 * `analog` instead runs the whole voice through a resonant filter whose cutoff falls
 * with the hit — the architecture of the classic analog drum machines — and lets the
 * noise share be dialled against the body.
 */
export type SoundEngine = 'fm' | 'analog';

export interface DrumSound {
  engine: SoundEngine;
  /** Semitones of transposition applied to the whole voice. */
  pitch: number;
  /** Multiplies the instrument's natural length. */
  decay: number;
  /** Filter brightness and noise colour. */
  tone: number;
  /** FM modulation index scaler. 0 removes the modulator entirely. */
  fmAmount: number;
  fmRatio: number;
  /** Fraction of the voice over which the FM index — or the analog filter — falls away. */
  fmDecay: number;
  /** Analog only: voice filter resonance, 0…1 mapped to Q 0.7…22. */
  resonance: number;
  /** Analog only: scales the instrument's natural noise share, 0…2. The classic „snappy“. */
  noise: number;
  /** Extra pitch-envelope depth on top of the instrument's natural sweep. */
  bend: number;
  /** Waveshaper saturation. */
  drive: number;
  pan: number;
}

export interface DrumTrack {
  steps: Step[];
  volume: number;
  mute: boolean;
  solo: boolean;
  sound: DrumSound;
}

export type Subdivision = 2 | 3 | 4;
export type Bars = 1 | 2 | 4;

export interface DrumPattern {
  name: string;
  bars: Bars;
  subdivision: Subdivision;
  swing: number;
  /** Which instruments the grid shows. Hidden tracks still play; see visibleTracks(). */
  visible: Instrument[];
  tracks: Record<Instrument, DrumTrack>;
}

export interface SavedPattern {
  id: string;
  pattern: DrumPattern;
}

export interface MetronomeSettings {
  beats: number;
  subdivision: 1 | 2 | 3 | 4;
  accent: boolean;
  clicks: 'all' | 'backbeat' | 'first';
  gap: boolean;
  audibleBars: number;
  silentBars: number;
}

/**
 * Practising a passage faster than you can play it is the point, so the trainer raises
 * the tempo on its own and stops at a target rather than running away.
 */
export interface TempoRamp {
  enabled: boolean;
  /** BPM added each time; negative slows down instead. */
  step: number;
  /** Bars between changes. */
  every: number;
  /** Where it stops. */
  target: number;
}

export interface RhythmPreferences {
  volume: number;
  countIn: number;
  ramp: TempoRamp;
  metronome: MetronomeSettings;
}

export const defaultPreferences: RhythmPreferences = {
  volume: 0.65,
  countIn: 0,
  ramp: { enabled: false, step: 4, every: 4, target: 120 },
  metronome: {
    beats: 4,
    subdivision: 1,
    accent: true,
    clicks: 'all',
    gap: false,
    audibleBars: 2,
    silentBars: 2,
  },
};

export function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/* ------------------------------------------------------------------ kits */

export type KitId = 'standard' | 'extended' | 'afroCuban' | 'brazilian';

export const kits: { id: KitId; name: string; description: string; tracks: Instrument[] }[] = [
  {
    id: 'standard',
    name: 'Standard-Set',
    description: 'Kick, Snare, Hi-Hat und das Nötigste. Der klarste Einstieg.',
    tracks: ['kick', 'snare', 'closedHat', 'openHat', 'rim', 'clap', 'tom', 'ride', 'cowbell'],
  },
  {
    id: 'extended',
    name: 'Großes Set',
    description: 'Drei Toms, Crash und Handpercussion für Fills und längere Phrasen.',
    tracks: [
      'kick',
      'snare',
      'rim',
      'clap',
      'tom',
      'tomMid',
      'tomHigh',
      'closedHat',
      'openHat',
      'ride',
      'crash',
      'shaker',
      'tambourine',
    ],
  },
  {
    id: 'afroCuban',
    name: 'Afro-Cuban',
    description: 'Clave, Congas, Bongos, Timbales und Glocke. Für das Salsa- und Latin-Kapitel.',
    tracks: [
      'clave',
      'cowbell',
      'timbaleShell',
      'congaSlap',
      'congaHigh',
      'congaLow',
      'bongoHigh',
      'bongoLow',
      'timbaleHigh',
      'timbaleLow',
      'maracas',
      'guiro',
      'kick',
      'snare',
      'closedHat',
    ],
  },
  {
    id: 'brazilian',
    name: 'Brazilian',
    description: 'Surdo-schwere Kick, Rimclick, Shaker und Tamburin für Bossa und Samba.',
    tracks: [
      'kick',
      'snare',
      'rim',
      'closedHat',
      'tom',
      'shaker',
      'cabasa',
      'tambourine',
      'congaHigh',
      'congaLow',
      'clave',
    ],
  },
];

export const kitById = (id: KitId) => kits.find((kit) => kit.id === id) ?? kits[0];

/* ---------------------------------------------------------- sound design */

export function defaultSound(id: Instrument): DrumSound {
  const spec = instrumentSpec(id);
  const metallic = spec.engine === 'metal' || spec.engine === 'bell';
  return {
    engine: 'fm',
    pitch: 0,
    decay: 1,
    tone: 0.5,
    fmAmount: metallic ? 2.6 : 0,
    fmRatio: metallic ? 1.48 : spec.engine === 'membrane' ? 1 : 2.71,
    fmDecay: 0.45,
    resonance: 0.35,
    noise: 1,
    bend: 0,
    drive: 0,
    pan: 0,
  };
}

/** A sound bank is a synthesis character applied across the whole kit; steps and mix are untouched. */
export interface SoundBank {
  id: string;
  name: string;
  description: string;
  sound: (id: Instrument) => Partial<DrumSound>;
}

const membraneLike = (id: Instrument) => instrumentSpec(id).engine === 'membrane';
const metalLike = (id: Instrument) => ['metal', 'bell'].includes(instrumentSpec(id).engine);

export const soundBanks: SoundBank[] = [
  {
    id: 'natural',
    name: 'Natürlich',
    description:
      'Die schlichteste Variante. Gleichmäßiger Abfall, keine Modulation auf den Trommeln.',
    sound: () => ({}),
  },
  {
    id: 'analog808',
    name: 'Analog · lange Ausklänge',
    description: 'Tiefe, langsame Bassdrum mit langem Sub-Ausklang. Lass ihr im Tiefen Platz.',
    sound: (id) => ({
      pitch: id === 'kick' ? -4 : membraneLike(id) ? -1 : 0,
      decay: id === 'kick' ? 2.1 : membraneLike(id) ? 1.35 : 1,
      tone: id === 'kick' ? 0.24 : 0.45,
      bend: membraneLike(id) ? 0.35 : 0,
      fmAmount: metalLike(id) ? 3.4 : 0,
    }),
  },
  {
    id: 'analog909',
    name: 'Analog · knackig',
    description: 'Kurze, harte Attacks und helle Hi-Hats. Setzt sich in einem lauten Raum durch.',
    sound: (id) => ({
      pitch: id === 'kick' ? 2 : 0,
      decay: id === 'kick' ? 0.75 : membraneLike(id) ? 0.8 : 0.85,
      tone: 0.72,
      bend: membraneLike(id) ? 0.55 : 0,
      drive: membraneLike(id) ? 0.35 : 0.15,
      fmAmount: metalLike(id) ? 2.2 : 0,
    }),
  },
  {
    id: 'fm',
    name: 'FM-Studio',
    description: 'Jede Stimme bekommt einen Modulator. Metallisch, digital und präzise.',
    sound: (id) => ({
      tone: 0.62,
      fmAmount: id === 'kick' ? 1.4 : membraneLike(id) ? 2.4 : 3.2,
      fmRatio: membraneLike(id) ? 1.41 : 2.71,
      fmDecay: 0.3,
      drive: 0.12,
    }),
  },
  {
    id: 'room',
    name: 'Akustischer Raum',
    description: 'Weichere Attacks, etwas länger, weniger Modulation. Sitzt hinter dem Bass.',
    sound: (id) => ({
      decay: membraneLike(id) ? 1.2 : 1.15,
      tone: 0.4,
      bend: membraneLike(id) ? 0.2 : 0,
      fmAmount: metalLike(id) ? 1.6 : 0,
    }),
  },
  {
    id: 'lofi',
    name: 'Lo-Fi-Tape',
    description: 'Dumpf, angezerrt und leicht verstimmt. Gut, wenn das Set zu sehr ablenkt.',
    sound: (id) => ({
      pitch: -2,
      decay: 0.9,
      tone: 0.18,
      drive: 0.7,
      fmAmount: metalLike(id) ? 1.1 : 0,
    }),
  },
];

/**
 * Sound presets for one voice. A bank changes the whole kit; these change only the
 * selected instrument, so a kick can be retuned without touching the hats.
 */
export interface VoicePreset {
  id: string;
  name: string;
  hint: string;
  /** The voices this preset was designed for. */
  applies: (id: Instrument) => boolean;
  sound: Partial<DrumSound>;
}

const engineIs =
  (...engines: VoiceEngine[]) =>
  (id: Instrument) =>
    engines.includes(instrumentSpec(id).engine);
const isKick = (id: Instrument) => id === 'kick';
const isDrumSkin = (id: Instrument) => instrumentSpec(id).engine === 'membrane' && id !== 'kick';

export const voicePresets: VoicePreset[] = [
  {
    id: 'kick-sub',
    name: '808-Sub',
    hint: 'Tief und lang. Lass ihr im Bass Platz.',
    applies: isKick,
    sound: { pitch: -5, decay: 2.2, tone: 0.2, bend: 0.3, drive: 0, fmAmount: 0 },
  },
  {
    id: 'kick-punch',
    name: 'Punch',
    hint: 'Kurz, hart, mit deutlichem Anschlag.',
    applies: isKick,
    sound: { pitch: 1, decay: 0.8, tone: 0.6, bend: 0.6, drive: 0.4, fmAmount: 0 },
  },
  {
    id: 'kick-acoustic',
    name: 'Akustisch',
    hint: 'Mittlere Länge, wenig Effekt. Der Allrounder.',
    applies: isKick,
    sound: { pitch: 0, decay: 1, tone: 0.45, bend: 0.25, drive: 0.1, fmAmount: 0 },
  },
  {
    id: 'kick-click',
    name: 'Click',
    hint: 'Nur Attack. Gut hörbar über lautem Bass.',
    applies: isKick,
    sound: { pitch: 3, decay: 0.55, tone: 0.85, bend: 0.75, drive: 0.25, fmAmount: 0 },
  },
  {
    id: 'kick-dub',
    name: 'Dub-Tiefe',
    hint: 'Sehr tief und sehr lang. Nur für langsame Tempi.',
    applies: isKick,
    sound: { pitch: -7, decay: 2.5, tone: 0.12, bend: 0.2, drive: 0, fmAmount: 0 },
  },
  {
    id: 'snare-fat',
    name: 'Fett & breit',
    hint: 'Langer Teppich, trägt den Backbeat allein.',
    applies: engineIs('snare'),
    sound: { pitch: -1, decay: 1.5, tone: 0.42, drive: 0.2 },
  },
  {
    id: 'snare-dry',
    name: 'Trocken',
    hint: 'Kurz und sachlich. Verdeckt keine Ghost Notes.',
    applies: engineIs('snare'),
    sound: { pitch: 0, decay: 0.6, tone: 0.55, drive: 0 },
  },
  {
    id: 'snare-crack',
    name: 'Knackig',
    hint: 'Heller Anschlag, setzt sich in einem lauten Raum durch.',
    applies: engineIs('snare'),
    sound: { pitch: 2, decay: 0.75, tone: 0.78, drive: 0.3 },
  },
  {
    id: 'snare-rimmy',
    name: 'Rimshot-artig',
    hint: 'Hoch und sehr kurz, fast wie ein Cross-Stick.',
    applies: engineIs('snare'),
    sound: { pitch: 5, decay: 0.45, tone: 0.9, drive: 0.45 },
  },
  {
    id: 'snare-lofi',
    name: 'Lo-Fi',
    hint: 'Dumpf und angezerrt. Lenkt am wenigsten ab.',
    applies: engineIs('snare'),
    sound: { pitch: -3, decay: 0.85, tone: 0.2, drive: 0.75 },
  },
  {
    id: 'skin-open',
    name: 'Offen & singend',
    hint: 'Langer Ausklang mit erkennbarer Tonhöhe.',
    applies: isDrumSkin,
    sound: { pitch: 0, decay: 1.6, tone: 0.5, bend: 0.2, fmAmount: 0 },
  },
  {
    id: 'skin-dry',
    name: 'Kurz & trocken',
    hint: 'Gedämpft. Gut für dichte Latin-Muster.',
    applies: isDrumSkin,
    sound: { pitch: 0, decay: 0.7, tone: 0.45, bend: 0.1, fmAmount: 0 },
  },
  {
    id: 'skin-low',
    name: 'Tief gestimmt',
    hint: 'Vier Halbtöne tiefer, mit Sweep.',
    applies: isDrumSkin,
    sound: { pitch: -4, decay: 1.4, tone: 0.35, bend: 0.3, fmAmount: 0 },
  },
  {
    id: 'skin-high',
    name: 'Hoch gestimmt',
    hint: 'Vier Halbtöne höher und kürzer.',
    applies: isDrumSkin,
    sound: { pitch: 4, decay: 0.9, tone: 0.6, bend: 0.15, fmAmount: 0 },
  },
  {
    id: 'skin-fm',
    name: 'FM-Trommel',
    hint: 'Modulierter Klang, elektronisch statt akustisch.',
    applies: isDrumSkin,
    sound: { pitch: 0, decay: 1, tone: 0.6, fmAmount: 2.4, fmRatio: 1.41, fmDecay: 0.3 },
  },
  {
    id: 'metal-tight',
    name: 'Eng & spitz',
    hint: 'Kurze, helle Hi-Hat. Das Standard-Achtelbett.',
    applies: engineIs('metal'),
    sound: { decay: 0.55, tone: 0.8, fmAmount: 2.4, fmRatio: 2.71, fmDecay: 0.3 },
  },
  {
    id: 'metal-dark',
    name: 'Weich & dunkel',
    hint: 'Zurückgenommen. Stört tiefe Linien nicht.',
    applies: engineIs('metal'),
    sound: { decay: 1.1, tone: 0.3, fmAmount: 1.4, fmRatio: 1.48, fmDecay: 0.5 },
  },
  {
    id: 'metal-glassy',
    name: 'Glasig',
    hint: 'Langer, unharmonischer Ausklang. Für Ride und Crash.',
    applies: engineIs('metal'),
    sound: { decay: 1.4, tone: 0.85, fmAmount: 3.6, fmRatio: 3.37, fmDecay: 0.6 },
  },
  {
    id: 'metal-tick',
    name: 'Kurzer Tick',
    hint: 'Fast nur Anschlag – eine reine Zählhilfe.',
    applies: engineIs('metal'),
    sound: { decay: 0.35, tone: 0.92, fmAmount: 1.8, fmRatio: 2.71, fmDecay: 0.2 },
  },
  {
    id: 'wood-dry',
    name: 'Trockenes Holz',
    hint: 'Natürlicher Klang für Clave und Cross-Stick.',
    applies: engineIs('wood'),
    sound: { pitch: 0, decay: 0.55, tone: 0.5, fmAmount: 1.2, fmRatio: 1, drive: 0 },
  },
  {
    id: 'wood-hard',
    name: 'Harter Klick',
    hint: 'Hoch und sehr kurz. Schneidet durch alles.',
    applies: engineIs('wood'),
    sound: { pitch: 4, decay: 0.35, tone: 0.85, fmAmount: 0.8, fmRatio: 1, drive: 0.3 },
  },
  {
    id: 'bell-open',
    name: 'Glocke offen',
    hint: 'Langer, klingender Ausklang.',
    applies: engineIs('bell'),
    sound: { decay: 1.6, tone: 0.6, fmAmount: 3, fmRatio: 1.48, fmDecay: 0.6 },
  },
  {
    id: 'bell-muted',
    name: 'Glocke gedämpft',
    hint: 'Kurz abgestoppt, wie mit der Hand gedämpft.',
    applies: engineIs('bell'),
    sound: { decay: 0.5, tone: 0.72, fmAmount: 2.2, fmRatio: 1.48, fmDecay: 0.25 },
  },
  {
    id: 'shake-fine',
    name: 'Fein',
    hint: 'Kurz und hell. Hält die Sechzehntel zusammen.',
    applies: engineIs('shaker', 'scrape'),
    sound: { decay: 0.6, tone: 0.8, drive: 0 },
  },
  {
    id: 'shake-broad',
    name: 'Breit',
    hint: 'Länger und dunkler, ein durchgehender Teppich.',
    applies: engineIs('shaker', 'scrape'),
    sound: { decay: 1.2, tone: 0.55, drive: 0 },
  },
  {
    id: 'clap-studio',
    name: 'Studio-Clap',
    hint: 'Breit und leicht verwaschen.',
    applies: engineIs('clap', 'slap'),
    sound: { decay: 1.1, tone: 0.6, drive: 0.2 },
  },
  {
    id: 'clap-tight',
    name: 'Enger Clap',
    hint: 'Trocken und punktgenau.',
    applies: engineIs('clap', 'slap'),
    sound: { decay: 0.6, tone: 0.75, drive: 0.1 },
  },
  {
    id: 'kick-analog',
    name: 'Analog-Filter',
    hint: 'Resonantes Tiefpassfilter statt FM. Rund und warm.',
    applies: isKick,
    sound: {
      engine: 'analog',
      pitch: -2,
      decay: 1.5,
      tone: 0.3,
      bend: 0.4,
      resonance: 0.55,
      noise: 0.4,
      fmDecay: 0.35,
    },
  },
  {
    id: 'snare-analog',
    name: 'Analog-Snare',
    hint: 'Gefilterter Teppich mit klingelnder Resonanz.',
    applies: engineIs('snare'),
    sound: {
      engine: 'analog',
      decay: 0.9,
      tone: 0.55,
      resonance: 0.6,
      noise: 1.3,
      fmDecay: 0.45,
    },
  },
  {
    id: 'skin-analog',
    name: 'Analog-Tom',
    hint: 'Filter-Sweep über der Trommel; wenig Rauschen.',
    applies: isDrumSkin,
    sound: {
      engine: 'analog',
      decay: 1.2,
      tone: 0.42,
      bend: 0.3,
      resonance: 0.5,
      noise: 0.3,
      fmDecay: 0.4,
    },
  },
  {
    id: 'metal-analog',
    name: 'Analog-Becken',
    hint: 'Schmales, klingelndes Filter auf dem Rauschen.',
    applies: engineIs('metal'),
    sound: {
      engine: 'analog',
      decay: 0.8,
      tone: 0.78,
      resonance: 0.72,
      noise: 1.2,
      fmDecay: 0.6,
    },
  },
];

/** The presets that fit this voice, always led by the instrument's own default. */
export function voicePresetsFor(id: Instrument): VoicePreset[] {
  return voicePresets.filter((preset) => preset.applies(id));
}

export function applySoundBank(pattern: DrumPattern, bankId: string): DrumPattern {
  const bank = soundBanks.find((item) => item.id === bankId) ?? soundBanks[0];
  return {
    ...pattern,
    tracks: Object.fromEntries(
      instruments.map(({ id }) => [
        id,
        { ...pattern.tracks[id], sound: { ...defaultSound(id), ...bank.sound(id) } },
      ]),
    ) as Record<Instrument, DrumTrack>,
  };
}

/* ------------------------------------------------------------- patterns */

export function emptyPattern(
  name = 'My groove',
  subdivision: Subdivision = 4,
  bars: Bars = 1,
  kit: KitId = 'standard',
): DrumPattern {
  return {
    name,
    subdivision,
    bars,
    swing: 0.5,
    visible: [...kitById(kit).tracks],
    tracks: Object.fromEntries(
      instruments.map((spec) => [
        spec.id,
        {
          steps: Array<Step>(4 * subdivision * bars).fill(0),
          volume: spec.level,
          mute: false,
          solo: false,
          sound: defaultSound(spec.id),
        },
      ]),
    ) as Record<Instrument, DrumTrack>,
  };
}

/** Hidden tracks still play, so anything with steps stays on the grid whatever the kit says. */
export function visibleTracks(pattern: DrumPattern): InstrumentSpec[] {
  return instruments.filter(
    (spec) =>
      pattern.visible.includes(spec.id) || pattern.tracks[spec.id].steps.some((step) => step !== 0),
  );
}

function normalizeSound(value: unknown, id: Instrument, legacyStep: boolean): DrumSound {
  const data = object(value);
  const defaults = defaultSound(id);
  return {
    engine: data.engine === 'analog' ? 'analog' : 'fm',
    pitch: clamp(data.pitch, -12, 12, defaults.pitch),
    decay: clamp(data.decay, 0.25, 2.5, defaults.decay),
    tone: clamp(data.tone, 0, 1, defaults.tone),
    fmAmount: clamp(data.fmAmount, 0, 8, defaults.fmAmount),
    fmRatio: clamp(data.fmRatio, 0.25, 8, defaults.fmRatio),
    // Patterns saved before the envelope controls existed keep their audible character.
    fmDecay: clamp(data.fmDecay, 0.05, 1, legacyStep ? 0.45 : defaults.fmDecay),
    resonance: clamp(data.resonance, 0, 1, defaults.resonance),
    noise: clamp(data.noise, 0, 2, defaults.noise),
    bend: clamp(data.bend, 0, 1, defaults.bend),
    drive: clamp(data.drive, 0, 1, defaults.drive),
    pan: clamp(data.pan, -1, 1, defaults.pan),
  };
}

const isSubdivision = (value: unknown): value is Subdivision =>
  value === 2 || value === 3 || value === 4;
const isBars = (value: unknown): value is Bars => value === 1 || value === 2 || value === 4;
const isInstrument = (value: unknown): value is Instrument =>
  typeof value === 'string' && byId.has(value as Instrument);

/**
 * `legacy` reads a pattern stored before velocity gained a ghost level, where 1 meant
 * hit and 2 meant accent. Those map to 2 and 3; everything else is clamped to silence.
 */
export function normalizePattern(value: unknown, legacy = false): DrumPattern {
  const data = object(value);
  const name =
    typeof data.name === 'string' ? data.name.trim().slice(0, 60) || 'My groove' : 'My groove';
  const result = emptyPattern(
    name,
    isSubdivision(data.subdivision) ? data.subdivision : 4,
    isBars(data.bars) ? data.bars : 1,
  );
  result.swing = clamp(data.swing, 0.5, 2 / 3, 0.5);
  if (Array.isArray(data.visible)) {
    const visible = data.visible.filter(isInstrument);
    result.visible = visible.length ? [...new Set(visible)] : result.visible;
  }
  const tracks = object(data.tracks);
  for (const spec of instruments) {
    const track = object(tracks[spec.id]);
    const steps = Array.isArray(track.steps) ? track.steps : [];
    result.tracks[spec.id] = {
      steps: result.tracks[spec.id].steps.map((_, index) => {
        const stored = steps[index];
        if (legacy) return stored === 1 ? 2 : stored === 2 ? 3 : 0;
        return stored === 1 || stored === 2 || stored === 3 ? (stored as Step) : 0;
      }),
      volume: clamp(track.volume, 0, 1, spec.level),
      mute: track.mute === true,
      solo: track.solo === true,
      sound: normalizeSound(track.sound, spec.id, legacy),
    };
  }
  return result;
}

export function normalizeSaved(value: unknown, legacy = false): SavedPattern[] {
  return Array.isArray(value)
    ? value
        .slice(0, 40)
        .flatMap((item) => {
          const saved = object(item);
          return typeof saved.id === 'string' &&
            saved.id.length < 100 &&
            saved.pattern &&
            typeof saved.pattern === 'object'
            ? [{ id: saved.id, pattern: normalizePattern(saved.pattern, legacy) }]
            : [];
        })
        .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    : [];
}

export function normalizePreferences(value: unknown): RhythmPreferences {
  const data = object(value);
  const metro = object(data.metronome);
  return {
    volume: clamp(data.volume, 0, 1, 0.65),
    countIn: Math.round(clamp(data.countIn, 0, 2, 0)),
    ramp: (() => {
      const ramp = object(data.ramp);
      return {
        enabled: ramp.enabled === true,
        step: Math.round(clamp(ramp.step, -20, 20, 4)) || 4,
        every: Math.round(clamp(ramp.every, 1, 32, 4)),
        target: Math.round(clamp(ramp.target, 30, 300, 120)),
      };
    })(),
    metronome: {
      beats: Math.round(clamp(metro.beats, 2, 7, 4)),
      subdivision:
        metro.subdivision === 2 || metro.subdivision === 3 || metro.subdivision === 4
          ? metro.subdivision
          : 1,
      accent: metro.accent !== false,
      clicks: metro.clicks === 'backbeat' || metro.clicks === 'first' ? metro.clicks : 'all',
      gap: metro.gap === true,
      audibleBars: Math.round(clamp(metro.audibleBars, 1, 8, 2)),
      silentBars: Math.round(clamp(metro.silentBars, 1, 8, 2)),
    },
  };
}

/** Keeps every hit that lands on a position the new grid can still express. */
export function resizePattern(
  pattern: DrumPattern,
  subdivision: Subdivision,
  bars: Bars,
): DrumPattern {
  const next = emptyPattern(pattern.name, subdivision, bars);
  next.swing = pattern.swing;
  next.visible = [...pattern.visible];
  const oldStepsPerBar = 4 * pattern.subdivision;
  for (const { id } of instruments) {
    const source = pattern.tracks[id].steps;
    next.tracks[id] = {
      ...pattern.tracks[id],
      steps: next.tracks[id].steps.map((_, index) => {
        const bar = Math.floor(index / (4 * subdivision));
        const beatPosition = ((index % (4 * subdivision)) / subdivision) * pattern.subdivision;
        if (!Number.isInteger(beatPosition)) return 0;
        // Shorter patterns repeat to fill a longer one, so growing never blanks the new bars.
        return source[((bar % pattern.bars) * oldStepsPerBar + beatPosition) % source.length] ?? 0;
      }),
    };
  }
  return next;
}

export function stepDuration(bpm: number, subdivision: number, step: number, swing = 0.5): number {
  const straight = 60 / clamp(bpm, 30, 240, 80) / subdivision;
  return subdivision === 2 || subdivision === 4
    ? straight * 2 * (step % 2 ? 1 - swing : swing)
    : straight;
}

export function isSilentBar(bar: number, settings: MetronomeSettings): boolean {
  return settings.gap && bar % (settings.audibleBars + settings.silentBars) >= settings.audibleBars;
}

/** Count-in always has a quarter-note pulse, independent of gap and click masks. */
export function clickAt(
  step: number,
  bar: number,
  settings: MetronomeSettings,
  countIn = false,
): boolean {
  const beat = Math.floor(step / settings.subdivision);
  if (countIn) return step % settings.subdivision === 0;
  if (isSilentBar(bar, settings)) return false;
  if (settings.clicks === 'first') return step === 0;
  if (settings.clicks === 'backbeat')
    return step % settings.subdivision === 0 && (beat === 1 || beat === 3);
  return true;
}

export function stepLabel(index: number, subdivision: number): string {
  const syllables =
    subdivision === 4 ? ['', 'e', '&', 'a'] : subdivision === 3 ? ['', 'trip', 'let'] : ['', '&'];
  return `${(Math.floor(index / subdivision) % 4) + 1}${syllables[index % subdivision] ?? ''}`;
}

/** One place builds the pad's accessible name, so the grid and its tests can never drift. */
export function stepAriaLabel(
  name: string,
  index: number,
  subdivision: number,
  value: Step,
): string {
  const bar = Math.floor(index / (4 * subdivision)) + 1;
  return `${name}, Takt ${bar}, ${stepLabel(index, subdivision)}: ${stepWords[value]}`;
}

export function recoverScheduleTime(next: number, now: number): number {
  // A throttled/background tab must never flush missed notes into one audible burst.
  return next < now ? now + 0.025 : next;
}

export function tappedTempo(taps: number[], now: number): { taps: number[]; bpm?: number } {
  const recent = !taps.length || now - taps.at(-1)! > 2200 ? [now] : [...taps.slice(-5), now];
  if (recent.length < 2) return { taps: recent };
  const gaps = recent.slice(1).map((time, i) => time - recent[i]);
  const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  return { taps: recent, bpm: Math.round(clamp(60000 / average, 30, 240, 80)) };
}

/* ------------------------------------------------------------ generator */

/** Keeps beat one and the backbeat, and never touches the user's sound design or mix. */
export function generateGroove(
  base: DrumPattern,
  level: number,
  random = Math.random,
): DrumPattern {
  const complexity = Math.round(clamp(level, 1, 4, 2));
  const fresh = emptyPattern(base.name, 4, base.bars);
  const hit = (id: Instrument, index: number, value: Step) => {
    fresh.tracks[id].steps[index] = value;
  };
  for (let bar = 0; bar < base.bars; bar++) {
    const offset = bar * 16;
    for (const step of [0, 8]) hit('kick', offset + step, 3);
    for (const step of [4, 12]) hit('snare', offset + step, 3);
    if (complexity >= 2)
      for (let step = 0; step < 16; step += 2) hit('closedHat', offset + step, step % 4 ? 2 : 3);
    if (complexity >= 3) {
      hit('kick', offset + [3, 6, 10][Math.min(2, Math.floor(random() * 3))], 2);
      hit('kick', offset + 8, random() < 0.5 ? 0 : 3);
      hit('closedHat', offset + 14, 0);
      hit('openHat', offset + 14, 2);
    }
    if (complexity >= 4) {
      hit('snare', offset + (random() < 0.5 ? 7 : 11), 1);
      for (const step of [1, 5, 9, 13]) if (random() < 0.45) hit('closedHat', offset + step, 1);
    }
  }
  return {
    ...base,
    subdivision: 4,
    swing: 0.5,
    name: base.name,
    tracks: Object.fromEntries(
      instruments.map(({ id }) => [id, { ...base.tracks[id], steps: fresh.tracks[id].steps }]),
    ) as Record<Instrument, DrumTrack>,
  };
}

export function clearSteps(pattern: DrumPattern): DrumPattern {
  const blank = emptyPattern('', pattern.subdivision, pattern.bars);
  return {
    ...pattern,
    tracks: Object.fromEntries(
      instruments.map(({ id }) => [id, { ...pattern.tracks[id], steps: blank.tracks[id].steps }]),
    ) as Record<Instrument, DrumTrack>,
  };
}

/** Writes `value` to every step that shares the clicked step's position modulo `every`. */
export function fillEvery(steps: Step[], from: number, every: number, value: Step): Step[] {
  return steps.map((old, index) => ((index - from) % every === 0 ? value : old));
}

export function shiftSteps(steps: Step[], delta: number): Step[] {
  const size = steps.length;
  return steps.map((_, index) => steps[(((index - delta) % size) + size) % size]);
}
