import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './UI';
import { PianoKeyboard } from './PianoKeyboard';
import {
  audioUnavailable,
  hold,
  labLevel,
  partialsFor,
  playSteps,
  setLabLevel,
  softHarmonics,
  stopLab,
} from '../lib/tone-lab';
import type { Held, Partial, Step } from '../lib/tone-lab';
import {
  cents,
  centreExamples,
  chainOfFifths,
  buildOrder,
  cMajorScale,
  commaCents,
  commaFactor,
  diatonicTriads,
  equalRatio,
  fifthScale,
  fifthWalk,
  intervalById,
  majorSteps,
  middleC,
  midiToHz,
  namedScaleSizes,
  pureFifthCents,
  pureIntervals,
  pythagoreanFifths,
  ratioValue,
  scaleEvenness,
  scaleGaps,
  scaleStepSizes,
  tuningComparison,
  wolfFifth,
} from '../lib/acoustics';
import { germanNoteName } from '../lib/i18n';
import { mod, pitchClass } from '../lib/music';

const de = (value: number, digits = 1) => value.toFixed(digits).replace('.', ',');
const signed = (value: number, digits = 1) => `${value > 0 ? '+' : ''}${de(value, digits)}`;
/** Hertz readouts stay coarse above 100 Hz; below that a decimal still says something. */
const hz = (value: number) => `${de(value, value < 100 ? 1 : value < 1000 ? 1 : 0)} Hz`;

/* ------------------------------------------------------------------ plumbing */

/** A sustained sound that can be retuned while it plays. */
function useHeld(build: () => Partial[]) {
  const handle = useRef<Held | null>(null);
  const [playing, setPlaying] = useState(false);
  const latest = useRef(build);
  latest.current = build;

  const stop = useCallback(() => {
    handle.current?.stop();
    handle.current = null;
    setPlaying(false);
  }, []);

  const start = useCallback(() => {
    // The callback also fires when another experiment or "Alles stoppen" takes over, so
    // the button never keeps claiming to play something that is already silent.
    void hold(latest.current(), () => {
      handle.current = null;
      setPlaying(false);
    }).then((held) => {
      handle.current = held;
      setPlaying(Boolean(held));
    });
  }, []);

  useEffect(() => () => handle.current?.stop(), []);
  // Whatever the sliders do, the sounding voice follows without restarting.
  useEffect(() => {
    if (handle.current) handle.current.update(latest.current());
  });

  return { playing, start, stop, toggle: () => (playing ? stop() : start()) };
}

/** A sequence of steps, with the sounding step reported back for the figure. */
function useSteps() {
  const current = useRef<{ stop: () => void } | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      current.current?.stop();
    };
  }, []);

  const stop = useCallback(() => {
    current.current?.stop();
    current.current = null;
    setIndex(null);
  }, []);

  const play = useCallback((steps: Step[]) => {
    void playSteps(steps, (at) => {
      if (alive.current) setIndex(at);
    }).then((sequence) => {
      current.current = sequence;
    });
  }, []);

  return { index, play, stop, playing: index !== null };
}

function Frame({
  id,
  title,
  question,
  children,
  onReset,
}: {
  id: string;
  title: string;
  question: string;
  children: React.ReactNode;
  onReset?: () => void;
}) {
  return (
    <section className="lab" id={`lab-${id}`} aria-label={`Hörbeispiel: ${title}`}>
      <header className="lab-head">
        <div>
          <span className="eyebrow">Hör hin</span>
          <h3>{title}</h3>
        </div>
        {onReset ? (
          <button type="button" className="lab-reset" onClick={onReset}>
            Zurücksetzen
          </button>
        ) : null}
      </header>
      <p className="lab-question">{question}</p>
      {children}
    </section>
  );
}

/** One toggle for the whole experiment, so nothing is ever left sounding by accident. */
function Toggle({
  playing,
  onClick,
  label = 'Abspielen',
  stopLabel = 'Stopp',
  primary,
}: {
  playing: boolean;
  onClick: () => void;
  label?: string;
  stopLabel?: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={`lab-play ${primary ? 'is-primary' : ''} ${playing ? 'is-busy' : ''}`}
      aria-pressed={playing}
      onClick={onClick}
    >
      <Icon name={playing ? 'pause' : 'play'} size={14} />
      {playing ? stopLabel : label}
    </button>
  );
}

function StopButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button type="button" className="lab-play" onClick={onClick} disabled={!playing}>
      <Icon name="pause" size={14} />
      Stopp
    </button>
  );
}

function Hint() {
  return (
    <p className="lab-hint">
      Mit Kopfhörern oft leichter zu hören. Wenn du keinen klaren Unterschied hörst, probiere eine
      andere Klangfarbe.
    </p>
  );
}

