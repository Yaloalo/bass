import test from 'node:test';
import assert from 'node:assert/strict';
import { chordById } from '../src/data/chords';
import {
  answerLabel,
  chordLevels,
  earRange,
  intervalLevels,
  nextQuestion,
  questionPitches,
} from '../src/lib/ear';
import type { EarMode } from '../src/lib/ear';
import {
  buildProgression,
  harmonyAt,
  harmonyAtTick,
  harmonyBars,
  harmonyNotes,
  harmonyTimeline,
  harmonyVoicing,
  harmonyVoicings,
  normalizeHarmony,
  progressions,
  retimeHarmonyForMeter,
  transposeHarmony,
} from '../src/lib/harmony-play';
import { circle, findPosition, keyDetail, signatureLabel, signatureNotes } from '../src/lib/circle';
import { degreeSemitones, keySignature, mod, pitchClass, spellDegree } from '../src/lib/music';
import { germanNoteName } from '../src/lib/i18n';
import {
  centreExamples,
  chainOfFifths,
  cMajorScale,
  diatonicTriads,
  gcd,
  majorSteps,
  scaleGaps,
} from '../src/lib/acoustics';

test('every ear-training question sounds exactly the notes it claims', () => {
  const cases: [EarMode, typeof intervalLevels][] = [
    ['intervals', intervalLevels],
    ['chords', chordLevels],
  ];
  for (const [mode, levels] of cases) {
    for (const level of levels) {
      assert.ok(level.answers.length >= 4, `${level.id} needs enough choices to be a test`);
      for (let round = 0; round < 400; round++) {
        const question = nextQuestion(mode, level);
        assert.ok(
          level.answers.map(String).includes(question.answer),
          `${level.id} produced an answer outside its own set`,
        );
        assert.equal(question.notes.length, question.midis.length);
        // A spelling that contradicts the pitch would teach the wrong name.
        question.notes.forEach((note, index) =>
          assert.equal(pitchClass(note), mod(question.midis[index]), `${note} vs midi`),
        );
        for (let i = 1; i < question.midis.length; i++)
          assert.ok(question.midis[i] > question.midis[i - 1], 'notes must ascend');
        // Every note of every question must be visible on the reveal keyboard.
        assert.ok(
          Math.min(...question.midis) >= earRange.first &&
            Math.max(...question.midis) <= earRange.last,
          `${level.id}/${question.answer} falls off the keyboard`,
        );
        assert.ok(questionPitches(question).length >= 1);
        assert.ok(answerLabel(mode, question.answer).length > 0);
      }
    }
  }
});

test('a question never repeats the sound that was just asked', () => {
  for (const level of [...intervalLevels, ...chordLevels]) {
    const mode: EarMode = typeof level.answers[0] === 'number' ? 'intervals' : 'chords';
    for (let round = 0; round < 200; round++) {
      const first = nextQuestion(mode, level);
      assert.notEqual(nextQuestion(mode, level, first.answer).answer, first.answer);
    }
  }
});

test('every progression is playable and transposes with the key', () => {
  assert.ok(progressions.length >= 20, 'the picker should offer more than the original small set');
  assert.equal(new Set(progressions.map((item) => item.id)).size, progressions.length);
  for (const category of ['Jazz', 'Funk', 'R&B'])
    assert.ok(progressions.filter((item) => item.category === category).length >= 4);
  for (const progression of progressions) {
    assert.ok(progression.steps.length >= 2, `${progression.id} is not a progression`);
    assert.ok(progression.steps.reduce((sum, item) => sum + item.bars, 0) <= 32);
    for (const key of ['C', 'D', 'Eb', 'F#', 'Bb']) {
      const steps = buildProgression(progression, key);
      assert.equal(steps.length, progression.steps.length);
      steps.forEach((step, index) => {
        const chord = chordById(step.chordId);
        assert.ok(chord, `${progression.id} names an unknown chord`);
        // The root has to land the stated number of semitones above the key.
        assert.equal(
          mod(pitchClass(step.root) - pitchClass(key)),
          mod(progression.steps[index].semitones),
        );
        const notes = harmonyNotes(step);
        assert.equal(notes.length, chord.formula.length);
        notes.forEach((note, i) =>
          assert.equal(
            pitchClass(note),
            mod(pitchClass(step.root) + degreeSemitones(chord.formula[i])),
          ),
        );
        // The pad must stay out of the register the bass player is working in.
        const voicing = harmonyVoicing(step);
        assert.ok(voicing.length > 0 && Math.min(...voicing) >= 60, 'comping dips into the bass');
        for (let i = 1; i < voicing.length; i++) assert.ok(voicing[i] > voicing[i - 1]);
      });
    }
  }
});

