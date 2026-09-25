import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, PageHeading, Panel, Segmented, usePageTitle } from '../components/UI';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { Fretboard } from '../components/Fretboard';
import {
  answerLabel,
  earRange,
  answerSymbol,
  chordLevels,
  intervalLevels,
  nextQuestion,
  questionPitches,
} from '../lib/ear';
import type { EarMode, EarQuestion } from '../lib/ear';
import { usePiano } from '../lib/use-piano';
import { allPositions, chromaticDegreesFor, mod, noteName, pitchClass, tuning } from '../lib/music';
import { germanNoteName } from '../lib/i18n';
import { useLocal, useStore } from '../lib/store';
import { instrumentProfile } from '../lib/instrument';
import '../piano.css';
import '../ear.css';

const modes = ['Intervalle', 'Akkorde'] as const;
const spreadMs = 260;

/**
 * Marks every position of the question's pitch classes on the neck, named the way the
 * question spells them — otherwise the verdict says B and the fretboard says Ais.
 */
function questionBoard(question: EarQuestion) {
  const root = question.notes[0];
  const spelling = new Map(question.notes.map((note) => [pitchClass(note), note]));
  const degrees = chromaticDegreesFor(root).filter((_, interval) =>
    spelling.has(mod(pitchClass(root) + interval)),
  );
  return allPositions(root, degrees, 0, 12).map((note) => ({
    ...note,
    name: spelling.get(mod(tuning[note.string] + note.fret)) ?? note.name,
  }));
}

