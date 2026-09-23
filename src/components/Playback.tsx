import { useEffect, useState, useRef } from 'react';
import { useStore } from '../lib/store';
import { useRhythm } from '../lib/rhythm-store';
import { playEvents, stopPlayback } from '../lib/audio';
import type { MusicEvent } from '../lib/music';
import { Icon, AudioError } from './UI';
import { textDe } from '../lib/i18n';
export function Playback({
  events,
  scale = false,
  label,
  loopable = false,
}: {
  events: MusicEvent[];
  scale?: boolean;
  label?: string;
  /** Offers a loop switch, so the example can run under you while you play along. */
  loopable?: boolean;
}) {
  const { bpm } = useStore();
  const { nextDownbeat } = useRhythm();
  const [direction, setDirection] = useState('Ascending');
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const looping = useRef(false);
  const [error, setError] = useState('');
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      looping.current = false;
      stopPlayback();
      clearTimeout(timeout.current);
    },
    [],
  );
  useEffect(() => {
    looping.current = false;
    stopPlayback();
    setPlaying(false);
    clearTimeout(timeout.current);
  }, [events]);
  const toggle = async () => {
    if (playing) {
      looping.current = false;
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
      // With a groove or a click running, the example waits for the next bar line so the
      // two are in step; on its own it starts straight away. Either way it plays at the
      // app's current tempo.
      looping.current = loop;
      const run = async () => {
        const time = await playEvents(route, bpm, nextDownbeat());
        setPlaying(true);
        // Chaining on the schedule keeps each repeat aligned with the transport.
        timeout.current = setTimeout(
          () => (looping.current ? void run() : setPlaying(false)),
          Math.max(40, time - 30),
        );
      };
      await run();
      setError('');
    } catch {
      setError('Audio ist in diesem Browser nicht verfügbar.');
    }
  };
  return (
    <div className="playback">
      {scale && (
        <select
          aria-label="Abspielrichtung"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        >
          {['Ascending', 'Descending', 'Up / down'].map((d) => (
            <option key={d} value={d}>
              {textDe(d)}
            </option>
          ))}
        </select>
      )}
      <button onClick={toggle}>
        <Icon name={playing ? 'pause' : 'play'} />
        {playing ? 'Stopp' : (label ?? (scale ? 'Tonleiter abspielen' : 'Beispiel abspielen'))}
      </button>
      {loopable && (
        <label className="playback-loop">
          <input
            type="checkbox"
            role="switch"
            checked={loop}
            onChange={(event) => {
              setLoop(event.target.checked);
              looping.current = event.target.checked && playing;
            }}
          />
          <span>Schleife</span>
        </label>
      )}
      <span className="muted">{bpm} BPM</span>
      <AudioError error={error} />
    </div>
  );
}
