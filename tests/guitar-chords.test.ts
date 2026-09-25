import test from 'node:test';
import assert from 'node:assert/strict';
import { scales } from '../src/data/catalog';
import { diatonicStackedChords } from '../src/lib/diatonic';
import { guitarChordShapes } from '../src/lib/guitar-chords';
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
