import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scales,
  exerciseGroove,
  exercises,
  programSections,
  programs,
  search,
} from '../src/data/catalog';
import { chords } from '../src/data/chords';
import { buildChordRoute } from '../src/lib/route';
import {
  roots,
  strings,
  tuning,
  pitchClass,
  spellDegree,
  degreeSemitones,
  transposeRoute,
  isNote,
  soundingMidi,
  writtenPitch,
  allPositions,
  mod,
  harmony,
  keySignature,
  intervalBetween,
} from '../src/lib/music';
test('standard tuning and all 100 physical fret positions are correct', () => {
  assert.deepEqual(tuning, { E: 28, A: 33, D: 38, G: 43 });
  for (const string of strings)
    for (let fret = 0; fret <= 24; fret++) {
      const midi = tuning[string] + fret;
      assert.equal(mod(midi), mod(pitchClass(string) + fret));
    }
});
test('normal major keys have correct spelling and relative minors', () => {
  for (const [root, expected, minor] of [
    ['D', 'D E F# G A B C#', 'B'],
    ['F', 'F G A Bb C D E', 'D'],
    ['Eb', 'Eb F G Ab Bb C D', 'C'],
    ['F#', 'F# G# A# B C# D# E#', 'D#'],
  ]) {
    const key = keySignature(root);
    assert.equal(key.notes.join(' '), expected);
    assert.equal(key.relativeMinor, minor);
  }
  assert.deepEqual(keySignature('D').altered, ['F#', 'C#']);
  assert.deepEqual(keySignature('Eb').altered, ['Bb', 'Eb', 'Ab']);
});
test('scale and arpeggio spelling, physical fingering and written pitch agree for every root', () => {
  for (const item of scales)
    for (const root of roots) {
      const route = transposeRoute(item.fingering, root).filter(isNote);
      assert.equal(route.length, item.degreeLabels.length + 1);
      assert.equal(
        new Set(route.map((n) => n.string + n.fret)).size,
        route.length,
        'no duplicate physical markers',
      );
      route.forEach((n, i) => {
        const degree = i === route.length - 1 ? '1' : item.degreeLabels[i];
        assert.equal(n.name, spellDegree(root, degree));
        assert.equal(mod(soundingMidi(n)), pitchClass(n.name!));
        assert.ok(n.fret >= 0 && n.fret <= 24);
        const written = writtenPitch(n);
        const name = written.name;
        const naturals = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        const accidental = [...name.slice(1)].reduce((n, c) => n + (c === '#' ? 1 : -1), 0);
        const writtenMidi =
          12 * (written.octave + 1) + naturals[name[0] as keyof typeof naturals] + accidental;
        assert.equal(writtenMidi, soundingMidi(n) + 12);
        if (i > 0) assert.ok(soundingMidi(n) > soundingMidi(route[i - 1]), 'strictly ascending');
      });
      assert.equal(soundingMidi(route.at(-1)!) - soundingMidi(route[0]), 12);
    }
});
test('original D major route is retained exactly', () => {
  assert.deepEqual(
    transposeRoute(scales[0].fingering, 'D')
      .filter(isNote)
      .map((n) => n.string + n.fret),
    ['A5', 'A7', 'A9', 'D5', 'D7', 'D9', 'G6', 'G7'],
  );
});
test('diminished seventh and augmented fourth retain their degree spelling', () => {
  assert.equal(spellDegree('D', 'bb7'), 'Cb');
  assert.equal(spellDegree('C', 'bb7'), 'Bbb');
  assert.equal(spellDegree('F', '\x234'), 'B');
  assert.equal(degreeSemitones('bb7'), 9);
  assert.equal(intervalBetween('C', 'Eb'), 'Minor third');
  assert.equal(intervalBetween('C', 'D#'), 'Augmented second');
});
test('all-positions view has only requested pitch classes and no duplicates', () => {
  for (const root of roots)
    for (const s of scales) {
      const notes = allPositions(root, s.degreeLabels);
      assert.equal(new Set(notes.map((n) => n.string + n.fret)).size, notes.length);
      notes.forEach((n) =>
        assert.ok(s.intervals.includes(mod(soundingMidi(n) - pitchClass(root)))),
      );
    }
});
test('every exercise preserves complete bars, pitches, rests and transposable positions', () => {
  // The book's forty, plus the beginner category this app adds.
  assert.equal(exercises.filter((e) => e.category === 'physical').length, 20);
  assert.equal(exercises.filter((e) => e.category === 'musical').length, 20);
  assert.equal(exercises.filter((e) => e.category === 'basics').length, 24);
  assert.equal(exercises.length, 64);
  assert.equal(new Set(exercises.map((e) => e.id)).size, exercises.length);
  assert.equal(new Set(exercises.map((e) => e.globalNumber)).size, exercises.length);
  for (const e of exercises) {
    const beats = e.events.reduce((n, x) => n + (x.duration === '8' ? 0.5 : 1), 0);
    assert.equal(beats % 4, 0, e.id);
    for (const root of roots) {
      const route = transposeRoute(e.events, root, e.baseRoot);
      assert.equal(route.length, e.events.length);
      route.forEach((n, i) => {
        assert.equal(isNote(n), isNote(e.events[i]));
        if (isNote(n)) {
          assert.ok(n.fret >= 0 && n.fret <= 24);
          assert.equal(pitchClass(n.name!), mod(soundingMidi(n)));
        }
      });
    }
  }
  assert.equal(exercises.find((e) => e.id === 'M19')!.events.filter(isNote).length, 4);
  assert.equal(exercises.find((e) => e.id === 'M20')!.events.filter(isNote).length, 8);
});
test('thirty programmes sit in three sections, six real blocks each', () => {
  assert.deepEqual(
    programSections.map((section) => section.id),
    ['grundlagen', 'harmonie', 'groove'],
  );
  assert.equal(programs.length, 30);
  assert.equal(new Set(programs.map((p) => p.id)).size, 30);
  for (const section of programSections) {
    const list = programs.filter((program) => program.section === section.id);
    assert.equal(list.length, 10, `${section.id} should offer ten programmes`);
    assert.ok(section.description.length > 0);
  }
  programs.forEach((program, index) => {
    assert.equal(program.number, index + 1);
    assert.equal(program.blocks.length, 6, `${program.id} is not six five-minute blocks`);
    program.blocks.forEach((block) => {
      const exercise = exercises.find((e) => e.id === block.exerciseId);
      assert.ok(exercise, `${program.id} names the unknown exercise ${block.exerciseId}`);
      // Every block has to carry its own tempo and groove for the setup to work.
      assert.ok(exercise.startBpm > 0 && exerciseGroove(exercise.id));
    });
  });
  // The entry programme has to be reachable by someone who has just started.
  assert.ok(
    programs[0].blocks.every((block) => block.exerciseId.startsWith('B')),
    'the first programme should only use the beginner exercises',
  );
  // Every exercise in the library earns its place in at least one programme.
  const used = new Set(programs.flatMap((p) => p.blocks.map((b) => b.exerciseId)));
  for (const exercise of exercises)
    assert.ok(used.has(exercise.id), `${exercise.id} appears in no programme`);
});
test('diatonic chord qualities and spelling follow major and natural minor', () => {
  assert.deepEqual(
    harmony('D').map((c) => c.root + c.symbol),
    ['Dmaj7', 'Em7', 'F#m7', 'Gmaj7', 'A7', 'Bm7', 'C#m7b5'],
  );
  assert.deepEqual(
    harmony('C', true).map((c) => c.root + c.symbol),
    ['Cm7', 'Dm7b5', 'Ebmaj7', 'Fm7', 'Gm7', 'Abmaj7', 'Bb7'],
  );
});
test('offline search finds formulas, aliases, concepts and global exercise numbers', () => {
  for (const q of [
    'Dorian',
    'minor pentatonic',
    'dominant 7',
    '1 b3 5',
    'voice leading',
    'chromatic approach',
    'salsa',
    'muting',
    'exercise 14',
    'Mixolydian',
    'relative minor',
    'Ionian',
    'exercise 40',
  ])
    assert.ok(search(q).length, q);
});
import { readableRoot, scaleStepLabels } from '../src/lib/music';
import { buildBassline } from '../src/lib/bassline';
test('contextual root spelling avoids unnecessarily complex keys', () => {
  assert.equal(readableRoot('Db', scales[1].degreeLabels), 'C#');
  assert.equal(readableRoot('Ab', scales[1].degreeLabels), 'G#');
  assert.equal(readableRoot('Eb', scales[0].degreeLabels), 'Eb');
  assert.equal(readableRoot('F#', scales[0].degreeLabels), 'F#');
  for (const s of scales)
    for (const selected of roots) {
      const displayed = readableRoot(selected, s.degreeLabels);
      assert.equal(pitchClass(displayed), pitchClass(selected));
      const events = transposeRoute(s.fingering, displayed).filter(isNote);
      events.forEach((n) => assert.equal(pitchClass(n.name!), mod(soundingMidi(n))));
    }
});
test('educational bassline uses chord tones, approaches and playable shared events', () => {
  for (const root of roots) {
    const line = buildBassline(root, [
      'Root',
      'Fifth',
      'Third',
      'Seventh',
      'Chromatic approach',
      'Passing tones',
    ]);
    assert.equal(line.length, 4);
    line.forEach((bar, i) => {
      assert.equal(bar.events.length, 4);
      assert.equal(pitchClass(bar.events[0].name!), pitchClass(bar.root));
      bar.events.forEach((n) => {
        assert.equal(mod(soundingMidi(n)), pitchClass(n.name!));
        assert.ok(n.fret >= 0 && n.fret <= 24);
      });
      assert.equal(mod(pitchClass(line[(i + 1) % 4].root) - pitchClass(bar.events[3].name!)), 1);
    });
  }
  assert.equal(buildBassline('C', []).flatMap((b) => b.events).length, 0);
  assert.equal(buildBassline('C', ['Fifth', 'Third', 'Root'])[0].events[0].degree, '1');
});

test('scale step sizes are derived from the formula and sum to an octave', () => {
  for (const scale of scales) {
    const steps = scaleStepLabels(scale.degreeLabels);
    assert.equal(steps.length, scale.degreeLabels.length, `${scale.id}: one step per note`);
    const semitones = steps.reduce((sum, label) => {
      const whole = label.startsWith('½') ? 0 : parseInt(label, 10);
      return sum + whole * 2 + (label.endsWith('½') ? 1 : 0);
    }, 0);
    assert.equal(semitones, 12, `${scale.id}: steps must close the octave`);
  }
  // A minor third is one and a half tones, not one: the pentatonic must not read as equal steps.
  assert.deepEqual(scaleStepLabels(['1', 'b3', '4', '5', 'b7']), ['1½', '1', '1', '1½', '1']);
  assert.deepEqual(scaleStepLabels(['1', '2', '3', '4', '5', '6', '7']), [
    '1',
    '1',
    '½',
    '1',
    '1',
    '1',
    '½',
  ]);
});
