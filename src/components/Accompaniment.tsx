import { useEffect, useRef } from 'react';
import { Icon } from './UI';
import { useRhythm, useRhythmStatus } from '../lib/rhythm-store';
import type { DrumPattern } from '../lib/rhythm';

const modes = [
  { id: 'off', label: 'Ohne' },
  { id: 'metronome', label: 'Metronom' },
  { id: 'drums', label: 'Groove' },
] as const;

type Mode = (typeof modes)[number]['id'];

/**
 * Plays a click or this exercise's groove underneath the block. The groove is played
 * from its own pattern, never from the one you are building in the drum machine, so
 * practising never disturbs your work there.
 */
export function Accompaniment({
  groove,
  value,
  onChange,
}: {
  /** The exercise's groove, or null where it has none. */
  groove: DrumPattern | null;
  value: Mode;
  onChange: (mode: Mode) => void;
}) {
  const { start, stop, playInstead } = useRhythm();
  const status = useRhythmStatus();
  const running = status.running || status.starting;
  const latest = useRef({ stop, playInstead });
  latest.current = { stop, playInstead };

  // Leaving the page must not leave the transport running or the override in place.
  useEffect(
    () => () => {
      latest.current.stop();
      latest.current.playInstead(null);
    },
    [],
  );

  const choose = (mode: Mode) => {
    onChange(mode);
    stop();
    playInstead(mode === 'drums' ? groove : null);
    if (mode === 'off') return;
    // The transport needs a tick to settle after a stop before it starts again.
    setTimeout(() => start(mode === 'drums' ? 'drums' : 'metronome'), 60);
  };

  return (
    <div className="accompaniment" role="group" aria-label="Begleitung">
      <div className="segmented" role="group" aria-label="Begleitung zum Beispiel">
        {modes.map((mode) => (
          <button
            type="button"
            key={mode.id}
            disabled={mode.id === 'drums' && !groove}
            aria-pressed={value === mode.id}
            className={value === mode.id ? 'selected' : ''}
            onClick={() => choose(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
      {value !== 'off' && running && (
        <button type="button" className="accompaniment-stop" onClick={() => choose('off')}>
          <Icon name="pause" size={14} /> Stopp
        </button>
      )}
    </div>
  );
}

export type AccompanimentMode = Mode;
