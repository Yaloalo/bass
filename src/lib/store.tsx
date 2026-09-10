import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { roots } from './music';
export function useLocal<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem('bass:' + key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('bass:' + key, JSON.stringify(value));
    } catch {
      /* Local preference storage may be unavailable. */
    }
  }, [key, value]);
  return [value, setValue];
}
export interface Viewed {
  title: string;
  path: string;
}
export interface LogEntry {
  id: string;
  date: string;
  title: string;
  minutes: number;
  completed: string[];
  notes: string;
}
interface Store {
  root: string;
  setRoot: (v: string) => void;
  bpm: number;
  setBpm: (v: number) => void;
  favorites: Viewed[];
  toggleFavorite: (v: Viewed) => void;
  recent: Viewed[];
  visit: (v: Viewed) => void;
  progress: Record<string, string>;
  setStatus: (path: string, status: string) => void;
  comfortable: Record<string, number>;
  setComfortable: (id: string, bpm: number) => void;
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, 'id' | 'date'>) => void;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [savedRoot, setRoot] = useLocal('root', 'D');
  const root = roots.includes(savedRoot) ? savedRoot : 'D';
  const [bpm, setBpmValue] = useLocal('bpm', 80);
  const [favorites, setFavorites] = useLocal<Viewed[]>('favorites', []);
  const [recent, setRecent] = useLocal<Viewed[]>('recent', []);
  const [progress, setProgress] = useLocal<Record<string, string>>('progress', {});
  const [comfortable, setComfortableValue] = useLocal<Record<string, number>>('comfortable', {});
  const [logs, setLogs] = useLocal<LogEntry[]>('log', []);
  const store: Store = {
    root,
    setRoot,
    bpm,
    setBpm: (v) => setBpmValue(Math.max(30, Math.min(240, Math.round(v) || 80))),
    favorites,
    toggleFavorite: (v) =>
      setFavorites((old) =>
        old.some((x) => x.path === v.path) ? old.filter((x) => x.path !== v.path) : [...old, v],
      ),
    recent,
    visit: (v) => setRecent((old) => [v, ...old.filter((x) => x.path !== v.path)].slice(0, 8)),
    progress,
    setStatus: (path, status) => setProgress((old) => ({ ...old, [path]: status })),
    comfortable,
    setComfortable: (id, tempo) => setComfortableValue((old) => ({ ...old, [id]: tempo })),
    logs,
    addLog: (entry) =>
      setLogs((old) =>
        [{ ...entry, id: crypto.randomUUID(), date: new Date().toISOString() }, ...old].slice(
          0,
          200,
        ),
      ),
  };
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export const useStore = () => {
  const store = useContext(Context);
  if (!store) throw new Error('Missing StoreProvider');
  return store;
};
