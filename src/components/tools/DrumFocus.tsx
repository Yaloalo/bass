import { useEffect, useRef } from 'react';
import { chordById } from '../../data/chords';
import { germanNoteName } from '../../lib/i18n';
import { harmonyBars, harmonyNotes } from '../../lib/harmony-play';
import { pretty } from '../../lib/music';
import { useRhythm, useRhythmStatus } from '../../lib/rhythm-store';
import { useNoteLabel, useStore } from '../../lib/store';

/** A reading-distance view for the player, separate from the editing workbench. */
export function DrumFocus({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { harmony, pattern, preferences, start, pause, resume, stop } = useRhythm();
  const status = useRhythmStatus();
  const { bpm } = useStore();
  const label = useNoteLabel();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const pulse = status.pulse;
  const countIn = !!pulse?.countIn;
  const index =
    (status.running || status.paused) &&
    pulse &&
    pulse.chord >= 0 &&
    pulse.chord < harmony.steps.length
      ? pulse.chord
      : 0;
  const step = harmony.steps[index] ?? harmony.steps[0];
  const chord = step ? chordById(step.chordId) : undefined;
  const chordName = step ? label.chord(step.root, chord?.symbol ?? '') : '';
  const notes = step ? harmonyNotes(step) : [];
  const upcoming =
    harmony.steps.length > 1
      ? Array.from({ length: Math.min(3, harmony.steps.length - 1) }, (_, offset) => {
          const next = harmony.steps[(index + offset + 1) % harmony.steps.length];
          return {
            name: label.chord(next.root, chordById(next.chordId)?.symbol ?? ''),
            bars: next.bars,
          };
        })
      : [];
  const totalBars = harmonyBars(harmony.steps);
  const currentBar = pulse && !countIn && totalBars ? (pulse.bar % totalBars) + 1 : 1;
  const active = status.running || status.starting;
  const state = status.starting
    ? 'Startet …'
    : status.paused
      ? 'Pausiert'
      : status.running
        ? countIn
          ? 'Einzähler'
          : 'Läuft'
        : 'Gestoppt';

  return (
    <dialog
      ref={dialog}
      className="drum-focus-dialog"
      aria-label="Mitspielansicht"
      onCancel={(event) => {
        event.preventDefault();
        stop();
        onClose();
      }}
    >
      <div className="drum-focus-shell">
        <header className="drum-focus-head">
          <div>
            <span className="eyebrow">DRUM-MASCHINE · MITSPIELEN</span>
            <p>
              {pattern.name} · {bpm} BPM
            </p>
          </div>
        </header>

        <div className="drum-focus-meta" aria-label="Wiedergabeposition">
          <span className={`drum-focus-state ${active ? 'is-running' : ''}`}>{state}</span>
          {!countIn && (
            <span>
              Takt {currentBar} von {totalBars || 1}
            </span>
          )}
          <div
            className="drum-focus-beats"
            aria-label={pulse ? `Zählzeit ${pulse.beat + 1} von 4` : 'Vier Zählzeiten'}
          >
            {[1, 2, 3, 4].map((beat) => (
              <span key={beat} className={active && pulse?.beat === beat - 1 ? 'is-current' : ''}>
                {beat}
              </span>
            ))}
          </div>
        </div>

        <section className="drum-focus-chord" aria-label="Aktueller Akkord und Akkordtöne">
          {countIn ? (
            <>
              <span className="drum-focus-kicker">GLEICH GEHT ES LOS</span>
              <strong className="drum-focus-count">{(pulse?.beat ?? 0) + 1}</strong>
              <p>
                Einzähler · {preferences.countIn} {preferences.countIn === 1 ? 'Takt' : 'Takte'}
              </p>
            </>
          ) : step ? (
            <>
              <span className="drum-focus-kicker">AKTUELLER AKKORD</span>
              <h1
                className={chordName.length > 7 ? 'is-long' : ''}
                aria-live="polite"
                aria-atomic="true"
              >
                {chordName}
              </h1>
              <p className="drum-focus-quality">{chord?.nameDe ?? ''}</p>
              <div className={`drum-focus-tones count-${notes.length}`} aria-label="Akkordtöne">
                {notes.map((note, i) => (
                  <div className="drum-focus-tone" key={`${note}-${i}`}>
                    <span>{germanNoteName(note)}</span>
                    <small>{pretty(chord?.formula[i] ?? '')}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>Wähle in der Drum-Maschine eine Akkordfolge.</p>
          )}
        </section>

        {upcoming.length > 0 && !countIn && (
          <aside className="drum-focus-upcoming" aria-label="Nächste Akkorde">
            <span className="drum-focus-kicker">ALS NÄCHSTES</span>
            <ol>
              {upcoming.map((next, offset) => (
                <li key={`${offset}-${next.name}`}>
                  <small>{offset + 1}</small>
                  <strong>{next.name}</strong>
                  <span>
                    {next.bars} {next.bars === 1 ? 'Takt' : 'Takte'}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        )}

        {status.error && (
          <p className="drum-focus-error" role="alert">
            {status.error}
          </p>
        )}
        <footer className="drum-focus-actions">
          <button
            type="button"
            className="primary"
            autoFocus
            disabled={status.starting}
            onClick={() => {
              if (status.running) pause();
              else if (status.paused) resume('drums');
              else start('drums');
            }}
          >
            {status.running ? 'Pause' : status.paused ? 'Fortsetzen' : 'Groove starten'}
          </button>
          <button
            type="button"
            onClick={() => {
              stop();
              onClose();
            }}
          >
            Stopp
          </button>
        </footer>
      </div>
    </dialog>
  );
}
