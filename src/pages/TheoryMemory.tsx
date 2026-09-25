import { useEffect, useMemo, useState } from 'react';
import { Icon, PageHeading, Panel, Segmented, usePageTitle } from '../components/UI';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { TheoryNoteStaff } from '../components/TheoryNoteStaff';
import { TheoryMemoryPool } from '../components/TheoryMemoryPool';
import { scales } from '../data/catalog';
import { chordFamilies } from '../lib/chord-types';
import { germanNoteName, scaleName, textDe } from '../lib/i18n';
import { mod, pitchClass, pretty, roots } from '../lib/music';
import {
  memoryAnswer,
  memoryChordPool,
  memoryNoteChoices,
  memoryScalePool,
  nextMemoryQuestion,
} from '../lib/theory-memory';
import type { MemoryTopic, RootScope } from '../lib/theory-memory';
import { usePiano } from '../lib/use-piano';
import { useNoteLabel, useStore } from '../lib/store';
import { instrumentProfile } from '../lib/instrument';
import '../memory.css';

type AnswerSurface = 'Notennamen' | 'Klaviatur' | 'Notenblatt';

const availableChords = memoryChordPool('all');
const scalePoolItems = scales.map((scale) => ({
  id: scale.id,
  title: scaleName(scale.id),
  detail: scale.degreeLabels.map(pretty).join(' · '),
  group: scale.category,
  keywords: `${scale.aliases?.join(' ') ?? ''} ${scale.applications}`,
}));
const scalePoolGroups = [...new Set(scales.map((scale) => scale.category))].map((category) => ({
  id: category,
  name: textDe(category),
}));
const chordPoolItems = availableChords.map((chord) => ({
  id: chord.id,
  title: chord.symbol || 'Dur',
  detail: `${chord.nameDe} · ${chord.formula.map(pretty).join(' · ')}`,
  group: chord.family,
  keywords: chord.aliases.join(' '),
}));
const chordIdsInFamilies = (...families: string[]) =>
  availableChords.filter((chord) => families.includes(chord.family)).map((chord) => chord.id);
const jazzBasicChordIds = [
  'major-7',
  'minor-7',
  'dominant-7',
  'minor-7b5',
  'diminished-7',
  'six',
  'minor-6',
];

