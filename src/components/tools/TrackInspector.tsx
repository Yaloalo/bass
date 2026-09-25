import { useState } from 'react';
import { applySoundBank, families, instruments, soundBanks, visibleTracks } from '../../lib/rhythm';
import type { Instrument } from '../../lib/rhythm';
import { useRhythm } from '../../lib/rhythm-store';

function Mixer() {
  const { pattern, setPattern } = useRhythm();
  const rows = visibleTracks(pattern);
  const setTrack = (id: Instrument, patch: Partial<(typeof pattern.tracks)[Instrument]>) =>
    setPattern({
      ...pattern,
      tracks: { ...pattern.tracks, [id]: { ...pattern.tracks[id], ...patch } },
    });
  return (
    <div className="mixer">
      <p className="tool-footnote">
        M = stumm, S = solo. Stumm hat Vorrang. Die Mischung gilt für alle Patterns.
      </p>
      {rows.map((spec) => (
        <div className="mixer-row" key={spec.id}>
          <span>{spec.name}</span>
          <input
            type="range"
            aria-label={`${spec.name} Lautstärke`}
            min={0}
            max={1}
            step={0.01}
            value={pattern.tracks[spec.id].volume}
            onChange={(event) => setTrack(spec.id, { volume: Number(event.target.value) })}
          />
          <button
            type="button"
            aria-label={`${spec.name} stummschalten`}
            aria-pressed={pattern.tracks[spec.id].mute}
            onClick={() => setTrack(spec.id, { mute: !pattern.tracks[spec.id].mute })}
          >
            M
          </button>
          <button
            type="button"
            aria-label={`${spec.name} solo schalten`}
            aria-pressed={pattern.tracks[spec.id].solo}
            onClick={() => setTrack(spec.id, { solo: !pattern.tracks[spec.id].solo })}
          >
            S
          </button>
        </div>
      ))}
    </div>
  );
}

function TrackPicker() {
  const { pattern, setPattern } = useRhythm();
  const toggle = (id: Instrument) =>
    setPattern({
      ...pattern,
      visible: pattern.visible.includes(id)
        ? pattern.visible.filter((item) => item !== id)
        : [...pattern.visible, id],
    });
  return (
    <div className="track-picker">
      <p className="tool-footnote">
        Ausgeblendete Spuren klingen weiter. Eine Spur mit Schritten bleibt immer sichtbar.
      </p>
      {families.map((family) => (
        <fieldset key={family}>
          <legend>{family}</legend>
          {instruments
            .filter((spec) => spec.family === family)
            .map((spec) => {
              const playing = pattern.tracks[spec.id].steps.some((step) => step !== 0);
              return (
                <label key={spec.id} className="tool-checkbox">
                  <input
                    type="checkbox"
                    checked={pattern.visible.includes(spec.id) || playing}
                    disabled={playing}
                    onChange={() => toggle(spec.id)}
                  />
                  {spec.name}
                </label>
              );
            })}
        </fieldset>
      ))}
    </div>
  );
}

function SoundBanks() {
  const { pattern, setPattern } = useRhythm();
  const [message, setMessage] = useState('');
  return (
    <div className="sound-banks">
      <p className="tool-footnote">
        Legt den Klangcharakter über das ganze Set. Schritte und Mischung bleiben erhalten.
      </p>
      <div className="bank-list">
        {soundBanks.map((bank) => (
          <button
            type="button"
            key={bank.id}
            className="bank-card"
            onClick={() => {
              setPattern(applySoundBank(pattern, bank.id));
              setMessage(`${bank.name} geladen.`);
            }}
          >
            <strong>{bank.name}</strong>
            <small>{bank.description}</small>
          </button>
        ))}
      </div>
      <p className="tool-footnote" role="status">
        {message}
      </p>
    </div>
  );
}

export function TrackInspector() {
  return (
    <aside className="drum-inspector" aria-label="Klang und Mischung">
      <details className="inspector-section">
        <summary>Mischung</summary>
        <div className="inspector-body">
          <Mixer />
        </div>
      </details>
      <details className="inspector-section">
        <summary>Spuren einblenden</summary>
        <div className="inspector-body">
          <TrackPicker />
        </div>
      </details>
      <details className="inspector-section">
        <summary>Klangbank</summary>
        <div className="inspector-body">
          <SoundBanks />
        </div>
      </details>
    </aside>
  );
}
