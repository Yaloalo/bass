import { useEffect, useRef, useState } from 'react';
import { defaultSound, instruments, instrumentSpec, voicePresetsFor } from '../../lib/rhythm';
import type { DrumSound, Instrument, SoundEngine } from '../../lib/rhythm';
import { canRenderScope, renderVoiceScope } from '../../lib/voice-scope';
import type { VoiceScope } from '../../lib/voice-scope';
import { useRhythm } from '../../lib/rhythm-store';
import { Icon } from '../UI';
import { Knob } from './Knob';

const width = 520;
const height = 128;

/**
 * The display is the rendered voice, not an illustration of it. `Wellenform` is the
 * first few milliseconds sample by sample, where FM is actually visible as a warped
 * cycle; `Hülle` is the peak envelope of the whole hit.
 */
function Display({ scope, view, busy }: { scope: VoiceScope | null; view: string; busy: boolean }) {
  if (!scope)
    return (
      <div className="synth-display is-empty">
        <p>{busy ? 'Wird berechnet …' : 'Für dieses Gerät ist keine Wellenform verfügbar.'}</p>
      </div>
    );

  const mid = height / 2;
  const gain = scope.peak > 0 ? 1 / scope.peak : 1;
  let path: string;
  let fill: string | null = null;

  if (view === 'Wellenform') {
    const samples = scope.head;
    const stride = Math.max(1, Math.floor(samples.length / width));
    const points: string[] = [];
    for (let x = 0; x * stride < samples.length; x++) {
      const value = samples[x * stride] * gain;
      points.push(
        `${((x * stride) / samples.length) * width},${(mid - value * (mid - 6)).toFixed(2)}`,
      );
    }
    path = 'M ' + points.join(' L ');
  } else {
    const top: string[] = [];
    const bottom: string[] = [];
    for (let i = 0; i < scope.peaks.length; i++) {
      const x = ((i / (scope.peaks.length - 1)) * width).toFixed(2);
      const value = scope.peaks[i] * gain * (mid - 6);
      top.push(`${x},${(mid - value).toFixed(2)}`);
      bottom.unshift(`${x},${(mid + value).toFixed(2)}`);
    }
    path = 'M ' + top.join(' L ');
    fill = `M ${top.join(' L ')} L ${bottom.join(' L ')} Z`;
  }

  const span = view === 'Wellenform' ? scope.headDuration : scope.duration;
  return (
    <div className="synth-display">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={
          view === 'Wellenform'
            ? `Wellenform der ersten ${Math.round(span * 1000)} Millisekunden`
            : `Hüllkurve über ${Math.round(span * 1000)} Millisekunden`
        }
      >
        <line className="synth-axis" x1={0} y1={mid} x2={width} y2={mid} />
        {fill && <path className="synth-fill" d={fill} />}
        <path className="synth-trace" d={path} />
      </svg>
      <div className="synth-readout">
        <span>{Math.round(span * 1000)} ms</span>
        <span>Körper {Math.round(scope.carrierHz)} Hz</span>
        {scope.engine === 'fm' ? (
          <span>
            Modulator {Math.round(scope.modulatorHz)} Hz · Index {scope.index.toFixed(1)}
          </span>
        ) : (
          <span>
            Filter {Math.round(scope.cutoffHz)} Hz · Q {scope.q.toFixed(1)}
          </span>
        )}
        <span>Spitze {Math.round(scope.peak * 100)} %</span>
      </div>
    </div>
  );
}

const ratioChips: { label: string; ratio: number; why: string }[] = [
  { label: '1:1', ratio: 1, why: 'Grundton, körperhaft' },
  { label: '2:1', ratio: 2, why: 'Oktave, hohl' },
  { label: '3:1', ratio: 3, why: 'Quinte darüber, hell' },
  { label: '1,41', ratio: 1.41, why: 'Tritonus, trommelartig' },
  { label: '1,48', ratio: 1.48, why: 'Glockig' },
  { label: '2,71', ratio: 2.71, why: 'Metallisch' },
  { label: '3,37', ratio: 3.37, why: 'Scheppernd' },
];

/** Every `DrumSound` field a knob can drive; `engine` is a switch, not a value. */
type NumericSound = Exclude<keyof DrumSound, 'engine'>;

