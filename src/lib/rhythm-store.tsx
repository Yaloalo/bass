import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useStore } from './store';
import { emptyHarmony, normalizeHarmony } from './harmony-play';
import type { Harmony, HarmonyStep } from './harmony-play';
import { RhythmEngine, stoppedRhythm } from './rhythm-audio';
import type { RhythmStatus } from './rhythm-audio';
import {
  defaultPreferences,
  normalizePattern,
  normalizePreferences,
  normalizeSaved,
  tappedTempo,
} from './rhythm';
import type {
  DrumPattern,
  DrumSound,
  Instrument,
  RhythmMode,
  RhythmPreferences,
  SavedPattern,
} from './rhythm';
import { drumPresets, presetById } from './drum-presets';

/**
 * Session-only, like everything else here: patterns, chords and preferences live in
 * this tab and nowhere else. `normalize` still runs over the defaults so the shapes
 * stay exactly the ones the rest of the app expects.
 */
function useValidatedLocal<T>(
  _key: string,
  _legacyKey: string,
  initial: T,
  normalize: (value: unknown, legacy?: boolean) => T,
) {
  const [value, setValue] = useState<T>(() => normalize(initial));
  return [value, setValue, false] as const;
}

export interface RhythmStore {
  pattern: DrumPattern;
  setPattern: (pattern: DrumPattern) => void;
  preferences: RhythmPreferences;
  setPreferences: (preferences: RhythmPreferences) => void;
  saved: SavedPattern[];
  /** null while the working pattern has no library entry behind it. */
  currentId: string | null;
  dirty: boolean;
  loadPattern: (id: string) => void;
  saveAs: (name: string) => void;
  saveOver: () => void;
  renamePattern: (id: string, name: string) => void;
  duplicatePattern: (id: string) => void;
  removePattern: (id: string) => void;
  harmony: Harmony;
  setHarmony: (harmony: Harmony) => void;
  /**
   * An exercise's groove, kept apart from the pattern you build in the drum machine.
   * Playing along with an exercise never touches your own working pattern, and editing
   * an exercise's groove never touches it either.
   */
  exerciseGrooves: Record<string, DrumPattern>;
  /** While set, the sequencer edits that exercise's groove, not your working pattern. */
  editingExercise: string | null;
  beginGrooveEdit: (exerciseId: string, initial: DrumPattern) => void;
  endGrooveEdit: () => void;
  /** Plays this pattern instead of the working one until it is cleared. */
  playInstead: (pattern: DrumPattern | null) => void;
  /** Audio-clock time of the next bar line, for anything that wants to play in time. */
  nextDownbeat: () => number | undefined;
  start: (mode: RhythmMode) => void;
  pause: () => void;
  resume: (mode: RhythmMode) => void;
  stop: () => void;
  tap: () => void;
  tapCount: number;
  preview: (instrument: Instrument, soundOverride?: DrumSound) => void;
  previewChord: (step: HarmonyStep, index: number) => void;
}

const ApiContext = createContext<RhythmStore | null>(null);
const StatusContext = createContext<RhythmStatus>(stoppedRhythm);

const serialize = (pattern: DrumPattern) => JSON.stringify(normalizePattern(pattern));

