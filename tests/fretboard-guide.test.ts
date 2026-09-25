import test from 'node:test';
import assert from 'node:assert/strict';
import { chordById } from '../src/data/chords';
import {
  chordGuideEntries,
  fretboardGuidePath,
  nextFretboardGuideTarget,
} from '../src/lib/fretboard-guide';
import { instrumentProfiles } from '../src/lib/instrument';

test('ordinary arpeggios ascend through their tones and finish at the octave', () => {
  const entries = chordGuideEntries('C', chordById('major')!);
  assert.deepEqual(
    entries.map((entry) => [entry.interval, entry.note]),
    [
      [0, 'C'],
      [4, 'E'],
      [7, 'G'],
      [12, 'C'],
    ],
  );
});

test('the arrow selects a nearby real position on bass and guitar', () => {
  const third = chordGuideEntries('C', chordById('major')!)[1];
  const bassTarget = nextFretboardGuideTarget(
    instrumentProfiles.bass,
    [0, 24],
    36,
    third,
    { fret: 8, stringLabel: 'E' },
    '#123456',
    'E · Stufe 3',
  );
  assert.equal(bassTarget?.positionId, 'A:7');
  assert.equal(bassTarget?.color, '#123456');

  const guitarTarget = nextFretboardGuideTarget(
    instrumentProfiles.guitar,
    [0, 12],
    48,
    third,
    { fret: 8, stringLabel: 'tiefe E' },
    '#abcdef',
    'E · Stufe 3',
  );
  assert.ok(guitarTarget);
  assert.match(guitarTarget.positionId, /^(A|D|G|B3|E4):\d+$/);
});

test('one root click creates the complete connected bass arpeggio path', () => {
  const path = fretboardGuidePath(
    'c-major',
    'C-Dur',
    instrumentProfiles.bass,
    [0, 24],
    36,
    chordGuideEntries('C', chordById('major')!),
    { positionId: 'E:8', fret: 8, stringLabel: 'E', label: 'C · Grundton' },
    '#4bb8d0',
    (note) => note,
  );
  assert.deepEqual(
    path.points.map((point) => point.positionId),
    ['E:8', 'A:7', 'A:10', 'D:10'],
  );
  assert.equal(path.color, '#4bb8d0');
});

test('the arrow stops cleanly when the next pitch is outside the visible range', () => {
  const octave = chordGuideEntries('C', chordById('major')!).at(-1)!;
  assert.equal(
    nextFretboardGuideTarget(
      instrumentProfiles.bass,
      [20, 24],
      67,
      octave,
      { fret: 24, stringLabel: 'G' },
      '#fff',
      'C',
    ),
    null,
  );
});
