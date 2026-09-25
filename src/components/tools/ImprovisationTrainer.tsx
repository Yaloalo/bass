import { modeInstruction } from '../../lib/improvisation-trainer';
import type {
  DropoutDisplay,
  ImprovisationMode,
  PhrasingRule,
  RhythmRule,
  TargetTone,
} from '../../lib/improvisation-trainer';
import { useRhythm } from '../../lib/rhythm-store';
import { useStore } from '../../lib/store';
import { instrumentProfile } from '../../lib/instrument';

const modes: { id: ImprovisationMode; name: string }[] = [
  { id: 'free', name: 'Frei spielen' },
  { id: 'root', name: 'Nur Grundton' },
  { id: 'root-fifth', name: 'Grundton + Quinte' },
  { id: 'chord-tones', name: 'Nur Akkordtöne' },
  { id: 'guide-tones', name: 'Guide Tones · Terz + Septime' },
  { id: 'target', name: 'Zielton beim Akkordwechsel' },
  { id: 'rhythm', name: 'Rhythmustraining' },
  { id: 'motif', name: 'Motivtraining' },
];

const targets: { id: TargetTone; name: string }[] = [
  { id: 'root', name: 'Grundton' },
  { id: 'third', name: 'Terz' },
  { id: 'fifth', name: 'Quinte' },
  { id: 'seventh', name: 'Septime' },
  { id: 'random', name: 'Zufälliger Akkordton' },
];

const rhythmRules: { id: RhythmRule; name: string }[] = [
  { id: 'with-kick', name: 'Mit den Kick-Hits spielen' },
  { id: 'between-kick', name: 'Zwischen den Kick-Hits spielen' },
  { id: 'copy-kick', name: 'Kick-Rhythmus kopieren' },
  { id: 'copy-snare', name: 'Snare-Rhythmus kopieren' },
  { id: 'subdivision', name: 'Nur auf gewählter Unterteilung' },
];

const phrasings: { id: PhrasingRule; name: string }[] = [
  { id: 'free', name: 'Frei' },
  { id: '1-1', name: '1 Takt spielen / 1 Takt Pause' },
  { id: '2-2', name: '2 Takte spielen / 2 Takte Pause' },
  { id: '4-4', name: '4 Takte spielen / 4 Takte Pause' },
  { id: 'call-response', name: 'Call and Response · 4 + 4 Takte' },
];

const aidLabels = {
  currentChord: 'Aktueller Akkord',
  chordTones: 'Akkordtöne',
  intervals: 'Intervalle',
  nextChord: 'Nächster Akkord',
  targetTone: 'Zielton',
  progression: 'Progression',
  position: 'Beat- und Taktposition',
} as const;

export function ImprovisationTrainer() {
  const { trainer, setTrainer } = useRhythm();
  const { instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const update = (patch: Partial<typeof trainer>) => setTrainer({ ...trainer, ...patch });
  const setDropout = (patch: Partial<typeof trainer.dropout>) =>
    update({ dropout: { ...trainer.dropout, ...patch } });

  return (
    <section className="improv-trainer" aria-label="Improvisationstraining">
      <div className="improv-trainer-head">
        <div>
          <span className="eyebrow">ÜBUNGSREGEL</span>
          <h2>Improvisationstraining</h2>
        </div>
        <label className="tool-field">
          <span>Modus</span>
          <select
            value={trainer.mode}
            onChange={(event) => update({ mode: event.target.value as ImprovisationMode })}
          >
            {modes.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="improv-instruction">
        {modeInstruction(trainer, profile.name === 'Bass' ? 'Bassnoten' : 'Gitarrentöne')}
      </p>

      <div className="improv-settings-grid">
        {trainer.mode === 'target' && (
          <label className="tool-field">
            <span>Zielton</span>
            <select
              value={trainer.targetTone}
              onChange={(event) => update({ targetTone: event.target.value as TargetTone })}
            >
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {trainer.mode === 'rhythm' && (
          <>
            <label className="tool-field">
              <span>Rhythmusregel</span>
              <select
                value={trainer.rhythmRule}
                onChange={(event) => update({ rhythmRule: event.target.value as RhythmRule })}
              >
                {rhythmRules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name}
                  </option>
                ))}
              </select>
            </label>
            {trainer.rhythmRule === 'subdivision' && (
              <label className="tool-field">
                <span>Unterteilung</span>
                <select
                  value={trainer.subdivision}
                  onChange={(event) =>
                    update({ subdivision: event.target.value as typeof trainer.subdivision })
                  }
                >
                  <option value="quarters">Viertel</option>
                  <option value="eighths">Achtel</option>
                  <option value="sixteenths">Sechzehntel</option>
                </select>
              </label>
            )}
          </>
        )}

        <label className="tool-field">
          <span>Phrasing</span>
          <select
            value={trainer.phrasing}
            onChange={(event) => update({ phrasing: event.target.value as PhrasingRule })}
          >
            {phrasings.map((phrasing) => (
              <option key={phrasing.id} value={phrasing.id}>
                {phrasing.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details className="improv-subsection">
        <summary>Harmony Dropout</summary>
        <div className="improv-dropout-grid">
          <label className="tool-checkbox">
            <input
              type="checkbox"
              checked={trainer.dropout.enabled}
              onChange={(event) => setDropout({ enabled: event.target.checked })}
            />
            Harmonie zyklisch ausblenden
          </label>
          <label className="tool-field">
            <span>Mit Begleitung</span>
            <select
              value={trainer.dropout.audibleCycles}
              onChange={(event) => setDropout({ audibleCycles: Number(event.target.value) })}
            >
              {[1, 2, 3, 4, 8].map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? 'Durchlauf' : 'Durchläufe'}
                </option>
              ))}
            </select>
          </label>
          <label className="tool-field">
            <span>Ohne Begleitung</span>
            <select
              value={trainer.dropout.silentCycles}
              onChange={(event) => setDropout({ silentCycles: Number(event.target.value) })}
            >
              {[1, 2, 3, 4, 8].map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? 'Durchlauf' : 'Durchläufe'}
                </option>
              ))}
            </select>
          </label>
          <label className="tool-field">
            <span>Während Dropout</span>
            <select
              value={trainer.dropout.display}
              onChange={(event) => setDropout({ display: event.target.value as DropoutDisplay })}
            >
              <option value="audio">Nur Akkord-Audio aus</option>
              <option value="audio-names">Audio + Akkordnamen aus</option>
              <option value="position-only">Nur Formposition zeigen</option>
            </select>
          </label>
        </div>
      </details>

      <details className="improv-subsection">
        <summary>Visuelle Hilfen</summary>
        <div className="improv-aids">
          {Object.entries(aidLabels).map(([key, name]) => (
            <label className="tool-checkbox" key={key}>
              <input
                type="checkbox"
                checked={trainer.aids[key as keyof typeof trainer.aids]}
                onChange={(event) =>
                  update({
                    aids: { ...trainer.aids, [key]: event.target.checked },
                  })
                }
              />
              {name}
            </label>
          ))}
        </div>
      </details>
    </section>
  );
}
