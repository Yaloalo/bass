import { useMemo, useRef, useState } from 'react';
import { Fretboard } from '../Fretboard';
import { Icon, Section } from '../UI';
import { ChordPicker } from '../ChordPicker';
import { PianoPreview } from '../PianoPreview';
import { chordById } from '../../data/chords';
import { chordFamilies } from '../../lib/chord-types';
import {
  buildProgression,
  compingChords,
  harmonyBars,
  harmonyDurationLabel,
  harmonyNotes,
  harmonyStepTicks,
  harmonyTimeline,
  progressions,
  transposeHarmony,
} from '../../lib/harmony-play';
import type { HarmonyStep } from '../../lib/harmony-play';
import { buildChordRoute } from '../../lib/route';
import { readableRoot, roots, routeRange, transposeRoute } from '../../lib/music';
import { germanNoteName } from '../../lib/i18n';
import { useRhythm, useRhythmStatus } from '../../lib/rhythm-store';
import { useNoteLabel, useStore } from '../../lib/store';
import { PPQ, barTicks } from '../../lib/rhythm';

/** Which chord the transport is on right now; -1 when nothing is comping. */
export function useCurrentChord() {
  const { harmony } = useRhythm();
  const status = useRhythmStatus();
  const playing = status.running && status.mode === 'drums';
  const index = playing && status.pulse ? status.pulse.chord : -1;
  const current = index >= 0 ? harmony.steps[index] : undefined;
  const next =
    index >= 0 && harmony.steps.length > 1
      ? harmony.steps[(index + 1) % harmony.steps.length]
      : undefined;
  return { harmony, index, current, next };
}

export function chordTitle(step: HarmonyStep, label: ReturnType<typeof useNoteLabel>) {
  const chord = chordById(step.chordId);
  return chord ? label.chord(step.root, chord.symbol) : germanNoteName(step.root);
}

/** The on/off switch itself, which lives in the transport rather than in the panel. */
export function HarmonyToggle() {
  const { harmony, setHarmony } = useRhythm();
  return (
    <label className="harmony-switch">
      <input
        type="checkbox"
        role="switch"
        checked={harmony.enabled}
        disabled={!harmony.steps.length}
        onChange={(event) => setHarmony({ ...harmony, enabled: event.target.checked })}
      />
      <span>Akkorde mitspielen</span>
    </label>
  );
}

/** The strip that rides along in the sticky transport while the groove runs. */
export function HarmonyNow() {
  const label = useNoteLabel();
  const { harmony, current, next } = useCurrentChord();
  if (!harmony.enabled || !harmony.steps.length) return null;
  return (
    <div className="harmony-now" role="status" aria-label="Aktueller Akkord">
      <span className="eyebrow">Akkord</span>
      <strong>{current ? chordTitle(current, label) : '—'}</strong>
      {current && <em>{harmonyNotes(current).map(germanNoteName).join(' · ')}</em>}
      {next && (
        <span className="harmony-next">
          danach <b>{chordTitle(next, label)}</b>
        </span>
      )}
    </div>
  );
}

const presetCategories = ['Jazz', 'Funk', 'R&B', 'Weitere'] as const;