export function TheoryMemory() {
  usePageTitle('Auswendig lernen');
  const { root: globalRoot, scaleId: storedScaleId, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const globalScaleId = scales.some((scale) => scale.id === storedScaleId)
    ? storedScaleId
    : scales[0].id;
  const noteLabel = useNoteLabel();
  const displayNote = (note: string) =>
    noteLabel.style === 'de' ? germanNoteName(note) : noteLabel.note(note);
  const [topicLabel, setTopicLabel] = useState('Tonleitern');
  const topic: MemoryTopic = topicLabel === 'Akkorde' ? 'chords' : 'scales';
  const [surface, setSurface] = useState<AnswerSurface>('Notennamen');
  const [rootScope, setRootScope] = useState<RootScope>('current');
  const [rootSelection, setRootSelection] = useState<Set<string>>(() => new Set(roots));
  const [scaleSelection, setScaleSelection] = useState<Set<string>>(
    () => new Set(memoryScalePool('major', 'core').map((scale) => scale.id)),
  );
  const [chordSelection, setChordSelection] = useState<Set<string>>(
    () => new Set(memoryChordPool('basic').map((chord) => chord.id)),
  );
  const [rootPanelOpen, setRootPanelOpen] = useState(false);
  const [poolOpen, setPoolOpen] = useState(false);
  const selectedRoots = useMemo(
    () => roots.filter((root) => rootSelection.has(root)),
    [rootSelection],
  );
  const options = useMemo(
    () => ({
      topic,
      globalRoot,
      rootScope,
      rootSelection: selectedRoots,
      scaleSelection: [...scaleSelection],
      chordSelection: [...chordSelection],
    }),
    [topic, globalRoot, rootScope, selectedRoots, scaleSelection, chordSelection],
  );
  const [question, setQuestion] = useState(() => nextMemoryQuestion(options));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [solutionShown, setSolutionShown] = useState(false);
  const piano = usePiano(48);

  const resetAnswer = () => {
    setSelected(new Set());
    setChecked(false);
    setSolutionShown(false);
    piano.stopAll();
  };
  const next = () => {
    setQuestion((old) => nextMemoryQuestion(options, old.key));
    resetAnswer();
  };
  useEffect(() => {
    setQuestion(nextMemoryQuestion(options));
    setSelected(new Set());
    setChecked(false);
    setSolutionShown(false);
    piano.stopAll();
  }, [options]);

  const choices = useMemo(() => memoryNoteChoices(question), [question]);
  const result = checked ? memoryAnswer(question, selected) : undefined;
  const selectedMidis = useMemo(
    () => new Set([...selected].map((value) => 60 + mod(value))),
    [selected],
  );
  const labelPitch = (value: number) => {
    const exact = question.notes.find((note) => pitchClass(note) === value);
    return displayNote(exact ?? choices[value]);
  };
  const toggle = (value: number, sound = true) => {
    const pitch = mod(value);
    if (sound) piano.playChord([60 + pitch]);
    setSelected((old) => {
      const nextSelection = new Set(old);
      if (nextSelection.has(pitch)) nextSelection.delete(pitch);
      else nextSelection.add(pitch);
      return nextSelection;
    });
    setChecked(false);
    setSolutionShown(false);
  };
  const toggleSolution = () => {
    setChecked(false);
    if (solutionShown) {
      setSelected(new Set());
      setSolutionShown(false);
    } else {
      setSelected(new Set(question.pitchClasses));
      setSolutionShown(true);
    }
  };
  const toggleRoot = (root: string) => {
    setRootScope('selection');
    setRootSelection((old) => {
      const base = rootScope === 'current' ? new Set([globalRoot]) : old;
      if (base.has(root) && base.size === 1) return base;
      const nextSelection = new Set(base);
      if (nextSelection.has(root)) nextSelection.delete(root);
      else nextSelection.add(root);
      return nextSelection;
    });
  };
  const activePool = topic === 'scales' ? scaleSelection : chordSelection;
  const togglePoolItem = (id: string) => {
    const setSelection = topic === 'scales' ? setScaleSelection : setChordSelection;
    setSelection((old) => {
      if (old.has(id) && old.size === 1) return old;
      const nextSelection = new Set(old);
      if (nextSelection.has(id)) nextSelection.delete(id);
      else nextSelection.add(id);
      return nextSelection;
    });
  };
  const setActivePool = (ids: string[]) => {
    const setSelection = topic === 'scales' ? setScaleSelection : setChordSelection;
    if (ids.length) setSelection(new Set(ids));
  };
  const title =
    question.topic === 'scales'
      ? `${displayNote(question.root)} · ${scaleName(question.itemId)}`
      : question.chord?.id === 'major'
        ? `${displayNote(question.root)}-Dur`
        : question.chord?.id === 'minor'
          ? `${displayNote(question.root)}-Moll`
          : noteLabel.chord(question.root, question.chord?.symbol ?? '');
  const subtitle = question.topic === 'scales' ? 'Tonleiter' : (question.chord?.nameDe ?? 'Akkord');

  return (
    <div className="memory-page">
      <PageHeading
        eyebrow="MUSIKTHEORIE / ÜBEN"
        title="Auswendig lernen"
        description="Baue Tonleitern und Akkorde selbst aus ihren Tönen – als Namen, auf der Klaviatur oder im Notenblatt."
      />

      <Panel className="memory-settings" title="Aufgabe einstellen">
        <div className="memory-settings-grid">
          <div className="memory-setting-group">
            <span className="memory-field-label">Lernbereich</span>
            <Segmented
              label="Lernbereich"
              value={topicLabel}
              onChange={(value) => {
                setTopicLabel(value);
                setPoolOpen(false);
                setRootPanelOpen(false);
              }}
              options={['Tonleitern', 'Akkorde']}
            />
          </div>
          <div className="memory-setting-group">
            <span className="memory-field-label">Grundtöne</span>
            <button
              type="button"
              className="memory-pool-trigger"
              aria-expanded={rootPanelOpen}
              onClick={() => {
                setRootPanelOpen((open) => !open);
                setPoolOpen(false);
              }}
            >
              <span>
                {rootScope === 'current'
                  ? `Nur ${displayNote(globalRoot)}`
                  : `${selectedRoots.length} ausgewählt`}
              </span>
              <Icon name="chevron" size={15} />
            </button>
          </div>
          <div className="memory-setting-group">
            <span className="memory-field-label">
              {topic === 'scales' ? 'Tonleitern' : 'Akkorde'}
            </span>
            <button
              type="button"
              className="memory-pool-trigger"
              aria-expanded={poolOpen}
              onClick={() => {
                setPoolOpen((open) => !open);
                setRootPanelOpen(false);
              }}
            >
              <span>{activePool.size} ausgewählt</span>
              <Icon name="chevron" size={15} />
            </button>
          </div>
          <label>
            Antwortfläche
            <select
              value={surface}
              onChange={(event) => setSurface(event.target.value as AnswerSurface)}
            >
              <option>Notennamen</option>
              <option>Klaviatur</option>
              <option>Notenblatt</option>
            </select>
          </label>
        </div>
        {rootPanelOpen && (
          <section
            className="memory-pool-panel memory-root-picker"
            aria-label="Grundtöne auswählen"
          >
            <div className="memory-pool-head">
              <div>
                <strong>Grundtöne auswählen</strong>
                <span>{rootScope === 'current' ? 1 : selectedRoots.length} von 12 aktiv</span>
              </div>
              <button
                type="button"
                aria-label="Grundtonauswahl schließen"
                onClick={() => setRootPanelOpen(false)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="memory-root-picker-head">
              <button
                type="button"
                onClick={() => {
                  setRootScope('current');
                  setRootSelection(new Set([globalRoot]));
                }}
              >
                Nur globaler Grundton · {displayNote(globalRoot)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRootScope('selection');
                  setRootSelection(new Set(roots));
                }}
              >
                Alle auswählen
              </button>
            </div>
            <div className="memory-root-options">
              {roots.map((root) => (
                <label key={root}>
                  <input
                    type="checkbox"
                    checked={
                      rootScope === 'current' ? root === globalRoot : rootSelection.has(root)
                    }
                    onChange={() => toggleRoot(root)}
                  />
                  <span>{displayNote(root)}</span>
                </label>
              ))}
            </div>
          </section>
        )}
        {poolOpen && (
          <TheoryMemoryPool
            label={topic === 'scales' ? 'Tonleitern' : 'Akkorde'}
            items={topic === 'scales' ? scalePoolItems : chordPoolItems}
            groups={
              topic === 'scales'
                ? scalePoolGroups
                : chordFamilies.map((family) => ({ id: family.id, name: family.name }))
            }
            selected={activePool}
            presets={
              topic === 'scales'
                ? [
                    { label: `Nur ${scaleName(globalScaleId)}`, ids: [globalScaleId] },
                    {
                      label: 'Basis',
                      ids: memoryScalePool(globalScaleId, 'core').map((scale) => scale.id),
                    },
                  ]
                : [
                    {
                      label: 'Einfach',
                      ids: memoryChordPool('basic').map((chord) => chord.id),
                    },
                    {
                      label: 'Dreiklänge',
                      ids: memoryChordPool('triads').map((chord) => chord.id),
                    },
                    {
                      label: 'Dreiklänge + Septakkorde',
                      ids: memoryChordPool('sevenths').map((chord) => chord.id),
                    },
                    { label: 'Jazz-Basis', ids: jazzBasicChordIds },
                    {
                      label: 'Sus & Add',
                      ids: chordIdsInFamilies('suspended', 'added'),
                    },
                    {
                      label: 'Septakkorde',
                      ids: chordIdsInFamilies('seventh'),
                    },
                    {
                      label: '9 · 11 · 13',
                      ids: chordIdsInFamilies('ninth', 'eleventh', 'thirteenth'),
                    },
                    {
                      label: 'Alterierte Dominanten',
                      ids: chordIdsInFamilies('altered'),
                    },
                  ]
            }
            onToggle={togglePoolItem}
            onSet={setActivePool}
            onClose={() => setPoolOpen(false)}
          />
        )}
      </Panel>

      <Panel className="memory-question">
        <div className="memory-prompt">
          <div>
            <span className="eyebrow">{subtitle.toUpperCase()}</span>
            <h2>{title}</h2>
            <p>Wähle alle enthaltenen Töne. Jeder Ton zählt nur einmal.</p>
          </div>
          <span className="memory-note-count">{question.pitchClasses.length} TÖNE</span>
        </div>

        {surface === 'Notennamen' && (
          <div className="memory-name-grid" aria-label="Notennamen auswählen">
            {choices.map((note, value) => (
              <button
                type="button"
                key={note}
                aria-pressed={selected.has(value)}
                className={selected.has(value) ? 'is-selected' : ''}
                onClick={() => toggle(value)}
              >
                {displayNote(note)}
              </button>
            ))}
          </div>
        )}

        {surface === 'Klaviatur' && (
          <div className="memory-keyboard">
            <PianoKeyboard
              first={60}
              last={71}
              scaleNotes={choices}
              scalePitchClasses={new Set()}
              rootPitch={-1}
              selected={selectedMidis}
              pressed={new Set(piano.held.values())}
              selecting
              showContext={false}
              noteLabel={displayNote}
              onStart={piano.start}
              onEnd={piano.end}
              onToggle={(midi) => toggle(midi, false)}
              onTap={(midi) => piano.playChord([midi])}
            />
          </div>
        )}

        {surface === 'Notenblatt' && (
          <TheoryNoteStaff
            choices={choices}
            selected={selected}
            noteLabel={displayNote}
            onToggle={toggle}
            clef={profile.notationClef}
          />
        )}

        <div className="memory-selection" aria-live="polite">
          <span>DEINE AUSWAHL</span>
          <strong>
            {selected.size
              ? [...selected]
                  .sort((a, b) => a - b)
                  .map(labelPitch)
                  .join(' · ')
              : 'Noch kein Ton gewählt'}
          </strong>
        </div>

        {piano.audioError && (
          <p className="error-text" role="alert">
            {piano.audioError}
          </p>
        )}
        <div className="memory-actions">
          <button
            type="button"
            className={`primary memory-check ${result ? (result.correct ? 'is-correct' : 'is-wrong') : ''}`}
            style={
              result
                ? {
                    background: result.correct ? 'var(--green)' : '#b42318',
                    borderColor: result.correct ? 'var(--green)' : '#b42318',
                    color: 'white',
                  }
                : undefined
            }
            aria-live="polite"
            disabled={!selected.size}
            onClick={() => setChecked(true)}
          >
            {result ? (result.correct ? 'Richtig' : 'Nicht richtig') : 'Auswahl prüfen'}
          </button>
          <button type="button" onClick={next}>
            Neue Aufgabe
          </button>
          <button type="button" onClick={toggleSolution}>
            {solutionShown ? 'Lösung ausblenden' : 'Lösung anzeigen'}
          </button>
          <button type="button" disabled={!selected.size} onClick={resetAnswer}>
            Auswahl leeren
          </button>
        </div>

        {solutionShown && (
          <div className="memory-formula">
            <span>FORMEL</span>
            <strong>{question.degrees.map(pretty).join(' · ')}</strong>
          </div>
        )}
      </Panel>
    </div>
  );
}
