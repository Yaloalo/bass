import { useEffect, useRef } from 'react';
import { exerciseGroove } from '../data/catalog';
import type { Exercise } from '../data/catalog';
import { presetById } from './drum-presets';
import { useRhythm } from './rhythm-store';
import type { DrumPattern } from './rhythm';
import { useStore } from './store';

/** The groove an exercise plays: your edited version if there is one, else its preset. */
export function useExerciseGroove(exercise: Exercise | undefined): DrumPattern | null {
  const { exerciseGrooves } = useRhythm();
  if (!exercise) return null;
  const edited = exerciseGrooves[exercise.id];
  if (edited) return edited;
  const preset = exerciseGroove(exercise.id);
  return preset ? (presetById(preset)?.pattern ?? null) : null;
}

/**
 * Opening an exercise should leave nothing to set up: its own starting tempo is in the
 * transport and the tempo trainer is off, so the tempo cannot creep away while you are
 * still learning the notes.
 *
 * It deliberately does not load anything into the drum machine. The pattern you were
 * building there is still there when you go back to it; an exercise's groove is a
 * separate thing that only the accompaniment plays.
 *
 * It runs once per exercise, not on every render, so changing the tempo by hand
 * afterwards sticks.
 */
export function usePracticeSetup(exercise: Exercise | undefined) {
  const { setBpm } = useStore();
  const { preferences, setPreferences, stop } = useRhythm();
  const applied = useRef('');
  const latest = useRef({ setBpm, preferences, setPreferences, stop });
  latest.current = { setBpm, preferences, setPreferences, stop };

  useEffect(() => {
    if (!exercise || applied.current === exercise.id) return;
    applied.current = exercise.id;
    const { setBpm: tempo, preferences: prefs, setPreferences: save, stop: halt } = latest.current;
    // A groove left running from the previous block would fight the new tempo.
    halt();
    tempo(exercise.startBpm);
    if (prefs.ramp.enabled) save({ ...prefs, ramp: { ...prefs.ramp, enabled: false } });
  }, [exercise]);
}
