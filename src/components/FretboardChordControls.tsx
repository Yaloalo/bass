import { useEffect, useMemo, useState } from 'react';
import { ChordPicker } from './ChordPicker';
import { Icon } from './UI';
import { chords } from '../data/chords';
import type { Scale } from '../data/catalog';
import { chordFamilies } from '../lib/chord-types';
import { diatonicStackedChords } from '../lib/diatonic';
import {
  fretboardChordColors,
  fretboardChordSelectionId,
  type FretboardChordSelection,
} from '../lib/fretboard-chords';
import { roots, spellDegree } from '../lib/music';
import { pretty } from '../lib/music';
import { useNoteLabel } from '../lib/store';

export function FretboardChordControls({
  root,
  scale,
  selected,
  onChange,
  guideChordIds,
  onToggleGuide,
}: {
  root: string;
  scale: Scale;
  selected: FretboardChordSelection[];
  onChange: (next: FretboardChordSelection[]) => void;
  guideChordIds: readonly string[];
  onToggleGuide: (id: string) => void;
}) {
  const label = useNoteLabel();
  const [chordRoot, setChordRoot] = useState(root);
  const scaleNotes = useMemo(
    () => scale.degreeLabels.map((degree) => spellDegree(root, degree)),
    [root, scale],
  );
  useEffect(() => setChordRoot(root), [root]);
  const keyChordGroups = useMemo(
    () => [
      { label: 'Dreiklänge', chords: diatonicStackedChords(scaleNotes, 3) },
      { label: 'Septakkorde', chords: diatonicStackedChords(scaleNotes, 4) },
    ],
    [scaleNotes],
  );
  const pickerItems = useMemo(
    () =>
      chords.map((chord) => ({
        id: chord.id,
        symbol: label.chord(chordRoot, chord.symbol),
        name: chord.nameDe,
        detail: `${chord.voicingFamily ? 'Tonvorrat: ' : ''}${chord.formula
          .map((degree) => label.note(spellDegree(chordRoot, degree)))
          .join(' · ')}`,
        family: chord.family,
        keywords: chord.aliases,
      })),
    [chordRoot, label],
  );
  const groups = chordFamilies.map((family) => ({ id: family.id, name: family.name }));

  const add = (selection: FretboardChordSelection) => {
    if (selected.some((item) => item.id === selection.id)) return;
    onChange([...selected, selection]);
  };
  const toggle = (selection: FretboardChordSelection) => {
    if (selected.some((item) => item.id === selection.id))
      onChange(selected.filter((item) => item.id !== selection.id));
    else add(selection);
  };
  const selectionForKeyChord = (item: (typeof keyChordGroups)[number]['chords'][number]) => ({
    id: fretboardChordSelectionId(item.root, item.chord.id),
    root: item.root,
    chordId: item.chord.id,
    roman: item.roman,
  });
  const hasKeyChords = keyChordGroups.some((group) => group.chords.length);

  return (
    <section className="fretboard-chord-controls" aria-label="Akkorde auf dem Griffbrett">
      <div className="fretboard-chord-add">
        <div>
          <span className="eyebrow">EINZELNE AKKORDE</span>
          <strong>Akkorde hinzufügen und vergleichen</strong>
        </div>
        <label>
          Grundton
          <select value={chordRoot} onChange={(event) => setChordRoot(event.target.value)}>
            {roots.map((note) => (
              <option key={note} value={note}>
                {label.note(note)}
              </option>
            ))}
          </select>
        </label>
        <div className="fretboard-chord-picker">
          <span>Akkord · alle {pickerItems.length} Akkordtypen</span>
          <ChordPicker
            label="Akkord zum Griffbrett hinzufügen"
            value=""
            items={pickerItems}
            groups={groups}
            emptyLabel="Gesamten Akkordkatalog öffnen"
            onPick={(chordId) =>
              add({
                id: fretboardChordSelectionId(chordRoot, chordId),
                root: chordRoot,
                chordId,
              })
            }
          />
        </div>
      </div>

      <div className="fretboard-key-chords">
        <div className="fretboard-key-chords-head">
          <div>
            <span className="eyebrow">SCHNELLAUSWAHL · AKKORDE DER TONART</span>
            <strong>
              {label.note(root)} {scale.name}
            </strong>
            <small>Dreiklänge und Septakkorde sind gleichzeitig sichtbar.</small>
          </div>
        </div>
        {hasKeyChords ? (
          keyChordGroups.map((group) => (
            <section className="fretboard-key-chord-group" key={group.label}>
              <header>
                <strong>{group.label}</strong>
                <button
                  type="button"
                  onClick={() => onChange(group.chords.map(selectionForKeyChord))}
                >
                  Alle {group.chords.length} anzeigen
                </button>
              </header>
              <div
                className="fretboard-key-chord-grid"
                role="group"
                aria-label={`${group.label} der Tonart`}
              >
                {group.chords.map((item) => {
                  const selection = selectionForKeyChord(item);
                  const index = selected.findIndex((candidate) => candidate.id === selection.id);
                  const active = index >= 0;
                  return (
                    <button
                      type="button"
                      key={selection.id}
                      className={active ? 'active' : ''}
                      aria-pressed={active}
                      onClick={() => toggle(selection)}
                    >
                      <i
                        style={{
                          background: active
                            ? fretboardChordColors[index % fretboardChordColors.length]
                            : undefined,
                        }}
                      />
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
          <p className="fretboard-key-chords-empty">
            Für diese Tonleiter gibt es keine sieben gewöhnlichen Stufenakkorde. Einzelne Akkorde
            kannst du trotzdem frei darüberlegen.
          </p>
        )}
      </div>

      <div className="fretboard-chord-selection" aria-live="polite">
        <span>
          {selected.length ? `${selected.length} Akkorde sichtbar` : 'Noch kein Akkord gewählt'}
        </span>
        <div>
          {selected.map((selection, index) => {
            const chord = chords.find((item) => item.id === selection.chordId);
            if (!chord) return null;
            const notes = chord.formula.map((degree) =>
              label.note(spellDegree(selection.root, degree)),
            );
            const guideActive = guideChordIds.includes(selection.id);
            return (
              <div
                key={selection.id}
                className={`fretboard-selected-chord ${guideActive ? 'guide-active' : ''}`}
                style={
                  {
                    '--chord-color': fretboardChordColors[index % fretboardChordColors.length],
                  } as React.CSSProperties
                }
              >
                <i />
                <span className="fretboard-selected-chord-content">
                  <span>
                    {selection.roman && <small>{selection.roman}</small>}
                    <strong>{label.chord(selection.root, chord.symbol)}</strong>
                  </span>
                  <span className="fretboard-selected-chord-notes">
                    <b>Töne</b> {notes.join(' · ')}
                  </span>
                  <span className="fretboard-selected-chord-formula">
                    <b>Formel</b> {chord.formula.map(pretty).join(' · ')}
                  </span>
                </span>
                <span className="fretboard-selected-chord-actions">
                  <button
                    type="button"
                    className={guideActive ? 'active' : ''}
                    aria-pressed={guideActive}
                    aria-label={`Tonfolge für ${label.chord(selection.root, chord.symbol)} ${guideActive ? 'beenden' : 'starten'}`}
                    onClick={() => onToggleGuide(selection.id)}
                  >
                    <Icon name="arrow" size={13} />
                    Pfeil
                  </button>
                  <button
                    type="button"
                    aria-label={`${label.chord(selection.root, chord.symbol)} ausblenden`}
                    onClick={() => onChange(selected.filter((item) => item.id !== selection.id))}
                  >
                    <Icon name="close" size={13} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
        {selected.length > 0 && (
          <button type="button" className="text-button" onClick={() => onChange([])}>
            Alle ausblenden
          </button>
        )}
      </div>
    </section>
  );
}
