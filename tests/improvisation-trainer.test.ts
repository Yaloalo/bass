import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultImprovisationTrainer,
  dropoutActive,
  phrasingState,
  relevantToneIndices,
  targetForChord,
} from '../src/lib/improvisation-trainer';

test('harmony dropout follows complete form cycles and always returns', () => {
  const trainer = {
    ...defaultImprovisationTrainer,
    dropout: {
      ...defaultImprovisationTrainer.dropout,
      enabled: true,
      audibleCycles: 2,
      silentCycles: 2,
    },
  };
  assert.deepEqual(
    Array.from({ length: 8 }, (_, index) => dropoutActive(trainer, index + 1)),
    [false, false, true, true, false, false, true, true],
  );
});

test('phrasing alternates full play and listening blocks', () => {
  const trainer = { ...defaultImprovisationTrainer, phrasing: '2-2' as const };
  assert.deepEqual(
    Array.from({ length: 8 }, (_, bar) => phrasingState(trainer, bar)),
    ['play', 'play', 'listen', 'listen', 'play', 'play', 'listen', 'listen'],
  );
});

test('guide tones and target tones come from the actual chord formula', () => {
  const chord = { root: 'G', chordId: 'dominant-7', bars: 1 };
  assert.deepEqual(relevantToneIndices(chord, 'guide-tones'), [1, 3]);
  assert.deepEqual(targetForChord(chord, 'third'), { note: 'H', interval: '3' });
  assert.deepEqual(targetForChord(chord, 'seventh'), { note: 'F', interval: 'b7' });
});
