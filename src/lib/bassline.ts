import { harmony, spellDegree, pitchClass, mod, tuning, strings, noteName } from './music';
import type { FingeringNote } from './music';
export const layerNames = [
  'Root',
  'Fifth',
  'Third',
  'Seventh',
  'Chromatic approach',
  'Passing tones',
] as const;
export interface BasslineBar {
  symbol: string;
  root: string;
  available: { name: string; degree: string; role: string }[];
  events: FingeringNote[];
}
export function positionForMidi(midi: number, previous?: FingeringNote): FingeringNote {
  const options = strings
    .map((string) => ({ string, fret: midi - tuning[string], duration: 'q' }))
    .filter((n) => n.fret >= 0 && n.fret <= 24);
  options.sort(
    (a, b) =>
      Math.abs(a.fret - (previous?.fret ?? 5)) -
      Math.abs(b.fret - (previous?.fret ?? 5)) +
      (a.string === previous?.string ? -0.5 : 0) -
      (b.string === previous?.string ? -0.5 : 0),
  );
  if (!options.length) throw new Error('No playable position');
  return options[0];
}
export function buildBassline(key: string, layers: string[]): BasslineBar[] {
  const family = harmony(key);
  const chords = [family[1], family[4], family[0], family[0]];
  let previous: FingeringNote | undefined;
  return chords.map((chord, index) => {
    const minor = chord.quality === 'Minor';
    const degreeMap: Record<string, string> = {
      Root: '1',
      Fifth: '5',
      Third: minor ? 'b3' : '3',
      Seventh: chord.symbol === 'maj7' ? '7' : 'b7',
    };
    const available = ['Root', 'Fifth', 'Third', 'Seventh']
      .filter((l) => layers.includes(l))
      .map((l) => ({
        degree: degreeMap[l],
        name: spellDegree(chord.root, degreeMap[l]),
        role: 'Chord tone',
      }));
    const next = chords[(index + 1) % chords.length];
    const approach = spellDegree(next.root, '7');
    // A diatonic neighbor below the next root, explicitly marked as a connecting note.
    const scale = family.map((c) => c.root);
    const nextIndex = scale.indexOf(next.root);
    const passing = scale[mod(nextIndex - 1, 7)];
    if (layers.includes('Passing tones'))
      available.push({
        degree: '',
        name: passing,
        role: available.some((n) => n.name === passing)
          ? 'Chord tone / connection'
          : 'Passing tone',
      });
    if (layers.includes('Chromatic approach'))
      available.push({ degree: '', name: approach, role: 'Approach to ' + next.root });
    const stable = available.filter((n) => n.role === 'Chord tone');
    if (!stable.length)
      return { symbol: chord.root + chord.symbol, root: chord.root, available, events: [] };
    const choices = [
      stable[0],
      stable[1 % stable.length],
      stable[2 % stable.length],
      stable[1 % stable.length],
    ];
    if (layers.includes('Passing tones')) choices[2] = available.find((n) => n.name === passing)!;
    if (layers.includes('Chromatic approach'))
      choices[3] = available.find((n) => n.role.startsWith('Approach'))!;
    const events = choices.map((note, i) => {
      let midi = 36 + pitchClass(note.name);
      if (midi > 47) midi -= 12;
      if (previous && i > 0) {
        const options = [midi - 12, midi, midi + 12].filter((m) => m >= 28 && m <= 55);
        options.sort(
          (a, b) =>
            Math.abs(a - (tuning[previous!.string] + previous!.fret)) -
            Math.abs(b - (tuning[previous!.string] + previous!.fret)),
        );
        midi = options[0];
      }
      previous = {
        ...positionForMidi(midi, previous),
        name: note.name,
        role: note.role,
        degree: note.degree || undefined,
      };
      return previous;
    });
    return { symbol: chord.root + chord.symbol, root: chord.root, available, events };
  });
}
export function lineFromNames(names: string[]): FingeringNote[] {
  let previous: FingeringNote | undefined;
  return names.map((name) => {
    let midi = 36 + pitchClass(name);
    if (midi < 33) midi += 12;
    previous = { ...positionForMidi(midi, previous), name: name ?? noteName(midi) };
    return previous;
  });
}
