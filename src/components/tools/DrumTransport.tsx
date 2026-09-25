import { useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useRhythm, useRhythmStatus } from '../../lib/rhythm-store';
import { meterById } from '../../lib/rhythm';
import type { RhythmMode } from '../../lib/rhythm';
import { Icon } from '../UI';
import { TempoInput } from './TempoInput';
import { HarmonyNow, HarmonyToggle } from './HarmonyPanel';

/**
 * Space only reaches the transport once the user has focused something on this page.
 * On a freshly loaded page the focus is on the body, where Space must still scroll.
 */
export function useTransportShortcuts(root: React.RefObject<HTMLElement | null>, mode: RhythmMode) {
  const { start, resume, stop, tap } = useRhythm();
  const { bpm, setBpm } = useStore();
  const status = useRhythmStatus();
  const active = (status.running || status.starting) && status.mode === mode;
  const paused = status.paused && status.mode === mode;
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (document.querySelector('dialog[open]')) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, select, textarea, [contenteditable="true"], [role="grid"]'))
        return;
      const focused = document.activeElement;
      if (!focused || focused === document.body || !root.current?.contains(focused)) return;
      if (event.code === 'Space') {
        // Preserve native activation on focused controls (preset, mute, help, etc.).
        if (target?.closest('button, a, summary, [role="button"], [role="switch"]')) return;
        event.preventDefault();
        if (active) stop();
        else if (paused) resume(mode);
        else start(mode);
      } else if (event.key === 't') {
        event.preventDefault();
        tap();
      } else if (event.key === '[' || event.key === ']') {
        event.preventDefault();
        setBpm(bpm + (event.key === ']' ? 5 : -5));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [root, mode, active, paused, start, resume, stop, tap, bpm, setBpm]);
}

function Position({ mode }: { mode: RhythmMode }) {
  const { preferences, pattern } = useRhythm();
  const status = useRhythmStatus();
  const playing = status.running && status.mode === mode;
  const pulse = playing ? status.pulse : null;
  const beats = mode === 'drums' ? meterById(pattern.meter).numerator : preferences.metronome.beats;
  const state = !playing
    ? status.paused && status.mode === mode
      ? 'Pausiert'
      : 'Bereit'
    : !pulse
      ? 'Startet…'
      : pulse.countIn
        ? 'Einzähler'
        : pulse.silent
          ? 'Stille Takte – halte den Puls'
          : 'Läuft';
  return (
    <div className={`transport-position ${pulse?.silent ? 'is-gap' : ''}`}>
      <div className="beat-dots" aria-hidden="true">
        {Array.from({ length: beats }, (_, index) => (
          <span key={index} className={pulse?.beat === index ? 'current' : ''}>
            {index + 1}
          </span>
        ))}
      </div>
      <span className="transport-bar" aria-hidden="true">
        {pulse && !pulse.countIn
          ? `Pattern ${(pulse.bar % pattern.bars) + 1}/${pattern.bars}${pulse.formBars ? ` · Form ${pulse.formBar + 1}/${pulse.formBars}` : ''}`
          : '—'}
      </span>
      {/* Only the state changes here, so a screen reader is not flooded once per step. */}
      <span className="transport-state" role="status">
        {state}
      </span>
    </div>
  );
}

