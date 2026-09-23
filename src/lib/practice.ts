import type { Exercise } from '../data/catalog';
import { isNote, readableRoot } from './music';
import { germanNoteName } from './i18n';

export function exerciseRoot(exercise: Exercise, selectedRoot: string): string {
  return readableRoot(selectedRoot, [
    ...new Set(exercise.events.filter(isNote).map((note) => note.degree ?? '1')),
  ]);
}

export function practiceExerciseTitle(exercise: Exercise, selectedRoot: string): string {
  const root = exerciseRoot(exercise, selectedRoot);
  return exercise.title.replace(
    new RegExp(`\\b${exercise.baseRoot}\\b`, 'g'),
    germanNoteName(root),
  );
}
