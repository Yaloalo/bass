import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './UI';
import '../chord-picker.css';

export interface ChordPickerItem {
  id: string;
  /** The symbol, shown large: `Dmaj7`. */
  symbol: string;
  /** German name, shown underneath. */
  name: string;
  /** Spelled notes or any other one-line detail. */
  detail?: string;
  /** Group id, used by the ART filter row. */
  family: string;
  /** Scale degree, used by the STUFE filter row where one applies. */
  degree?: number;
  /** Alternative spellings, so a search for `7#5b9` finds `7b9b13`. */
  keywords?: readonly string[];
}

export interface ChordPickerGroup {
  id: string;
  name: string;
}

interface DegreeFilter {
  label: string;
  /** One entry per selectable degree, in scale order. */
  options: { degree: number; label: string }[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * One chord list, opened from wherever it is needed. A key offers close to ninety
 * chords and the catalogue over seventy, which is far past what a native <select>
 * can be navigated in — this filters by degree, by family and by free text instead.
 * It floats in a portal so no scrolling panel or sticky bar can clip it.
 */
export function ChordPicker({
  label,
  value,
  items,
  groups,
  degrees,
  emptyLabel = 'Akkord wählen',
  disabled = false,
  triggerClassName = '',
  onPick,
}: {
  /** Accessible name of the trigger and heading of the panel. */
  label: string;
  value: string;
  items: ChordPickerItem[];
  groups: ChordPickerGroup[];
  degrees?: DegreeFilter;
  emptyLabel?: string;
  disabled?: boolean;
  triggerClassName?: string;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [degree, setDegree] = useState(0);
  const [family, setFamily] = useState('');
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 360 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const selected = items.find((item) => item.id === value);
  const usedGroups = groups.filter((group) => items.some((item) => item.family === group.id));

  const place = () => {
    const box = trigger.current?.getBoundingClientRect();
    if (!box) return;
    const width = clamp(Math.max(box.width, 420), 260, window.innerWidth - 24);
    const height = Math.min(470, window.innerHeight - 32);
    const below = window.innerHeight - box.bottom;
    setPosition({
      // Flip above the trigger when there is no room underneath.
      top: below >= height + 12 ? box.bottom + 6 : clamp(box.top - height - 6, 12, box.top),
      left: clamp(box.left, 12, Math.max(12, window.innerWidth - width - 12)),
      width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    search.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || trigger.current?.contains(target)) return;
      setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const needle = query.trim().toLowerCase();
  const shown = items.filter((item) => {
    if (degree && item.degree !== degree) return false;
    if (family && item.family !== family) return false;
    if (!needle) return true;
    return [item.symbol, item.name, item.detail ?? '', ...(item.keywords ?? [])]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  const chip = (active: boolean, key: string, onClick: () => void, children: React.ReactNode) => (
    <button
      type="button"
      key={key}
      className={`chord-picker-chip ${active ? 'active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );

  return (
    <>
      <button
        type="button"
        ref={trigger}
        disabled={disabled || !items.length}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`chord-picker-trigger ${triggerClassName}`}
        onClick={() => setOpen((was) => !was)}
      >
        <span className="chord-picker-value">
          {selected ? selected.symbol : items.length ? emptyLabel : 'nicht verfügbar'}
        </span>
        {selected?.name && <small>{selected.name}</small>}
        <Icon name="chevron" size={16} />
      </button>
      {open &&
        createPortal(
          <div
            className="chord-picker-panel"
            ref={panel}
            role="dialog"
            aria-label={label}
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            <div className="chord-picker-head">
              <strong>{label}</strong>
              <span className="chord-picker-count">
                {shown.length} von {items.length}
              </span>
              <button type="button" aria-label="Schließen" onClick={() => setOpen(false)}>
                <Icon name="close" size={15} />
              </button>
            </div>
            <label className="chord-picker-search">
              <Icon name="search" size={16} />
              <input
                ref={search}
                type="search"
                value={query}
                aria-label={`${label} durchsuchen`}
                placeholder="Symbol oder Name, z. B. maj7 oder vermindert"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {degrees && degrees.options.length > 1 && (
              <div className="chord-picker-row" role="group" aria-label={degrees.label}>
                <span className="eyebrow">Stufe</span>
                {chip(!degree, 'all-degrees', () => setDegree(0), 'Alle')}
                {degrees.options.map((option) =>
                  chip(
                    degree === option.degree,
                    `d${option.degree}`,
                    () => setDegree(option.degree),
                    option.label,
                  ),
                )}
              </div>
            )}
            {usedGroups.length > 1 && (
              <div className="chord-picker-row" role="group" aria-label="Nach Akkordart filtern">
                <span className="eyebrow">Art</span>
                {chip(!family, 'all-families', () => setFamily(''), 'Alle')}
                {usedGroups.map((group) =>
                  chip(family === group.id, group.id, () => setFamily(group.id), group.name),
                )}
              </div>
            )}
            {shown.length ? (
              <ul className="chord-picker-grid">
                {shown.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`chord-picker-card ${item.id === value ? 'active' : ''}`}
                      aria-pressed={item.id === value}
                      onClick={() => {
                        onPick(item.id);
                        setOpen(false);
                      }}
                    >
                      {item.degree !== undefined && degrees && (
                        <span className="chord-picker-degree">
                          {degrees.options.find((option) => option.degree === item.degree)?.label}
                        </span>
                      )}
                      <strong>{item.symbol}</strong>
                      <small>{item.name}</small>
                      {item.detail && <em>{item.detail}</em>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="chord-picker-empty">
                Keine Treffer. Setz die Filter zurück oder such nach einem anderen Symbol.
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
