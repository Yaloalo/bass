import test from 'node:test';
import assert from 'node:assert/strict';
import { chords } from '../src/data/chords';
import { practicalVoicing, practiceDegrees } from '../src/lib/chord-practice';
import {
  degreeSemitones,
  isNote,
  mod,
  pitchClass,
  roots,
  soundingMidi,
  transposeRoute,
} from '../src/lib/music';
import { buildChordRoute, practiceRoute, walkRoute } from '../src/lib/route';

test('descending and returning chord exercises preserve every requested pitch and direction', () => {
  for (const root of roots) {
    for (const shape of ['ascending', 'descending', 'upDown', 'rotate', 'permutation'] as const) {
      for (const octaves of [1, 2]) {
        const degrees = practiceDegrees(['1', '3', '5', '7'], {
          shape,
          start: 1,
          permutation: 23,
          octaves,
        });
        const offsets = degrees.map(degreeSemitones);
        const playable = Array.from({ length: 128 }, (_, midi) => midi).some(
          (midi) =>
            mod(midi) === pitchClass(root) &&
            midi + Math.min(...offsets) >= 28 &&
            midi + Math.max(...offsets) <= 67,
        );
        if (!playable) {
          assert.throws(() => practiceRoute(degrees, { baseRoot: root }), /spielbare Oktave/);
          continue;
        }
        const route = practiceRoute(degrees, { baseRoot: root });
        assert.deepEqual(
          route.map((note) => note.degree),
          degrees,
          `${root} ${shape}: do not replace the requested exercise`,
        );
        const rootMidi = soundingMidi(route[0]) - degreeSemitones(degrees[0]);
        assert.equal(mod(rootMidi), pitchClass(root));
        route.forEach((note, index) => {
          assert.ok(note.fret >= 0 && note.fret <= 24, 'every note must be playable');
          assert.equal(soundingMidi(note), rootMidi + degreeSemitones(degrees[index]));
        });
        if (shape === 'descending') assert.ok(soundingMidi(route[0]) > soundingMidi(route.at(-1)!));
        if (shape === 'upDown') assert.equal(soundingMidi(route[0]), soundingMidi(route.at(-1)!));
      }
    }
  }
});

test('a position-shifting route supports D and all chromatic roots without silently changing octave relationships', () => {
  for (const root of roots) {
    const route = walkRoute(['7', '5', '3', '1'], { baseRoot: root });
    assert.equal(mod(soundingMidi(route[3])), pitchClass(root));
    assert.deepEqual(
      route.map((note) => soundingMidi(note) - soundingMidi(route[3])),
      [11, 7, 4, 0],
    );
  }
  assert.throws(() => practiceRoute(['1', '29']), /spielbare Oktave/);
});

test('reduced voicings retain all defining chord tones, including chords needing more than four', () => {
  for (const chord of chords) {
    const voicing = practicalVoicing(chord);
    for (const required of chord.required)
      assert.ok(voicing.includes(required), `${chord.id}: missing ${required}`);
    assert.ok(voicing.every((degree) => chord.formula.includes(degree)));
  }
  assert.deepEqual(practicalVoicing(chords.find((chord) => chord.id === 'major')!), [
    '1',
    '3',
    '5',
  ]);
});

test('every catalogue chord is well formed and playable in all twelve roots', () => {
  assert.equal(new Set(chords.map((c) => c.id)).size, chords.length, 'chord ids are unique');
  assert.equal(
    new Set(chords.map((c) => c.symbol)).size,
    chords.length,
    'chord symbols are unique',
  );
  for (const chord of chords) {
    assert.ok(chord.formula.includes('1'), `${chord.id} has no root`);
    assert.deepEqual(
      [...chord.formula],
      [...chord.formula].sort((a, b) => degreeSemitones(a) - degreeSemitones(b)),
      `${chord.id}: formula must ascend`,
    );
    assert.equal(
      new Set(chord.formula.map(degreeSemitones)).size,
      chord.formula.length,
      `${chord.id}: two degrees share a pitch`,
    );
    for (const degree of [
      ...chord.required,
      ...chord.omissible,
      ...chord.alterations,
      ...chord.extensions,
    ])
      assert.ok(chord.formula.includes(degree), `${chord.id}: ${degree} is not in the formula`);
    assert.equal(
      chord.required.filter((d) => chord.omissible.includes(d)).length,
      0,
      `${chord.id}: a degree cannot be both required and omissible`,
    );
    if (chord.avoid) assert.ok(chord.tertianStack, `${chord.id}: avoid needs a tertian stack`);

    // The fingering must exist, ascend, stay in one hand and survive every transposition.
    const route = buildChordRoute(chord);
    const frets = route.map((n) => n.fret);
    assert.ok(Math.max(...frets) - Math.min(...frets) <= 7, `${chord.id}: fret span too wide`);
    for (let i = 1; i < route.length; i++)
      assert.ok(
        soundingMidi(route[i]) > soundingMidi(route[i - 1]),
        `${chord.id}: route must ascend strictly`,
      );
    for (const root of roots) {
      const moved = transposeRoute(route, root).filter(isNote);
      assert.equal(moved.length, route.length, `${chord.id} in ${root}: lost a note`);
      for (const note of moved) {
        assert.ok(note.fret >= 0 && note.fret <= 24, `${chord.id} in ${root}: fret out of range`);
        assert.equal(
          mod(soundingMidi(note)),
          pitchClass(note.name!),
          `${chord.id} in ${root}: spelling and pitch disagree`,
        );
      }
    }
  }
});

test('no two catalogue chords describe the same pitch-class set', () => {
  // Enharmonic twins such as 7♯5 and 7♭13 highlight identical keys and identical
  // fingerings. They belong on one record as alias spellings, not as two entries.
  const seen = new Map<string, string>();
  for (const chord of chords) {
    if (chord.voicingFamily) continue;
    const key = [...new Set(chord.formula.map((degree) => mod(degreeSemitones(degree))))]
      .sort((a, b) => a - b)
      .join(',');
    assert.equal(seen.get(key), undefined, `${chord.symbol} duplicates ${seen.get(key)}`);
    seen.set(key, chord.symbol);
  }
  const symbols = chords.flatMap((chord) => [chord.symbol, ...chord.aliases]);
  assert.equal(new Set(symbols).size, symbols.length, 'a symbol or alias is used twice');
});
