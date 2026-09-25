import type { CSSProperties } from 'react';
import { pitchClass, pretty } from '../lib/music';

const letterPosition: Record<string, number> = { C: 3, D: 4, E: 5, F: 6, G: 7, A: 8, B: 9 };

export function TheoryNoteStaff({
  choices,
  selected,
  noteLabel,
  onToggle,
}: {
  choices: readonly string[];
  selected: ReadonlySet<number>;
  noteLabel: (name: string) => string;
  onToggle: (pitch: number) => void;
}) {
  const rows = [choices.slice(0, 6), choices.slice(6, 12)];
  return (
    <div className="memory-staves" aria-label="Töne im Bassschlüssel auswählen">
      {rows.map((notes, row) => (
        <div className="memory-staff" key={row}>
          <span className="memory-clef" aria-hidden="true">
            𝄢
          </span>
          <div className="memory-staff-notes">
            {notes.map((note) => {
              const value = pitchClass(note);
              const active = selected.has(value);
              const position = letterPosition[note[0]] ?? 3;
              return (
                <button
                  type="button"
                  key={`${row}-${note}`}
                  className={active ? 'is-selected' : ''}
                  style={{ '--staff-position': position } as CSSProperties}
                  aria-label={`${noteLabel(note)} auswählen`}
                  aria-pressed={active}
                  onClick={() => onToggle(value)}
                >
                  <span className="memory-accidental" aria-hidden="true">
                    {pretty(note.slice(1))}
                  </span>
                  <span className="memory-notehead" aria-hidden="true" />
                  <span className="visually-hidden">{noteLabel(note)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p>Bassschlüssel · dieselben zwölf Tonklassen in zwei übersichtlichen Zeilen</p>
    </div>
  );
}