export function DrumTransport({ mode }: { mode: RhythmMode }) {
  const { bpm, setBpm } = useStore();
  const { start, resume, stop, preferences, setPreferences, tap, tapCount, pattern, setPattern } =
    useRhythm();
  const status = useRhythmStatus();
  const active = (status.running || status.starting) && status.mode === mode;
  const paused = status.paused && status.mode === mode;
  const drums = mode === 'drums';
  const ramp = preferences.ramp;
  const setRamp = (patch: Partial<typeof ramp>) =>
    setPreferences({ ...preferences, ramp: { ...ramp, ...patch } });
  return (
    <div className="drum-transport" role="group" aria-label="Transport">
      <button
        type="button"
        className={`button primary transport-play ${active ? 'is-running' : ''}`}
        onClick={() => {
          if (active) stop();
          else if (paused) resume(mode);
          else start(mode);
        }}
      >
        <Icon name={active ? 'pause' : 'play'} />
        {active
          ? status.starting
            ? 'Abbrechen'
            : 'Stopp'
          : paused
            ? 'Fortsetzen'
            : drums
              ? 'Groove starten'
              : 'Klick starten'}
      </button>
      <Position mode={mode} />
      {/* The current chord rides in the sticky transport, so it stays readable from
          the music stand while the rest of the page scrolls away. */}
      {drums && <HarmonyNow />}
      {drums && <HarmonyToggle />}
      <div className="transport-tempo">
        <button type="button" aria-label="Tempo um 5 verringern" onClick={() => setBpm(bpm - 5)}>
          −5
        </button>
        <label>
          <span>BPM</span>
          <TempoInput label="Übe-Tempo" />
        </label>
        <button type="button" aria-label="Tempo um 5 erhöhen" onClick={() => setBpm(bpm + 5)}>
          +5
        </button>
        <button type="button" className="tap-button" onClick={tap} aria-label="Tempo tippen">
          {tapCount > 0 ? `Weiter tippen (${tapCount})` : 'Tempo tippen'}
        </button>
      </div>
      <label className="tool-field">
        <span>Einzähler</span>
        <select
          aria-label="Einzähler in Takten"
          value={preferences.countIn}
          onChange={(event) =>
            setPreferences({ ...preferences, countIn: Number(event.target.value) })
          }
        >
          <option value={0}>Kein</option>
          <option value={1}>1 Takt</option>
          <option value={2}>2 Takte</option>
        </select>
      </label>
      {drums && (
        <>
          <label className="tool-checkbox metric-click-toggle">
            <input
              type="checkbox"
              checked={preferences.metricClick}
              onChange={(event) =>
                setPreferences({ ...preferences, metricClick: event.target.checked })
              }
            />
            Metrik-Klick
          </label>
          <label className="tool-field swing-field">
            <span>
              Swing <output>{Math.round(pattern.swing * 100)}%</output>
            </span>
            <input
              type="range"
              aria-label="Swing"
              min={50}
              max={67}
              disabled={pattern.subdivision === 3}
              value={Math.round(pattern.swing * 100)}
              onChange={(event) =>
                setPattern({ ...pattern, swing: Math.min(2 / 3, Number(event.target.value) / 100) })
              }
            />
          </label>
        </>
      )}
      <label className="tool-field volume-field">
        <span>
          Lautstärke <output>{Math.round(preferences.volume * 100)}%</output>
        </span>
        <input
          type="range"
          aria-label="Gesamtlautstärke"
          min={0}
          max={1}
          step={0.01}
          value={preferences.volume}
          onChange={(event) =>
            setPreferences({ ...preferences, volume: Number(event.target.value) })
          }
        />
      </label>
      <div className="tempo-trainer">
        <label className="tempo-trainer-switch">
          <input
            type="checkbox"
            role="switch"
            checked={ramp.enabled}
            onChange={(event) => setRamp({ enabled: event.target.checked })}
          />
          <span>Tempo-Trainer</span>
        </label>
        <label>
          <span className="visually-hidden">Schritt in BPM</span>
          <select
            aria-label="Tempo-Schritt in BPM"
            value={ramp.step}
            onChange={(event) => setRamp({ step: Number(event.target.value) })}
          >
            {[-5, -2, 1, 2, 3, 4, 5, 10].map((value) => (
              <option key={value} value={value}>
                {value > 0 ? `+${value}` : value} BPM
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="visually-hidden">Takte zwischen den Schritten</span>
          <select
            aria-label="Takte je Tempo-Schritt"
            value={ramp.every}
            onChange={(event) => setRamp({ every: Number(event.target.value) })}
          >
            {[1, 2, 4, 8, 12, 16].map((value) => (
              <option key={value} value={value}>
                alle {value} {value === 1 ? 'Takt' : 'Takte'}
              </option>
            ))}
          </select>
        </label>
        <label className="tempo-trainer-target">
          <span>bis</span>
          <input
            type="number"
            aria-label="Ziel-Tempo in BPM"
            min={30}
            max={300}
            value={ramp.target}
            onChange={(event) => setRamp({ target: Number(event.target.value) })}
          />
          <span>BPM</span>
        </label>
        <p className="tempo-trainer-note" role="status">
          {ramp.enabled
            ? `${bpm} → ${ramp.target} BPM · ${ramp.step > 0 ? '+' : ''}${ramp.step} alle ${ramp.every} ${
                ramp.every === 1 ? 'Takt' : 'Takte'
              }. Ein eigener Tempowechsel schaltet ihn wieder ab.`
            : 'Zieht das Tempo während des Spielens Schritt für Schritt hoch und hält beim Ziel an.'}
        </p>
      </div>
      {status.running && status.mode !== mode && (
        <p className="tool-notice" role="status">
          {status.mode === 'drums'
            ? 'Die Drum-Maschine läuft gerade.'
            : 'Das Metronom läuft gerade.'}{' '}
          Starte hier, um zu wechseln.
        </p>
      )}
      {status.error && (
        <p className="tool-notice" role="alert">
          {status.error}
        </p>
      )}
    </div>
  );
}
