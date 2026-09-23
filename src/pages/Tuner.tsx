import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, PageHeading, Panel, usePageTitle } from '../components/UI';
import {
  analysisSize,
  decimate,
  decimation,
  detectPitch,
  midiToFrequency,
  nearestString,
  readPitch,
  tunings,
} from '../lib/tuner';
import type { PitchReading } from '../lib/tuner';
import { mod, noteName } from '../lib/music';
import { germanNoteName } from '../lib/i18n';
import { usePiano } from '../lib/use-piano';
import { useLocal } from '../lib/store';
import '../tuner.css';

type State = 'idle' | 'asking' | 'live' | 'denied' | 'unavailable';

/** Inside this the string counts as in tune; a bass player cannot hear finer than this. */
const inTune = 5;
const analysisMs = 70;
/** How long a reading stays on screen after the note has decayed. */
const holdMs = 1600;

const label = (midi: number) =>
  `${germanNoteName(noteName(mod(midi), true))}${Math.floor(midi / 12) - 1}`;

export function Tuner() {
  usePageTitle('Stimmgerät');
  const piano = usePiano(70);
  const [tuningId, setTuningId] = useLocal<string>('tuner-tuning', 'standard4');
  const [state, setState] = useState<State>('idle');
  const [reading, setReading] = useState<PitchReading | null>(null);
  const [error, setError] = useState('');
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; analyser: AnalyserNode } | null>(
    null,
  );
  const frame = useRef(0);
  const smoothed = useRef<number | null>(null);
  const lastHeard = useRef(0);

  const tuning = tunings.find((item) => item.id === tuningId) ?? tunings[0];
  const target = reading ? tuning.strings[nearestString(reading.midi, tuning.strings)] : null;
  // Measure against the string, not against the nearest chromatic note: a string a
  // semitone flat should read as that string badly out, not as its neighbour in tune.
  const cents =
    reading && target !== null ? 1200 * Math.log2(reading.frequency / midiToFrequency(target)) : 0;
  const close = Math.abs(cents) <= 60;

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    audio.current?.stream.getTracks().forEach((track) => track.stop());
    void audio.current?.ctx.close();
    audio.current = null;
    smoothed.current = null;
    setReading(null);
    setState('idle');
  }, []);

  useEffect(() => stop, [stop]);

  const listen = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    setState('asking');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Every one of these would fight the tuner: they reshape exactly what it measures.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const rumble = ctx.createBiquadFilter();
      rumble.type = 'highpass';
      rumble.frequency.value = 22;
      const body = ctx.createBiquadFilter();
      body.type = 'lowpass';
      body.frequency.value = 900;
      body.Q.value = 0.7;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = analysisSize;
      // Nothing is connected to the destination: routing a microphone to the speakers
      // is feedback, not monitoring.
      source.connect(rumble);
      rumble.connect(body);
      body.connect(analyser);
      audio.current = { ctx, stream, analyser };
      setState('live');

      const buffer = new Float32Array(analyser.fftSize);
      let previous = 0;
      const tick = (now: number) => {
        frame.current = requestAnimationFrame(tick);
        if (now - previous < analysisMs) return;
        previous = now;
        analyser.getFloatTimeDomainData(buffer);
        const found = detectPitch(decimate(buffer), ctx.sampleRate / decimation);
        if (found === null) {
          if (now - lastHeard.current > holdMs) {
            smoothed.current = null;
            setReading(null);
          }
          return;
        }
        lastHeard.current = now;
        // Smooth small wobbles, jump on a real change of note.
        const last = smoothed.current;
        const drift = last ? Math.abs(1200 * Math.log2(found / last)) : Infinity;
        smoothed.current = last && drift < 120 ? last * 0.7 + found * 0.3 : found;
        setReading(readPitch(smoothed.current));
      };
      frame.current = requestAnimationFrame(tick);
    } catch (problem) {
      const name = problem instanceof DOMException ? problem.name : '';
      setState(name === 'NotAllowedError' ? 'denied' : 'unavailable');
      setError(
        name === 'NotFoundError'
          ? 'Es wurde kein Mikrofon gefunden.'
          : name === 'NotAllowedError'
            ? ''
            : 'Das Mikrofon konnte nicht geöffnet werden.',
      );
    }
  };

  const verdict = !reading
    ? 'Spiel eine Saite an'
    : !close
      ? 'Weit daneben'
      : cents < -inTune
        ? 'Zu tief'
        : cents > inTune
          ? 'Zu hoch'
          : 'Stimmt';

  return (
    <div className="tuner-page">
      <PageHeading
        eyebrow="BASS / INSTRUMENT"
        title="Stimmgerät"
        description="Hört über das Mikrofon mit und zeigt, wie weit die Saite daneben liegt. Die Aufnahme bleibt auf diesem Gerät."
      />

      <Panel className="tuner-stage">
        <div className="tuner-controls">
          <label className="tool-field">
            <span>Stimmung</span>
            <select
              aria-label="Stimmung"
              value={tuning.id}
              onChange={(event) => setTuningId(event.target.value)}
            >
              {tunings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {state === 'live' ? (
            <button type="button" onClick={stop}>
              <Icon name="pause" size={15} /> Mikrofon aus
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              disabled={state === 'asking'}
              onClick={listen}
            >
              <Icon name="play" size={15} />
              {state === 'asking' ? 'Warte auf Freigabe…' : 'Mikrofon einschalten'}
            </button>
          )}
          <span className="tuner-hint">{tuning.hint}</span>
        </div>

        <div
          className={`tuner-meter ${state === 'live' ? 'is-live' : ''} ${reading && close && Math.abs(cents) <= inTune ? 'is-tuned' : ''}`}
        >
          <div className="tuner-note" role="status" aria-live="polite">
            <strong>{reading && target !== null ? label(target) : '—'}</strong>
            <small>
              {reading
                ? `${reading.frequency.toFixed(1)} Hz · ${cents > 0 ? '+' : ''}${cents.toFixed(0)} Cent`
                : state === 'live'
                  ? 'Ich höre zu'
                  : 'Mikrofon aus'}
            </small>
          </div>
          <div
            className="tuner-scale"
            role="img"
            aria-label={reading ? `${verdict}, ${cents.toFixed(0)} Cent` : 'Kein Ton'}
          >
            <span className="tuner-zone" />
            {[-50, -25, 0, 25, 50].map((mark) => (
              <span
                key={mark}
                className={`tuner-tick ${mark === 0 ? 'is-centre' : ''}`}
                style={{ left: `${50 + mark}%` }}
              />
            ))}
            {reading && close && (
              <span
                className="tuner-needle"
                style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }}
              />
            )}
          </div>
          <p className="tuner-verdict">{verdict}</p>
        </div>

        <ol className="tuner-strings" aria-label="Saiten">
          {[...tuning.strings].reverse().map((midi, index) => {
            const number = tuning.strings.length - index;
            const active = reading !== null && target === midi && close;
            return (
              <li key={midi}>
                <button
                  type="button"
                  className={`tuner-string ${active ? 'is-active' : ''} ${
                    active && Math.abs(cents) <= inTune ? 'is-tuned' : ''
                  }`}
                  aria-label={`Saite ${number}, ${label(midi)} als Referenzton anspielen`}
                  onClick={() => piano.playChord([midi + 24])}
                >
                  <span className="tuner-string-number">{number}</span>
                  <strong>{germanNoteName(noteName(mod(midi), true))}</strong>
                  <small>{midiToFrequency(midi).toFixed(2)} Hz</small>
                </button>
              </li>
            );
          })}
        </ol>

        {state === 'denied' && (
          <p className="tool-notice" role="alert">
            Ohne Mikrofonfreigabe kann das Stimmgerät nichts hören. Erlaube den Zugriff in den
            Seiteneinstellungen deines Browsers und versuch es noch einmal.
          </p>
        )}
        {state === 'unavailable' && (
          <p className="tool-notice" role="alert">
            {error || 'Dieser Browser gibt keinen Mikrofonzugriff frei.'} Du kannst stattdessen die
            Referenztöne oben antippen und nach Gehör stimmen.
          </p>
        )}
        {piano.audioError && (
          <p className="tool-notice" role="alert">
            {piano.audioError}
          </p>
        )}
      </Panel>

      <Panel className="tuner-help" title="So stimmst du sauber">
        <ul>
          <li>
            Spiel die Saite leer und kräftig an, dann lass sie klingen. Während des Anschlags ist
            die Tonhöhe noch nicht stabil.
          </li>
          <li>
            Stimme immer von unten nach oben: eine zu hohe Saite entspannen und neu hochziehen,
            sonst rutscht sie beim Spielen wieder ab.
          </li>
          <li>
            Bis fünf Cent gilt als sauber. Der Zeiger steht dann in der grünen Zone und die Saite
            wird grün markiert.
          </li>
          <li>
            Der Referenzton auf jeder Saite klingt zwei Oktaven höher als der Bass. Zum Stimmen nach
            Gehör vergleichst du ihn mit dem Flageolett am zwölften Bund.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