export function RhythmProvider({ children }: { children: ReactNode }) {
  const { bpm, setBpm } = useStore();
  const [pattern, setPattern] = useValidatedLocal(
    'rhythm:draft:v2',
    'rhythm:draft:v1',
    drumPresets[0].pattern,
    normalizePattern,
  );
  const [preferences, setPreferences] = useValidatedLocal(
    'rhythm:preferences:v2',
    'rhythm:preferences:v1',
    defaultPreferences,
    normalizePreferences,
  );
  const [saved, setSaved] = useValidatedLocal<SavedPattern[]>(
    'rhythm:patterns:v2',
    'rhythm:patterns:v1',
    [],
    normalizeSaved,
  );
  const [harmony, setHarmony] = useValidatedLocal<Harmony>(
    'rhythm:harmony:v1',
    'rhythm:harmony:v1',
    emptyHarmony,
    normalizeHarmony,
  );
  const [exerciseGrooves, setExerciseGrooves] = useState<Record<string, DrumPattern>>({});
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [override, setOverride] = useState<DrumPattern | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState<RhythmStatus>(stoppedRhythm);
  const [tapCount, setTapCount] = useState(0);
  const taps = useRef<number[]>([]);
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const engine = useRef<RhythmEngine | null>(null);

  // The sequencer shows your working pattern, unless you came here to edit one
  // exercise's groove — then it shows that, and your own is left untouched.
  const edited = editingExercise ? exerciseGrooves[editingExercise] : undefined;
  const shownPattern = edited ?? pattern;
  const setShownPattern = useCallback(
    (next: DrumPattern) =>
      editingExercise
        ? setExerciseGrooves((old) => ({ ...old, [editingExercise]: next }))
        : setPattern(next),
    [editingExercise, setPattern],
  );
  // What the transport actually plays: an exercise's groove while one is chosen,
  // otherwise whatever the sequencer is showing.
  const sounding = override ?? shownPattern;
  const config = useRef({ bpm, pattern: sounding, preferences, harmony });
  config.current = { bpm, pattern: sounding, preferences, harmony };

  useEffect(() => {
    engine.current = new RhythmEngine(config.current, setStatus, (next) => setBpm(next));
    return () => {
      engine.current?.stop();
      engine.current = null;
      clearTimeout(tapTimeout.current);
    };
  }, []);
  useEffect(
    () => engine.current?.update({ bpm, pattern: sounding, preferences, harmony }),
    [bpm, sounding, preferences, harmony],
  );

  const dirty = useMemo(() => {
    if (!currentId) return false;
    const entry = saved.find((item) => item.id === currentId) ?? presetById(currentId);
    return !entry || serialize(entry.pattern) !== serialize(pattern);
  }, [currentId, saved, pattern]);

  const loadPattern = useCallback(
    (id: string) => {
      const preset = presetById(id);
      const custom = saved.find((item) => item.id === id);
      const next = custom?.pattern ?? preset?.pattern;
      if (!next) return;
      setPattern(normalizePattern(next));
      setCurrentId(id);
      if (preset) setBpm(preset.bpm);
    },
    [saved, setPattern, setBpm],
  );

  const saveAs = useCallback(
    (name: string) => {
      const id = crypto.randomUUID();
      const clean = {
        ...normalizePattern(pattern),
        name: name.trim().slice(0, 60) || 'Mein Groove',
      };
      setPattern(clean);
      setSaved((old) => [{ id, pattern: clean }, ...old].slice(0, 40));
      setCurrentId(id);
    },
    [pattern, setPattern, setSaved],
  );

  const saveOver = useCallback(() => {
    if (!currentId) return;
    const clean = normalizePattern(pattern);
    setSaved((old) =>
      old.some((item) => item.id === currentId)
        ? old.map((item) => (item.id === currentId ? { id: currentId, pattern: clean } : item))
        : [{ id: currentId, pattern: clean }, ...old].slice(0, 40),
    );
  }, [currentId, pattern, setSaved]);

  const renamePattern = useCallback(
    (id: string, name: string) => {
      const clean = name.trim().slice(0, 60) || 'Mein Groove';
      setSaved((old) =>
        old.map((item) =>
          item.id === id ? { ...item, pattern: { ...item.pattern, name: clean } } : item,
        ),
      );
      if (id === currentId) setPattern({ ...pattern, name: clean });
    },
    [currentId, pattern, setPattern, setSaved],
  );

  const duplicatePattern = useCallback(
    (id: string) => {
      const source = saved.find((item) => item.id === id)?.pattern ?? presetById(id)?.pattern;
      if (!source) return;
      const copy = { ...normalizePattern(source), name: `${source.name.slice(0, 52)} Kopie` };
      const newId = crypto.randomUUID();
      setSaved((old) => [{ id: newId, pattern: copy }, ...old].slice(0, 40));
      setPattern(copy);
      setCurrentId(newId);
    },
    [saved, setPattern, setSaved],
  );

  const removePattern = useCallback(
    (id: string) => {
      setSaved((old) => old.filter((item) => item.id !== id));
      setCurrentId((old) => (old === id ? null : old));
    },
    [setSaved],
  );

  const start = useCallback((mode: RhythmMode) => {
    void engine.current?.start(mode);
  }, []);
  const pause = useCallback(() => engine.current?.pause(), []);
  const resume = useCallback((mode: RhythmMode) => engine.current?.resume(mode), []);
  const stop = useCallback(() => engine.current?.stop(), []);
  const preview = useCallback((instrument: Instrument, soundOverride?: DrumSound) => {
    void engine.current?.preview(instrument, soundOverride);
  }, []);
  const previewChord = useCallback((step: HarmonyStep, index: number) => {
    void engine.current?.previewChord(step, index);
  }, []);
  const tap = useCallback(() => {
    const result = tappedTempo(taps.current, performance.now());
    taps.current = result.taps;
    setTapCount(result.taps.length);
    if (result.bpm) setBpm(result.bpm);
    clearTimeout(tapTimeout.current);
    tapTimeout.current = setTimeout(() => setTapCount(0), 2200);
  }, [setBpm]);

  const nextDownbeat = useCallback(() => engine.current?.nextDownbeat(), []);
  const beginGrooveEdit = useCallback((exerciseId: string, initial: DrumPattern) => {
    setExerciseGrooves((old) => (old[exerciseId] ? old : { ...old, [exerciseId]: initial }));
    setEditingExercise(exerciseId);
  }, []);
  const endGrooveEdit = useCallback(() => setEditingExercise(null), []);

  // The API object is stable across pulses; only StatusContext changes 8-16 times a bar.
  const api = useMemo<RhythmStore>(
    () => ({
      pattern: shownPattern,
      setPattern: setShownPattern,
      preferences,
      setPreferences,
      saved,
      currentId,
      dirty,
      loadPattern,
      saveAs,
      saveOver,
      renamePattern,
      duplicatePattern,
      removePattern,
      harmony,
      setHarmony,
      exerciseGrooves,
      editingExercise,
      beginGrooveEdit,
      endGrooveEdit,
      playInstead: setOverride,
      nextDownbeat,
      start,
      pause,
      resume,
      stop,
      tap,
      tapCount,
      preview,
      previewChord,
    }),
    [
      shownPattern,
      setShownPattern,
      nextDownbeat,
      preferences,
      setPreferences,
      saved,
      currentId,
      dirty,
      loadPattern,
      saveAs,
      saveOver,
      renamePattern,
      duplicatePattern,
      removePattern,
      harmony,
      setHarmony,
      exerciseGrooves,
      editingExercise,
      beginGrooveEdit,
      endGrooveEdit,
      setOverride,
      start,
      pause,
      resume,
      stop,
      tap,
      tapCount,
      preview,
      previewChord,
    ],
  );

  return (
    <ApiContext.Provider value={api}>
      <StatusContext.Provider value={status}>{children}</StatusContext.Provider>
    </ApiContext.Provider>
  );
}

export function useRhythm() {
  const store = useContext(ApiContext);
  if (!store) throw new Error('Missing RhythmProvider');
  return store;
}

/** Subscribe to the transport only where the playhead is actually drawn. */
export function useRhythmStatus() {
  return useContext(StatusContext);
}
