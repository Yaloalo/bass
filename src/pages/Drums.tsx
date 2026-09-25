import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, PageHeading, usePageTitle } from '../components/UI';
import { DrumTransport, useTransportShortcuts } from '../components/tools/DrumTransport';
import { StepSequencer } from '../components/tools/StepSequencer';
import { TrackInspector } from '../components/tools/TrackInspector';
import { SynthPanel } from '../components/tools/SynthPanel';
import { HarmonyPanel } from '../components/tools/HarmonyPanel';
import { DrumFocus } from '../components/tools/DrumFocus';
import { PatternLibrary } from '../components/tools/PatternLibrary';
import { DrumSimple } from '../components/tools/DrumSimple';
import { ImprovisationTrainer } from '../components/tools/ImprovisationTrainer';
import { useLocation } from 'react-router-dom';
import { useRhythm, useRhythmStatus } from '../lib/rhythm-store';
import { exerciseGroove as grooveFor, exercisePath, exercises } from '../data/catalog';
import { presetById } from '../lib/drum-presets';
import type { Exercise } from '../data/catalog';

const presetPattern = (exercise: Exercise) => {
  const id = grooveFor(exercise.id);
  return id ? (presetById(id)?.pattern ?? null) : null;
};
import {
  clearSteps,
  generateGroove,
  instrumentSpec,
  kits,
  meters,
  resizePattern,
} from '../lib/rhythm';
import { drumPresets } from '../lib/drum-presets';
import type { Bars, Instrument, KitId, MeterId, Subdivision } from '../lib/rhythm';
import '../drums.css';

