import test from 'node:test';
import assert from 'node:assert/strict';
import { exercises } from '../src/data/catalog';
import { exerciseRoot, practiceExerciseTitle } from '../src/lib/practice';

test('practice titles follow the same transposition as their exercises', () => {
  const major = exercises.find((exercise) => exercise.id === 'M1')!;
  const minor = exercises.find((exercise) => exercise.id === 'M2')!;
  const chain = exercises.find((exercise) => exercise.id === 'M12')!;
  assert.equal(practiceExerciseTitle(major, 'E'), 'E-Dur-Tonleiter');
  assert.equal(practiceExerciseTitle(minor, 'Db'), 'Cis-Moll-Tonleiter');
  assert.equal(practiceExerciseTitle(chain, 'F'), 'ii–V–I-Septakkordfolge in F');
  assert.equal(major.title, 'D-Dur-Tonleiter');
});
