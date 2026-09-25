import { drumPresets, presetGroups } from '../../lib/drum-presets';
import { buildProgression, progressions } from '../../lib/harmony-play';
import { germanNoteName } from '../../lib/i18n';
import { kits } from '../../lib/rhythm';
import type { KitId } from '../../lib/rhythm';
import { useRhythm, useRhythmStatus } from '../../lib/rhythm-store';
import { useStore } from '../../lib/store';
import { Icon } from '../UI';

const sameSteps = (
  left: { root: string; chordId: string; bars: number }[],
  right: { root: string; chordId: string; bars: number }[],
) =>
  left.length === right.length &&
  left.every(
    (step, index) =>
      step.root === right[index]?.root &&
      step.chordId === right[index]?.chordId &&
      step.bars === right[index]?.bars,
  );

/** The three decisions needed before practising: groove, harmony and instrument set. */
export function DrumSimple() {
  const {
    pattern,
    setPattern,
    saved,
    currentId,
    loadPattern,
    harmony,
    setHarmony,
    start,
    resume,
    stop,
  } = useRhythm();
  const status = useRhythmStatus();
  const { root } = useStore();
  const active = (status.running || status.starting) && status.mode === 'drums';
  const paused = status.paused && status.mode === 'drums';
  const inferredPreset = drumPresets.find(
    (preset) => JSON.stringify(preset.pattern) === JSON.stringify(pattern),
  )?.id;
  const patternId = currentId ?? inferredPreset ?? 'custom';
  const activeKit =
    kits.find(
      (kit) =>
        kit.tracks.length === pattern.visible.length &&
        kit.tracks.every((id) => pattern.visible.includes(id)),
    )?.id ?? '';
  const selectedProgression = harmony.enabled
    ? (progressions.find((item) =>
        sameSteps(buildProgression(item, root, pattern.meter), harmony.steps),
      )?.id ?? 'custom')
    : 'off';

  return (
    <section className="drum-simple" aria-label="Einfache Drum-Machine">
      <label className="simple-choice">
        <span>
          <b>1</b> Drum-Pattern
        </span>
        <select
          aria-label="Drum-Pattern"
          value={patternId}
          onChange={(event) => event.target.value !== 'custom' && loadPattern(event.target.value)}
        >
          {patternId === 'custom' && (
            <option value="custom">Eigenes Pattern · {pattern.name}</option>
          )}
          {presetGroups.map((group) => (
            <optgroup key={group} label={group}>
              {drumPresets
                .filter((preset) => preset.group === group)
                .map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.pattern.name} · {preset.bpm} BPM
                  </option>
                ))}
            </optgroup>
          ))}
          {saved.length > 0 && (
            <optgroup label="Deine Patterns">
              {saved.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.pattern.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <small>
          {pattern.meter} · {pattern.bars} {pattern.bars === 1 ? 'Takt' : 'Takte'} ·{' '}
          {pattern.subdivision === 4
            ? 'Sechzehntel'
            : pattern.subdivision === 3
              ? 'Triolen'
              : 'Achtel'}
        </small>
      </label>

      <label className="simple-choice">
        <span>
          <b>2</b> Akkordfolge
        </span>
        <select
          aria-label="Akkordfolge für einfache Ansicht"
          value={selectedProgression}
          onChange={(event) => {
            if (event.target.value === 'off') {
              setHarmony({ ...harmony, enabled: false });
              return;
            }
            if (event.target.value === 'custom') return;
            const progression = progressions.find((item) => item.id === event.target.value);
            if (!progression) return;
            setHarmony({
              ...harmony,
              enabled: true,
              steps: buildProgression(progression, root, pattern.meter),
            });
          }}
        >
          <option value="off">Ohne Akkorde</option>
          {selectedProgression === 'custom' && <option value="custom">Eigene Akkordfolge</option>}
          {(['Jazz', 'Funk', 'R&B', 'Weitere'] as const).map((category) => (
            <optgroup key={category} label={category}>
              {progressions
                .filter((item) => item.category === category)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <small>Tonart {germanNoteName(root)} · startet automatisch mit dem Groove</small>
      </label>

      <label className="simple-choice">
        <span>
          <b>3</b> Kit
        </span>
        <select
          aria-label="Drum-Kit"
          value={activeKit}
          onChange={(event) => {
            const kit = kits.find((item) => item.id === (event.target.value as KitId));
            if (kit) setPattern({ ...pattern, visible: [...kit.tracks] });
          }}
        >
          {!activeKit && <option value="">Eigene Instrumentenauswahl</option>}
          {kits.map((kit) => (
            <option key={kit.id} value={kit.id}>
              {kit.name}
            </option>
          ))}
        </select>
        <small>
          {kits.find((kit) => kit.id === activeKit)?.description ?? 'Eigene sichtbare Spuren'}
        </small>
      </label>

      <button
        type="button"
        className={`button primary simple-groove-start ${active ? 'is-running' : ''}`}
        onClick={() => {
          if (active) stop();
          else if (paused) resume('drums');
          else start('drums');
        }}
      >
        <Icon name={active ? 'pause' : 'play'} size={16} />
        {active
          ? status.starting
            ? 'Abbrechen'
            : 'Groove stoppen'
          : paused
            ? 'Groove fortsetzen'
            : 'Groove starten'}
      </button>
    </section>
  );
}