export function SynthPanel({
  id,
  onSelect,
}: {
  id: Instrument;
  onSelect?: (id: Instrument) => void;
}) {
  const { pattern, setPattern, preview } = useRhythm();
  const sound = pattern.tracks[id].sound;
  const latestSound = useRef(sound);
  latestSound.current = sound;
  const spec = instrumentSpec(id);
  const [view, setView] = useState('Wellenform');
  const [scope, setScope] = useState<VoiceScope | null>(null);
  const [busy, setBusy] = useState(canRenderScope());
  const generation = useRef(0);

  // Debounced: a knob drag emits a value per frame, and each render is a full offline pass.
  useEffect(() => {
    if (!canRenderScope()) {
      setBusy(false);
      return;
    }
    const mine = ++generation.current;
    setBusy(true);
    const timer = setTimeout(() => {
      renderVoiceScope(id, sound)
        .then((result) => {
          if (generation.current !== mine) return;
          setScope(result);
          setBusy(false);
        })
        .catch(() => {
          if (generation.current !== mine) return;
          setScope(null);
          setBusy(false);
        });
    }, 90);
    return () => clearTimeout(timer);
  }, [id, sound]);

  const update = (patch: Partial<DrumSound>, audition = true) => {
    const nextSound = { ...sound, ...patch };
    latestSound.current = nextSound;
    setPattern({
      ...pattern,
      tracks: { ...pattern.tracks, [id]: { ...pattern.tracks[id], sound: nextSound } },
    });
    if (audition) preview(id, nextSound);
  };
  /** `module` keeps the accessible names unique; the visible caption stays short. */
  const knob = (
    module: string,
    label: string,
    key: NumericSound,
    min: number,
    max: number,
    step: number,
    format: (value: number) => string,
    bipolar = false,
  ) => (
    <Knob
      label={label}
      ariaLabel={`${spec.name} ${module} ${label}`}
      value={sound[key]}
      min={min}
      max={max}
      step={step}
      format={format}
      bipolar={bipolar}
      onChange={(value) => update({ [key]: value } as Partial<DrumSound>, false)}
      onCommit={() => preview(id, latestSound.current)}
    />
  );

  return (
    <div className="synth-panel">
      <div className="synth-head">
        <div className="synth-voice-choice">
          <span className="eyebrow">{spec.family}</span>
          <label>
            <span>Instrument</span>
            <select
              aria-label="Instrument im Drum-Synthesizer"
              value={id}
              onChange={(event) => onSelect?.(event.target.value as Instrument)}
            >
              {instruments.map((instrument) => (
                <option value={instrument.id} key={instrument.id}>
                  {instrument.name} · {instrument.family}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="synth-head-actions">
          <div className="segmented" role="group" aria-label="Darstellung">
            {['Wellenform', 'Hülle'].map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={view === option}
                className={view === option ? 'selected' : ''}
                onClick={() => setView(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <button type="button" className="primary" onClick={() => preview(id)}>
            <Icon name="play" size={14} /> Anspielen
          </button>
        </div>
      </div>

      <Display scope={scope} view={view} busy={busy} />

      <div
        className="synth-presets"
        role="group"
        aria-label={`Klang-Voreinstellungen ${spec.name}`}
      >
        {voicePresetsFor(id).map((preset) => (
          <button
            type="button"
            key={preset.id}
            title={preset.hint}
            onClick={() => update({ ...defaultSound(id), ...preset.sound })}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="synth-modules">
        <section className="synth-module">
          <h4>Oszillator</h4>
          <div className="knob-row">
            {knob(
              'Oszillator',
              'Stimmung',
              'pitch',
              -12,
              12,
              1,
              (value) => `${value > 0 ? '+' : ''}${value} HT`,
              true,
            )}
            {knob(
              'Oszillator',
              'Sweep',
              'bend',
              0,
              1,
              0.01,
              (value) => `${Math.round(value * 100)} %`,
            )}
            {knob(
              'Oszillator',
              'Länge',
              'decay',
              0.25,
              2.5,
              0.05,
              (value) => `${Math.round(spec.duration * value * 1000)} ms`,
            )}
            {knob(
              'Oszillator',
              'Klangfarbe',
              'tone',
              0,
              1,
              0.01,
              (value) => `${Math.round(value * 100)} %`,
            )}
          </div>
          <p className="synth-note">
            Der Sweep fällt vom Anschlag zur Grundfrequenz – das ist der „Bauch“ einer Trommel.
          </p>
        </section>

        <section className={`synth-module is-engine ${sound.engine}`}>
          <div className="synth-module-head">
            <h4>{sound.engine === 'fm' ? 'FM-Operator' : 'Analog-Filter'}</h4>
            <div className="segmented" role="group" aria-label={`Synthese-Modell ${spec.name}`}>
              {(['fm', 'analog'] as SoundEngine[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={sound.engine === option}
                  className={sound.engine === option ? 'selected' : ''}
                  onClick={() => update({ engine: option })}
                >
                  {option === 'fm' ? 'FM' : 'Analog'}
                </button>
              ))}
            </div>
          </div>
          {sound.engine === 'fm' ? (
            <>
              <div className="knob-row">
                {knob('FM', 'Stärke', 'fmAmount', 0, 8, 0.1, (value) =>
                  value === 0 ? 'aus' : value.toFixed(1),
                )}
                {knob(
                  'FM',
                  'Verhältnis',
                  'fmRatio',
                  0.25,
                  8,
                  0.01,
                  (value) => `${value.toFixed(2)} : 1`,
                )}
                {knob(
                  'FM',
                  'Abfall',
                  'fmDecay',
                  0.05,
                  1,
                  0.01,
                  (value) => `${Math.round(value * 100)} %`,
                )}
              </div>
              <div className="synth-chips" role="group" aria-label="FM-Verhältnis wählen">
                {ratioChips.map((chip) => (
                  <button
                    type="button"
                    key={chip.label}
                    title={chip.why}
                    className={Math.abs(sound.fmRatio - chip.ratio) < 0.02 ? 'active' : ''}
                    onClick={() => update({ fmRatio: chip.ratio })}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <p className="synth-note">
                Ein zweiter Oszillator moduliert die Frequenz des ersten. Ganzzahlige Verhältnisse
                klingen tonal, gebrochene metallisch. Der Abfall bestimmt, wie schnell die
                Modulation verschwindet – kurz heißt Anschlag, lang heißt durchgehend schepperndes
                Klangbild.
              </p>
            </>
          ) : (
            <>
              <div className="knob-row">
                {knob(
                  'Analog',
                  'Resonanz',
                  'resonance',
                  0,
                  1,
                  0.01,
                  (value) => `Q ${(0.7 + value * 21.3).toFixed(1)}`,
                )}
                {knob('Analog', 'Rauschen', 'noise', 0, 2, 0.01, (value) =>
                  value === 0 ? 'nur Körper' : `${Math.round(value * 100)} %`,
                )}
                {knob(
                  'Analog',
                  'Abfall',
                  'fmDecay',
                  0.05,
                  1,
                  0.01,
                  (value) => `${Math.round(value * 100)} %`,
                )}
              </div>
              <p className="synth-note">
                Die ganze Stimme läuft durch ein resonantes Tiefpassfilter, dessen Grenzfrequenz mit
                dem Schlag nach unten fällt – so sind die klassischen Analog-Drumcomputer gebaut.
                Viel Resonanz lässt das Filter am Grenzpunkt klingeln; „Rauschen“ mischt Teppich
                gegen Körper, also Snare gegen Tom.
              </p>
            </>
          )}
        </section>

        <section className="synth-module">
          <h4>Ausgang</h4>
          <div className="knob-row">
            {knob('Ausgang', 'Sättigung', 'drive', 0, 1, 0.01, (value) =>
              value === 0 ? 'aus' : `${Math.round(value * 100)} %`,
            )}
            {knob(
              'Ausgang',
              'Panorama',
              'pan',
              -1,
              1,
              0.01,
              (value) =>
                value === 0
                  ? 'Mitte'
                  : `${value < 0 ? 'L' : 'R'} ${Math.round(Math.abs(value) * 100)}`,
              true,
            )}
          </div>
          <div className="synth-actions">
            <button type="button" onClick={() => update(defaultSound(id))}>
              Klang zurücksetzen
            </button>
          </div>
          <p className="synth-note">
            Doppelklick auf einen Regler setzt ihn zurück, Umschalt beim Ziehen regelt fein.
          </p>
        </section>
      </div>
    </div>
  );
}