export function Drums() {
  usePageTitle('Drum-Maschine');
  const page = useRef<HTMLDivElement>(null);
  const { pattern, setPattern, harmony, beginGrooveEdit, endGrooveEdit } = useRhythm();
  // `?uebung=<id>` edits that exercise's own groove instead of your working pattern, so
  // whatever you were building in here is still exactly as you left it.
  const query = new URLSearchParams(useLocation().search);
  const editing = query.get('uebung');
  const exercise = editing ? exercises.find((item) => item.id === editing) : undefined;
  // Back where you came from, which is the programme when you were in one. Only a path
  // within this app is accepted, never an absolute or protocol-relative URL.
  const requested = query.get('zurueck');
  const back =
    requested && /^\/[^/]/.test(requested) && exercise
      ? requested
      : exercise
        ? exercisePath(exercise)
        : '/';
  useEffect(() => {
    const initial = exercise && presetPattern(exercise);
    if (exercise && initial) beginGrooveEdit(exercise.id, initial);
    else endGrooveEdit();
    return endGrooveEdit;
  }, [exercise, beginGrooveEdit, endGrooveEdit]);
  const rhythmStatus = useRhythmStatus();
  const [focus, setFocus] = useState(false);
  const [selected, setSelected] = useState<Instrument>('kick');
  const [complexity, setComplexity] = useState(2);
  const [status, setStatus] = useState('');
  const [view, setView] = useState<'simple' | 'details'>(() =>
    exercise ||
    !window.matchMedia('(max-width: 700px), (pointer: coarse) and (max-width: 1000px)').matches
      ? 'details'
      : 'simple',
  );
  const wasRunning = useRef(false);
  useTransportShortcuts(page, 'drums');
  useEffect(() => {
    if (exercise) setView('details');
  }, [exercise]);
  // Starting from either the compact view or the detailed transport opens the same
  // distraction-free chord view.
  useEffect(() => {
    const running = rhythmStatus.running && rhythmStatus.mode === 'drums';
    if (running && !wasRunning.current && harmony.enabled && harmony.steps.length) setFocus(true);
    wasRunning.current = running;
  }, [rhythmStatus.running, rhythmStatus.mode, harmony.enabled, harmony.steps.length]);
  // Reflect the set that is actually showing, rather than a placeholder that never updates.
  const activeKit =
    kits.find(
      (kit) =>
        kit.tracks.length === pattern.visible.length &&
        kit.tracks.every((id) => pattern.visible.includes(id)),
    )?.id ?? '';

  return (
    <div className="drums-page" ref={page}>
      <PageHeading eyebrow="WERKZEUGE / RHYTHMUS" title="Drum-Maschine" />

      {exercise && (
        /* Only here: you came from an exercise to shape its groove, and this takes you
           back with it. Your own working pattern was never touched. */
        <div className="drum-edit-banner" role="status">
          <div>
            <span className="eyebrow">Groove für eine Übung</span>
            <strong>
              {exercise.id} · {exercise.title}
            </strong>
            <p>
              Änderungen hier gelten nur für diese Übung. Dein eigenes Pattern in der Drum-Maschine
              bleibt unberührt.
            </p>
          </div>
          <Link className="button primary" to={back}>
            <Icon name="arrow" size={15} />
            {back.startsWith('/programs/') ? 'Zurück zum Programm' : 'Zurück zur Übung'}
          </Link>
        </div>
      )}
      <div className="drum-view-switch" role="group" aria-label="Ansicht der Drum-Maschine">
        <button
          type="button"
          className={view === 'simple' ? 'active' : ''}
          aria-pressed={view === 'simple'}
          onClick={() => setView('simple')}
        >
          Einfach
        </button>
        <button
          type="button"
          className={view === 'details' ? 'active' : ''}
          aria-pressed={view === 'details'}
          onClick={() => setView('details')}
        >
          Details
        </button>
      </div>

      {view === 'simple' ? (
        <DrumSimple />
      ) : (
        <div className="drum-detail-view">
          <details className="drum-drawer drum-controls">
            <summary>Tempo, Einzähler, Swing &amp; Lautstärke</summary>
            <DrumTransport mode="drums" />
          </details>

          <details className="drum-drawer grid-settings">
            <summary>Pattern bearbeiten · Raster, Länge &amp; Erzeugen</summary>
            <div className="grid-toolbar">
              <label className="tool-field">
                <span>Taktart</span>
                <select
                  aria-label="Taktart"
                  value={pattern.meter}
                  onChange={(event) => {
                    const meter = event.target.value as MeterId;
                    const next = resizePattern(pattern, pattern.subdivision, pattern.bars, meter);
                    setPattern(next);
                    setStatus(
                      `${meter} aktiviert${next.subdivision !== pattern.subdivision ? ' · Raster auf Sechzehntel gesetzt' : ''}.`,
                    );
                  }}
                >
                  {meters.map((meter) => (
                    <option key={meter.id} value={meter.id}>
                      {meter.id}
                      {['5/4', '6/8', '7/8'].includes(meter.id)
                        ? ` · ${meter.groups.join(' + ')}`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tool-field">
                <span>Raster</span>
                <select
                  aria-label="Raster"
                  value={pattern.subdivision}
                  onChange={(event) => {
                    setPattern(
                      resizePattern(
                        pattern,
                        Number(event.target.value) as Subdivision,
                        pattern.bars,
                      ),
                    );
                    setStatus('Raster geändert. Drücke Start, um ab Zählzeit 1 zu spielen.');
                  }}
                >
                  <option value={2}>Achtel</option>
                  <option value={3} disabled={pattern.meter.endsWith('/8')}>
                    Triolen
                  </option>
                  <option value={4}>Sechzehntel</option>
                </select>
              </label>
              <label className="tool-field">
                <span>Länge</span>
                <select
                  aria-label="Pattern-Länge"
                  value={pattern.bars}
                  onChange={(event) => {
                    setPattern(
                      resizePattern(
                        pattern,
                        pattern.subdivision,
                        Number(event.target.value) as Bars,
                      ),
                    );
                    setStatus('Länge geändert. Drücke Start, um ab Zählzeit 1 zu spielen.');
                  }}
                >
                  <option value={1}>1 Takt</option>
                  <option value={2}>2 Takte</option>
                  <option value={4}>4 Takte</option>
                </select>
              </label>
              <label className="tool-field">
                <span>Instrumenten-Set</span>
                <select
                  aria-label="Instrumenten-Set"
                  value={activeKit}
                  onChange={(event) => {
                    const kit = kits.find((item) => item.id === (event.target.value as KitId));
                    if (!kit) return;
                    setPattern({ ...pattern, visible: [...kit.tracks] });
                    setStatus(`${kit.name}: ${kit.description}`);
                  }}
                >
                  {!activeKit && <option value="">Eigene Auswahl</option>}
                  {kits.map((kit) => (
                    <option key={kit.id} value={kit.id}>
                      {kit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tool-field">
                <span>Groove erzeugen</span>
                <select
                  aria-label="Dichte des erzeugten Grooves"
                  value={complexity}
                  onChange={(event) => setComplexity(Number(event.target.value))}
                >
                  <option value={1}>1 · Nur Puls</option>
                  <option value={2}>2 · Achtel-Pocket</option>
                  <option value={3}>3 · Synkopen</option>
                  <option value={4}>4 · Ghosts & Akzente</option>
                </select>
              </label>
              <div className="toolbar-buttons">
                <button
                  type="button"
                  onClick={() => {
                    setPattern(generateGroove(pattern, complexity));
                    setStatus(
                      'Neuer Groove erzeugt. Deine Klänge und die Mischung bleiben unverändert.',
                    );
                  }}
                >
                  Erzeugen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPattern(clearSteps(pattern));
                    setStatus(
                      'Alle Schritte gelöscht. Klänge, Mischung und gespeicherte Patterns bleiben.',
                    );
                  }}
                >
                  Schritte löschen
                </button>
              </div>
              {status && (
                <p className="toolbar-status" role="status">
                  {status}
                </p>
              )}
            </div>
          </details>

          <h2 className="visually-hidden">Sequencer und Klangeinstellungen</h2>
          <details className="drum-drawer drum-sequencer-drawer" id="drum-sequencer">
            <summary>Step-Sequencer · {pattern.name}</summary>
            <StepSequencer selected={selected} onSelect={setSelected} />
          </details>

          <details className="drum-drawer drum-mixer-drawer">
            <summary>Mischung, Spuren &amp; Klangbank</summary>
            <TrackInspector />
          </details>

          <details className="drum-drawer drum-synth-drawer" id="drum-synth">
            <summary>Drum-Synthesizer · {instrumentSpec(selected).name}</summary>
            <SynthPanel id={selected} onSelect={setSelected} />
          </details>

          <details className="drum-drawer drum-harmony-drawer" id="drum-harmony">
            <summary>Akkorde zum Mitspielen</summary>
            <HarmonyPanel />
          </details>

          <details className="drum-drawer drum-training-drawer" id="drum-training">
            <summary>Improvisationstraining</summary>
            <ImprovisationTrainer />
          </details>

          <details className="drum-drawer" id="drum-patterns">
            <summary>Pattern-Bibliothek · {drumPresets.length} Grooves und deine eigenen</summary>
            <PatternLibrary />
          </details>
        </div>
      )}
      {focus && <DrumFocus onClose={() => setFocus(false)} />}
    </div>
  );
}
