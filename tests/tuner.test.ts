import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analysisSize,
  decimate,
  decimation,
  detectPitch,
  midiToFrequency,
  nearestString,
  readPitch,
  tunings,
} from '../src/lib/tuner';
import { defaultPreferences, normalizePreferences } from '../src/lib/rhythm';
import { germanNoteName } from '../src/lib/i18n';
import {
  buildOrder,
  cents,
  commaCents,
  commaFactor,
  equalRatio,
  evenSide,
  fifthScale,
  fifthNearMiss,
  fifthWalk,
  intervalById,
  middleC,
  nearMissCandidates,
  oddSide,
  pureFifthCents,
  pureIntervals,
  pythagoreanFifths,
  pythagoreanNotes,
  ratioValue,
  scaleEvenness,
  scaleSizes,
  scaleStepSizes,
  tuningComparison,
  wolfFifth,
} from '../src/lib/acoustics';

const rate = 44100;

/** A plucked string: the second harmonic is often louder than the fundamental. */
function pluck(frequency: number, harmonics = [0.6, 1, 0.7, 0.4, 0.25, 0.15], noise = 0.01) {
  const buffer = new Float32Array(analysisSize);
  for (let i = 0; i < buffer.length; i++) {
    let value = 0;
    harmonics.forEach((level, index) => {
      value += level * Math.sin((2 * Math.PI * frequency * (index + 1) * i) / rate + index);
    });
    buffer[i] = value * 0.12 + (Math.random() * 2 - 1) * noise;
  }
  return buffer;
}

const hear = (
  frequency: number,
  ...rest: Parameters<typeof pluck> extends [unknown, ...infer R] ? R : never
) => detectPitch(decimate(pluck(frequency, ...rest)), rate / decimation);

test('the tuner reads every string of every tuning, in tune and out', () => {
  let worst = 0;
  for (const tuning of tunings) {
    assert.ok(tuning.strings.length >= 4);
    for (const string of tuning.strings) {
      // The strings must ascend, or the display would name the wrong one.
      for (let i = 1; i < tuning.strings.length; i++)
        assert.ok(tuning.strings[i] > tuning.strings[i - 1]);
      for (const detune of [-0.45, -0.2, -0.05, 0, 0.05, 0.2, 0.45]) {
        const frequency = midiToFrequency(string + detune);
        const found = hear(frequency);
        assert.ok(found !== null, `${tuning.id}: no reading at ${frequency.toFixed(2)} Hz`);
        const error = Math.abs(1200 * Math.log2(found / frequency));
        worst = Math.max(worst, error);
        assert.ok(error < 5, `${frequency.toFixed(2)} Hz read ${error.toFixed(1)} cents out`);
      }
    }
  }
  assert.ok(worst < 5, `worst error was ${worst.toFixed(2)} cents`);
});

test('a missing fundamental does not fool the tuner into the octave above', () => {
  // A low E through a small speaker often has no fundamental at all.
  const found = hear(midiToFrequency(28), [0, 1, 0.8, 0.5, 0.3]);
  assert.ok(found !== null);
  assert.ok(Math.abs(1200 * Math.log2(found / midiToFrequency(28))) < 10);
});

test('silence and noise report no pitch at all', () => {
  assert.equal(detectPitch(new Float32Array(analysisSize), rate), null);
  const noise = new Float32Array(analysisSize).map(() => Math.random() * 2 - 1);
  assert.equal(detectPitch(decimate(noise), rate / decimation), null);
  // A signal too quiet to be a played note is not guessed at either.
  const whisper = pluck(55).map((value) => value * 0.005) as Float32Array;
  assert.equal(detectPitch(decimate(whisper), rate / decimation), null);
});

test('readings name the nearest note and the nearest string', () => {
  assert.deepEqual(readPitch(440), { frequency: 440, midi: 69, cents: 0 });
  assert.equal(readPitch(midiToFrequency(28)).midi, 28);
  assert.ok(Math.abs(readPitch(midiToFrequency(28.25)).cents - 25) < 0.001);
  const four = tunings[0].strings;
  assert.equal(nearestString(28, four), 0);
  assert.equal(nearestString(43, four), 3);
  // Halfway between two strings still resolves to one of them, never off the end.
  for (let midi = 20; midi <= 50; midi++) {
    const index = nearestString(midi, four);
    assert.ok(index >= 0 && index < four.length);
  }
});

