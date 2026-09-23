import test from 'node:test';
import assert from 'node:assert/strict';
import { chords } from '../src/data/chords';
import {
  degreeSemitones,
  mod,
  pitchClass,
  roots,
  spellDegree,
  strings,
  tuning,
} from '../src/lib/music';
import {
  analyzePiano,
  diatonicPianoChords,
  midiFrequency,
  pianoChordMidis,
  pianoFretboardEvents,
  pianoKeys,
  pianoNoteName,
} from '../src/lib/piano';
import { germanNoteName } from '../src/lib/i18n';

test('piano keys represent two real octaves with correctly positioned black keys', () => {
  const keys = pianoKeys();
  assert.equal(keys.length, 25);
  assert.equal(keys[0].midi, 48);
  assert.equal(keys.at(-1)?.midi, 72);
  assert.equal(keys.filter((key) => !key.black).length, 15);
  assert.deepEqual(
    keys.filter((key) => key.black).map((key) => key.whiteIndex),
    [1, 2, 4, 5, 6, 8, 9, 11, 12, 13],
  );
  assert.equal(midiFrequency(69), 440);
  assert.equal(midiFrequency(60), midiFrequency(48) * 2);
});

test('piano analysis recognizes major, minor, sus and major seventh without forced matches', () => {
  for (const [midis, id, symbol] of [
    [[60, 64, 67], 'major', 'C'],
    [[60, 63, 67], 'minor', 'Cm'],
    [[60, 62, 67], 'sus2', 'Csus2'],
    [[60, 64, 67, 71], 'major-7', 'Cmaj7'],
  ] as const) {
    const result = analyzePiano(midis);
    assert.equal(result.matches[0].chord.id, id);
    assert.equal(result.matches[0].internationalSymbol, symbol);
  }
  assert.equal(analyzePiano([]).kind, 'empty');
  assert.equal(analyzePiano([60, 72]).kind, 'single');
  assert.equal(analyzePiano([60, 64]).kind, 'interval');
  assert.equal(analyzePiano([60, 61, 62]).kind, 'unknown');
  assert.equal(analyzePiano([60, 61, 62]).matches.length, 0);
});

test('octave doubling preserves quality and the real bass determines inversions', () => {
  const result = analyzePiano([76, 67, 64, 72, 64]);
  assert.equal(result.matches[0].chord.id, 'major');
  assert.equal(result.matches[0].internationalSymbol, 'C/E');
  assert.equal(result.matches[0].inversion, 1);
  assert.deepEqual(result.midis, [64, 67, 72, 76]);
  assert.equal(result.pitchClasses.length, 3);
  assert.equal(analyzePiano([67, 72, 76]).matches[0].inversion, 2);
});

test('ambiguous sixth/seventh sets and symmetrical diminished chords retain alternatives', () => {
  const six = analyzePiano([60, 64, 67, 69]);
  assert.equal(six.matches[0].internationalSymbol, 'C6');
  assert.ok(six.matches.some((match) => match.internationalSymbol === 'Am7/C'));
  assert.equal(analyzePiano([57, 60, 64, 67]).matches[0].internationalSymbol, 'Am7');
  const dim = analyzePiano([60, 63, 66, 69]);
  assert.equal(dim.matches.filter((match) => match.chord.id === 'diminished-7').length, 4);
});

test('canonical chord formulas are recognized at all roots; voicing families are excluded', () => {
  for (const root of roots) {
    for (const chord of chords.filter((entry) => !entry.voicingFamily)) {
      const midis = chord.formula.map((degree) => 48 + pitchClass(root) + degreeSemitones(degree));
      const result = analyzePiano(midis, root);
      assert.ok(
        result.matches.some(
          (match) => match.chord.id === chord.id && pitchClass(match.root) === pitchClass(root),
        ),
        `${root}${chord.symbol}`,
      );
      result.matches.forEach((match) => assert.ok(!match.chord.voicingFamily));
    }
  }
});

test('German piano labels keep H and B distinct and preserve scale spelling', () => {
  assert.equal(germanNoteName(pianoNoteName(71, [])), 'H');
  assert.equal(germanNoteName(pianoNoteName(70, [])), 'B');
  assert.equal(germanNoteName(pianoNoteName(63, [])), 'Es');
  const fSharp = ['1', '2', '3', '4', '5', '6', '7'].map((degree) => spellDegree('F#', degree));
  assert.equal(germanNoteName(pianoNoteName(65, fSharp)), 'Eis');
  for (let midi = 48; midi <= 72; midi++)
    assert.equal(pitchClass(pianoNoteName(midi, fSharp)), mod(midi));
});

test('a key offers every catalogue chord whose tones it contains', () => {
  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const choices = diatonicPianoChords(notes);
  const inScale = new Set(notes.map(pitchClass));

  // Far more than the seven triads and sevenths: sus, added-tone and extended chords too.
  assert.ok(choices.length > 40, `expected a rich list, saw ${choices.length}`);
  const symbols = choices.filter((c) => c.degree === 1).map((c) => `C${c.chord?.symbol}`);
  for (const expected of ['C', 'Cmaj7', 'Cmaj9', 'Cmaj13', 'C6', 'C6/9', 'Csus2', 'Cadd9'])
    assert.ok(symbols.includes(expected), `${expected} belongs to C major`);
  for (const forbidden of ['C7', 'Cm', 'C7b9'])
    assert.ok(!symbols.includes(forbidden), `${forbidden} has a tone outside C major`);

  // Every listed chord must really be playable from the key's own notes.
  for (const choice of choices)
    for (const note of choice.notes)
      assert.ok(inScale.has(pitchClass(note)), `${choice.root}${choice.chord?.symbol}: ${note}`);

  const triad = choices.find((c) => c.degree === 1 && c.chord?.id === 'major')!;
  assert.deepEqual(pianoChordMidis(triad), [48, 52, 55]);
  const halfDim = choices.find((c) => c.degree === 7 && c.chord?.id === 'minor-7b5')!;
  assert.equal(analyzePiano(pianoChordMidis(halfDim), 'C', notes).matches[0].chord.id, 'minor-7b5');
  assert.equal(germanNoteName(halfDim.root), 'H');
});

test('pentatonic keys still offer their own chords; duplicates are rejected', () => {
  assert.ok(diatonicPianoChords(['C', 'D', 'E', 'G', 'A']).length > 0);
  assert.deepEqual(diatonicPianoChords(['C', 'D', 'E', 'F', 'G', 'A', 'C']), []);
  assert.equal(analyzePiano([60, 64, 67]).matches[0].chord.id, 'major');
});

test('piano selection maps to every matching bass position through the twelfth fret', () => {
  const selected = [48, 52, 55, 60];
  const positions = pianoFretboardEvents(selected, 'C', ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  assert.ok(positions.some((note) => note.string === 'E' && note.fret === 0 && note.name === 'E'));
  assert.ok(positions.some((note) => note.string === 'E' && note.fret === 8 && note.name === 'C'));
  assert.ok(positions.some((note) => note.string === 'G' && note.fret === 0 && note.name === 'G'));
  assert.ok(positions.every((note) => [0, 4, 7].includes(pitchClass(note.name!))));
  assert.ok(positions.every((note) => note.fret <= 12));
  for (const string of strings)
    for (let fret = 0; fret <= 12; fret++) {
      const appears = positions.some((note) => note.string === string && note.fret === fret);
      assert.equal(appears, [0, 4, 7].includes(mod(tuning[string] + fret)), `${string}${fret}`);
    }
  assert.deepEqual(pianoFretboardEvents([], 'C', []), []);
});
