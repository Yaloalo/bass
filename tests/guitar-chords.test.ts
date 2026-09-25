import test from 'node:test';
import assert from 'node:assert/strict';
import { scales } from '../src/data/catalog';
import { chords } from '../src/data/chords';
import { diatonicStackedChords } from '../src/lib/diatonic';
import { guitarChordShapes } from '../src/lib/guitar-chords';
import { guitarScaleShapes } from '../src/lib/guitar-scales';
import { degreeSemitones, mod, pitchClass, roots, spellDegree } from '../src/lib/music';

const supported = [
  'major',
  'natural-minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'harmonic-minor',
  'melodic-minor',
];

test('every supported key builds seven named triads and seventh chords', () => {
  for (const root of roots) {
    for (const id of supported) {
      const scale = scales.find((candidate) => candidate.id === id)!;
      const notes = scale.degreeLabels.map((degree) => spellDegree(root, degree));
      for (const size of [3, 4] as const) {
        const keyChords = diatonicStackedChords(notes, size);
        assert.equal(keyChords.length, 7, `${root} ${id} should have seven ${size}-note chords`);
        assert.deepEqual(
          keyChords.map((chord) => chord.degree),
          [1, 2, 3, 4, 5, 6, 7],
        );
        for (const chord of keyChords) {
          assert.equal(chord.notes.length, size);
          assert.ok(chord.roman.length > 0);
        }
      }
    }
  }
});

test('the complete chord catalogue has playable, fingered guitar voicings', () => {
  for (const chord of chords.filter((candidate) => !candidate.voicingFamily)) {
    for (const root of ['C', 'F#', 'Bb']) {
      const shapes = guitarChordShapes(root, chord);
      assert.ok(shapes.length >= 1, `${root}${chord.symbol} needs a playable shape`);
      for (const shape of shapes) {
        assert.equal(shape.frets.length, 6);
        assert.equal(shape.fingers.length, 6);
        assert.ok(shape.fingers.every((finger) => finger === null || (finger >= 0 && finger <= 4)));
        assert.equal(mod(shape.midis[0]), pitchClass(root), `${shape.name} needs its root in bass`);
        const actual = new Set(shape.midis.map((midi) => mod(midi)));
        for (const required of chord.required)
          assert.ok(
            actual.has(mod(pitchClass(root) + degreeSemitones(required))),
            `${root}${chord.symbol} ${shape.name} misses ${required}`,
          );
      }
    }
  }
});

test('guitar scales provide two exact six-string positions with usable fingers and TAB pitches', () => {
  for (const scale of scales) {
    for (const root of roots) {
      const shapes = guitarScaleShapes(root, scale.degreeLabels);
      assert.equal(shapes.length, 2, `${root} ${scale.name} needs two positions`);
      for (const shape of shapes) {
        assert.ok(shape.events.length >= scale.degreeLabels.length);
        assert.ok(shape.events.every((event) => event.stringId && event.midi !== undefined));
        assert.ok(shape.events.every((event) => event.finger !== undefined && event.finger <= 4));
        assert.ok(shape.events.every((event) => event.fret >= 0 && event.fret <= 24));
        const wanted = new Set(scale.degreeLabels.map((degree) => mod(degreeSemitones(degree))));
        assert.deepEqual(
          new Set(shape.events.map((event) => mod(event.midi! - pitchClass(root)))),
          wanted,
        );
      }
    }
  }
});

test('each diatonic quality has two playable guitar shapes with exactly its chord tones', () => {
  const qualities = new Map<string, ReturnType<typeof diatonicStackedChords>[number]>();
  for (const id of supported) {
    const scale = scales.find((candidate) => candidate.id === id)!;
    const notes = scale.degreeLabels.map((degree) => spellDegree('C', degree));
    for (const size of [3, 4] as const)
      for (const chord of diatonicStackedChords(notes, size)) qualities.set(chord.chord.id, chord);
  }

  for (const root of roots) {
    for (const example of qualities.values()) {
      const shapes = guitarChordShapes(root, example.chord);
      assert.equal(shapes.length, 2, `${root}${example.chord.symbol} needs two shapes`);
      const wanted = new Set(
        example.chord.formula.map((degree) => mod(pitchClass(root) + degreeSemitones(degree))),
      );
      for (const shape of shapes) {
        const actual = new Set(shape.midis.map((midi) => mod(midi)));
        assert.deepEqual(
          [...actual].sort((a, b) => a - b),
          [...wanted].sort((a, b) => a - b),
        );
        assert.equal(
          mod(shape.midis[0]),
          pitchClass(root),
          `${shape.name} must keep the root in bass`,
        );
        assert.ok(shape.frets.every((fret) => fret === null || (fret >= 0 && fret <= 14)));
      }
    }
  }
});
