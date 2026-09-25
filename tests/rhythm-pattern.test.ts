import test from 'node:test';
import assert from 'node:assert/strict';
import { drumPosition } from '../src/lib/rhythm-audio';
import {
  barTicks,
  defaultPreferences,
  emptyPattern,
  meterGroupStarts,
  resizePattern,
  stepsPerBar,
} from '../src/lib/rhythm';
import type { MeterId } from '../src/lib/rhythm';

test('pattern playback loops over its own bars', () => {
  const pattern = emptyPattern('A', 4, 2);
  const config = { bpm: 96, pattern, preferences: defaultPreferences };
  assert.deepEqual(
    [0, 1, 2, 3].map((bar) => drumPosition(config, bar).localBar),
    [0, 1, 0, 1],
  );
});

test('the sequencer derives a bar from meter and sixteenth-note resolution', () => {
  const expected: Record<MeterId, number> = {
    '2/4': 8,
    '3/4': 12,
    '4/4': 16,
    '5/4': 20,
    '6/8': 12,
    '7/8': 14,
  };
  for (const [meter, steps] of Object.entries(expected) as [MeterId, number][]) {
    const pattern = emptyPattern(meter, 4, 2, 'standard', meter);
    assert.equal(stepsPerBar(pattern), steps);
    assert.equal(pattern.tracks.kick.steps.length, steps * 2);
  }
});

test('changing meter preserves pattern bars and remaps hits by musical position', () => {
  const original = emptyPattern('Five', 4, 2);
  original.tracks.kick.steps[0] = 3;
  original.tracks.kick.steps[16] = 2;
  const five = resizePattern(original, 4, 2, '5/4');
  assert.equal(five.meter, '5/4');
  assert.equal(five.bars, 2);
  assert.equal(five.tracks.kick.steps.length, 40);
  assert.equal(five.tracks.kick.steps[0], 3);
  assert.equal(five.tracks.kick.steps[20], 2);
  assert.equal(barTicks('5/4'), 5 * 96);
  assert.deepEqual(meterGroupStarts('5/4'), [0, 3]);
  assert.deepEqual(meterGroupStarts('7/8'), [0, 2, 4]);
});
