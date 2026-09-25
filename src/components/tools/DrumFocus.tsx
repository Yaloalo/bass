import { useEffect, useRef } from 'react';
import { chordById } from '../../data/chords';
import { germanNoteName } from '../../lib/i18n';
import { harmonyDurationLabel, harmonyNotes, harmonyTimeline } from '../../lib/harmony-play';
import {
  dropoutActive,
  modeInstruction,
  phrasingState,
  relevantToneIndices,
  targetForChord,
} from '../../lib/improvisation-trainer';
import { pretty } from '../../lib/music';
import { meterById, stepLabel, stepsPerBar } from '../../lib/rhythm';
import { useRhythm, useRhythmStatus } from '../../lib/rhythm-store';
import { useNoteLabel, useStore } from '../../lib/store';
import { instrumentProfile } from '../../lib/instrument';

/** A reading-distance view for the player, separate from the editing workbench. */
export function DrumFocus({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { harmony, pattern, preferences, trainer, start, pause, resume, stop } = useRhythm();
  const status = useRhythmStatus();
  const { bpm, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const instrumentNotes = profile.name === 'Bass' ? 'Bassnoten' : 'Gitarrentöne';
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
  const relevant = relevantToneIndices(step, trainer.mode);
  const meter = meterById(pattern.meter);
  const perBar = stepsPerBar(pattern);
  const timeline = harmonyTimeline(harmony.steps, pattern.meter);
  const totalBars = pulse?.formBars || timeline.length;
  const currentBar = pulse && !countIn ? pulse.formBar + 1 : 1;
  const formCycle = pulse?.formCycle || 1;
  const dropout = !countIn && dropoutActive(trainer, formCycle);
  const hideNames = dropout && trainer.dropout.display !== 'audio';
  const positionOnly = dropout && trainer.dropout.display === 'position-only';
  const phrase = phrasingState(trainer, pulse?.bar ?? 0);
  const nextStep =
    harmony.steps.length > 1 ? harmony.steps[(index + 1) % harmony.steps.length] : step;
  const target = targetForChord(nextStep, trainer.targetTone, formCycle + index);
  const upcoming =
    harmony.steps.length > 1
      ? Array.from({ length: Math.min(3, harmony.steps.length - 1) }, (_, offset) => {
          const next = harmony.steps[(index + offset + 1) % harmony.steps.length];
          return {
            name: chordTitleFor(next, label),
            duration: harmonyDurationLabel(next, pattern.meter),
          };
        })
      : [];
  const active = status.running || status.starting;
  const state = status.starting
    ? 'Startet …'
    : status.paused
      ? 'Pausiert'
      : status.running
        ? countIn
          ? 'Einzähler'
          : dropout
            ? 'Harmony Dropout'
            : 'Läuft'
        : 'Gestoppt';
  const formStart =
    status.running && !countIn && pulse?.formTick === 0 && pulse.beat === 0 && pulse.substep === 0;

  const rhythmTrack = trainer.rhythmRule === 'copy-snare' ? 'snare' : 'kick';
  const rhythmSteps = pattern.tracks[rhythmTrack].steps.slice(
    ((pulse?.bar ?? 0) % pattern.bars) * perBar,
    (((pulse?.bar ?? 0) % pattern.bars) + 1) * perBar,
  );
  const rhythmActive = (value: number, stepIndex: number) => {
    if (trainer.rhythmRule === 'between-kick') return !value;
    if (trainer.rhythmRule === 'subdivision') {
      const unit =
        trainer.subdivision === 'quarters' ? 1 : trainer.subdivision === 'eighths' ? 2 : 4;
      return stepIndex % Math.max(1, pattern.subdivision / unit) === 0;
    }
    return value > 0;
  };

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
              {pattern.name} · {pattern.meter} · {bpm} BPM
            </p>
          </div>
          {!countIn && (trainer.aids.position || positionOnly) && (
            <strong className={`drum-focus-form-flash ${formStart ? 'is-flash' : ''}`}>
              FORM {formCycle}
            </strong>
          )}
        </header>

        {(trainer.aids.position || positionOnly) && (
          <div className="drum-focus-meta" aria-label="Wiedergabeposition">
            <span className={`drum-focus-state ${active ? 'is-running' : ''}`}>{state}</span>
            {!countIn && (
              <span>
                Takt {currentBar} / {totalBars || 1} · Durchlauf {formCycle}
              </span>
            )}
            <div
              className="drum-focus-beats"
              aria-label={
                pulse
                  ? `Zählzeit ${pulse.beat + 1} von ${meter.numerator}`
                  : `${meter.numerator} Zählzeiten`
              }
            >
              {Array.from({ length: meter.numerator }, (_, beat) => (
                <span key={beat} className={active && pulse?.beat === beat ? 'is-current' : ''}>
                  {beat + 1}
                </span>
              ))}
            </div>
            <small className="drum-focus-substep">
              {pulse && !countIn
                ? stepLabel(pulse.step % perBar, pattern.subdivision, pattern.meter)
                : '—'}
            </small>
          </div>
        )}

        {trainer.phrasing !== 'free' && !countIn && !positionOnly && (
          <div className={`drum-focus-phrase is-${phrase}`} role="status">
            {phrase === 'play'
              ? trainer.phrasing === 'call-response'
                ? 'CALL · SPIELEN'
                : 'SPIELEN'
              : trainer.phrasing === 'call-response'
                ? 'RESPONSE · ANTWORTEN'
                : 'PAUSE / ZUHÖREN'}
          </div>
        )}

        {trainer.mode !== 'free' && !countIn && !positionOnly && (
          <p className="drum-focus-task">
            <span>AUFGABE</span> {modeInstruction(trainer, instrumentNotes)}
          </p>
        )}

        <section className="drum-focus-chord" aria-label="Aktueller Akkord und Akkordtöne">
          {countIn ? (
            <>
              <span className="drum-focus-kicker">GLEICH GEHT ES LOS</span>
              <strong className="drum-focus-count">{(pulse?.beat ?? 0) + 1}</strong>
              <p>
                Einzähler · {preferences.countIn} {preferences.countIn === 1 ? 'Takt' : 'Takte'}
              </p>
            </>
          ) : step && trainer.aids.currentChord && !hideNames ? (
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
              {trainer.aids.chordTones && !positionOnly && (
                <div className={`drum-focus-tones count-${notes.length}`} aria-label="Akkordtöne">
                  {notes.map((note, i) => (
                    <div
                      className={`drum-focus-tone ${relevant.includes(i) ? 'is-relevant' : 'is-muted'}`}
                      key={`${note}-${i}`}
                    >
                      <span>{germanNoteName(note)}</span>
                      {trainer.aids.intervals && <small>{pretty(chord?.formula[i] ?? '')}</small>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <span className="drum-focus-kicker">
                {dropout ? 'HARMONY DROPOUT' : 'ÜBUNGSREGEL'}
              </span>
              <strong className="drum-focus-hidden">HÖRE DIE FORM</strong>
              <p>{modeInstruction(trainer, instrumentNotes)}</p>
            </>
          )}
        </section>

        {trainer.mode === 'target' && trainer.aids.targetTone && target && !positionOnly && (
          <aside className="drum-focus-target" aria-label="Zielton für den nächsten Akkord">
            <span className="drum-focus-kicker">ZIEL BEIM NÄCHSTEN WECHSEL</span>
            <strong>{target.note}</strong>
            <span>
              {pretty(target.interval)} von{' '}
              {!hideNames && nextStep ? chordTitleFor(nextStep, label) : 'nächstem Akkord'}
            </span>
          </aside>
        )}

        {trainer.mode === 'rhythm' && !positionOnly && (
          <aside className="drum-focus-rhythm" aria-label="Rhythmusaufgabe">
            <span className="drum-focus-kicker">RHYTHMUSREGEL</span>
            <div
              className="drum-focus-rhythm-grid"
              style={{ ['--rhythm-steps' as string]: perBar }}
            >
              {rhythmSteps.map((value, stepIndex) => (
                <span
                  key={stepIndex}
                  className={`${rhythmActive(value, stepIndex) ? 'is-hit' : ''} ${
                    (pulse?.step ?? -1) % perBar === stepIndex ? 'is-current' : ''
                  }`}
                  title={stepLabel(stepIndex, pattern.subdivision, pattern.meter)}
                />
              ))}
            </div>
          </aside>
        )}

        {trainer.aids.progression && timeline.length > 0 && (
          <div className="drum-focus-timeline" aria-label="Harmonische Form">
            {timeline.map((bar) => (
              <div className={bar.number === currentBar ? 'is-current' : ''} key={bar.number}>
                <small>{bar.number}</small>
                <span>
                  {bar.segments.map((segment) => (
                    <b
                      key={`${segment.index}-${segment.start}`}
                      className={
                        bar.number === currentBar && segment.index === index ? 'is-current' : ''
                      }
                      style={{ width: `${segment.width * 100}%` }}
                    >
                      {!hideNames && segment.startsHere ? chordTitleFor(segment.step, label) : '·'}
                    </b>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}

        {upcoming.length > 0 && !countIn && trainer.aids.nextChord && !hideNames && (
          <aside className="drum-focus-upcoming" aria-label="Nächste Akkorde">
            <span className="drum-focus-kicker">ALS NÄCHSTES</span>
            <ol>
              {upcoming.map((next, offset) => (
                <li key={`${offset}-${next.name}`}>
                  <small>{offset + 1}</small>
                  <strong>{next.name}</strong>
                  <span>{next.duration}</span>
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

function chordTitleFor(
  step: { root: string; chordId: string },
  label: ReturnType<typeof useNoteLabel>,
) {
  const chord = chordById(step.chordId);
  return label.chord(step.root, chord?.symbol ?? '');
}