/** Lifts one chord out and drops it at another index, keeping the rest in order. */
function moveStep(steps: HarmonyStep[], from: number, to: number): HarmonyStep[] {
  if (to < 0 || to >= steps.length || from === to) return steps;
  const next = [...steps];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

const pickerGroups = chordFamilies.map((family) => ({ id: family.id, name: family.name }));
const pickerItems = compingChords.map((chord) => ({
  id: chord.id,
  symbol: chord.symbol,
  name: chord.nameDe,
  family: chord.family,
  keywords: chord.aliases,
}));

export function HarmonyPanel() {
  const { harmony, setHarmony, previewChord, pattern } = useRhythm();
  const [previewIndex, setPreviewIndex] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);
  const list = useRef<HTMLOListElement>(null);
  // The pointer moves faster than React re-renders, so the drag reads the order it is
  // building from here rather than from the state of the last paint.
  const order = useRef<HarmonyStep[]>([]);
  const [presetSearch, setPresetSearch] = useState('');
  const presetPicker = useRef<HTMLDetailsElement>(null);
  const presetSearchInput = useRef<HTMLInputElement>(null);
  const { root: globalRoot, instrument } = useStore();
  const label = useNoteLabel();
  const status = useRhythmStatus();
  const playing = status.running && status.mode === 'drums';
  const liveIndex = playing && status.pulse ? status.pulse.chord : -1;
  // While the transport runs the sounding chord wins; otherwise it is the one you chose.
  const shownIndex = liveIndex >= 0 ? liveIndex : Math.min(previewIndex, harmony.steps.length - 1);
  const shown = harmony.steps[shownIndex] ?? harmony.steps[0];
  const route = useMemo(() => {
    const chord = shown ? chordById(shown.chordId) : undefined;
    return chord ? transposeRoute(buildChordRoute(chord), shown.root) : [];
  }, [shown]);

  const update = (patch: Partial<typeof harmony>) => setHarmony({ ...harmony, ...patch });
  const setStep = (index: number, patch: Partial<HarmonyStep>) =>
    update({
      steps: harmony.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    });
  const matchingPresets = progressions.filter((item) =>
    `${item.name} ${item.hint} ${item.category}`
      .toLocaleLowerCase('de')
      .includes(presetSearch.trim().toLocaleLowerCase('de')),
  );
  const bar = barTicks(pattern.meter);
  const timeline = harmonyTimeline(harmony.steps, pattern.meter);
  const noteOptions = [
    { ticks: PPQ / 2, label: '1/8 Note' },
    { ticks: PPQ, label: '1/4 Note' },
    { ticks: PPQ * 2, label: '1/2 Note' },
  ].map((option) =>
    option.ticks === bar ? { ...option, label: `${option.label} · 1 Takt` } : option,
  );
  const durationOptions = [
    ...noteOptions,
    ...[1, 2, 4, 8].flatMap((bars) => ({
      ticks: bars * bar,
      label: `${bars} ${bars === 1 ? 'Takt' : 'Takte'}`,
    })),
  ].filter((option, index, all) => all.findIndex((item) => item.ticks === option.ticks) === index);

  return (
    <section className="harmony-panel" aria-label="Akkorde zum Mitspielen">
      <div className="harmony-head">
        <div>
          <span className="eyebrow">Harmonie</span>
          <h2>Akkorde zum Mitspielen</h2>
          <p>
            Eine Akkordfolge läuft im selben Takt wie der Groove.{' '}
            {instrument === 'bass'
              ? 'Die Fläche liegt bewusst hoch – der Bass bleibt dein Register.'
              : 'Die Fläche bleibt kompakt – ergänze darunter Grundtöne oder darüber Guide Tones.'}
          </p>
        </div>
      </div>

      <details
        className="harmony-preset-picker"
        ref={presetPicker}
        onToggle={(event) => {
          if (event.currentTarget.open)
            requestAnimationFrame(() => presetSearchInput.current?.focus());
        }}
      >
        <summary>
          <span>Akkordfolge wählen</span>
          <small>
            {progressions.length} Vorlagen · Tonart {germanNoteName(globalRoot)}
          </small>
        </summary>
        <div className="harmony-preset-menu">
          <label>
            <span className="visually-hidden">Akkordfolgen durchsuchen</span>
            <input
              ref={presetSearchInput}
              type="search"
              aria-label="Akkordfolgen durchsuchen"
              placeholder="Jazz, Funk, R&B, Kadenz …"
              value={presetSearch}
              onChange={(event) => setPresetSearch(event.target.value)}
            />
          </label>
          <div className="harmony-preset-results">
            {presetCategories.map((category) => {
              const items = matchingPresets.filter((item) => item.category === category);
              if (!items.length) return null;
              return (
                <div className="harmony-preset-group" key={category}>
                  <h3>{category}</h3>
                  {items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setHarmony({
                          ...harmony,
                          enabled: true,
                          steps: buildProgression(item, globalRoot, pattern.meter),
                        });
                        setPresetSearch('');
                        if (presetPicker.current) presetPicker.current.open = false;
                      }}
                    >
                      <strong>{item.name}</strong>
                      <small>{item.hint}</small>
                      <span>{item.steps.reduce((sum, entry) => sum + entry.bars, 0)} Takte</span>
                    </button>
                  ))}
                </div>
              );
            })}
            {!matchingPresets.length && (
              <p className="harmony-empty">Keine passende Akkordfolge.</p>
            )}
          </div>
        </div>
      </details>

      {harmony.steps.length === 0 ? (
        <p className="harmony-empty">
          Wähle eine Akkordfolge – oder bau dir mit „Akkord anhängen“ eine eigene.
        </p>
      ) : (
        <>
          <div className="harmony-controls">
            <label className="harmony-timbre">
              Akkordklang
              <select
                value={harmony.timbre}
                onChange={(event) =>
                  update({ timbre: event.target.value as typeof harmony.timbre })
                }
              >
                <option value="warm">Warm</option>
                <option value="bright">Hell</option>
              </select>
            </label>
            <label className="harmony-volume">
              Lautstärke
              <input
                type="range"
                aria-label="Lautstärke der Akkorde"
                min={0}
                max={1}
                step={0.01}
                value={harmony.volume}
                onChange={(event) => update({ volume: Number(event.target.value) })}
              />
            </label>
            <span className="small-label">
              {harmonyBars(harmony.steps, pattern.meter).toLocaleString('de-DE')} TAKTE IM UMLAUF
            </span>
          </div>

          {/* The form at a glance, read like a lead sheet: one cell per bar, the chord
              named where it starts and a repeat sign while it holds. */}
          <ol className="harmony-grid" aria-label="Akkordfolge nach Takten">
            {timeline.map((cell) => (
              <li
                key={cell.number}
                className={`${
                  cell.segments.some((segment) => playing && segment.index === liveIndex)
                    ? 'is-current'
                    : ''
                } ${
                  cell.segments.some((segment) => segment.index === shownIndex) ? 'is-shown' : ''
                } ${cell.segments.some((segment) => segment.startsHere) ? 'is-start' : ''}`}
              >
                <span className="harmony-grid-bar" aria-hidden="true">
                  {cell.number}
                </span>
                <div className="harmony-grid-segments">
                  {cell.segments.map((segment) => {
                    const live = playing && segment.index === liveIndex;
                    return (
                      <button
                        type="button"
                        key={`${segment.index}-${segment.start}`}
                        className={`${live ? 'is-current' : ''} ${
                          segment.index === shownIndex ? 'is-shown' : ''
                        } ${segment.startsHere ? 'is-start' : ''}`}
                        style={{ width: `${segment.width * 100}%` }}
                        aria-label={`Takt ${cell.number}: ${chordTitle(segment.step, label)} anzeigen`}
                        aria-pressed={segment.index === shownIndex}
                        onClick={() => setPreviewIndex(segment.index)}
                      >
                        <strong>
                          {segment.startsHere ? chordTitle(segment.step, label) : '％'}
                        </strong>
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>

          <ol className="harmony-steps" ref={list}>
            {harmony.steps.map((step, index) => (
              <li
                key={index}
                className={`${index === liveIndex ? 'is-current' : ''} ${
                  index === shownIndex ? 'is-shown' : ''
                } ${index === dragging ? 'is-dragging' : ''}`}
              >
                <button
                  type="button"
                  className="harmony-drag"
                  aria-label={`Akkord ${index + 1} verschieben`}
                  title="Ziehen, um die Reihenfolge zu ändern"
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    order.current = harmony.steps;
                    setDragging(index);
                  }}
                  onPointerMove={(event) => {
                    if (dragging === null) return;
                    const rows = [...(list.current?.children ?? [])] as HTMLElement[];
                    const over = rows.findIndex((row) => {
                      const box = row.getBoundingClientRect();
                      return event.clientY >= box.top && event.clientY <= box.bottom;
                    });
                    if (over < 0 || over === dragging) return;
                    order.current = moveStep(order.current, dragging, over);
                    update({ steps: order.current });
                    setDragging(over);
                  }}
                  onLostPointerCapture={() => setDragging(null)}
                  onKeyDown={(event) => {
                    // No arrow buttons any more, but the handle still reorders by keyboard.
                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    const to = index + (event.key === 'ArrowUp' ? -1 : 1);
                    if (to < 0 || to >= harmony.steps.length) return;
                    update({ steps: moveStep(harmony.steps, index, to) });
                    if (previewIndex === index) setPreviewIndex(to);
                  }}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  <Icon name="grip" size={13} />
                </button>
                <button
                  type="button"
                  className="harmony-name"
                  aria-pressed={index === shownIndex}
                  aria-label={`${chordTitle(step, label)} auf Griffbrett und Klaviatur zeigen`}
                  onClick={() => setPreviewIndex(index)}
                >
                  {chordTitle(step, label)}
                </button>
                <label className="harmony-root">
                  <span className="visually-hidden">Grundton von Akkord {index + 1}</span>
                  <select
                    value={step.root}
                    onChange={(event) => {
                      const chord = chordById(step.chordId);
                      setStep(index, {
                        root: chord
                          ? readableRoot(event.target.value, [...chord.formula])
                          : event.target.value,
                      });
                    }}
                  >
                    {roots.map((note) => (
                      <option key={note} value={note}>
                        {germanNoteName(note)}
                      </option>
                    ))}
                  </select>
                </label>
                <ChordPicker
                  label={`Akkordtyp von Akkord ${index + 1}`}
                  value={step.chordId}
                  items={pickerItems}
                  groups={pickerGroups}
                  onPick={(id) => {
                    const chord = chordById(id);
                    setStep(index, {
                      chordId: id,
                      ...(chord ? { root: readableRoot(step.root, [...chord.formula]) } : {}),
                    });
                  }}
                />
                <label className="harmony-bars">
                  <span className="visually-hidden">Takte für Akkord {index + 1}</span>
                  <select
                    value={harmonyStepTicks(step, pattern.meter)}
                    aria-label={`Dauer von Akkord ${index + 1}`}
                    title={harmonyDurationLabel(step, pattern.meter)}
                    onChange={(event) => {
                      const durationTicks = Number(event.target.value);
                      setStep(index, { durationTicks, bars: durationTicks / bar });
                    }}
                  >
                    {durationOptions.map((option) => (
                      <option key={option.ticks} value={option.ticks}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  aria-label={`Akkord ${index + 1} vorhören`}
                  title="Akkord vorhören und auf dem Griffbrett zeigen"
                  onClick={() => {
                    setPreviewIndex(index);
                    previewChord(step, index);
                  }}
                >
                  <Icon name="play" size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Akkord ${index + 1} entfernen`}
                  onClick={() => update({ steps: harmony.steps.filter((_, i) => i !== index) })}
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="harmony-actions">
        <button
          type="button"
          disabled={harmony.steps.length >= 32}
          onClick={() =>
            update({
              steps: [
                ...harmony.steps,
                harmony.steps[harmony.steps.length - 1] ?? {
                  root: globalRoot,
                  chordId: 'minor-7',
                  bars: 1,
                  durationTicks: bar,
                },
              ],
            })
          }
        >
          Akkord anhängen
        </button>
        {harmony.steps.length > 0 && (
          <>
            <div className="harmony-transpose" role="group" aria-label="Akkordfolge transponieren">
              <button
                type="button"
                onClick={() => update({ steps: transposeHarmony(harmony.steps, -1) })}
              >
                −1 HT
              </button>
              <span>Alle Akkorde transponieren</span>
              <button
                type="button"
                onClick={() => update({ steps: transposeHarmony(harmony.steps, 1) })}
              >
                +1 HT
              </button>
            </div>
            <button
              type="button"
              className="danger"
              onClick={() => update({ steps: [], enabled: false })}
            >
              Folge leeren
            </button>
          </>
        )}
      </div>

      {shown && (
        <div className="harmony-views">
          <Section
            className="harmony-board"
            title="Griffbrett"
            defaultOpen={false}
            aside={`Akkord ${shownIndex + 1} · ${chordTitle(shown, label)} · ${harmonyNotes(shown)
              .map(germanNoteName)
              .join(' · ')}`}
          >
            {route.length > 0 && (
              <Fretboard
                key={`${shown.root}-${shown.chordId}`}
                events={route}
                root={shown.root}
                range={routeRange(route)}
                labels="Degrees"
                title={chordTitle(shown, label)}
                route
              />
            )}
          </Section>
          <PianoPreview
            title="Klaviatur"
            defaultOpen={false}
            scaleNotes={harmonyNotes(shown)}
            highlighted={harmonyNotes(shown)}
            caption={`${chordTitle(shown, label)}: ${harmonyNotes(shown).map(germanNoteName).join(' · ')}.`}
            to={`/piano?akkord=${shown.chordId}`}
            linkLabel="Im Piano öffnen"
          />
        </div>
      )}
    </section>
  );
}
