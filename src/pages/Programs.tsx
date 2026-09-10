import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { programs, exercises, exercisePath } from '../data/catalog';
import type { PracticeProgram } from '../data/catalog';
import { useLocal, useStore } from '../lib/store';
import { PageHeading, Panel, Icon, ReferenceActions, Notice, usePageTitle } from '../components/UI';
import { Timer } from '../components/Timer';
import { ExercisePattern, ExerciseInstructions } from './Exercises';
function balanced(): PracticeProgram {
  const themes = [
    {
      name: 'Major vocabulary',
      blocks: [['P1', 'P3', 'P15'], ['P5', 'P12', 'P16'], ['M1', 'M3'], ['M6'], ['M10'], ['M11']],
    },
    {
      name: 'Minor vocabulary',
      blocks: [
        ['P2', 'P4', 'P13'],
        ['P5', 'P8', 'P17'],
        ['M2', 'M4'],
        ['M7', 'M9'],
        ['M18'],
        ['song'],
      ],
    },
    {
      name: 'Latin chord tones',
      blocks: [['P5', 'P17'], ['P8', 'P12'], ['M8'], ['M9'], ['M19'], ['M20']],
    },
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  return {
    id: 'balanced',
    number: 0,
    name: `Balanced · ${theme.name}`,
    blocks: theme.blocks.map((pool, i) => ({
      exerciseId: pool[Math.floor(Math.random() * pool.length)],
      purpose: i < 2 ? 'Physical control' : i < 4 ? 'Musical vocabulary' : 'Apply it to a line',
    })),
  };
}
export function ProgramLibrary() {
  usePageTitle('Practice programs');
  const [, setBalanced] = useLocal<PracticeProgram | null>('balanced', null);
  return (
    <>
      <PageHeading
        eyebrow="08 / STRUCTURED PRACTICE"
        title="Thirty minutes, well spent"
        description="Ten programs from the book. Six five-minute blocks. Choose a focus and follow the sequence."
      />
      <Panel className="quick-practice">
        <div>
          <span className="eyebrow">QUICK PRACTICE</span>
          <h2>Let the session take shape.</h2>
          <p>
            10 minutes of physical control, 10 of musical vocabulary, 10 of application. A coherent
            major, minor, or Latin focus.
          </p>
        </div>
        <Link
          className="button primary"
          to="/programs/balanced"
          onClick={() => setBalanced(balanced())}
        >
          <Icon name="play" />
          Random balanced program
        </Link>
      </Panel>
      <div className="program-grid">
        {programs.map((p) => (
          <Link className="program-card" to={'/programs/' + p.id} key={p.id}>
            <div className="program-card-top">
              <span className="eyebrow">PROGRAM {String(p.number).padStart(2, '0')}</span>
              <span>
                <Icon name="clock" size={13} />
                30 MIN
              </span>
            </div>
            <h2>{p.name}</h2>
            <p>{p.blocks.map((b) => b.exerciseId).join('  /  ')}</p>
            <div className="program-block-preview">
              {p.blocks.map((b, i) => (
                <span
                  key={i}
                  title={b.purpose}
                  className={b.exerciseId.startsWith('P') ? 'physical' : 'musical'}
                />
              ))}
            </div>
            <div className="program-card-bottom">
              <span>6 × 5-minute blocks</span>
              <Icon name="arrow" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
export function ProgramPage() {
  const { id } = useParams();
  const [randomProgram] = useLocal<PracticeProgram | null>('balanced', null);
  const fallback = useMemo(() => balanced(), []);
  const p = id === 'balanced' ? (randomProgram ?? fallback) : programs.find((p) => p.id === id);
  usePageTitle(p?.name ?? 'Program not found');
  return p ? (
    <ProgramRunner key={p.id + p.name} program={p} />
  ) : (
    <PageHeading
      eyebrow="PROGRAMS"
      title="Program not found"
      actions={<Link to="/programs">Browse programs</Link>}
    />
  );
}
function ProgramRunner({ program }: { program: PracticeProgram }) {
  const [block, setBlock] = useState(0),
    [done, setDone] = useState<number[]>([]),
    [saved, setSaved] = useState(false),
    [loggedDone, setLoggedDone] = useState<number[]>([]),
    [notes, setNotes] = useState('');
  const { setBpm, addLog } = useStore();
  const exercise = exercises.find((e) => e.id === program.blocks[block].exerciseId);
  const next = program.blocks[block + 1];
  const nextExercise = next && exercises.find((e) => e.id === next.exerciseId);
  return (
    <>
      <PageHeading
        eyebrow={`08 / PROGRAM ${program.number || 'CUSTOM'} / 30 MINUTES`}
        title={program.name}
        description="Keep the order. Lower the tempo on a difficult day. Transpose the final musical blocks when ready."
        actions={<ReferenceActions title={program.name} />}
      />
      <div className="program-layout">
        <aside className="program-sequence">
          <Panel title="Your six blocks">
            <ol>
              {program.blocks.map((b, i) => {
                const e = exercises.find((e) => e.id === b.exerciseId);
                return (
                  <li
                    className={`${i === block ? 'current' : ''} ${done.includes(i) ? 'done' : ''}`}
                    key={i}
                  >
                    <button onClick={() => setBlock(i)}>
                      <span className="block-number">{done.includes(i) ? '✓' : i + 1}</span>
                      <span>
                        <small>
                          {i * 5}–{(i + 1) * 5} MIN ·{' '}
                          {b.exerciseId === 'song' ? 'APPLICATION' : b.exerciseId}
                        </small>
                        <strong>{e?.title ?? 'Song drill'}</strong>
                        <em>{b.purpose}</em>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="session-count">
              {done.length} of 6 blocks complete · {done.length * 5} minutes
            </div>
          </Panel>
          <Panel title="Session note">
            <div className="practice-note">
              <textarea
                aria-label="Program practice note"
                placeholder="One thing for next time…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                disabled={!done.length || saved}
                onClick={() => {
                  addLog({
                    title: program.name,
                    minutes: done.filter((i) => !loggedDone.includes(i)).length * 5,
                    completed: done
                      .filter((i) => !loggedDone.includes(i))
                      .map((i) => program.blocks[i].exerciseId),
                    notes,
                  });
                  setLoggedDone(done);
                  setSaved(true);
                }}
              >
                {saved
                  ? 'Session saved'
                  : `Save ${done.filter((i) => !loggedDone.includes(i)).length * 5} practiced minutes`}
              </button>
            </div>
          </Panel>
        </aside>
        <div className="program-current">
          <div className="program-current-header">
            <div>
              <span className="eyebrow">BLOCK {block + 1} OF 6</span>
              <h2>{exercise ? `${exercise.id} · ${exercise.title}` : 'Song drill'}</h2>
              <p>{program.blocks[block].purpose}</p>
            </div>
            {exercise && (
              <button onClick={() => setBpm(exercise.startBpm)}>Set {exercise.startBpm} BPM</button>
            )}
          </div>
          <div className="program-player">
            <Timer
              key={block}
              compact
              onComplete={() => {
                setDone((old) => (old.includes(block) ? old : [...old, block]));
                setSaved(false);
              }}
            />
            <div className="program-player-next">
              <span className="eyebrow">COMING NEXT</span>
              <h3>
                {next
                  ? nextExercise
                    ? `${next.exerciseId} · ${nextExercise.title}`
                    : 'Song drill'
                  : 'Session complete'}
              </h3>
              <p>
                {next
                  ? next.purpose
                  : 'Take a moment to record what felt clean and what needs attention.'}
              </p>
              <div className="timer-controls">
                <button disabled={block === 0} onClick={() => setBlock((n) => n - 1)}>
                  ← Previous
                </button>
                <button disabled={block === 5} onClick={() => setBlock((n) => n + 1)}>
                  Next <Icon name="arrow" />
                </button>
              </div>
              <small>Move on when you are ready. Skipping does not mark a block complete.</small>
            </div>
          </div>
          {done.includes(block) && (
            <Notice>✓ This block is complete. Use Next to continue when you’re ready.</Notice>
          )}
          {exercise ? (
            <>
              <ExerciseInstructions exercise={exercise} />
              <ExercisePattern exercise={exercise} />
              <Link className="text-link" to={exercisePath(exercise)}>
                Open the full exercise <Icon name="arrow" />
              </Link>
            </>
          ) : (
            <>
              <Notice>
                Choose one song. Locate the chord roots, begin with roots and fifths, then add
                thirds and one deliberate approach. Repeat a short motif and leave space.
              </Notice>
              <Panel title="Four-stage song drill">
                <ol className="instruction-list">
                  <li>Roots only: establish form and chord timing.</li>
                  <li>Add fifths while keeping the same rhythm.</li>
                  <li>Add thirds and sevenths; make chord quality audible.</li>
                  <li>Add passing tones between clear chord-tone targets.</li>
                </ol>
                <Link className="text-link" to="/improvisation/play">
                  Open the play-along reference <Icon name="arrow" />
                </Link>
              </Panel>
            </>
          )}
        </div>
      </div>
    </>
  );
}
