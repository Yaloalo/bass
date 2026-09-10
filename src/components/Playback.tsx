import { useEffect, useState, useRef } from 'react';
import { useStore } from '../lib/store';
import { playEvents, stopPlayback } from '../lib/audio';
import type { MusicEvent } from '../lib/music';
import { Icon, AudioError } from './UI';
export function Playback({
  events,
  scale = false,
  label,
}: {
  events: MusicEvent[];
  scale?: boolean;
  label?: string;
}) {
  const { bpm } = useStore();
  const [direction, setDirection] = useState('Ascending');
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      stopPlayback();
      clearTimeout(timeout.current);
    },
    [],
  );
  useEffect(() => {
    stopPlayback();
    setPlaying(false);
    clearTimeout(timeout.current);
  }, [events]);
  const toggle = async () => {
    if (playing) {
      stopPlayback();
      setPlaying(false);
      clearTimeout(timeout.current);
      return;
    }
    try {
      const route =
        direction === 'Descending'
          ? [...events].reverse()
          : direction === 'Up / down'
            ? [...events, ...events.slice(0, -1).reverse()]
            : events;
      const time = await playEvents(route, bpm);
      setPlaying(true);
      timeout.current = setTimeout(() => setPlaying(false), time);
      setError('');
    } catch {
      setError('Audio is unavailable in this browser.');
    }
  };
  return (
    <div className="playback">
      {scale && (
        <select
          aria-label="Playback direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        >
          {['Ascending', 'Descending', 'Up / down'].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      )}
      <button onClick={toggle}>
        <Icon name={playing ? 'pause' : 'play'} />
        {playing ? 'Stop' : (label ?? (scale ? 'Play scale' : 'Play example'))}
      </button>
      <span className="muted">{bpm} BPM</span>
      <AudioError error={error} />
    </div>
  );
}
