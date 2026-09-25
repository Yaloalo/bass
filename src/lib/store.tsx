import { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { roots, noteLabel, chordLabel, keyLabel } from './music';
import type { NoteNameStyle } from './music';
/**
 * Session-only state. Nothing this app holds about you is written anywhere: the key,
 * the tempo, the drum patterns and every setting live for as long as the tab does and
 * are gone afterwards. The signature keeps the `key` argument so call sites read the
 * same, but it is only a label.
 */
export function useLocal<T>(_key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  return useState<T>(initial);
}
interface Store {
  root: string;
  setRoot: (v: string) => void;
  scaleId: string;
  setScaleId: (v: string) => void;
  bpm: number;
  setBpm: (v: number) => void;
  noteStyle: NoteNameStyle;
  setNoteStyle: (v: NoteNameStyle) => void;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [savedRoot, setRoot] = useLocal('root', 'D');
  const root = roots.includes(savedRoot) ? savedRoot : 'D';
  const [savedScaleId, setScaleId] = useLocal('scale', 'major');
  const scaleId = typeof savedScaleId === 'string' ? savedScaleId : 'major';
  const [savedBpm, setBpmValue] = useLocal('bpm', 80);
  const [savedStyle, setNoteStyle] = useLocal<unknown>('note-names', 'de');
  const noteStyle: NoteNameStyle = savedStyle === 'int' ? 'int' : 'de';
  const bpm =
    typeof savedBpm === 'number' && Number.isFinite(savedBpm)
      ? Math.max(30, Math.min(240, Math.round(savedBpm)))
      : 80;
  const store: Store = {
    root,
    setRoot,
    scaleId,
    setScaleId,
    bpm,
    setBpm: (v) => setBpmValue(Math.max(30, Math.min(240, Math.round(v) || 80))),
    noteStyle,
    setNoteStyle,
  };
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
/** Bound helpers so components never thread the note-name style through by hand. */
export const useNoteLabel = () => {
  const { noteStyle } = useStore();
  return useMemo(
    () => ({
      note: (name: string) => noteLabel(name, noteStyle),
      chord: (root: string, symbol: string) => chordLabel(root, symbol, noteStyle),
      key: (root: string, minor: boolean) => keyLabel(root, minor, noteStyle),
      style: noteStyle,
    }),
    [noteStyle],
  );
};

export const useStore = () => {
  const store = useContext(Context);
  if (!store) throw new Error('Missing StoreProvider');
  return store;
};
