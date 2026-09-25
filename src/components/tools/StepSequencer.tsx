import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  fillEvery,
  meterById,
  meterGroupStarts,
  nextStep,
  shiftSteps,
  stepAriaLabel,
  stepLabel,
  stepsPerBar,
  stepsPerPulse,
  stepWords,
  visibleTracks,
} from '../../lib/rhythm';
import type { DrumTrack, Instrument, MeterId, Step } from '../../lib/rhythm';
import { useRhythm, useRhythmStatus } from '../../lib/rhythm-store';
import { Icon } from '../UI';

export type PaintValue = 'cycle' | Step;

interface Cursor {
  track: number;
  step: number;
}

/* --------------------------------------------------------------- pads */

const StepPad = memo(function StepPad({
  name,
  index,
  subdivision,
  meter,
  value,
  focused,
  onSet,
  onCycle,
  onFocus,
  onPaint,
}: {
  name: string;
  index: number;
  subdivision: number;
  meter: MeterId;
  value: Step;
  focused: boolean;
  onSet: (value: Step) => void;
  onCycle: (direction: 1 | -1) => void;
  onFocus: () => void;
  onPaint: (value: Step) => void;
}) {
  const shape = { meter, subdivision: subdivision as 2 | 3 | 4 };
  const barSteps = stepsPerBar(shape);
  const pulseSteps = stepsPerPulse(shape);
  const beatStart = index % pulseSteps === 0;
  const barStart = index % barSteps === 0;
  const localPulse = Math.floor((index % barSteps) / pulseSteps);
  const groupStart = beatStart && meterGroupStarts(meter).includes(localPulse);
  return (
    <button
      type="button"
      className={`pad v-${value} ${beatStart ? 'is-beat' : ''} ${groupStart ? 'is-group' : ''} ${barStart ? 'is-bar' : ''}`}
      data-step={index}
      data-value={stepWords[value]}
      aria-label={stepAriaLabel(name, index, subdivision, value, meter)}
      aria-pressed={value !== 0}
      tabIndex={focused ? 0 : -1}
      onPointerDown={(event) => {
        onFocus();
        if (event.button !== 0) return;
        onPaint(nextStep(value, 1));
        onCycle(1);
      }}
      onClick={(event) => {
        // Pointer activation was handled on down so the first stroke can paint.
        if (event.detail === 0) onCycle(1);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onCycle(-1);
      }}
      onFocus={onFocus}
      onKeyDown={(event) => {
        const direct = ['0', '1', '2', '3'].indexOf(event.key);
        if (direct >= 0) {
          event.preventDefault();
          onSet(direct as Step);
        }
      }}
    >
      <span className="pad-mark" aria-hidden="true" />
    </button>
  );
});

/* --------------------------------------------------------------- rows */

const TrackRow = memo(function TrackRow({
  id,
  name,
  short,
  track,
  subdivision,
  meter,
  selected,
  silenced,
  cursorStep,
  onStep,
  onTrack,
  onSelect,
  onPreview,
  onFocusStep,
  onPaint,
  startStep,
  endStep,
}: {
  id: Instrument;
  name: string;
  short: string;
  track: DrumTrack;
  subdivision: number;
  meter: MeterId;
  selected: boolean;
  silenced: boolean;
  cursorStep: number | null;
  onStep: (index: number, value: Step) => void;
  onTrack: (patch: Partial<DrumTrack>) => void;
  onSelect: () => void;
  onPreview: () => void;
  onFocusStep: (index: number) => void;
  onPaint: (value: Step) => void;
  startStep: number;
  endStep: number;
}) {
  return (
    <div
      role="row"
      className={`track-row ${selected ? 'is-selected' : ''} ${track.mute ? 'is-muted' : ''} ${silenced ? 'is-silenced' : ''}`}
    >
      <div role="rowheader" className="track-rail">
        <button
          type="button"
          className="track-name"
          aria-pressed={selected}
          title={`${name} auswählen und anspielen`}
          onClick={() => {
            onSelect();
            onPreview();
          }}
        >
          {/* Both names ship; CSS picks one, so a narrow rail never clips mid-word. */}
          <span className="track-name-full">{name}</span>
          <span className="track-name-short" aria-hidden="true">
            {short}
          </span>
        </button>
        <button
          type="button"
          className="rail-toggle"
          aria-label={`${name} stummschalten`}
          aria-pressed={track.mute}
          onClick={() => onTrack({ mute: !track.mute })}
        >
          M
        </button>
        <button
          type="button"
          className="rail-toggle"
          aria-label={`${name} solo schalten`}
          aria-pressed={track.solo}
          onClick={() => onTrack({ solo: !track.solo })}
        >
          S
        </button>
      </div>
      {track.steps.slice(startStep, endStep).map((value, offset) => {
        const index = startStep + offset;
        return (
          <div role="gridcell" className="pad-cell" key={index}>
            <StepPad
              name={name}
              index={index}
              subdivision={subdivision}
              meter={meter}
              value={value}
              focused={cursorStep === index}
              onSet={(next) => onStep(index, next)}
              onCycle={(direction) => onStep(index, nextStep(value, direction))}
              onFocus={() => onFocusStep(index)}
              onPaint={onPaint}
            />
          </div>
        );
      })}
      <span className="track-row-end" aria-hidden="true" data-track={id} />
    </div>
  );
});

