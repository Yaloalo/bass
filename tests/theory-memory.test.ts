import assert from 'node:assert/strict';
import test from 'node:test';
import { pitchClass } from '../src/lib/music';
import {
  chordMemoryQuestion,
  memoryAnswer,
  memoryChordPool,
  memoryNoteChoices,
  memoryScalePool,
  nextMemoryQuestion,
  scaleMemoryQuestion,
} from '../src/lib/theory-memory';

test('builds scale questions from the shared scale and spelling model', () => {
  const cMajor = scaleMemoryQuestion('C', 'major');
  assert.deepEqual(cMajor.notes, ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  assert.deepEqual(cMajor.pitchClasses, [0, 2, 4, 5, 7, 9, 11]);

  const fSharpMajor = scaleMemoryQuestion('F#', 'major');
  assert.deepEqual(fSharpMajor.notes, ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
  assert.equal(memoryNoteChoices(fSharpMajor)[5], 'E#');
});

test('builds chord questions from the shared chord formulas', () => {
  assert.deepEqual(chordMemoryQuestion('C', 'minor').notes, ['C', 'Eb', 'G']);
  assert.deepEqual(chordMemoryQuestion('B', 'major-7').notes, ['B', 'D#', 'F#', 'A#']);
});

test('checks exact pitch-class sets and explains missing and wrong notes', () => {
  const question = chordMemoryQuestion('C', 'major');
  assert.deepEqual(memoryAnswer(question, new Set([0, 4, 7])), {
    correct: true,
    wrong: [],
    missing: [],
  });
  assert.deepEqual(memoryAnswer(question, new Set([0, 3, 7, 10])), {
    correct: false,
    wrong: [3, 10],
    missing: [4],
  });
});

test('difficulty pools keep the simple level focused', () => {
  assert.deepEqual(
    memoryChordPool('basic').map((chord) => chord.id),
    ['major', 'minor'],
  );
  assert.ok(memoryChordPool('sevenths').some((chord) => chord.id === 'dominant-7'));
  assert.equal(memoryScalePool('not-a-scale', 'current')[0].id, 'major');
});

test('current-context questions honor the global root and selected scale', () => {
  const question = nextMemoryQuestion(
    {
      topic: 'scales',
      globalRoot: 'Eb',
      rootScope: 'current',
      rootSelection: ['C', 'G'],
      scaleSelection: ['blues'],
      chordSelection: ['major', 'minor'],
    },
    '',
    () => 0,
  );
  // The shared spelling model may choose the lighter enharmonic name (D# blues
  // avoids the Bbb produced by a literal b5), but it must retain the chosen pitch.
  assert.equal(pitchClass(question.root), pitchClass('Eb'));
  assert.equal(question.itemId, 'blues');
});

test('custom root selection limits random questions to the checked roots', () => {
  const options = {
    topic: 'chords' as const,
    globalRoot: 'D',
    rootScope: 'selection' as const,
    rootSelection: ['C', 'F#'],
    scaleSelection: ['major'],
    chordSelection: ['minor'],
  };
  assert.equal(nextMemoryQuestion(options, '', () => 0).root, 'C');
  assert.equal(pitchClass(nextMemoryQuestion(options, '', () => 0.99).root), pitchClass('F#'));
});

test('custom chord and scale selections are the exact question pools', () => {
  const common = {
    globalRoot: 'C',
    rootScope: 'current' as const,
    rootSelection: ['C'],
    scaleSelection: ['dorian'],
    chordSelection: ['sus4'],
  };
  assert.equal(nextMemoryQuestion({ ...common, topic: 'scales' }).itemId, 'dorian');
  assert.equal(nextMemoryQuestion({ ...common, topic: 'chords' }).itemId, 'sus4');
});
