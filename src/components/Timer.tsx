import { useState, useEffect, useRef } from 'react';
import { Icon } from './UI';
export function Timer({
  seconds = 300,
  onComplete,
  compact = false,
}: {
  seconds?: number;
  onComplete?: () => void;
  compact?: boolean;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
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
  const reset = () => {
    setRunning(false);
    setRemaining(seconds);
    notified.current = false;
  };
  return (
    <section
      className={`timer ${compact ? 'compact' : ''}`}
      aria-label="Exercise timer"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.code === 'Space' && e.target === e.currentTarget) {
          e.preventDefault();
          if (remaining > 0) setRunning((v) => !v);
        }
      }}
    >
      <div className="eyebrow">{remaining === 0 ? 'INTERVAL COMPLETE' : 'FIVE-MINUTE BLOCK'}</div>
      <div
        className="time-digits"
        role="timer"
        aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds`}
      >
        {String(Math.floor(remaining / 60)).padStart(2, '0')}
        <span>:</span>
        {String(remaining % 60).padStart(2, '0')}
      </div>
      <div className="timer-track">
        <span style={{ width: `${((seconds - remaining) / seconds) * 100}%` }} />
      </div>
      <div className="timer-controls">
        <button
          className="primary"
          disabled={remaining === 0}
          onClick={() => setRunning((v) => !v)}
        >
          <Icon name={running ? 'pause' : 'play'} />
          {running ? 'Pause' : remaining < seconds ? 'Resume' : 'Start'}
        </button>
        <button aria-label="Reset timer" onClick={reset}>
          <Icon name="repeat" />
          Reset
        </button>
      </div>
      <div className="timer-status" role="status">
        {remaining === 0
          ? '✓ Five minutes complete. Take a breath.'
          : running
            ? 'Keep the pulse. Stay relaxed.'
            : 'Space starts or pauses when this timer is focused.'}
      </div>
    </section>
  );
}
