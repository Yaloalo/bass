import { useEffect, useState } from 'react';
import { Icon } from './UI';

export interface MemoryPoolItem {
  id: string;
  title: string;
  detail: string;
  group: string;
  keywords?: string;
}

export interface MemoryPoolGroup {
  id: string;
  name: string;
}

export function TheoryMemoryPool({
  label,
  items,
  groups,
  selected,
  presets,
  onToggle,
  onSet,
  onClose,
}: {
  label: string;
  items: MemoryPoolItem[];
  groups: MemoryPoolGroup[];
  selected: ReadonlySet<string>;
  presets: { label: string; ids: string[] }[];
  onToggle: (id: string) => void;
  onSet: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  useEffect(() => setQuery(''), [label]);
  const needle = query.trim().toLowerCase();
  const shown = items.filter((item) =>
    `${item.title} ${item.detail} ${item.keywords ?? ''}`.toLowerCase().includes(needle),
  );

  return (
    <section className="memory-pool-panel" aria-label={`${label} auswählen`}>
      <div className="memory-pool-head">
        <div>
          <strong>{label} auswählen</strong>
          <span>
            {selected.size} von {items.length} aktiv
          </span>
        </div>
        <button type="button" aria-label={`${label}-Auswahl schließen`} onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="memory-pool-tools">
        <label>
          <Icon name="search" size={16} />
          <input
            type="search"
            value={query}
            placeholder={`${label} durchsuchen …`}
            aria-label={`${label} durchsuchen`}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="memory-pool-presets" aria-label="Schnellauswahl">
          {presets.map((preset) => (
            <button type="button" key={preset.label} onClick={() => onSet(preset.ids)}>
              {preset.label}
            </button>
          ))}
          <button type="button" onClick={() => onSet(items.map((item) => item.id))}>
            Alle
          </button>
        </div>
      </div>
      {groups
        .filter((group) => shown.some((item) => item.group === group.id))
        .map((group) => (
          <div className="memory-pool-group" key={group.id}>
            <h3>{group.name}</h3>
            <div className="memory-pool-grid">
              {shown
                .filter((item) => item.group === group.id)
                .map((item) => (
                  <label key={item.id} className={selected.has(item.id) ? 'is-selected' : ''}>
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => onToggle(item.id)}
                    />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                  </label>
                ))}
            </div>
          </div>
        ))}
      {!shown.length && <p className="memory-pool-empty">Keine passenden Einträge gefunden.</p>}
    </section>
  );
}