test('the progression clock repeats and marks where each chord starts', () => {
  const steps = buildProgression(
    progressions.find((item) => item.id === 'ii-v-i')!,
    'C',
  );
  assert.equal(harmonyBars(steps), 4);
  const read = Array.from({ length: 9 }, (_, bar) => {
    const at = harmonyAt(steps, bar)!;
    return [at.index, at.first ? 1 : 0];
  });
  // Dm7 | G7 | Cmaj7 Cmaj7 | and then round again.
  assert.deepEqual(read, [
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 0],
    [0, 1],
  ]);
  assert.equal(harmonyAt([], 0), undefined);
});

test('tick-based harmony supports two chord changes inside a bar and loops independently', () => {
  const steps = [
    { root: 'D', chordId: 'minor-7', bars: 0.5, durationTicks: 192 },
    { root: 'G', chordId: 'dominant-7', bars: 0.5, durationTicks: 192 },
    { root: 'C', chordId: 'major-7', bars: 1, durationTicks: 384 },
  ];
  assert.equal(harmonyAtTick(steps, 0)?.index, 0);
  assert.equal(harmonyAtTick(steps, 191)?.index, 0);
  assert.equal(harmonyAtTick(steps, 192)?.index, 1);
  assert.equal(harmonyAtTick(steps, 384)?.index, 2);
  assert.equal(harmonyAtTick(steps, 768)?.cycle, 1);
  const timeline = harmonyTimeline(steps);
  assert.equal(timeline.length, 2);
  assert.deepEqual(
    timeline[0].segments.map((segment) => [segment.index, segment.start, segment.width]),
    [
      [0, 0, 0.5],
      [1, 0.5, 0.5],
    ],
  );
});

test('meter changes retime whole bars but preserve absolute note durations', () => {
  const changed = retimeHarmonyForMeter(
    [
      { root: 'D', chordId: 'minor-7', bars: 1, durationTicks: 384 },
      { root: 'G', chordId: 'dominant-7', bars: 0.5, durationTicks: 192 },
    ],
    '4/4',
    '3/4',
  );
  assert.deepEqual(
    changed.map((step) => [step.durationTicks, step.bars]),
    [
      [288, 1],
      [192, 2 / 3],
    ],
  );
});

test('comping retains defining tones and connects ii–V–I in close positions', () => {
  const steps = buildProgression(
    progressions.find((item) => item.id === 'ii-v-i')!,
    'C',
  );
  const voices = harmonyVoicings(steps);
  assert.equal(voices.length, 3);
  voices.forEach((notes, i) => {
    assert.ok(Math.min(...notes) >= 60 && Math.max(...notes) <= 83);
    assert.deepEqual(
      [...new Set(notes.map((midi) => mod(midi)))].sort((a, b) => a - b),
      [...new Set(harmonyNotes(steps[i]).map(pitchClass))].sort((a, b) => a - b),
    );
  });
  for (let i = 1; i < voices.length; i++) {
    const totalMovement = voices[i].reduce(
      (sum, midi, j) => sum + Math.abs(midi - voices[i - 1][j]),
      0,
    );
    assert.ok(totalMovement <= 10, `chord ${i} jumps ${totalMovement} semitones`);
  }
  const altered = harmonyVoicing({ root: 'G', chordId: 'dominant-7b9', bars: 1 });
  const required = chordById('dominant-7b9')!.required.map((degree) =>
    mod(pitchClass('G') + degreeSemitones(degree)),
  );
  required.forEach((pitch) => assert.ok(altered.some((midi) => mod(midi) === pitch)));
});

