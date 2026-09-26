import { useMemo } from 'react';
import { Section } from './UI';
import { diatonicStackedChords } from '../lib/diatonic';
import type { DiatonicStackedChord } from '../lib/diatonic';
import { useNoteLabel } from '../lib/store';

/**
 * The diatonic triads and seventh chords of the current key, as one grid you can tap.
 * The fretboard has had this for a while; the piano now shares the same construction, so
 * a chord means the same thing on both instruments.
 *
 * Folded away by default: it is a shortcut, not the page.
 */

/** Stable within one key, and distinct between the triad and the seventh on a degree. */
export const quickChordId = (item: DiatonicStackedChord) =>
  `${item.notes.length}:${item.root}:${item.chord.id}`;

export function QuickChordSelect({
  scaleNotes,
  activeId = '',
  onPick,
  title = 'Schnellauswahl',
  subtitle,
  defaultOpen = false,
}: {
  /** The seven notes of the key, in scale order. */
  scaleNotes: readonly string[];
  /** `quickChordId` of the chord currently showing, if any. */
  activeId?: string;
  onPick: (item: DiatonicStackedChord) => void;
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
}) {
  const label = useNoteLabel();
  const groups = useMemo(
    () => [
      { label: 'Dreiklänge', chords: diatonicStackedChords(scaleNotes, 3) },
      { label: 'Septakkorde', chords: diatonicStackedChords(scaleNotes, 4) },
    ],
    [scaleNotes],
  );
  const total = groups.reduce((sum, group) => sum + group.chords.length, 0);

  return (
    <Section
      className="quick-chords"
      title={title}
      defaultOpen={defaultOpen}
      aside={<span className="small-label">{total ? `${total} AKKORDE` : 'NICHT VERFÜGBAR'}</span>}
    >
      {subtitle && <p className="quick-chords-hint">{subtitle}</p>}
      {total ? (
        groups.map((group) => (
          <section className="quick-chord-group" key={group.label}>
            <header>
              <strong>{group.label}</strong>
              <span>{group.chords.length}</span>
            </header>
            <div className="quick-chord-grid" role="group" aria-label={`${group.label} der Tonart`}>
              {group.chords.map((item) => {
                const id = quickChordId(item);
                const active = id === activeId;
                return (
                  <button
                    type="button"
                    key={id}
                    className={active ? 'active' : ''}
                    aria-pressed={active}
                    onClick={() => onPick(item)}
                  >
                    <span>{item.roman}</span>
                    <strong>{label.chord(item.root, item.chord.symbol)}</strong>
                    <small>{item.notes.map(label.note).join(' · ')}</small>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <p className="quick-chords-empty">
          Diese Tonleiter hat keine sieben verschiedenen Töne, deshalb gibt es hier keine
          Stufenakkorde. Einzelne Akkorde kannst du weiterhin frei wählen.
        </p>
      )}
    </Section>
  );
}
