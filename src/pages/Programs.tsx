import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { programs, programGroove, programSections, exercises } from '../data/catalog';
import { drumPresets } from '../lib/drum-presets';
import type { PracticeProgram } from '../data/catalog';
import { useStore } from '../lib/store';
import { PageHeading, Panel, Icon, Notice, usePageTitle } from '../components/UI';
import { ExerciseView } from './Exercises';
import { practiceExerciseTitle } from '../lib/practice';
import { usePracticeSetup } from '../lib/use-practice-setup';
import '../practice.css';
import { instrumentProfile } from '../lib/instrument';
/** The drum preset a programme opens with, named for the card. */
const grooveName = (program: PracticeProgram) =>
  drumPresets.find((preset) => preset.id === programGroove(program))?.pattern.name;

export function ProgramLibrary() {
  const { instrument } = useStore();
  const profile = instrumentProfile(instrument);
  usePageTitle('Übeprogramme');
  return (
    <>
      <PageHeading
        eyebrow={`${profile.nameUpper} / STRUKTURIERT ÜBEN`}
        title="Dreißig Minuten sinnvoll üben"
        description="Dreißig Programme in drei Bereichen. Jedes besteht aus sechs Fünf-Minuten-Blöcken und ist von leicht nach schwer einsortiert – fang oben an."
      />
      {programSections.map((section) => (
        <section className="program-section" key={section.id}>
          <div className="program-section-head">
            <h2>{section.name}</h2>
            <p>{section.description}</p>
            <span className="small-label">
              {programs.filter((item) => item.section === section.id).length} PROGRAMME
            </span>
          </div>
          <div className="program-grid">
            {programs
              .filter((item) => item.section === section.id)
              .map((item, index) => (
                <Link className="program-card" to={'/programs/' + item.id} key={item.id}>
                  <div className="program-card-top">
                    <span className="eyebrow">{String(index + 1).padStart(2, '0')}</span>
                    <span>
                      <Icon name="clock" size={13} />
                      30 MIN
                    </span>
                  </div>
                  <h3>{item.name}</h3>
                  <div className="program-card-bottom">
                    <span>
                      {item.blocks.map((block) => block.exerciseId).join(' · ')}
                      {grooveName(item) && <em> · {grooveName(item)}</em>}
                    </span>
                    <Icon name="arrow" />
                  </div>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
export function ProgramPage() {
  const { id } = useParams();
  const p = programs.find((item) => item.id === id);
  usePageTitle(p?.name ?? 'Programm nicht gefunden');
  return p ? (
    <ProgramRunner key={p.id + p.name} program={p} />
  ) : (
    <PageHeading
      eyebrow="PROGRAMS"
      title="Programm nicht gefunden"
      actions={<Link to="/programs">Programme ansehen</Link>}
    />
  );
}
export function ProgramRunner({
  program,
  showHeading = true,
  autoStart = false,
  onChangeSession,
}: {
  program: PracticeProgram;
  showHeading?: boolean;
  autoStart?: boolean;
  onChangeSession?: () => void;
}) {
  // `?block=` lets a return trip — from editing an exercise's groove, say — land on the
  // block you left rather than at the start of the session.
  const requested = Number(new URLSearchParams(useLocation().search).get('block'));
  const [block, setBlock] = useState(
      Number.isInteger(requested) && requested > 0 && requested < program.blocks.length
        ? requested
        : 0,
    ),
    [done, setDone] = useState<number[]>([]),
    [startFirstBlock, setStartFirstBlock] = useState(autoStart);
  const { root, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const blockCount = program.blocks.length;
  const changeBlock = (index: number) => {
    // Only the initial session launch starts a timer automatically.
    setStartFirstBlock(false);
    setBlock(index);
  };
  const exercise = exercises.find((e) => e.id === program.blocks[block].exerciseId);
  usePracticeSetup(exercise);
  const next = program.blocks[block + 1];
  const nextExercise = next && exercises.find((e) => e.id === next.exerciseId);
  return (
    <>
      {showHeading && (
        <PageHeading
          eyebrow={`${profile.nameUpper} / ${blockCount * 5} MINUTEN`}
          title={program.name}
          actions={
            <Link className="text-link" to="/programs">
              ← Anderes Programm
            </Link>
          }
        />
      )}
      <div className="program-layout session-runner">
        <aside className="program-sequence">
          <Panel title={`Deine ${blockCount} Blöcke`}>
            <ol>
              {program.blocks.map((b, i) => {
                const e = exercises.find((e) => e.id === b.exerciseId);
                return (
                  <li
                    className={`${i === block ? 'current' : ''} ${done.includes(i) ? 'done' : ''}`}
                    key={i}
                  >
                    <button
                      aria-current={i === block ? 'step' : undefined}
                      onClick={() => changeBlock(i)}
                    >
                      <span className="block-number">{done.includes(i) ? '✓' : i + 1}</span>
                      <span>
                        <small>
                          {i * 5}–{(i + 1) * 5} MIN ·{' '}
                          {b.exerciseId === 'song' ? 'ANWENDUNG' : b.exerciseId}
                        </small>
                        <strong>{e ? practiceExerciseTitle(e, root) : 'Songübung'}</strong>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="session-count">
              {done.length} von {blockCount} Blöcken abgeschlossen · {done.length * 5} Minuten
            </div>
          </Panel>
        </aside>
        <div className="program-current">
          <div className="program-current-header">
            <div>
              <span className="eyebrow">
                BLOCK {block + 1} VON {blockCount}
              </span>
              <h2>
                {exercise
                  ? `${exercise.id} · ${practiceExerciseTitle(exercise, root)}`
                  : 'Songübung'}
              </h2>
            </div>
          </div>
          <div className="program-player">
            <div className="program-player-next">
              <span className="eyebrow">ALS NÄCHSTES</span>
              <h3>
                {next
                  ? nextExercise
                    ? `${next.exerciseId} · ${practiceExerciseTitle(nextExercise, root)}`
                    : 'Songübung'
                  : done.length === blockCount
                    ? 'Einheit abgeschlossen'
                    : 'Letzter Block'}
              </h3>
              {!next && (
                <p>
                  {done.length === blockCount
                    ? 'Dreißig Minuten sind geschafft.'
                    : 'Schließe diesen Block ab und geh weiter.'}
                </p>
              )}
              <div className="timer-controls">
                <button disabled={block === 0} onClick={() => changeBlock(block - 1)}>
                  ← Zurück
                </button>
                <button disabled={block === blockCount - 1} onClick={() => changeBlock(block + 1)}>
                  Weiter <Icon name="arrow" />
                </button>
                {onChangeSession && <button onClick={onChangeSession}>Andere Einheit</button>}
              </div>
              <small>
                Wechsle weiter, wenn du bereit bist. Übersprungene Blöcke zählen nicht als
                abgeschlossen.
              </small>
            </div>
          </div>
          {done.includes(block) && (
            <Notice>
              <div className="session-completion">
                <span>
                  {done.length === blockCount
                    ? '✓ Alle Blöcke sind abgeschlossen. Dreißig Minuten geübt.'
                    : next
                      ? '✓ Dieser Block ist abgeschlossen. Wähle „Weiter“, wenn du bereit bist.'
                      : '✓ Dieser Block ist abgeschlossen. Kehre zu den offenen Blöcken zurück.'}
                </span>
              </div>
            </Notice>
          )}
          {exercise ? (
            /* The same view as the exercise page, so a block and the full exercise are
               the same thing — only the surrounding chapter list differs. */
            <ExerciseView
              exercise={exercise}
              autoStart={startFirstBlock && block === 0}
              standaloneLink
              backTo={`/programs/${program.id}?block=${block}`}
              onComplete={() => setDone((old) => (old.includes(block) ? old : [...old, block]))}
            />
          ) : (
            <Panel title="Songübung">
              <p className="program-song">Wende den Ablauf auf ein Stück deiner Wahl an.</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
