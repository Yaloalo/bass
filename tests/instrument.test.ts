import test from 'node:test';
import assert from 'node:assert/strict';
import { instrumentProfiles } from '../src/lib/instrument';
import { tuningsForInstrument } from '../src/lib/tuner';
import { areas, areaPresentation } from '../src/data/navigation';

test('instrument profiles describe real standard bass and guitar layouts', () => {
  const bass = instrumentProfiles.bass;
  const guitar = instrumentProfiles.guitar;

  assert.deepEqual(
    bass.stringsHighToLow.map((string) => string.midi),
    [43, 38, 33, 28],
  );
  assert.deepEqual(
    guitar.stringsHighToLow.map((string) => string.midi),
    [64, 59, 55, 50, 45, 40],
  );
  assert.equal(new Set(guitar.stringsHighToLow.map((string) => string.id)).size, 6);
  assert.equal(bass.notationClef, 'bass');
  assert.equal(guitar.notationClef, 'treble');
});

test('every instrument opens with one of its own tuner presets', () => {
  for (const profile of Object.values(instrumentProfiles)) {
    const presets = tuningsForInstrument(profile.id);
    assert.ok(presets.length >= 3);
    assert.ok(presets.some((preset) => preset.id === profile.defaultTuning));
    assert.ok(presets.every((preset) => preset.instrument === profile.id));
  }
});

test('legacy four-string exercises map to the same physical guitar strings one octave up', () => {
  const bass = instrumentProfiles.bass.stringsHighToLow;
  const guitar = instrumentProfiles.guitar.stringsHighToLow.filter(
    (string) => string.exerciseString,
  );

  assert.deepEqual(
    guitar.map((string) => string.exerciseString),
    bass.map((string) => string.exerciseString),
  );
  assert.deepEqual(
    guitar.map((string, index) => string.midi - bass[index].midi),
    [12, 12, 12, 12],
  );
});

test('the guitar chord trainer is offered only in guitar mode', () => {
  const instrumentArea = areas.find((area) => area.id === 'bass')!;
  assert.equal(
    areaPresentation(instrumentArea, 'bass').items.some((item) => item.path === '/gitarrenakkorde'),
    false,
  );
  assert.equal(
    areaPresentation(instrumentArea, 'guitar').items.some(
      (item) => item.path === '/gitarrenakkorde',
    ),
    true,
  );
});
