import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fretboardChordEvents,
  fretboardChordSelectionId,
  makeFretboardChordOverlays,
  type FretboardChordSelection,
} from '../src/lib/fretboard-chords';
import { mod, pitchClass, tuning } from '../src/lib/music';

const selections: FretboardChordSelection[] = [
  { id: fretboardChordSelectionId('C', 'major'), root: 'C', chordId: 'major' },
  { id: fretboardChordSelectionId('A', 'minor'), root: 'A', chordId: 'minor' },
];

test('multiple fretboard chords keep individual colors and expose shared tones', () => {
  const overlays = makeFretboardChordOverlays(
    selections,
    (root, symbol) => root + symbol,
    (note) => note,
  );
  assert.equal(overlays.length, 2);
  assert.notEqual(overlays[0].color, overlays[1].color);
  assert.deepEqual(overlays[0].pitchClasses, [0, 4, 7]);
  assert.deepEqual(overlays[1].pitchClasses, [9, 0, 4]);
  assert.deepEqual(
    overlays
      .filter((overlay) => overlay.pitchClasses.includes(pitchClass('C')))
      .map((item) => item.label),
    ['C', 'Am'],
  );
});

test('the chord view emits only the union of every selected chord across the neck', () => {
  const events = fretboardChordEvents(selections, 'C', 0, 12);
  const actual = new Set(events.map((event) => mod(tuning[event.string] + event.fret)));
  assert.deepEqual(
    [...actual].sort((a, b) => a - b),
    [0, 4, 7, 9],
  );
  assert.ok(events.every((event) => event.fret >= 0 && event.fret <= 12));
  assert.deepEqual(fretboardChordEvents([], 'C', 0, 12), []);
});
