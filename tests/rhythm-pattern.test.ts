import test from 'node:test';
import assert from 'node:assert/strict';
import { drumPosition } from '../src/lib/rhythm-audio';
import { defaultPreferences, emptyPattern } from '../src/lib/rhythm';

test('pattern playback loops over its own bars', () => {
  const pattern = emptyPattern('A', 4, 2);
  const config = { bpm: 96, pattern, preferences: defaultPreferences };
  assert.deepEqual(
    [0, 1, 2, 3].map((bar) => drumPosition(config, bar).localBar),
    [0, 1, 0, 1],
  );
});