/** Master level and a panic button, shared by every experiment on the page. */
export function LabTransport() {
  const [level, setLevel] = useState(() => Math.round(labLevel() * 100));
  const [blocked, setBlocked] = useState(false);
  useEffect(() => () => stopLab(), []);
  useEffect(() => {
    const id = setInterval(() => setBlocked(audioUnavailable()), 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="lab-transport">
      <label className="lab-slider lab-transport-level">
        <span>
          Lautstärke <output>{level} %</output>
        </span>
        <input
          type="range"
          aria-label="Lautstärke aller Hörbeispiele in Prozent"
          min={0}
          max={100}
          step={1}
          value={level}
          onChange={(event) => {
            setLevel(Number(event.target.value));
            setLabLevel(Number(event.target.value) / 100);
          }}
        />
      </label>
      <button type="button" className="lab-stop-all" onClick={() => stopLab()}>
        Alles stoppen
      </button>
      {blocked ? (
        <p className="lab-blocked" role="status">
          Dein Browser lässt hier keine Tonausgabe zu. Der Artikel bleibt ohne Ton verständlich.
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------- 1 · schwingung */

const waveWindow = 0.02; // 20 ms, fixed, so a higher frequency really shows more cycles.

function wavePath(sample: (t: number) => number, width: number, height: number, points = 480) {
  const middle = height / 2;
  return Array.from({ length: points }, (_, index) => {
    const t = (index / (points - 1)) * waveWindow;
    const x = (index / (points - 1)) * width;
    const y = middle - sample(t) * (height / 2 - 4);
    return `${x.toFixed(1)},${y.toFixed(2)}`;
  }).join(' ');
}

export function VibrationLab() {
  const [frequency, setFrequency] = useState(220);
  const [amplitude, setAmplitude] = useState(0.6);
  const voice = useHeld(() => [{ frequency, amplitude }]);
  return (
    <Frame
      id="schwingung"
      title="Einen Ton verändern"
      question="Was ändert die Frequenz, und was ändert die Lautstärke?"
      onReset={() => {
        setFrequency(220);
        setAmplitude(0.6);
      }}
    >
      <div className="lab-row">
        <Toggle playing={voice.playing} onClick={voice.toggle} label="Ton anhören" primary />
        <label className="lab-slider">
          <span>
            Frequenz <output>{hz(frequency)}</output>
          </span>
          <input
            type="range"
            aria-label="Frequenz in Hertz"
            aria-valuetext={`${Math.round(frequency)} Hertz`}
            min={0}
            max={1000}
            step={1}
            value={Math.round((Math.log2(frequency / 110) / 3) * 1000)}
            onChange={(event) => setFrequency(110 * 2 ** ((Number(event.target.value) / 1000) * 3))}
          />
        </label>
        <label className="lab-slider">
          <span>
            Tonpegel <output>{Math.round(amplitude * 100)} %</output>
          </span>
          <input
            type="range"
            aria-label="Pegel dieses Tons in Prozent"
            min={5}
            max={100}
            step={1}
            value={Math.round(amplitude * 100)}
            onChange={(event) => setAmplitude(Number(event.target.value) / 100)}
          />
        </label>
      </div>
      <div className="lab-chips" role="group" aria-label="Frequenz voreinstellen">
        {[110, 220, 440, 880].map((preset) => (
          <button
            type="button"
            key={preset}
            aria-pressed={Math.round(frequency) === preset}
            className={Math.round(frequency) === preset ? 'active' : ''}
            onClick={() => setFrequency(preset)}
          >
            {preset} Hz
          </button>
        ))}
      </div>
      <figure className="lab-figure">
        <svg
          className="lab-wave"
          viewBox="0 0 560 150"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Wellenform bei ${Math.round(frequency)} Hertz und ${Math.round(amplitude * 100)} Prozent Pegel`}
        >
          <line className="lab-axis" x1="0" y1="75" x2="560" y2="75" />
          <polyline
            className="lab-wave-a"
            points={wavePath((t) => amplitude * Math.sin(2 * Math.PI * frequency * t), 560, 150)}
          />
        </svg>
        <figcaption>
          Waagerecht: Zeit von 0 bis 20 ms, feste Skala. Senkrecht: relative Amplitude, feste Skala.
        </figcaption>
      </figure>
    </Frame>
  );
}

/* ------------------------------------------------------- 3 · verhaeltnisse */

const chainTimbre = softHarmonics(6);

const ladders = [
  {
    id: 'double',
    label: 'Immer verdoppeln',
    tones: [110, 220, 440],
    marks: ['×2 / +110 Hz', '×2 / +220 Hz'],
  },
  {
    id: 'add',
    label: 'Immer 110 Hz dazu',
    tones: [110, 220, 330],
    marks: ['×2 / +110 Hz', '×1,5 / +110 Hz'],
  },
];

export function RatioLab() {
  const steps = useSteps();
  const [active, setActive] = useState<string | null>(null);
  const run = (id: string, tones: number[]) => {
    if (steps.playing && active === id) return steps.stop();
    setActive(id);
    steps.play(
      tones.map((frequency) => ({
        partials: partialsFor(frequency, chainTimbre),
        seconds: 0.7,
        gap: 0.12,
      })),
    );
  };
  return (
    <Frame
      id="verhaeltnisse"
      title="Gleicher Abstand, andere Höhe"
      question="Bleibt der musikalische Abstand gleich, wenn man dieselbe Zahl an Hertz addiert?"
      onReset={() => {
        steps.stop();
        setActive(null);
      }}
    >
      {ladders.map((ladder) => (
        <div className="lab-ladder" key={ladder.id}>
          <div className="lab-row">
            <Toggle
              playing={steps.playing && active === ladder.id}
              onClick={() => run(ladder.id, ladder.tones)}
              label={ladder.label}
            />
          </div>
          <ol className="lab-stairs">
            {ladder.tones.map((tone, index) => (
              <li key={tone}>
                {index > 0 ? (
                  <span className="lab-stair-mark">{ladder.marks[index - 1]}</span>
                ) : null}
                <span
                  className={`lab-stair ${steps.playing && active === ladder.id && steps.index === index ? 'is-sounding' : ''}`}
                  aria-current={
                    steps.playing && active === ladder.id && steps.index === index
                      ? 'true'
                      : undefined
                  }
                >
                  {tone} Hz
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}
      <div className="lab-row">
        <span className="lab-label">Oktaven direkt vergleichen</span>
        {[
          [110, 220],
          [220, 440],
        ].map(([low, high]) => (
          <Toggle
            key={low}
            playing={steps.playing && active === `pair-${low}`}
            onClick={() => run(`pair-${low}`, [low, high])}
            label={`${low} → ${high} Hz`}
          />
        ))}
      </div>
      <p className="lab-caption">
        Beide Folgen verwenden dieselbe Klangfarbe, denselben Pegel und dieselbe Tondauer. In der
        ersten Folge verdoppelt sich die Frequenz zweimal; in der zweiten kommen zweimal 110 Hz
        dazu, und der zweite Schritt ist deshalb ein anderer musikalischer Abstand.
      </p>
    </Frame>
  );
}

/* ---------------------------------------------------------- 4 · intervalle */

export function IntervalLab() {
  const [lower, setLower] = useState(220);
  const [id, setId] = useState('fifth');
  const steps = useSteps();
  const interval = intervalById(id);
  const upper = lower * ratioValue(interval);
  // One full repetition of the combined wave: q cycles of the lower tone.
  const window = interval.q / lower;
  const points = 700;
  const shape = (offset: number, scale: number, only?: 'low' | 'high') =>
    Array.from({ length: points }, (_, index) => {
      const t = ((index / (points - 1)) * window) / (interval.q > 5 ? 1 : 1);
      const low = Math.sin(2 * Math.PI * lower * t);
      const high = Math.sin(2 * Math.PI * upper * t);
      const y = only === 'low' ? low : only === 'high' ? high : (low + high) / 2;
      return `${((index / (points - 1)) * 560).toFixed(1)},${(offset - y * scale).toFixed(2)}`;
    }).join(' ');

  const play = (together: boolean) =>
    steps.play(
      together
        ? [
            {
              partials: [
                { frequency: lower, amplitude: 0.5 },
                { frequency: upper, amplitude: 0.5 },
              ],
              seconds: 3,
            },
          ]
        : [
            { partials: [{ frequency: lower, amplitude: 0.9 }], seconds: 1, gap: 0.08 },
            { partials: [{ frequency: upper, amplitude: 0.9 }], seconds: 1, gap: 0.08 },
            {
              partials: [
                { frequency: lower, amplitude: 0.5 },
                { frequency: upper, amplitude: 0.5 },
              ],
              seconds: 2.4,
            },
          ],
    );

  return (
    <Frame
      id="intervalle"
      title="Die einfachen Verhältnisse hören"
      question="Wie klingen die Verhältnisse, aus denen gleich eine Tonleiter wird?"
      onReset={() => {
        steps.stop();
        setLower(220);
        setId('fifth');
      }}
    >
      <div className="lab-row">
        <label className="lab-field">
          <span>Verhältnis</span>
          <select aria-label="Intervall" value={id} onChange={(event) => setId(event.target.value)}>
            {pureIntervals.map((option) => (
              <option key={option.id} value={option.id}>
                {option.p}:{option.q} · {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className="lab-field">
          <span>Unterer Ton</span>
          <select
            aria-label="Frequenz des unteren Tons"
            value={lower}
            onChange={(event) => setLower(Number(event.target.value))}
          >
            {[110, 220, 440].map((option) => (
              <option key={option} value={option}>
                {option} Hz
              </option>
            ))}
          </select>
        </label>
        <Toggle
          playing={steps.playing}
          onClick={() => (steps.playing ? steps.stop() : play(false))}
          label="Nacheinander"
          primary
        />
        <button type="button" className="lab-play" onClick={() => play(true)}>
          <Icon name="play" size={14} />
          Zusammen
        </button>
      </div>
      <dl className="lab-facts">
        <div>
          <dt>Unterer Ton</dt>
          <dd>{hz(lower)}</dd>
        </div>
        <div>
          <dt>Oberer Ton</dt>
          <dd>{hz(upper)}</dd>
        </div>
        <div>
          <dt>Muster wiederholt sich nach</dt>
          <dd>
            {interval.q} {interval.q === 1 ? 'Schwingung' : 'Schwingungen'}{' '}
            <small>unten / {interval.p} oben</small>
          </dd>
        </div>
      </dl>
      <figure className="lab-figure">
        <svg
          className="lab-wave"
          viewBox="0 0 560 170"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Wellenform des Verhältnisses ${interval.p} zu ${interval.q}`}
        >
          <line className="lab-axis" x1="0" y1="34" x2="560" y2="34" />
          <line className="lab-axis" x1="0" y1="84" x2="560" y2="84" />
          <line className="lab-axis" x1="0" y1="136" x2="560" y2="136" />
          <polyline className="lab-wave-a" points={shape(34, 26, 'low')} />
          <polyline className="lab-wave-b" points={shape(84, 26, 'high')} />
          <polyline className="lab-wave-sum" points={shape(136, 30)} />
        </svg>
        <figcaption>
          Oben der tiefere Ton, darunter der höhere, unten ihre Summe — über genau eine Wiederholung
          des gemeinsamen Musters. Je einfacher das Verhältnis, desto kürzer diese Wiederholung: bei{' '}
          {interval.p}:{interval.q} nach {interval.q} Schwingungen des tieferen Tons.
        </figcaption>
      </figure>
      <Hint />
    </Frame>
  );
}

/* ----------------------------------------------------------- 5 · schwebung */

const beatPresets = [0, 2, 6, 20, 40, 120];

export function BeatLab() {
  const [delta, setDelta] = useState(2);
  const base = 220;
  const voice = useHeld(() => [
    { frequency: base, amplitude: 0.5 },
    { frequency: base + delta, amplitude: 0.5 },
  ]);
  // Two seconds of the actual envelope: |2·cos(π·Δf·t)| for two equal-amplitude sines.
  const seconds = 2;
  const envelope = Array.from({ length: 360 }, (_, index) => {
    const t = (index / 359) * seconds;
    const y = Math.abs(Math.cos(Math.PI * delta * t));
    return `${((index / 359) * 560).toFixed(1)},${(60 - y * 52).toFixed(2)}`;
  }).join(' ');
  const mirrored = Array.from({ length: 360 }, (_, index) => {
    const t = (index / 359) * seconds;
    const y = Math.abs(Math.cos(Math.PI * delta * t));
    return `${((index / 359) * 560).toFixed(1)},${(60 + y * 52).toFixed(2)}`;
  }).join(' ');
  return (
    <Frame
      id="schwebung"
      title="Zwei fast gleiche Töne"
      question="Was passiert, wenn zwei Frequenzen nur wenige Hertz auseinanderliegen?"
      onReset={() => setDelta(2)}
    >
      <div className="lab-row">
        <Toggle playing={voice.playing} onClick={voice.toggle} label="Beide anhören" primary />
        <label className="lab-slider lab-slider-wide">
          <span>
            Abstand Δf <output>{de(delta, delta < 10 ? 1 : 0)} Hz</output>
          </span>
          <input
            type="range"
            aria-label="Frequenzabstand der beiden Töne in Hertz"
            aria-valuetext={`${de(delta, 1)} Hertz`}
            min={0}
            max={1000}
            step={1}
            value={Math.round(Math.sqrt(delta / 120) * 1000)}
            onChange={(event) => setDelta((Number(event.target.value) / 1000) ** 2 * 120)}
          />
        </label>
      </div>
      <div className="lab-chips" role="group" aria-label="Abstand voreinstellen">
        {beatPresets.map((preset) => (
          <button
            type="button"
            key={preset}
            aria-pressed={Math.abs(delta - preset) < 0.05}
            className={Math.abs(delta - preset) < 0.05 ? 'active' : ''}
            onClick={() => setDelta(preset)}
          >
            {preset} Hz
          </button>
        ))}
      </div>
      <dl className="lab-facts">
        <div>
          <dt>Töne</dt>
          <dd>
            {base} Hz und {de(base + delta, delta < 10 ? 1 : 0)} Hz
          </dd>
        </div>
        <div>
          <dt>Frequenzunterschied</dt>
          <dd>{de(delta, delta < 10 ? 1 : 0)} Hz</dd>
        </div>
        <div>
          <dt>{delta > 0 && delta <= 20 ? 'Schwebungsrate' : 'Höreindruck'}</dt>
          <dd>
            {delta === 0
              ? 'kein Pulsieren'
              : delta <= 20
                ? `${de(delta, delta < 10 ? 1 : 0)} pro Sekunde`
                : 'verändert sich mit dem Abstand'}
          </dd>
        </div>
      </dl>
      <figure className="lab-figure">
        <svg
          className="lab-wave"
          viewBox="0 0 560 120"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Hüllkurve bei einem Abstand von ${de(delta, 1)} Hertz`}
        >
          <line className="lab-axis" x1="0" y1="60" x2="560" y2="60" />
          <polyline className="lab-wave-a" points={envelope} />
          <polyline className="lab-wave-b" points={mirrored} />
        </svg>
        <figcaption>
          Modell: Hüllkurve der Summe beider Töne über 2 Sekunden. Beide Töne erklingen gemeinsam
          auf beiden Kanälen, nicht getrennt links und rechts.
        </figcaption>
      </figure>
      <Hint />
    </Frame>
  );
}

/* -------------------------------------------------------- 5b · tonleiterbau */

export function ScaleBuildLab() {
  // Two notes is the smallest state worth drawing: the strip runs from C to C, and C
  // only joins the chain on the second step.
  const [count, setCount] = useState(2);
  const steps = useSteps();
  const base = 261.6255653005986;
  const tones = fifthScale(count);
  const sizes = scaleEvenness(count);
  const named = namedScaleSizes[count];
  const timbre = softHarmonics(6);
  const playScale = () =>
    steps.play(
      [...tones, { ...tones[0], ratio: tones[0].ratio * 2 }].map((tone) => ({
        partials: partialsFor(base * tone.ratio, timbre),
        seconds: 0.44,
        gap: 0.04,
      })),
    );
  return (
    <Frame
      id="tonleiterbau"
      title="Eine Tonleiter aus Quinten bauen"
      question="Was passiert, wenn man immer wieder eine Quinte dazunimmt und alles in eine Oktave faltet?"
      onReset={() => {
        steps.stop();
        setCount(2);
      }}
    >
      <div className="lab-row">
        <button
          type="button"
          className="lab-play is-primary"
          onClick={() => setCount((value) => Math.min(12, value + 1))}
          disabled={count >= 12}
        >
          Quinte dazu
        </button>
        <button
          type="button"
          className="lab-play"
          onClick={() => setCount((value) => Math.max(2, value - 1))}
          disabled={count <= 2}
        >
          zurück
        </button>
        <Toggle
          playing={steps.playing}
          onClick={() => (steps.playing ? steps.stop() : playScale())}
          label="Töne der Reihe nach"
        />
        <div className="lab-chips" role="group" aria-label="Direkt zu einer Anzahl springen">
          {[5, 7, 12].map((size) => (
            <button
              type="button"
              key={size}
              aria-pressed={count === size}
              className={count === size ? 'active' : ''}
              onClick={() => setCount(size)}
            >
              {size}
              <small>{namedScaleSizes[size]}</small>
            </button>
          ))}
        </div>
      </div>

      <p className="lab-caption">
        Kette: {buildOrder.slice(0, count).map(germanNoteName).join(' → ')}
        {count < 12 ? ' → …' : ''}
      </p>

      <figure className="lab-figure">
        <div className="lab-octave" role="img" aria-label={`Oktave mit ${count} Tönen`}>
          <div className="lab-octave-track">
            {tones.map((tone) => (
              <span
                key={tone.name}
                className={tone.step === count ? 'is-new' : ''}
                style={{ left: `${(tone.cents / 1200) * 100}%` }}
              >
                <b>{germanNoteName(tone.name)}</b>
              </span>
            ))}
            <span className="lab-octave-end" style={{ left: '100%' }}>
              <b>{germanNoteName('C')}</b>
            </span>
          </div>
        </div>
        <div className="lab-gaps" aria-hidden="true">
          {scaleStepSizes(count).map((step, index) => (
            <span key={index} style={{ width: `${(step / 1200) * 100}%` }}>
              {step > 70 ? de(step, 0) : ''}
            </span>
          ))}
        </div>
        <figcaption>
          Die Oktave von {germanNoteName('C')} bis {germanNoteName('C')}, Positionen nach ihrem
          tatsächlichen Abstand in Cent. Die Balken darunter sind die Schritte zwischen benachbarten
          Tönen.
        </figcaption>
      </figure>

      <dl className="lab-facts">
        <div>
          <dt>Töne</dt>
          <dd>{count}</dd>
        </div>
        <div>
          <dt>Verschiedene Schrittgrößen</dt>
          <dd className={sizes.even ? 'good' : 'off'}>
            {sizes.sizes.length}
            <small>{sizes.sizes.map((size) => de(size, 0)).join(' / ')} Cent</small>
          </dd>
        </div>
        <div>
          <dt>Das ist</dt>
          <dd>{named ?? 'noch keine gebräuchliche Leiter'}</dd>
        </div>
      </dl>

      <p className="lab-caption">
        {sizes.even
          ? `Mit ${count} Tönen kommt die Oktave mit nur zwei Schrittgrößen aus. Genau an diesen Stellen entstehen die Leitern, die wirklich benutzt werden.`
          : `Mit ${count} Tönen braucht die Oktave drei verschiedene Schrittgrößen — der zuletzt dazugekommene Ton sitzt dicht neben einem alten und lässt einen auffällig kleinen Rest. Nimm eine Quinte dazu.`}
      </p>
      <Hint />
    </Frame>
  );
}

/* ------------------------------------------------------ 6 · quintenluecke */

export function FifthWalkLab() {
  const [pure, setPure] = useState(true);
  const [step, setStep] = useState(12);
  const steps = useSteps();
  const walk = useMemo(() => fifthWalk(middleC, pure ? 'pure' : 'equal'), [pure]);
  const shown = walk.slice(0, step + 1);
  const end = walk[step];
  const timbre = softHarmonics(6);
  const play = (frequencies: number[], seconds = 1.6, gap = 0.25) =>
    steps.play(
      frequencies.map((frequency) => ({
        partials: partialsFor(frequency, timbre),
        seconds,
        gap,
      })),
    );
  return (
    <Frame
      id="quintenluecke"
      title="Der Kreis, der nicht ganz schließt"
      question="Wo landet man, wenn man zwölfmal eine reine Quinte nach oben geht?"
      onReset={() => {
        steps.stop();
        setPure(true);
        setStep(12);
      }}
    >
      <div className="lab-row">
        <div className="lab-chips" role="group" aria-label="Art der Quinte">
          <button
            type="button"
            aria-pressed={pure}
            className={pure ? 'active' : ''}
            onClick={() => setPure(true)}
          >
            Reine Quinten
          </button>
          <button
            type="button"
            aria-pressed={!pure}
            className={pure ? '' : 'active'}
            onClick={() => setPure(false)}
          >
            Gleichstufige Quinten
          </button>
        </div>
        <label className="lab-slider">
          <span>
            Schritte <output>{step}</output>
          </span>
          <input
            type="range"
            aria-label="Anzahl der Quintschritte"
            min={0}
            max={12}
            step={1}
            value={step}
            onChange={(event) => setStep(Number(event.target.value))}
          />
        </label>
        <Toggle
          playing={steps.playing}
          onClick={() =>
            steps.playing
              ? steps.stop()
              : play(
                  shown.map((entry) => entry.folded),
                  0.55,
                  0.05,
                )
          }
          label="Schrittweise hören"
        />
      </div>
      <figure className="lab-figure">
        <svg
          viewBox="-16 -16 272 272"
          className="lab-circle"
          role="img"
          aria-label="Tonklassenkreis"
        >
          <circle className="lab-circle-ring" cx="120" cy="120" r="94" />
          {shown.map((entry) => {
            const angle = entry.turn * 2 * Math.PI - Math.PI / 2;
            return (
              <g key={entry.index}>
                <circle
                  className={`lab-circle-dot ${entry.index === step ? 'is-end' : ''} ${entry.index === 0 ? 'is-start' : ''}`}
                  cx={120 + Math.cos(angle) * 94}
                  cy={120 + Math.sin(angle) * 94}
                  r={entry.index === step || entry.index === 0 ? 6 : 4}
                />
                <text
                  x={120 + Math.cos(angle) * (entry.index === 12 ? 136 : 114)}
                  y={120 + Math.sin(angle) * (entry.index === 12 ? 136 : 114) + 4}
                  textAnchor="middle"
                  className={entry.index === 12 ? 'is-end' : undefined}
                >
                  {entry.name}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="lab-zoom">
          <span className="lab-label">Ausschnitt um den Ausgangston</span>
          <svg viewBox="0 0 320 62" role="img" aria-label="Vergrößerter Ausschnitt der Lücke">
            <line className="lab-axis" x1="10" y1="40" x2="310" y2="40" />
            {[-20, 0, 20, 40].map((mark) => (
              <g key={mark}>
                <line
                  className="lab-axis"
                  x1={160 + mark * 5}
                  y1="34"
                  x2={160 + mark * 5}
                  y2="46"
                />
                <text x={160 + mark * 5} y="60" textAnchor="middle">
                  {mark > 0 ? `+${mark}` : mark}
                </text>
              </g>
            ))}
            <circle className="lab-circle-dot is-start" cx="160" cy="40" r="6" />
            <text x="160" y="22" textAnchor="middle">
              C
            </text>
            <circle
              className="lab-circle-dot is-end"
              cx={160 + Math.max(-28, Math.min(28, end.drift)) * 5}
              cy="40"
              r="6"
            />
            <text x={160 + Math.max(-28, Math.min(28, end.drift)) * 5} y="22" textAnchor="middle">
              {end.name}
            </text>
          </svg>
          <span className="lab-label">Cent</span>
        </div>
        <figcaption>
          Positionen entsprechen der tatsächlich berechneten Tonhöhe. Die Namen folgen der
          Quintenkette; welche Klaviertaste dazu gehört, steht in der Tabelle.
        </figcaption>
      </figure>
      <dl className="lab-facts">
        <div>
          <dt>Ausgangston C</dt>
          <dd>{de(walk[0].folded, 3)} Hz</dd>
        </div>
        <div>
          <dt>
            Nach {step} {step === 1 ? 'Schritt' : 'Schritten'}: {end.name}
          </dt>
          <dd>{de(end.folded, 3)} Hz</dd>
        </div>
        <div>
          <dt>Abstand zum Ausgangston</dt>
          <dd className={Math.abs(end.drift) < 0.01 ? 'good' : ''}>
            {Math.abs(end.drift) < 0.01 ? '0 Cent' : `${signed(end.drift, 2)} Cent`}
          </dd>
        </div>
      </dl>
      <div className="lab-row">
        <Toggle playing={false} onClick={() => play([walk[0].folded], 2)} label="Anfang" />
        <button type="button" className="lab-play" onClick={() => play([end.folded], 2)}>
          <Icon name="play" size={14} />
          Ende
        </button>
        <button
          type="button"
          className="lab-play"
          onClick={() => play([walk[0].folded, end.folded, walk[0].folded], 1.4, 0.2)}
        >
          <Icon name="play" size={14} />
          Nacheinander vergleichen
        </button>
        <button
          type="button"
          className="lab-play"
          onClick={() =>
            steps.play([
              {
                partials: [
                  ...partialsFor(walk[0].folded, timbre),
                  ...partialsFor(end.folded, timbre),
                ],
                seconds: 3,
              },
            ])
          }
        >
          <Icon name="play" size={14} />
          Beide zusammen
        </button>
      </div>
      <p className="lab-caption">
        {pure ? (
          <>
            Zwölf reine Quinten landen {de(commaCents, 2)} Cent höher — etwa{' '}
            {de(commaCents / 100, 3)} Halbtöne. Der zwölfte Ton heißt His und ist hier nicht
            dieselbe Frequenz wie C.
          </>
        ) : (
          <>
            Mit gleichstufigen Quinten schließt der Kreis nach zwölf Schritten exakt. Deshalb liegen
            His und C auf derselben Klaviertaste: Die gleichstufige Stimmung setzt sie gleich.
          </>
        )}
      </p>
      <details className="lab-details">
        <summary>Technische Details</summary>
        <p>
          Reiner Weg: <code>(3/2)^12 / 2^7 ≈ {commaFactor.toFixed(6)}</code>, das sind{' '}
          {de(commaCents, 2)} Cent. Gleichstufiger Weg: <code>(2^(7/12))^12 = 2^7</code>, also exakt
          sieben Oktaven. Für die Wiedergabe wird jeder Schritt durch Oktavversetzung in den Bereich
          von C bis zum nächsten C gefaltet.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Schritt</th>
                <th>Name</th>
                <th>Klaviertaste</th>
                <th>Frequenz</th>
              </tr>
            </thead>
            <tbody>
              {walk.map((entry) => (
                <tr key={entry.index} className={entry.index === step ? 'highlight' : ''}>
                  <td className="mono">{entry.index}</td>
                  <td>{entry.name}</td>
                  <td>{entry.key}</td>
                  <td className="mono">{de(entry.folded, 3)} Hz</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Frame>
  );
}

/* ------------------------------------------------------ 6b · wolfsquinte */

export function WolfLab() {
  const [pick, setPick] = useState<number | null>(null);
  const steps = useSteps();
  const base = 220;
  const timbre = softHarmonics(8);
  const both = (ratio: number, seconds = 2.8): Step[] => [
    {
      partials: [...partialsFor(base, timbre), ...partialsFor(base * ratio, timbre)],
      seconds,
    },
  ];
  const equalFifth = equalRatio(7);
  return (
    <Frame
      id="wolfsquinte"
      title="Elf reine Quinten und ein Wolf"
      question="Was passiert, wenn man auf reinen Quinten besteht und den Kreis trotzdem schließt?"
      onReset={() => {
        steps.stop();
        setPick(null);
      }}
    >
      <p className="lab-caption">
        Alle zwölf Quinten ab demselben Ton bei {base} Hz, damit man die Intervalle und nicht die
        Tonlagen vergleicht.
      </p>
      <div className="lab-chips lab-wolf" role="group" aria-label="Quinte im Kreis">
        {pythagoreanFifths.map((fifth, index) => (
          <button
            type="button"
            key={fifth.from}
            aria-pressed={pick === index}
            className={`${pick === index || steps.index === index ? 'active' : ''} ${fifth.wolf ? 'is-wolf' : ''}`}
            onClick={() => {
              setPick(index);
              steps.play(both(fifth.ratio));
            }}
          >
            {germanNoteName(fifth.from)} → {germanNoteName(fifth.to)}
            <small>{fifth.wolf ? 'Wolf' : 'rein'}</small>
          </button>
        ))}
      </div>
      <div className="lab-row">
        <Toggle
          playing={steps.playing}
          onClick={() =>
            steps.playing
              ? steps.stop()
              : steps.play(
                  pythagoreanFifths.map((fifth) => ({
                    ...both(fifth.ratio, 1.1)[0],
                    gap: 0.12,
                  })),
                )
          }
          label="Alle zwölf der Reihe nach"
          primary
        />
        <button type="button" className="lab-play" onClick={() => steps.play(both(3 / 2))}>
          <Icon name="play" size={14} />
          Reine Quinte
        </button>
        <button
          type="button"
          className="lab-play"
          onClick={() => steps.play(both(wolfFifth.ratio))}
        >
          <Icon name="play" size={14} />
          Wolfsquinte
        </button>
        <button type="button" className="lab-play" onClick={() => steps.play(both(equalFifth))}>
          <Icon name="play" size={14} />
          Gleichstufige Quinte
        </button>
      </div>
      <dl className="lab-facts">
        <div>
          <dt>Reine Quinte</dt>
          <dd className="good">
            {de(pureFifthCents, 2)} Cent <small>{de(base * 1.5, 1)} Hz</small>
          </dd>
        </div>
        <div>
          <dt>Wolfsquinte</dt>
          <dd className="off">
            {de(wolfFifth.cents, 2)} Cent <small>{de(base * wolfFifth.ratio, 1)} Hz</small>
          </dd>
        </div>
        <div>
          <dt>Gleichstufige Quinte</dt>
          <dd>
            {de(cents(equalFifth), 2)} Cent <small>{de(base * equalFifth, 1)} Hz</small>
          </dd>
        </div>
        <div>
          <dt>Unterschied rein zu Wolf</dt>
          <dd>{de(commaCents, 2)} Cent</dd>
        </div>
      </dl>
      <p className="lab-caption">
        Elf Quinten sind exakt 3:2. Die zwölfte wurde nie gestimmt — sie ist einfach das, was
        zwischen dem letzten und dem ersten Ton der Kette übrig bleibt, und trägt die ganze Lücke
        allein. Die gleichstufige Quinte liegt dagegen nur {de(Math.abs(commaCents / 12), 2)} Cent
        unter der reinen: dieselbe Lücke, aber auf zwölf Quinten verteilt.
      </p>
      <Hint />
    </Frame>
  );
}

/* ------------------------------------------------------- 7 · stimmungen */

const tuningChoices = [
  { id: 'third', label: 'Große Terz', pure: [1, 5 / 4], equal: [1, equalRatio(4)] },
  { id: 'fifth', label: 'Quinte', pure: [1, 3 / 2], equal: [1, equalRatio(7)] },
  {
    id: 'triad',
    label: 'Dur-Dreiklang',
    pure: [1, 5 / 4, 3 / 2],
    equal: [1, equalRatio(4), equalRatio(7)],
  },
];

export function TemperamentLab() {
  const [id, setId] = useState('third');
  const [base, setBase] = useState(220);
  const [rich, setRich] = useState(true);
  const steps = useSteps();
  const choice = tuningChoices.find((entry) => entry.id === id) ?? tuningChoices[0];
  const amplitudes = rich ? softHarmonics(8) : [1];
  const stack = (ratios: number[]): Partial[] =>
    ratios.flatMap((ratio) => partialsFor(base * ratio, amplitudes));
  const listen = (ratios: number[]) => steps.play([{ partials: stack(ratios), seconds: 3.2 }]);
  const compare = () =>
    steps.play([
      { partials: stack(choice.pure), seconds: 3.2, gap: 0.45 },
      { partials: stack(choice.equal), seconds: 3.2 },
    ]);
  return (
    <Frame
      id="stimmungen"
      title="Rein und gleichstufig vergleichen"
      question="Wie hörbar ist der Unterschied zwischen dem reinen Verhältnis und der Klaviertaste?"
      onReset={() => {
        steps.stop();
        setId('third');
        setBase(220);
        setRich(true);
      }}
    >
      <div className="lab-row">
        <div className="lab-chips" role="group" aria-label="Was verglichen wird">
          {tuningChoices.map((entry) => (
            <button
              type="button"
              key={entry.id}
              aria-pressed={id === entry.id}
              className={id === entry.id ? 'active' : ''}
              onClick={() => setId(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <label className="lab-field">
          <span>Lage</span>
          <select
            aria-label="Grundfrequenz"
            value={base}
            onChange={(event) => setBase(Number(event.target.value))}
          >
            <option value={110}>110 Hz</option>
            <option value={220}>220 Hz</option>
            <option value={440}>440 Hz</option>
          </select>
        </label>
        <div className="lab-chips" role="group" aria-label="Klangfarbe">
          <button
            type="button"
            aria-pressed={rich}
            className={rich ? 'active' : ''}
            onClick={() => setRich(true)}
          >
            Voller Klang
          </button>
          <button
            type="button"
            aria-pressed={!rich}
            className={rich ? '' : 'active'}
            onClick={() => setRich(false)}
          >
            Sinus
          </button>
        </div>
      </div>
      <div className="lab-row lab-row-big">
        <button type="button" className="lab-play is-primary" onClick={() => listen(choice.pure)}>
          <Icon name="play" size={14} />
          Rein hören
        </button>
        <button type="button" className="lab-play is-primary" onClick={() => listen(choice.equal)}>
          <Icon name="play" size={14} />
          Gleichstufig hören
        </button>
        <button type="button" className="lab-play" onClick={compare}>
          <Icon name="play" size={14} />
          A/B-Vergleich
        </button>
        <StopButton playing={steps.playing} onClick={steps.stop} />
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ton</th>
              <th>Rein</th>
              <th>Gleichstufig</th>
              <th>Unterschied</th>
            </tr>
          </thead>
          <tbody>
            {choice.pure.map((ratio, index) => (
              <tr key={index}>
                <td>{index === 0 ? 'Grundton' : `${index + 1}. Ton`}</td>
                <td className="mono">{de(base * ratio, 2)} Hz</td>
                <td className="mono">{de(base * choice.equal[index], 2)} Hz</td>
                <td className={Math.abs(cents(choice.equal[index] / ratio)) > 5 ? 'off' : 'good'}>
                  {Math.abs(cents(choice.equal[index] / ratio)) < 0.01
                    ? '0 Cent'
                    : `${signed(cents(choice.equal[index] / ratio), 2)} Cent`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lab-caption">
        Die Cent-Angabe ist eine Tonhöhenabweichung, kein Qualitätsurteil. Beide Fassungen werden in
        derselben Lage, mit derselben Klangfarbe und demselben Verfahren erzeugt; beim A/B-Vergleich
        liegt eine kurze Pause dazwischen, damit sich die Stimmungen nicht überlagern. Der volle
        Klang enthält mehr Frequenzanteile als ein reiner Sinus; dadurch wird der Unterschied
        zwischen den beiden Stimmungen hörbarer.
      </p>
      <Hint />
    </Frame>
  );
}

/* --------------------------------------------------------- 8 · tonvorrat */

const stages = [
  { id: 'chain', label: 'Quintenkette' },
  { id: 'scale', label: 'Tonleiter' },
  { id: 'triads', label: 'Dreiklänge' },
  { id: 'centres', label: 'Zwei Zentren' },
] as const;

const scaleNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const scaleClasses = new Set(scaleNotes.map(pitchClass));
const keyboardFirst = 60;
const keyboardLast = 81;
const melodyTimbre = softHarmonics(5);

export function ScaleLab() {
  const [stage, setStage] = useState<(typeof stages)[number]['id']>('chain');
  const [built, setBuilt] = useState(1);
  const [triad, setTriad] = useState<number | null>(null);
  const steps = useSteps();

  const chainClasses = chainOfFifths.slice(0, built).map(pitchClass);
  const marked =
    stage === 'chain'
      ? new Set(chainClasses.map((pc) => keyboardFirst + mod(pc - mod(keyboardFirst))))
      : stage === 'triads' && triad !== null
        ? new Set(diatonicTriads[triad].offsets.map((offset) => keyboardFirst + offset))
        : new Set(majorSteps.map((offset) => keyboardFirst + offset));

  const playMidis = (midis: number[], seconds: number, together: boolean) =>
    steps.play(
      together
        ? [
            {
              partials: midis.flatMap((midi) => partialsFor(midiToHz(midi), melodyTimbre)),
              seconds,
            },
          ]
        : midis.map((midi) => ({
            partials: partialsFor(midiToHz(midi), melodyTimbre),
            seconds,
            gap: 0.06,
          })),
    );

  const playCentre = (example: (typeof centreExamples)[number]) => {
    const bass = keyboardFirst - 12 + mod(pitchClass(example.bass) - mod(keyboardFirst));
    const melody = example.melody;
    steps.play(
      melody.map((offset, index) => ({
        partials: [
          ...partialsFor(midiToHz(keyboardFirst + offset), melodyTimbre),
          ...partialsFor(midiToHz(bass), melodyTimbre).map((partial) => ({
            ...partial,
            amplitude: partial.amplitude * 0.3,
          })),
        ],
        seconds: index === melody.length - 1 ? 1.6 : 0.62,
        gap: 0.04,
      })),
    );
  };

  return (
    <Frame
      id="tonvorrat"
      title="Von der Quintenkette zur Tonleiter"
      question="Wie wird aus sieben Tönen eine Tonleiter — und woran hängt es, welcher Ton das Zentrum ist?"
      onReset={() => {
        steps.stop();
        setStage('chain');
        setBuilt(1);
        setTriad(null);
      }}
    >
      <p className="lab-caption">Alle Töne hier in zwölfstufig gleichstufiger Stimmung.</p>
      <div className="lab-chips" role="group" aria-label="Schritt">
        {stages.map((entry) => (
          <button
            type="button"
            key={entry.id}
            aria-pressed={stage === entry.id}
            className={stage === entry.id ? 'active' : ''}
            onClick={() => {
              setStage(entry.id);
              setTriad(null);
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {stage === 'chain' ? (
        <div className="lab-row lab-wrap">
          <ol className="lab-chain">
            {chainOfFifths.map((name, index) => (
              <li key={name} className={index < built ? 'on' : ''}>
                {germanNoteName(name)}
                {index > 0 && index < built ? <small>Quinte</small> : null}
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="lab-play"
            onClick={() => setBuilt((value) => Math.min(chainOfFifths.length, value + 1))}
            disabled={built >= chainOfFifths.length}
          >
            Quinte weiter
          </button>
          <button type="button" className="lab-play" onClick={() => setBuilt(1)}>
            Kette neu
          </button>
          <button
            type="button"
            className="lab-play is-primary"
            onClick={() => setStage('scale')}
            disabled={built < chainOfFifths.length}
          >
            Zur Tonleiter sortieren
          </button>
        </div>
      ) : null}

      {stage === 'scale' ? (
        <>
          <ol className="lab-scale">
            {cMajorScale.map((name, index) => (
              <li key={name}>
                {germanNoteName(name)}
                <small>{scaleGaps[index] === 2 ? 'ganz' : 'halb'}</small>
              </li>
            ))}
            <li>
              {germanNoteName('C')}
              <small />
            </li>
          </ol>
          <div className="lab-row">
            <Toggle
              playing={steps.playing}
              onClick={() =>
                steps.playing
                  ? steps.stop()
                  : playMidis(
                      [...majorSteps, 12].map((offset) => keyboardFirst + offset),
                      0.42,
                      false,
                    )
              }
              label="Tonleiter abspielen"
              primary
            />
          </div>
        </>
      ) : null}

      {stage === 'triads' ? (
        <>
          <div className="lab-chips lab-degrees" role="group" aria-label="Stufe">
            {diatonicTriads.map((entry, index) => (
              <button
                type="button"
                key={entry.notes[0]}
                aria-pressed={triad === index}
                className={triad === index ? 'active' : ''}
                onClick={() => {
                  setTriad(index);
                  playMidis(
                    entry.offsets.map((offset) => keyboardFirst + offset),
                    2.4,
                    true,
                  );
                }}
              >
                {germanNoteName(entry.notes[0])}
                {entry.suffix}
                <small>{entry.quality}</small>
              </button>
            ))}
          </div>
          <p className="lab-caption">
            {triad === null
              ? 'Jede Stufe stapelt jeden zweiten Ton der Tonleiter. Weil die Schritte unterschiedlich groß sind, entstehen dabei verschiedene Dreiklangsarten.'
              : `${diatonicTriads[triad].notes.map(germanNoteName).join(' – ')}: ${diatonicTriads[triad].quality}.`}
          </p>
        </>
      ) : null}

      {stage === 'centres' ? (
        <>
          <div className="lab-row">
            {centreExamples.map((example) => (
              <button
                key={example.id}
                type="button"
                className="lab-play is-primary"
                onClick={() => playCentre(example)}
              >
                <Icon name="play" size={14} />
                {example.label}
              </button>
            ))}
            <StopButton playing={steps.playing} onClick={steps.stop} />
          </div>
          <p className="lab-caption">
            Beide Beispiele verwenden ausschließlich dieselben sieben Töne und dieselbe Klangfarbe.
            Unterschiedlich sind der Basston und der Schlusston der Melodie — und damit der
            Eindruck, welcher Ton das Zentrum ist.
          </p>
        </>
      ) : null}

      <div className="lab-keyboard">
        <PianoKeyboard
          first={keyboardFirst}
          last={keyboardLast}
          scaleNotes={scaleNotes}
          scalePitchClasses={stage === 'chain' ? new Set(chainClasses) : scaleClasses}
          rootPitch={-1}
          selected={marked}
          pressed={new Set()}
          selecting={false}
          noteLabel={germanNoteName}
          onStart={() => {}}
          onEnd={() => {}}
          onToggle={() => {}}
          onTap={(midi) => playMidis([midi], 1.1, false)}
        />
      </div>
    </Frame>
  );
}

/** Used by the article's closing summary to restate the cost of the compromise. */
export const temperamentRows = tuningComparison;