test('legacy tempo-trainer settings stay disabled after the feature was removed', () => {
  assert.deepEqual(defaultPreferences.ramp, { enabled: false, step: 4, every: 4, target: 120 });
  const saved = normalizePreferences({
    ramp: { enabled: true, step: 900, every: 0, target: 5000 },
  }).ramp;
  assert.deepEqual(saved, { enabled: false, step: 20, every: 1, target: 300 });
  // A step of zero would never reach the target, so it falls back to the default.
  assert.equal(normalizePreferences({ ramp: { step: 0 } }).ramp.step, 4);
  assert.equal(normalizePreferences({}).ramp.enabled, false);
  assert.equal(normalizePreferences({ ramp: { step: -5 } }).ramp.step, -5);
  assert.equal(normalizePreferences({ metronome: { gap: true } }).metronome.gap, false);
});

test('stacking fifths really produces the pentatonic, the major scale and the twelve', () => {
  // Starting one fifth below C is what makes seven steps land on C major rather than a
  // mode of it; everything else in the article depends on that.
  assert.equal(buildOrder[0], 'F');
  assert.equal(buildOrder[1], 'C');
  assert.equal(buildOrder.length, 12);

  // Every note of the construction is (3/2)^k folded into one octave above C.
  for (const tone of fifthScale(12)) {
    assert.ok(tone.ratio >= 1 && tone.ratio < 2, `${tone.name} escaped the octave`);
    const raw = (3 / 2) ** tone.fifths;
    assert.ok(Math.abs(Math.log2(tone.ratio / raw) % 1) < 1e-9, 'not an octave apart');
    assert.ok(Math.abs(tone.cents - 1200 * Math.log2(tone.ratio)) < 1e-9);
  }
  // Sorted by pitch, and each step counted from the order the chain was built in.
  const twelve = fifthScale(12);
  for (let i = 1; i < twelve.length; i++) assert.ok(twelve[i].cents > twelve[i - 1].cents);
  assert.equal(new Set(twelve.map((tone) => tone.name)).size, 12);

  // The three landmarks the article names.
  assert.deepEqual(
    fifthScale(5).map((tone) => tone.name),
    ['C', 'D', 'F', 'G', 'A'],
  );
  assert.deepEqual(
    fifthScale(7).map((tone) => tone.name),
    ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  );
  assert.deepEqual(
    fifthScale(7)
      .map((tone) => germanNoteName(tone.name))
      .join(' '),
    'C D E F G A H',
  );

  // Seven fifths give exactly the major scale, in the step order the article prints.
  const major = scaleStepSizes(7).map((step) => Math.round(step));
  assert.deepEqual(major, [204, 204, 90, 204, 204, 204, 90]);
  assert.equal(
    major.reduce((total, step) => total + step, 0),
    1200,
  );
  for (const count of scaleSizes)
    assert.ok(
      Math.abs(scaleStepSizes(count).reduce((total, step) => total + step, 0) - 1200) < 1e-9,
      `the steps of ${count} notes do not fill an octave`,
    );

  // The claim the whole "why 5, 7 and 12" chapter rests on: exactly those counts (and
  // the trivial 2 and 3) fill the octave with two step sizes; the others need three.
  const twoSized = [];
  for (let count = 2; count <= 12; count++) if (scaleEvenness(count).even) twoSized.push(count);
  assert.deepEqual(twoSized, [2, 3, 5, 7, 12]);
  for (const count of [4, 6, 8, 9, 10, 11])
    assert.equal(scaleEvenness(count).sizes.length, 3, `${count} notes should be lumpy`);

  // The two step sizes of the major scale are the whole tone and the semitone.
  assert.deepEqual(
    scaleEvenness(7).sizes.map((size) => Math.round(size)),
    [90, 204],
  );
  // And of the pentatonic: a whole tone and a minor third, no semitone at all.
  assert.deepEqual(
    scaleEvenness(5).sizes.map((size) => Math.round(size)),
    [204, 294],
  );
  assert.ok(!scaleEvenness(5).sizes.some((size) => size < 150), 'the pentatonic has no semitone');
  // Twelve notes: the Pythagorean limma and apotome, close but not equal.
  assert.deepEqual(
    scaleEvenness(12).sizes.map((size) => Math.round(size)),
    [90, 114],
  );
  assert.ok(Math.abs(scaleEvenness(12).sizes[0] - 1200 * Math.log2(256 / 243)) < 0.01);
  assert.ok(Math.abs(scaleEvenness(12).sizes[1] - 1200 * Math.log2(2187 / 2048)) < 0.01);
  // The difference between those two steps is the comma all over again.
  assert.ok(Math.abs(scaleEvenness(12).sizes[1] - scaleEvenness(12).sizes[0] - commaCents) < 0.01);
});