test('transposing a working progression preserves its voicings and bar lengths', () => {
  const original = buildProgression(
    progressions.find((item) => item.id === 'ii-v-i')!,
    'C',
  );
  const raised = transposeHarmony(original, 1);
  raised.forEach((step, i) => {
    assert.equal(mod(pitchClass(step.root) - pitchClass(original[i].root)), 1);
    assert.equal(step.chordId, original[i].chordId);
    assert.equal(step.bars, original[i].bars);
  });
  assert.deepEqual(
    transposeHarmony(raised, -1).map((step) => pitchClass(step.root)),
    original.map((step) => pitchClass(step.root)),
  );
});

test('stored harmony survives a reload and rejects nonsense', () => {
  const saved = normalizeHarmony({
    enabled: true,
    style: 'stabs',
    volume: 0.7,
    steps: [
      { root: 'C', chordId: 'major-7', bars: 2 },
      { root: 'D', chordId: 'does-not-exist', bars: 1 },
      { root: 'G', chordId: 'dominant-7', bars: 99 },
      { chordId: 'minor-7', bars: 1 },
    ],
  });
  assert.equal(saved.style, 'stabs');
  assert.equal(saved.volume, 0.7);
  assert.deepEqual(
    saved.steps.map((step) => [step.root, step.chordId, step.bars]),
    [
      ['C', 'major-7', 2],
      ['G', 'dominant-7', 8],
    ],
  );
  // Nothing to play means nothing is enabled, whatever the stored flag said.
  assert.equal(normalizeHarmony({ enabled: true, steps: [] }).enabled, false);
  assert.equal(normalizeHarmony(null).steps.length, 0);
  assert.equal(normalizeHarmony({ volume: 'loud' }).volume, 0.45);
  assert.equal(normalizeHarmony({ style: 'offbeats', timbre: 'bright' }).style, 'offbeats');
  assert.equal(normalizeHarmony({ timbre: 'bright' }).timbre, 'bright');
  assert.equal(normalizeHarmony({}).timbre, 'warm');
});

test('the circle of fifths matches the theory it is derived from', () => {
  assert.equal(circle.length, 12);
  circle.forEach((position, index) => {
    assert.equal(position.index, index);
    // Clockwise is a fifth up and one sharp more; the two must never disagree.
    const next = circle[(index + 1) % 12];
    assert.equal(mod(pitchClass(next.major) - pitchClass(position.major)), 7);
    for (const spelling of [position, ...(position.alternative ? [position.alternative] : [])]) {
      // The relative minor is the sixth degree, and shares the signature.
      assert.equal(
        pitchClass(spellDegree(spelling.major, '6')),
        pitchClass(spelling.minor),
        `${spelling.major} names the wrong relative minor`,
      );
      // The written accidentals are exactly the altered notes of the scale.
      const scale = keySignature(spelling.major);
      assert.deepEqual(
        signatureNotes(spelling.accidentals).map(pitchClass).sort(),
        scale.altered.map(pitchClass).sort(),
        `${spelling.major} claims the wrong signature`,
      );
      assert.equal(signatureNotes(spelling.accidentals).length, Math.abs(spelling.accidentals));
    }
    if (position.alternative)
      assert.equal(pitchClass(position.alternative.major), pitchClass(position.major));
  });
  // Neighbours are subdominant and dominant, which is why the circle is useful at all.
  const detail = keyDetail(circle[0]);
  assert.equal(detail.subdominant, 'F');
  assert.equal(detail.dominant, 'G');
  assert.equal(detail.chords.map((chord) => chord.roman).join(' '), 'I ii iii IV V vi vii°');
  assert.equal(signatureLabel(0), 'keine Vorzeichen');
  assert.equal(signatureLabel(1), '1 Kreuz');
  assert.equal(signatureLabel(-1), '1 Be');
  assert.equal(signatureLabel(4), '4 Kreuze');
  assert.equal(findPosition('Gb')?.index, 6);
  assert.equal(findPosition('A', true)?.index, 0);
});

