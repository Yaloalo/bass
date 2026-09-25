import { useRhythm } from '../../lib/rhythm-store';
import type { MetronomeSettings } from '../../lib/rhythm';
import { Panel } from '../UI';
import { DrumTransport } from './DrumTransport';

export function MetronomeTool() {
  const { preferences, setPreferences } = useRhythm();
  const settings = preferences.metronome;
  const update = (values: Partial<MetronomeSettings>) =>
    setPreferences({ ...preferences, metronome: { ...settings, ...values } });
  return (
    <Panel className="rhythm-main">
      <div className="rhythm-panel-title">
        <div>
          <span className="eyebrow">Bau dir ein inneres Zeitgefühl</span>
          <h2>Damit dein Timing sicher wird.</h2>
        </div>
        <span className="pill">{settings.beats}/4</span>
      </div>
      <DrumTransport mode="metronome" />
      <div className="metronome-settings">
        <label className="tool-field">
          <span>Schläge pro Takt</span>
          <select
            aria-label="Schläge pro Takt"
            value={settings.beats}
            onChange={(event) => update({ beats: Number(event.target.value) })}
          >
            {[2, 3, 4, 5, 6, 7].map((beats) => (
              <option key={beats} value={beats}>
                {beats}/4
              </option>
            ))}
          </select>
        </label>
        <label className="tool-field">
          <span>Unterteilung</span>
          <select
            aria-label="Unterteilung"
            value={settings.subdivision}
            onChange={(event) =>
              update({
                subdivision: Number(event.target.value) as MetronomeSettings['subdivision'],
              })
            }
          >
            <option value={1}>Viertel</option>
            <option value={2}>Achtel</option>
            <option value={3}>Triolen</option>
            <option value={4}>Sechzehntel</option>
          </select>
        </label>
        <label className="tool-field">
          <span>Klick-Platzierung</span>
          <select
            aria-label="Klick-Platzierung"
            value={settings.clicks}
            onChange={(event) =>
              update({ clicks: event.target.value as MetronomeSettings['clicks'] })
            }
          >
            <option value="all">Jede Zählzeit &amp; Unterteilung</option>
            <option value="backbeat">Nur 2 und 4</option>
            <option value="first">Nur die 1</option>
          </select>
        </label>
        <label className="tool-checkbox">
          <input
            type="checkbox"
            checked={settings.accent}
            onChange={(event) => update({ accent: event.target.checked })}
          />
          Die 1 betonen
        </label>
      </div>
      <p className="tool-footnote">
        BPM zählt Viertelnoten.{' '}
        {settings.clicks !== 'all' ? 'Sparsame Klicks lassen Unterteilungen weg. ' : ''}
        {settings.clicks === 'backbeat' && settings.beats < 4
          ? 'In diesem Takt klickt nur die 2. '
          : ''}
        Beim Wechsel von Taktart oder Unterteilung stoppt der Klick, damit du wieder auf der 1
        beginnst.
      </p>
    </Panel>
  );
}
