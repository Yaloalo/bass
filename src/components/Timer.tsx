import { useState, useEffect, useRef } from 'react';
import { Icon } from './UI';

export function Timer({
  seconds = 300,
  onComplete,
  compact = false,
  autoStart = false,
  adjustable = false,
}: {
  seconds?: number;
  onComplete?: () => void;
  compact?: boolean;
  autoStart?: boolean;
  /** Offers other block lengths; five minutes stays the default. */
  adjustable?: boolean;
}) {
  const [length, setLength] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(autoStart);
  const end = useRef(0);
  const notified = useRef(false);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    if (!running) return;
    end.current = Date.now() + remaining * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((end.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        if (!notified.current) {
          notified.current = true;
          complete.current?.();
        }
      }
    };
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [running]); // Wall-clock deadline avoids drift when the tab sleeps.
  const reset = (to = length) => {
    setRunning(false);
    setLength(to);
    setRemaining(to);
    notified.current = false;
  };
  return (
    <section
      className={`timer ${compact ? 'compact' : ''}`}
      aria-label="Übetimer"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.code === 'Space' && e.target === e.currentTarget) {
          e.preventDefault();
          if (remaining > 0) setRunning((v) => !v);
        }
      }}
    >
      <div className="eyebrow">
        {remaining === 0 ? 'BLOCK ABGESCHLOSSEN' : `${length / 60}-MINUTEN-BLOCK`}
      </div>
      <div
        className="time-digits"
        role="timer"
        aria-label={`${Math.floor(remaining / 60)} Minuten ${remaining % 60} Sekunden`}
      >
        {String(Math.floor(remaining / 60)).padStart(2, '0')}
        <span>:</span>
        {String(remaining % 60).padStart(2, '0')}
      </div>
      <div className="timer-track">
        <span style={{ width: `${((length - remaining) / length) * 100}%` }} />
      </div>
      <div className="timer-controls">
        <button
          className="primary"
          disabled={remaining === 0}
          onClick={() => setRunning((v) => !v)}
        >
          <Icon name={running ? 'pause' : 'play'} />
          {running ? 'Pause' : remaining < length ? 'Fortsetzen' : 'Start'}
        </button>
        <button aria-label="Timer zurücksetzen" onClick={() => reset()}>
          <Icon name="repeat" />
          Zurücksetzen
        </button>
        {adjustable && (
          <label className="timer-length">
            <input
              type="number"
              inputMode="numeric"
              aria-label="Blocklänge in Minuten"
              min={1}
              max={120}
              step={1}
              value={Math.round(length / 60)}
              onChange={(event) => {
                const minutes = Number(event.target.value);
                if (minutes >= 1 && minutes <= 120) reset(minutes * 60);
              }}
            />
            <span>Min</span>
          </label>
        )}
      </div>
      <div className="timer-status" role="status">
        {remaining === 0
          ? '✓ Block abgeschlossen. Kurz durchatmen.'
          : running
            ? 'Halte den Puls. Bleib entspannt.'
            : 'Leertaste startet oder pausiert den fokussierten Timer.'}
      </div>
    </section>
  );
}
