export type BassString = 'E' | 'A' | 'D' | 'G';
export interface FingeringNote {
  string: BassString;
  fret: number;
  degree?: string;
  duration: string;
  name?: string;
  role?: string;
}
export interface RestEvent {
  rest: true;
  duration: string;
}
export type MusicEvent = FingeringNote | RestEvent;
export const isNote = (event: MusicEvent): event is FingeringNote => !('rest' in event);
export const tuning: Record<BassString, number> = { E: 28, A: 33, D: 38, G: 43 };
export const strings: BassString[] = ['G', 'D', 'A', 'E'];
export const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const keyRoots = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Cb',
];
export const mod = (n: number, m = 12) => ((n % m) + m) % m;
const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const majorSteps = [0, 2, 4, 5, 7, 9, 11];
export const chromaticDegrees = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
export const intervalNames = [
  'Unison',
  'Minor second',
  'Major second',
  'Minor third',
  'Major third',
  'Perfect fourth',
  'Tritone',
  'Perfect fifth',
  'Minor sixth',
  'Major sixth',
  'Minor seventh',
  'Major seventh',
];
export function pitchClass(name: string): number {
  const normalized = name.replaceAll('♭', 'b').replaceAll('♯', '#');
  const letter = normalized[0]?.toUpperCase();
  if (!(letter in natural)) throw new Error(`Invalid note ${name}`);
  return mod(
    natural[letter] +
      [...normalized.slice(1)].reduce((n, c) => n + (c === '#' ? 1 : c === 'b' ? -1 : 0), 0),
  );
}
export function degreeSemitones(degree: string): number {
  const match = /^([b#]*)(\d+)$/.exec(degree);
  if (!match) throw new Error(`Invalid degree ${degree}`);
  const num = Number(match[2]) - 1;
  return (
    majorSteps[mod(num, 7)] +
    Math.floor(num / 7) * 12 +
    [...match[1]].reduce((n, c) => n + (c === '#' ? 1 : -1), 0)
  );
}
export function spellDegree(root: string, degree: string): string {
  const number = Number(degree.match(/\d+/)?.[0] ?? 1) - 1;
  const letter = letters[mod(letters.indexOf(root[0]) + number, 7)];
  const target = mod(pitchClass(root) + degreeSemitones(degree));
  let delta = mod(target - natural[letter]);
  if (delta > 6) delta -= 12;
  return letter + (delta > 0 ? '#'.repeat(delta) : 'b'.repeat(-delta));
}
export function noteName(midi: number, preferFlats = false): string {
  return (
    preferFlats
      ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
      : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  )[mod(midi)];
}
export const pretty = (text: string) => text.replaceAll('b', '♭').replaceAll('#', '♯');
export const soundingMidi = (note: FingeringNote) => tuning[note.string] + note.fret;
export function writtenPitch(note: FingeringNote): {
  key: string;
  accidental: string;
  octave: number;
  name: string;
} {
  const midi = soundingMidi(note) + 12;
  const name = note.name ?? noteName(midi);
  const accidental = name.slice(1);
  const offset = [...accidental].reduce((n, c) => n + (c === '#' ? 1 : c === 'b' ? -1 : 0), 0);
  const octave = Math.round((midi - natural[name[0]] - offset) / 12) - 1;
  return { key: `${name.toLowerCase()}/${octave}`, accidental, octave, name };
}
/** Preserve every source string choice and transpose the entire route by one offset. */
export function transposeRoute(events: MusicEvent[], root: string, baseRoot = 'D'): MusicEvent[] {
  const positions = events.filter(isNote);
  const options = [
    mod(pitchClass(root) - pitchClass(baseRoot)),
    mod(pitchClass(root) - pitchClass(baseRoot)) - 12,
  ];
  const delta = options
    .filter((d) => positions.every((n) => n.fret + d >= 0 && n.fret + d <= 24))
    .sort((a, b) => Math.abs(a) - Math.abs(b))[0];
  if (delta === undefined) throw new Error('Route cannot be transposed within 0–24 frets');
  return events.map((n) =>
    isNote(n)
      ? {
          ...n,
          fret: n.fret + delta,
          name: n.degree
            ? spellDegree(root, n.degree)
            : noteName(soundingMidi(n) + delta, root.includes('b')),
        }
      : n,
  );
}
export function allPositions(
  root: string,
  degrees: string[],
  start = 0,
  end = 24,
): FingeringNote[] {
  const result: FingeringNote[] = [];
  for (const string of strings)
    for (let fret = start; fret <= end; fret++) {
      const pc = mod(tuning[string] + fret - pitchClass(root));
      const degree = degrees.find((d) => mod(degreeSemitones(d)) === pc);
      if (degree)
        result.push({
          string,
          fret,
          degree,
          name: spellDegree(root, degree),
          duration: 'q',
          role:
            degree === '1'
              ? 'Root'
              : degree === 'b5' && degrees.includes('5')
                ? 'Passing tone'
                : ['3', 'b3', 'b5', '5', '#5', '7', 'b7', 'bb7'].includes(degree)
                  ? 'Chord tone'
                  : 'Scale tone',
        });
    }
  return result;
}
/** A compact arpeggio based at A5 in D; each pitch appears once plus the octave. */
export function arpeggioRoute(degrees: string[]): FingeringNote[] {
  return [...degrees, '1'].map((degree, i) => {
    const offset = i === degrees.length ? 12 : degreeSemitones(degree);
    const string: BassString = offset === 0 ? 'A' : offset < 5 ? 'D' : offset < 10 ? 'D' : 'G';
    return { string, fret: 38 + offset - tuning[string], degree, duration: 'q' };
  });
}
export function routeRange(events: MusicEvent[]): [number, number] {
  const frets = events.filter(isNote).map((n) => n.fret);
  if (!frets.length) return [3, 10];
  const min = Math.min(...frets),
    max = Math.max(...frets);
  return [Math.max(0, min - 1), Math.min(24, Math.max(max + 1, min + 5))];
}
export function intervalBetween(root: string, target: string): string {
  const semitones = mod(pitchClass(target) - pitchClass(root));
  const number = mod(letters.indexOf(target[0]) - letters.indexOf(root[0]), 7) + 1;
  const expected = majorSteps[number - 1];
  let difference = semitones - expected;
  if (difference > 6) difference -= 12;
  if (difference < -6) difference += 12;
  const perfect = [1, 4, 5].includes(number);
  const quality = perfect
    ? difference === 0
      ? 'Perfect'
      : difference === 1
        ? 'Augmented'
        : difference === -1
          ? 'Diminished'
          : `${Math.abs(difference)}× ${difference > 0 ? 'augmented' : 'diminished'}`
    : difference === 0
      ? 'Major'
      : difference === -1
        ? 'Minor'
        : difference === 1
          ? 'Augmented'
          : difference === -2
            ? 'Diminished'
            : `${Math.abs(difference)} alterations`;
  return number === 1 && difference === 0
    ? 'Unison'
    : `${quality} ${['', 'unison', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'][number]}`;
}
export function harmony(root: string, minor = false) {
  const degrees = minor
    ? ['1', '2', 'b3', '4', '5', 'b6', 'b7']
    : ['1', '2', '3', '4', '5', '6', '7'];
  const qualities = minor
    ? ['Minor', 'Diminished', 'Major', 'Minor', 'Minor', 'Major', 'Major']
    : ['Major', 'Minor', 'Minor', 'Major', 'Major', 'Minor', 'Diminished'];
  const symbols = minor
    ? ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7']
    : ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];
  const roman = minor
    ? ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']
    : ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  return degrees.map((d, i) => ({
    degree: d,
    root: spellDegree(root, d),
    quality: qualities[i],
    symbol: symbols[i],
    roman: roman[i],
  }));
}
export function keySignature(root: string) {
  const notes = ['1', '2', '3', '4', '5', '6', '7'].map((d) => spellDegree(root, d));
  const order = notes.some((n) => n.includes('b'))
    ? ['B', 'E', 'A', 'D', 'G', 'C', 'F']
    : ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  return {
    notes,
    altered: notes
      .filter((n) => n.length > 1)
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])),
    relativeMinor: notes[5],
  };
}
/** Choose a conventional enharmonic tonic when the requested spelling creates
 * unnecessary double accidentals or a much heavier key signature. Pitch is unchanged. */
export function readableRoot(root: string, degrees: string[]): string {
  const enharmonics = [
    ['C#', 'Db'],
    ['D#', 'Eb'],
    ['F#', 'Gb'],
    ['G#', 'Ab'],
    ['A#', 'Bb'],
  ];
  const choices = enharmonics.find((pair) => pair.includes(root));
  if (!choices) return root;
  const cost = (candidate: string) =>
    degrees.reduce((sum, degree) => {
      const count = spellDegree(candidate, degree).length - 1;
      return sum + count + (count > 1 ? 12 : 0);
    }, 0);
  const alternate = choices.find((candidate) => candidate !== root)!;
  return cost(alternate) < cost(root) ? alternate : root;
}