/* ---------------------------------------------------------- playhead */

/**
 * The playhead lives in its own absolutely positioned overlay that mirrors the grid's
 * column template. As a real grid item it was explicitly placed in every row, so the
 * auto-placed rail and pads had to flow around it and the grid tripled in width on play.
 */
function Playhead({ startStep, steps }: { startStep: number; steps: number }) {
  const status = useRhythmStatus();
  const active = status.running && status.mode === 'drums' && status.pulse && !status.pulse.countIn;
  const step =
    active && status.pulse!.step >= startStep && status.pulse!.step < startStep + steps
      ? status.pulse!.step - startStep
      : null;
  return (
    <div className="playhead-layer" aria-hidden="true">
      {step !== null && <div className="playhead" style={{ gridColumnStart: step + 2 }} />}
    </div>
  );
}

/* --------------------------------------------------------- sequencer */

export function StepSequencer({
  selected,
  onSelect,
}: {
  selected: Instrument;
  onSelect: (id: Instrument) => void;
}) {
  const { pattern, setPattern, preview } = useRhythm();
  const [cursor, setCursor] = useState<Cursor>({ track: 0, step: 0 });
  const [paint, setPaint] = useState<PaintValue>('cycle');
  const [fill, setFill] = useState(0);
  const [note, setNote] = useState('');
  const compactGridQuery = '(max-width: 700px), (pointer: coarse) and (max-width: 1000px)';
  const [mobile, setMobile] = useState(() => window.matchMedia(compactGridQuery).matches);
  const [beatPage, setBeatPage] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const painting = useRef<Step | null>(null);
  // Pointer moves can arrive faster than React commits a render. Keeping the most recent
  // pattern here prevents a drag stroke from overwriting the pad painted just before it.
  const patternRef = useRef(pattern);
  patternRef.current = pattern;
  const rows = visibleTracks(pattern);
  const perBar = stepsPerBar(pattern);
  const perPulse = stepsPerPulse(pattern);
  const meter = meterById(pattern.meter);
  const steps = perBar * pattern.bars;
  const beats = meter.numerator * pattern.bars;
  const startStep = mobile ? beatPage * perPulse : 0;
  const visibleSteps = mobile ? perPulse : steps;
  const endStep = Math.min(steps, startStep + visibleSteps);
  const soloing = rows.some((spec) => pattern.tracks[spec.id].solo);
  const transport = useRhythmStatus();

  useEffect(() => {
    const query = window.matchMedia(compactGridQuery);
    const sync = () => setMobile(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [compactGridQuery]);
  useEffect(() => setBeatPage((old) => Math.min(old, beats - 1)), [beats]);
  useEffect(() => {
    if (
      mobile &&
      transport.running &&
      transport.mode === 'drums' &&
      transport.pulse &&
      !transport.pulse.countIn
    )
      setBeatPage(Math.floor(transport.pulse.step / perPulse));
  }, [mobile, transport.running, transport.mode, transport.pulse, perPulse]);

  const setTrack = useCallback(
    (id: Instrument, patch: Partial<DrumTrack>) =>
      setPattern({
        ...pattern,
        tracks: { ...pattern.tracks, [id]: { ...pattern.tracks[id], ...patch } },
      }),
    [pattern, setPattern],
  );

  const writeStep = useCallback(
    (id: Instrument, index: number, value: Step) => {
      const current = patternRef.current;
      const next = {
        ...current,
        tracks: {
          ...current.tracks,
          [id]: {
            ...current.tracks[id],
            steps: current.tracks[id].steps.map((old, i) => (i === index ? value : old)),
          },
        },
      };
      patternRef.current = next;
      setPattern(next);
    },
    [setPattern],
  );

  const resolve = useCallback(
    (proposed: Step): Step => (paint === 'cycle' ? proposed : paint),
    [paint],
  );

  // Drag across pads to paint; release/cancel always ends the stroke.
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const at = (x: number, y: number) => {
      const pad = document.elementFromPoint(x, y)?.closest<HTMLElement>('.pad');
      const row = pad
        ?.closest<HTMLElement>('.track-row')
        ?.querySelector<HTMLElement>('.track-row-end');
      return pad && row && element.contains(pad)
        ? { id: row.dataset.track as Instrument, index: Number(pad.dataset.step) }
        : null;
    };
    const move = (event: PointerEvent) => {
      if (painting.current === null || event.buttons === 0) return;
      const target = at(event.clientX, event.clientY);
      if (target && patternRef.current.tracks[target.id].steps[target.index] !== painting.current)
        writeStep(target.id, target.index, painting.current);
    };
    const up = () => {
      painting.current = null;
    };
    element.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      element.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [writeStep]);

  const moveCursor = (track: number, step: number) => {
    const next = {
      track: Math.max(0, Math.min(rows.length - 1, track)),
      step: Math.max(0, Math.min(steps - 1, step)),
    };
    setCursor(next);
    if (mobile) setBeatPage(Math.floor(next.step / perPulse));
    requestAnimationFrame(() => {
      const row = grid.current?.querySelectorAll('.track-row')[next.track];
      row?.querySelector<HTMLElement>(`.pad[data-step="${next.step}"]`)?.focus();
    });
  };

  const keyDown = (event: React.KeyboardEvent) => {
    const id = rows[cursor.track]?.id;
    if (!id) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => moveCursor(cursor.track, cursor.step - 1),
      ArrowRight: () => moveCursor(cursor.track, cursor.step + 1),
      ArrowUp: () => moveCursor(cursor.track - 1, cursor.step),
      ArrowDown: () => moveCursor(cursor.track + 1, cursor.step),
      Home: () => moveCursor(cursor.track, 0),
      End: () => moveCursor(cursor.track, steps - 1),
      PageUp: () => moveCursor(cursor.track, cursor.step - perBar),
      PageDown: () => moveCursor(cursor.track, cursor.step + perBar),
      m: () => setTrack(id, { mute: !pattern.tracks[id].mute }),
      s: () => setTrack(id, { solo: !pattern.tracks[id].solo }),
      p: () => preview(id),
      ',': () => setTrack(id, { steps: shiftSteps(pattern.tracks[id].steps, -1) }),
      '.': () => setTrack(id, { steps: shiftSteps(pattern.tracks[id].steps, 1) }),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const paintOptions: { value: PaintValue; label: string }[] = [
    { value: 'cycle', label: 'Tippen' },
    { value: 1, label: 'Ghost' },
    { value: 2, label: 'Schlag' },
    { value: 3, label: 'Akzent' },
    { value: 0, label: 'Löschen' },
  ];

  return (
    <section className="sequencer-panel" aria-label="Step-Sequencer">
      <div className="sequencer-toolbar">
        <div className="toolbar-group">
          <span className="eyebrow">Anschlagstärke</span>
          <div className="paint-picker" role="group" aria-label="Anschlagstärke zum Malen">
            {paintOptions.map((option) => (
              <button
                type="button"
                key={String(option.value)}
                className={`paint-option ${option.value !== 'cycle' ? `v-${option.value}` : ''} ${paint === option.value ? 'active' : ''}`}
                aria-pressed={paint === option.value}
                onClick={() => setPaint(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <label className="tool-field">
          <span>Füllraster</span>
          <select
            aria-label="Füllraster"
            value={fill}
            onChange={(event) => setFill(Number(event.target.value))}
          >
            <option value={0}>Aus</option>
            {[1, 2, 3, 4, 6, 8].map((value) => (
              <option key={value} value={value}>
                jeden {value}.
              </option>
            ))}
          </select>
        </label>
        <details className="seq-guide">
          <summary>Bedienung</summary>
          <p>
            Tippen schaltet durch <b>aus → Schlag → Akzent → Ghost</b>. Mit aktivem Füllraster füllt
            ein Tipp die ganze Reihe.
            <span className="pointer-only">
              {' '}
              Rechtsklick geht zurück, Ziehen malt, die Tasten <kbd>0</kbd>–<kbd>3</kbd> setzen
              direkt.
            </span>
          </p>
        </details>
      </div>

      {mobile && (
        <div className="beat-page" role="group" aria-label="Sichtbare Zählzeit">
          <button
            type="button"
            aria-label="Vorherige Zählzeit"
            disabled={beatPage === 0}
            onClick={() => setBeatPage((old) => Math.max(0, old - 1))}
          >
            ←
          </button>
          <label>
            <span>Zählzeit im Raster</span>
            <select
              aria-label="Zählzeit im Sequencer"
              value={beatPage}
              onChange={(event) => setBeatPage(Number(event.target.value))}
            >
              {Array.from({ length: beats }, (_, index) => (
                <option key={index} value={index}>
                  Takt {Math.floor(index / meter.numerator) + 1} · Zählzeit{' '}
                  {(index % meter.numerator) + 1}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            aria-label="Nächste Zählzeit"
            disabled={beatPage === beats - 1}
            onClick={() => setBeatPage((old) => Math.min(beats - 1, old + 1))}
          >
            →
          </button>
        </div>
      )}

      <div className="seq-scroll">
        <div
          className="seq-grid"
          role="grid"
          ref={grid}
          aria-label={`Step-Sequencer, ${pattern.meter}, ${pattern.subdivision === 4 ? 'Sechzehntel' : pattern.subdivision === 3 ? 'Triolen' : 'Achtel'}, ${pattern.bars} ${pattern.bars === 1 ? 'Takt' : 'Takte'}`}
          style={{ ['--steps' as string]: visibleSteps }}
          onKeyDown={keyDown}
        >
          <div role="row" className="seq-header">
            <div role="columnheader" className="seq-corner">
              Instrument
            </div>
            {Array.from({ length: visibleSteps }, (_, offset) => {
              const index = startStep + offset;
              const local = index % perBar;
              const pulse = Math.floor(local / perPulse);
              const groupStart = local % perPulse === 0 && meterGroupStarts(meter).includes(pulse);
              return (
                <div
                  role="columnheader"
                  key={index}
                  data-bar={local === 0 ? Math.floor(index / perBar) + 1 : undefined}
                  className={`ruler-cell ${local % perPulse === 0 ? 'is-beat' : ''} ${groupStart ? 'is-group' : ''} ${local === 0 ? 'is-bar' : ''}`}
                >
                  {stepLabel(index, pattern.subdivision, pattern.meter)}
                </div>
              );
            })}
          </div>
          <Playhead startStep={startStep} steps={visibleSteps} />
          {rows.map((spec, rowIndex) => (
            <TrackRow
              key={spec.id}
              id={spec.id}
              name={spec.name}
              short={spec.short}
              track={pattern.tracks[spec.id]}
              subdivision={pattern.subdivision}
              meter={pattern.meter}
              selected={selected === spec.id}
              silenced={soloing && !pattern.tracks[spec.id].solo}
              cursorStep={cursor.track === rowIndex ? cursor.step : null}
              onSelect={() => onSelect(spec.id)}
              onPreview={() => preview(spec.id)}
              onFocusStep={(index) => setCursor({ track: rowIndex, step: index })}
              onPaint={(value) => {
                painting.current = resolve(value);
              }}
              startStep={startStep}
              endStep={endStep}
              onTrack={(patch) => setTrack(spec.id, patch)}
              onStep={(index, proposed) => {
                const value = resolve(proposed);
                if (fill > 0) {
                  setTrack(spec.id, {
                    steps: fillEvery(pattern.tracks[spec.id].steps, index, fill, value),
                  });
                  setNote(`${spec.name}: jeden ${fill}. Schritt auf ${stepWords[value]} gesetzt.`);
                } else {
                  writeStep(spec.id, index, value);
                  setNote(
                    stepAriaLabel(spec.name, index, pattern.subdivision, value, pattern.meter),
                  );
                }
              }}
            />
          ))}
        </div>
      </div>
      <p className="sequencer-note" role="status">
        {note || `${rows.length} Spuren sichtbar · ${steps} Schritte`}
      </p>
      <p className="sequencer-scrollhint">
        <Icon name="arrow" size={14} />
        {mobile ? (
          <>Wähle die Zählzeit über dem Raster – hier gibt es keinen zweiten Scrollbereich.</>
        ) : (
          <>
            Das Raster lässt sich seitwärts scrollen.
            <span className="pointer-only">
              {' '}
              Pfeiltasten bewegen den Cursor, <kbd>M</kbd> und <kbd>S</kbd> schalten stumm bzw.
              solo.
            </span>
          </>
        )}
      </p>
    </section>
  );
}