export function EarTraining() {
  const { instrument } = useStore();
  const profile = instrumentProfile(instrument);
  usePageTitle('Gehörbildung');
  const piano = usePiano(60);
  const [mode, setMode] = useLocal<string>('ear-mode', 'Intervalle');
  const [levelId, setLevelId] = useLocal<string>('ear-level', 'basics');
  const [spread, setSpread] = useLocal('ear-spread', true);
  const [question, setQuestion] = useState<EarQuestion | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0, best: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const kind: EarMode = mode === 'Akkorde' ? 'chords' : 'intervals';
  const levels = kind === 'chords' ? chordLevels : intervalLevels;
  const level = levels.find((item) => item.id === levelId) ?? levels[0];

  const sound = useCallback(
    (target: EarQuestion, apart: boolean) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      if (!apart) {
        piano.playChord(target.midis);
        return;
      }
      // Spread out, the question becomes a melody: each note lands on its own.
      target.midis.forEach((midi, index) => {
        timers.current.push(setTimeout(() => piano.playChord([midi]), index * spreadMs));
      });
    },
    [piano],
  );

  const ask = useCallback(() => {
    const target = nextQuestion(kind, level, question?.answer);
    setQuestion(target);
    setPicked(null);
    sound(target, spread);
  }, [kind, level, question?.answer, sound, spread]);

  // A new mode or level means a new question; nothing plays until the user asks.
  useEffect(() => {
    setQuestion(null);
    setPicked(null);
  }, [kind, levelId]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (levels.some((item) => item.id === levelId)) return;
    setLevelId(levels[0].id);
  }, [levels, levelId, setLevelId]);

  const answer = (choice: string) => {
    if (!question || picked) return;
    setPicked(choice);
    const right = choice === question.answer;
    setScore((old) => ({
      right: old.right + (right ? 1 : 0),
      total: old.total + 1,
      streak: right ? old.streak + 1 : 0,
      best: Math.max(old.best, right ? old.streak + 1 : 0),
    }));
    // Hearing it again straight after the verdict is where the learning happens.
    if (!right) sound(question, spread);
  };

  const solved = picked !== null;
  const correct = solved && picked === question?.answer;
  const pitches = question ? new Set(questionPitches(question)) : new Set<number>();
  const board = question && solved ? questionBoard(question) : [];

  return (
    <div className="ear-page">
      <PageHeading
        eyebrow="MUSIKTHEORIE / HÖREN"
        title="Gehörbildung"
        description="Hören, benennen, sehen. Nach jeder Antwort liegt der Klang auf der Klaviatur und auf dem Griffbrett."
      />

      <Panel className="ear-setup">
        <div className="ear-setup-row">
          <Segmented
            label="Übungsart"
            options={[...modes]}
            value={mode}
            onChange={(value) => {
              setMode(value);
              setLevelId((value === 'Akkorde' ? chordLevels : intervalLevels)[0].id);
            }}
          />
          <div className="segmented" role="group" aria-label="Schwierigkeit">
            {levels.map((item) => (
              <button
                type="button"
                key={item.id}
                title={item.hint}
                aria-pressed={level.id === item.id}
                className={level.id === item.id ? 'selected' : ''}
                onClick={() => setLevelId(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <label className="ear-toggle">
            <input
              type="checkbox"
              role="switch"
              checked={spread}
              onChange={(event) => setSpread(event.target.checked)}
            />
            <span>{kind === 'chords' ? 'Gebrochen spielen' : 'Nacheinander spielen'}</span>
          </label>
        </div>
        <p className="ear-hint">{level.hint}</p>
      </Panel>

      <Panel className="ear-stage">
        <div className="ear-stage-head">
          <button
            type="button"
            className="button primary ear-play"
            onClick={question ? () => sound(question, spread) : ask}
          >
            <Icon name="play" size={18} />
            {question ? 'Nochmal hören' : 'Aufgabe starten'}
          </button>
          <div className="ear-score" role="status">
            <span>
              <b>{score.right}</b> / {score.total} richtig
            </span>
            <span>
              Serie <b>{score.streak}</b>
              {score.best > 0 && ` · beste ${score.best}`}
            </span>
            {score.total > 0 && (
              <button
                type="button"
                onClick={() => setScore({ right: 0, total: 0, streak: 0, best: 0 })}
              >
                Zurücksetzen
              </button>
            )}
          </div>
        </div>

        {!question ? (
          <p className="ear-idle">
            {kind === 'chords'
              ? 'Du hörst einen Akkord und benennst seinen Typ.'
              : 'Du hörst zwei Töne und benennst ihren Abstand.'}{' '}
            Drücke „Aufgabe starten“.
          </p>
        ) : (
          <>
            <div className="ear-answers" role="group" aria-label="Antwort wählen">
              {(level.answers as (number | string)[]).map((value) => {
                const id = String(value);
                const isAnswer = solved && id === question.answer;
                const isWrong = solved && id === picked && !correct;
                return (
                  <button
                    type="button"
                    key={id}
                    disabled={solved}
                    className={`ear-answer ${isAnswer ? 'is-right' : ''} ${isWrong ? 'is-wrong' : ''}`}
                    onClick={() => answer(id)}
                  >
                    <strong>{answerLabel(kind, id)}</strong>
                    <small>{answerSymbol(kind, id)}</small>
                  </button>
                );
              })}
            </div>

            <div
              className={`ear-verdict ${solved ? (correct ? 'is-right' : 'is-wrong') : ''}`}
              role="status"
            >
              {!solved ? (
                <p>Hör so oft du willst – erst deine Antwort beendet die Aufgabe.</p>
              ) : (
                <>
                  <strong>
                    {correct ? 'Richtig' : 'Daneben'} · {answerLabel(kind, question.answer)}
                  </strong>
                  <span>
                    {question.notes.map(germanNoteName).join(' – ')}
                    {kind === 'chords' &&
                      ` · ${germanNoteName(question.notes[0])}${answerSymbol(kind, question.answer)}`}
                  </span>
                  <button type="button" className="button primary" onClick={ask}>
                    Nächste Aufgabe
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </Panel>

      {question && solved && (
        <Panel className="ear-reveal" title="So sieht der Klang aus">
          <PianoKeyboard
            first={earRange.first}
            last={earRange.last}
            scaleNotes={question.notes}
            scalePitchClasses={pitches}
            rootPitch={pitchClass(question.notes[0])}
            selected={new Set(question.midis)}
            pressed={new Set(piano.held.values())}
            selecting={false}
            noteLabel={germanNoteName}
            onStart={piano.start}
            onEnd={piano.end}
            onToggle={() => {}}
            onTap={(midi) => piano.playChord([midi])}
          />
          <div className="ear-board">
            <span className="small-label">
              AUF {profile.name === 'Bass' ? 'DEM BASS' : 'DER GITARRE'} · GRUNDTON{' '}
              {germanNoteName(noteName(mod(question.root), true))} · BUND 0–12
            </span>
            <Fretboard
              key={`${question.root}-${question.answer}`}
              events={board}
              root={question.notes[0]}
              range={[0, 12]}
              labels="Notes"
              title={answerLabel(kind, question.answer)}
            />
          </div>
        </Panel>
      )}

      {piano.audioError && (
        <p className="tool-notice" role="alert">
          {piano.audioError}
        </p>
      )}
    </div>
  );
}
