import { useState } from 'react';
import { drumPresets, presetGroups } from '../../lib/drum-presets';
import { useRhythm } from '../../lib/rhythm-store';
import type { DrumPattern } from '../../lib/rhythm';

/** Kick on the baseline, snare above it: enough to recognise a groove without playing it. */
function MiniMap({ pattern }: { pattern: DrumPattern }) {
  const steps = pattern.tracks.kick.steps.length;
  const marks = ['kick', 'snare', 'clave', 'cowbell'] as const;
  return (
    <svg
      className="minimap"
      viewBox={`0 0 ${steps * 4} 14`}
      role="img"
      aria-label={`Vorschau von ${pattern.name}`}
    >
      {marks.map((id, row) =>
        pattern.tracks[id].steps.map((value, index) =>
          value ? (
            <rect
              key={`${id}-${index}`}
              x={index * 4}
              y={10 - row * 3}
              width={value === 3 ? 3 : 2}
              height={value === 1 ? 2 : 3}
              className={`minimap-${row}`}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export function PatternLibrary() {
  const {
    pattern,
    setPattern,
    saved,
    currentId,
    dirty,
    loadPattern,
    saveAs,
    saveOver,
    renamePattern,
    duplicatePattern,
    removePattern,
  } = useRhythm();
  const [confirming, setConfirming] = useState('');
  const [renaming, setRenaming] = useState('');
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');

  return (
    <section className="pattern-library" aria-label="Pattern-Bibliothek">
      <div className="library-head">
        <div>
          <span className="eyebrow">Arbeits-Pattern</span>
          <label className="library-name">
            <span className="visually-hidden">Pattern-Name</span>
            <input
              aria-label="Pattern-Name"
              maxLength={60}
              value={pattern.name}
              onChange={(event) => setPattern({ ...pattern, name: event.target.value })}
            />
          </label>
        </div>
        <div className="library-actions">
          {currentId && dirty && (
            <button
              type="button"
              className="primary"
              onClick={() => {
                saveOver();
                setMessage('Änderungen gespeichert.');
              }}
            >
              Speichern
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              saveAs(pattern.name);
              setMessage(
                `„${pattern.name.trim() || 'Mein Groove'}“ in deiner Bibliothek gespeichert.`,
              );
            }}
          >
            Als neues Pattern sichern
          </button>
        </div>
      </div>
      {dirty && <p className="library-dirty">• Ungespeicherte Änderungen am geladenen Pattern.</p>}

      {presetGroups.map((group) => (
        <div className="library-group" key={group}>
          <h3>{group}</h3>
          <div className="library-cards">
            {drumPresets
              .filter((preset) => preset.group === group)
              .map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  className={`pattern-card ${currentId === preset.id ? 'is-current' : ''}`}
                  aria-pressed={currentId === preset.id}
                  onClick={() => {
                    loadPattern(preset.id);
                    setMessage(
                      `${preset.pattern.name} bei ${preset.bpm} BPM geladen. ${preset.hint}`,
                    );
                  }}
                >
                  <strong>{preset.pattern.name}</strong>
                  <MiniMap pattern={preset.pattern} />
                  <small>
                    {preset.bpm} BPM · {preset.pattern.bars}{' '}
                    {preset.pattern.bars === 1 ? 'Takt' : 'Takte'}
                  </small>
                </button>
              ))}
          </div>
        </div>
      ))}

      <div className="library-group">
        <h3>Deine Patterns</h3>
        {saved.length === 0 ? (
          <p className="empty-state">
            Hier erscheinen deine eigenen Patterns. Ändere einen Groove und sichere ihn als neues
            Pattern.
          </p>
        ) : (
          <ul className="saved-list">
            {saved.map((item) => (
              <li key={item.id} className={currentId === item.id ? 'is-current' : ''}>
                {renaming === item.id ? (
                  <form
                    className="rename-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      renamePattern(item.id, draft);
                      setRenaming('');
                      setMessage('Pattern umbenannt.');
                    }}
                  >
                    <input
                      aria-label="Neuer Pattern-Name"
                      autoFocus
                      maxLength={60}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                    <button type="submit">Übernehmen</button>
                    <button type="button" onClick={() => setRenaming('')}>
                      Abbrechen
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="saved-load"
                      aria-pressed={currentId === item.id}
                      onClick={() => {
                        loadPattern(item.id);
                        setMessage(`${item.pattern.name} geladen.`);
                      }}
                    >
                      <strong>{item.pattern.name}</strong>
                      <MiniMap pattern={item.pattern} />
                    </button>
                    <button
                      type="button"
                      aria-label={`${item.pattern.name} umbenennen`}
                      onClick={() => {
                        setRenaming(item.id);
                        setDraft(item.pattern.name);
                      }}
                    >
                      Umbenennen
                    </button>
                    <button
                      type="button"
                      aria-label={`${item.pattern.name} duplizieren`}
                      onClick={() => duplicatePattern(item.id)}
                    >
                      Duplizieren
                    </button>
                    {confirming === item.id ? (
                      <span className="confirm-delete">
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            removePattern(item.id);
                            setConfirming('');
                            setMessage('Pattern gelöscht.');
                          }}
                        >
                          Wirklich löschen
                        </button>
                        <button type="button" onClick={() => setConfirming('')}>
                          Abbrechen
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`${item.pattern.name} löschen`}
                        onClick={() => setConfirming(item.id)}
                      >
                        Löschen
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="library-message" role="status">
        {message}
      </p>
    </section>
  );
}
