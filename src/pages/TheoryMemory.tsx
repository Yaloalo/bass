import { useEffect, useMemo, useState } from 'react';
import { PageHeading, Panel, Segmented, usePageTitle } from '../components/UI';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { TheoryNoteStaff } from '../components/TheoryNoteStaff';
import { scales } from '../data/catalog';
import { germanNoteName, scaleName } from '../lib/i18n';
import { mod, pitchClass, pretty } from '../lib/music';
import { memoryAnswer, memoryNoteChoices, nextMemoryQuestion } from '../lib/theory-memory';
import type { ChordLevel, MemoryTopic, RootScope, ScaleScope } from '../lib/theory-memory';
import { usePiano } from '../lib/use-piano';
import { useNoteLabel, useStore } from '../lib/store';
import '../memory.css';

type AnswerSurface = 'Notennamen' | 'Klaviatur' | 'Notenblatt';

export function TheoryMemory() {
  usePageTitle('Auswendig lernen');
  const { root: globalRoot, scaleId: storedScaleId } = useStore();
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
  const [scaleScope, setScaleScope] = useState<ScaleScope>('current');
  const [chordLevel, setChordLevel] = useState<ChordLevel>('basic');
  const options = useMemo(
    () => ({ topic, globalRoot, globalScaleId, rootScope, scaleScope, chordLevel }),
    [topic, globalRoot, globalScaleId, rootScope, scaleScope, chordLevel],
  );
  const [question, setQuestion] = useState(() => nextMemoryQuestion(options));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const piano = usePiano(48);

  const resetAnswer = () => {
    setSelected(new Set());
    setChecked(false);
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
        description="Baue Tonleitern und Akkorde selbst aus ihren Tönen – als Namen, auf der Klaviatur oder im Notensystem."
      />

      <Panel className="memory-context">
        <div>
          <span className="eyebrow">GLOBALER MUSIKKONTEXT</span>
          <strong>
            {displayNote(globalRoot)} · {scaleName(globalScaleId)}
          </strong>
          <p>Grundton und Tonleiter kannst du jederzeit oben rechts ändern.</p>
        </div>
        <div className="memory-topic-switch">
          <Segmented
            label="Lernbereich"
            value={topicLabel}
            onChange={setTopicLabel}
            options={['Tonleitern', 'Akkorde']}
          />
        </div>
      </Panel>

      <Panel className="memory-settings" title="Aufgabe einstellen">
        <div className="memory-settings-grid">
          <label>
            Grundtöne
            <select
              value={rootScope}
              onChange={(event) => setRootScope(event.target.value as RootScope)}
            >
              <option value="current">Nur globaler Grundton · {displayNote(globalRoot)}</option>
              <option value="all">Zufällig durch alle Grundtöne</option>
            </select>
          </label>
          {topic === 'scales' ? (
            <label>
              Tonleitern
              <select
                value={scaleScope}
                onChange={(event) => setScaleScope(event.target.value as ScaleScope)}
              >
                <option value="current">Nur globale Tonleiter · {scaleName(globalScaleId)}</option>
                <option value="core">Dur, Moll, Pentatonik und Blues</option>
                <option value="all">Alle vorhandenen Tonleitern und Modi</option>
              </select>
            </label>
          ) : (
            <label>
              Akkordstufe
              <select
                value={chordLevel}
                onChange={(event) => setChordLevel(event.target.value as ChordLevel)}
              >
                <option value="basic">Einfach · nur Dur und Moll</option>
                <option value="triads">Alle Dreiklänge und Vorhalte</option>
                <option value="sevenths">Dreiklänge und grundlegende Septakkorde</option>
                <option value="all">Alle festen Akkordtypen</option>
              </select>
            </label>
          )}
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

        {result && (
          <div
            className={`memory-feedback ${result.correct ? 'is-correct' : 'is-wrong'}`}
            role="status"
          >
            <strong>{result.correct ? 'Richtig.' : 'Noch nicht ganz.'}</strong>
            {result.correct ? (
              <p>
                {title}: {question.notes.map(displayNote).join(' · ')}
              </p>
            ) : (
              <p>
                {result.missing.length > 0 &&
                  `Es fehlen: ${result.missing.map(labelPitch).join(' · ')}. `}
                {result.wrong.length > 0 &&
                  `Nicht enthalten: ${result.wrong.map(labelPitch).join(' · ')}.`}
              </p>
            )}
            {!result.correct && (
              <button
                type="button"
                onClick={() => {
                  setSelected(new Set(question.pitchClasses));
                  setChecked(true);
                }}
              >
                Lösung einsetzen
              </button>
            )}
          </div>
        )}

        {piano.audioError && (
          <p className="error-text" role="alert">
            {piano.audioError}
          </p>
        )}
        <div className="memory-actions">
          <button type="button" className="primary" onClick={() => setChecked(true)}>
            Auswahl prüfen
          </button>
          <button type="button" disabled={!selected.size} onClick={resetAnswer}>
            Auswahl leeren
          </button>
          <button type="button" onClick={next}>
            Neue Aufgabe
          </button>
        </div>

        {checked && (
          <div className="memory-formula">
            <span>FORMEL</span>
            <strong>{question.degrees.map(pretty).join(' · ')}</strong>
          </div>
        )}
      </Panel>
    </div>
  );
}
