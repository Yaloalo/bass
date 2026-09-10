import { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { audioContext, tone } from '../lib/audio';
import { Icon } from './UI';
export function Metronome() {
  const { bpm, setBpm } = useStore();
  const [running, setRunning] = useState(false),
    [beat, setBeat] = useState(0),
    [error, setError] = useState('');
  const tempo = useRef(bpm);
  tempo.current = bpm;
  useEffect(() => {
    if (!running) return;
    let canceled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const oscillators: OscillatorNode[] = [];
    let next = 0,
      count = 0;
    audioContext()
      .then((ctx) => {
        if (canceled) return;
        next = ctx.currentTime + 0.04;
        const schedule = () => {
          while (next < ctx.currentTime + 0.1) {
            oscillators.push(tone(ctx, count % 4 === 0 ? 1100 : 800, next, 0.045, true));
            if (oscillators.length > 12) oscillators.shift();
            setBeat(count % 4);
            next += 60 / tempo.current;
            count++;
          }
        };
        schedule();
        interval = setInterval(schedule, 25);
      })
      .catch(() => {
        setError('Audio unavailable');
        setRunning(false);
      });
    return () => {
      canceled = true;
      clearInterval(interval);
      oscillators.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* Ended. */
        }
      });
    };
  }, [running]);
  return (
    <div className="metronome">
      <span className="metronome-label">
        <Icon name="metronome" />
        Metronome
      </span>
      <div className="beat-lights" aria-label={running ? 'Metronome running' : 'Metronome stopped'}>
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={running && beat === i ? 'on' : ''} />
        ))}
      </div>
      <button
        className="small-button"
        aria-label="Decrease tempo by 5"
        onClick={() => setBpm(bpm - 5)}
      >
        −5
      </button>
      <label>
        <input
          type="number"
          aria-label="Metronome BPM"
          min="30"
          max="240"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
        />
        <span>BPM</span>
      </label>
      <button
        className="small-button"
        aria-label="Increase tempo by 5"
        onClick={() => setBpm(bpm + 5)}
      >
        +5
      </button>
      <button
        className={running ? 'metro-toggle active' : 'metro-toggle'}
        aria-label={running ? 'Stop metronome' : 'Start metronome'}
        onClick={() => setRunning((v) => !v)}
      >
        <Icon name={running ? 'pause' : 'play'} size={14} />
        <span>{running ? 'Stop' : 'Start'}</span>
      </button>
      {error && <span role="status">{error}</span>}
    </div>
  );
}