test('the scale and the chords the article builds really are those notes', () => {
  // Seven consecutive fifths, sorted into one octave, are the major scale.
  assert.deepEqual(chainOfFifths, ['F', 'C', 'G', 'D', 'A', 'E', 'B']);
  const sorted = [...chainOfFifths].map((name) => mod(pitchClass(name))).sort((a, b) => a - b);
  assert.deepEqual(sorted, majorSteps);
  assert.deepEqual(cMajorScale, ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  // Names are international in the data and German in the article: B reads as H.
  assert.deepEqual(cMajorScale.map(germanNoteName), ['C', 'D', 'E', 'F', 'G', 'A', 'H']);
  // Whole, whole, half, whole, whole, whole, half — as the prose spells it out.
  assert.deepEqual(scaleGaps, [2, 2, 1, 2, 2, 2, 1]);
  assert.equal(
    scaleGaps.reduce((total, gap) => total + gap, 0),
    12,
  );

  // Stacking every other degree gives the seven triads, with German note names.
  assert.deepEqual(
    diatonicTriads.map((triad) => germanNoteName(triad.notes[0]) + triad.suffix),
    ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Hdim'],
  );
  for (const triad of diatonicTriads) {
    assert.equal(triad.notes.length, 3);
    // Every chord tone is a note of the scale, and the stack really is thirds.
    for (const note of triad.notes) assert.ok(cMajorScale.includes(note));
    for (const offset of triad.offsets) assert.ok(majorSteps.includes(mod(offset)));
    const [third, fifth] = [
      triad.offsets[1] - triad.offsets[0],
      triad.offsets[2] - triad.offsets[0],
    ];
    assert.ok(third === 3 || third === 4, 'a third, not something else');
    assert.ok(fifth === 6 || fifth === 7);
    if (triad.quality === 'Dur') assert.deepEqual([third, fifth], [4, 7]);
    if (triad.quality === 'Moll') assert.deepEqual([third, fifth], [3, 7]);
    if (triad.quality === 'vermindert') assert.deepEqual([third, fifth], [3, 6]);
  }
  // Three major, three minor, one diminished — the shape the table shows.
  const counted = diatonicTriads.reduce<Record<string, number>>((tally, triad) => {
    tally[triad.quality] = (tally[triad.quality] ?? 0) + 1;
    return tally;
  }, {});
  assert.deepEqual(counted, { Dur: 3, Moll: 3, vermindert: 1 });

  // Both melodies of the two-centres example stay inside those seven notes and end on
  // their own centre — no raised seventh sneaks into the A minor figure.
  for (const example of centreExamples) {
    assert.ok(majorSteps.includes(mod(pitchClass(example.bass))));
    for (const note of example.melody) assert.ok(majorSteps.includes(mod(note)));
    assert.equal(mod(example.melody.at(-1)!), mod(pitchClass(example.bass)));
    assert.equal(mod(example.melody[0]), mod(pitchClass(example.bass)));
  }
  assert.ok(!centreExamples[1].melody.some((note) => mod(note) === 8), 'no Gis in A minor');

  // The fifth still generates all twelve pitch classes; the major third does not. That
  // is why a chain of fifths reaches every note and the circle of fifths exists.
  assert.equal(gcd(7, 12), 1);
  assert.equal(new Set(Array.from({ length: 12 }, (_, i) => mod(i * 7))).size, 12);
  assert.equal(new Set(Array.from({ length: 12 }, (_, i) => mod(i * 4))).size, 3);
});