test('the numbers the article quotes come out of the same arithmetic it plays', () => {
  // The five ratios the article builds on, and the pitches it prints for them.
  assert.deepEqual(
    pureIntervals.map((interval) => `${interval.p}:${interval.q}`),
    ['2:1', '3:2', '4:3', '5:4', '6:5'],
  );
  assert.equal(220 * ratioValue(intervalById('octave')), 440);
  assert.equal(220 * ratioValue(intervalById('fifth')), 330);
  assert.ok(Math.abs(220 * ratioValue(intervalById('major-third')) - 275) < 1e-9);

  // The cost of twelve equal steps, in the direction the prose states it.
  const [equalFifth, equalThird] = tuningComparison;
  assert.equal(equalFifth.name, 'Quinte');
  assert.ok(equalFifth.offset < 0 && Math.abs(equalFifth.offset + 1.955) < 0.01);
  assert.equal(equalThird.name, 'Große Terz');
  assert.ok(equalThird.offset > 0 && Math.abs(equalThird.offset - 13.686) < 0.01);
  assert.ok(Math.abs(equalRatio(12) - 2) < 1e-12);
  assert.ok(Math.abs(equalRatio(1) - 1.0594630943592953) < 1e-12);
  assert.ok(Math.abs(cents(2) - 1200) < 1e-9);
  assert.ok(Math.abs(cents(equalRatio(1)) - 100) < 1e-9);

  // The gap the walk demonstrates: twelve pure fifths, about 23.46 cents sharp.
  assert.ok(Math.abs(commaFactor - 1.0136432647705078) < 1e-12);
  assert.ok(Math.abs(commaCents - 23.46) < 0.01);
  assert.ok(Math.abs((commaFactor - 1) * 100 - 1.36) < 0.01, 'about 1.36 percent');

  // A pure walk does not close; an equal-tempered walk does, exactly.
  const pure = fifthWalk(middleC, 'pure');
  assert.equal(pure.length, 13);
  assert.ok(Math.abs(pure[0].folded - 261.6255653005986) < 1e-9);
  assert.ok(Math.abs(pure[12].folded - 265.195) < 0.001);
  assert.ok(Math.abs(pure[12].drift - commaCents) < 1e-9);
  assert.equal(pure[12].name, 'His');
  assert.equal(pure[12].key, 'C');
  // Every step is folded into one octave above the start, so nothing runs off into
  // ultrasound while the walk is being played back.
  for (const entry of pure) {
    assert.ok(entry.folded >= middleC - 1e-9 && entry.folded < middleC * 2);
    assert.ok(entry.turn >= 0 && entry.turn < 1);
  }
  // Why it can never close, in the elementary form the article prints: twelve fifths
  // against seven octaves means 3^12 = 2^19, an odd number against an even one.
  assert.equal(oddSide, 3 ** 12);
  assert.equal(evenSide, 2 ** 19);
  assert.equal(oddSide % 2, 1);
  assert.equal(evenSide % 2, 0);
  assert.notEqual(oddSide, evenSide);
  assert.ok(Math.abs(oddSide / evenSide - commaFactor) < 1e-12, 'the gap is the comma itself');

  const equal = fifthWalk(middleC, 'equal');
  assert.ok(Math.abs(equal[12].folded - middleC) < 1e-9, 'the equal circle has to close');
  assert.ok(Math.abs(equal[12].drift) < 1e-9);
  // Eleven of the twelve steps are distinct pitch classes in both modes.
  assert.equal(new Set(equal.slice(0, 12).map((entry) => Math.round(entry.turn * 12))).size, 12);

  // Eleven pure fifths and one that was never tuned: the wolf carries the whole comma.
  assert.equal(pythagoreanFifths.length, 12);
  assert.equal(pythagoreanFifths.filter((fifth) => fifth.wolf).length, 1);
  for (const fifth of pythagoreanFifths.filter((entry) => !entry.wolf))
    assert.ok(Math.abs(fifth.ratio - 1.5) < 1e-12, 'a chain fifth is not pure');
  assert.equal(wolfFifth.from, 'G#');
  assert.equal(wolfFifth.to, 'Eb');
  assert.ok(Math.abs(pureFifthCents - wolfFifth.cents - commaCents) < 1e-9);
  assert.ok(Math.abs(wolfFifth.cents - 678.49) < 0.01, `the wolf measures ${wolfFifth.cents}`);
  // The chain really is twelve distinct notes inside one octave.
  assert.equal(pythagoreanNotes.length, 12);
  assert.equal(new Set(pythagoreanNotes.map((note) => note.ratio.toFixed(6))).size, 12);
  for (const note of pythagoreanNotes) assert.ok(note.ratio >= 1 && note.ratio < 2);

  // Sharing the gap out over the fifths is exactly what an equal division does, and for
  // twelve it lands on the equal-tempered fifth to the last decimal.
  const twelve = fifthNearMiss(12);
  assert.equal(twelve.octaves, 7);
  assert.ok(Math.abs(twelve.miss - commaCents) < 1e-9);
  assert.ok(Math.abs(twelve.perFifth - commaCents / 12) < 1e-9);
  assert.ok(Math.abs(twelve.tempered - 700) < 1e-9);
  assert.ok(Math.abs(twelve.perFifth - 1.955) < 0.001);
  // That correction is the same number the temperament table quotes for the fifth.
  assert.ok(Math.abs(twelve.perFifth + tuningComparison[0].offset) < 1e-9);
  for (const count of nearMissCandidates) {
    const row = fifthNearMiss(count);
    // A tempered fifth is the octave stack divided by the number of steps, and the
    // correction is the miss shared out — the two have to agree.
    assert.ok(Math.abs(row.tempered - (pureFifthCents - row.perFifth)) < 1e-9);
    assert.ok(Math.abs(row.miss) <= 600 + 1e-9);
    assert.ok(count * row.tempered - row.octaves * 1200 < 1e-9, 'the circle has to close');
  }
  // Twelve is the first count whose fifth has to move by less than two cents.
  const firstGood = [...Array(54).keys()]
    .slice(1)
    .find((count) => Math.abs(fifthNearMiss(count).perFifth) < 2);
  assert.equal(firstGood, 12);
  // Five and seven bend the fifth by more than sixteen cents; 41 and 53 beat twelve.
  for (const count of [5, 7]) assert.ok(Math.abs(fifthNearMiss(count).perFifth) > 16);
  for (const count of [41, 53])
    assert.ok(Math.abs(fifthNearMiss(count).perFifth) < Math.abs(twelve.perFifth));
  // Nineteen is the honest counterexample: better third, clearly worse fifth.
  assert.ok(Math.abs(fifthNearMiss(19).perFifth) > Math.abs(twelve.perFifth));

  // The second conflict: four pure fifths give 81:64, a pure third wants 80:64.
  assert.ok(Math.abs((3 / 2) ** 4 / 4 - 81 / 64) < 1e-12);
  assert.ok(Math.abs(cents(81 / 80) - 21.51) < 0.01);
});
