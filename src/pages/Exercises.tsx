import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { exercises, exercisePath } from '../data/catalog';
import type { Exercise } from '../data/catalog';
import { useStore } from '../lib/store';
import { transposeRoute, routeRange, pretty, readableRoot, isNote } from '../lib/music';
import {
  PageHeading,
  Panel,
  ReferenceActions,
  Segmented,
  Icon,
  usePageTitle,
  Notice,
} from '../components/UI';
import { Fretboard } from '../components/Fretboard';
import { Score } from '../components/Score';
import { Playback } from '../components/Playback';
import { Timer } from '../components/Timer';
function exerciseRoot(exercise: Exercise, selectedRoot: string) {
  return readableRoot(selectedRoot, [
    ...new Set(exercise.events.filter(isNote).map((n) => n.degree ?? '1')),
  ]);
}
export function ExerciseLibrary() {
  const { category } = useParams();
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('All');
  usePageTitle(category ? `${category} exercises` : 'Exercise library');
  const result = exercises.filter(
    (e) =>
      (!category || e.category === category) &&
      (filter === 'All' || e.tags.includes(filter)) &&
      `${e.id} ${e.title} ${e.globalNumber}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="07 / PRACTICE LIBRARY"
        title={
          category
            ? `${category === 'physical' ? 'Physical' : 'Musical'} exercises`
            : 'Forty focused exercises'
        }
        description="Independent five-minute blocks. Control the start, duration, and release of every note."
      />
      <div className="exercise-filters">
        <div className="route-tabs">
          <Link className={!category ? 'active' : ''} to="/exercises">
            All exercises <span>40</span>
          </Link>
          <Link className={category === 'physical' ? 'active' : ''} to="/exercises/physical">
            Physical <span>20</span>
          </Link>
          <Link className={category === 'musical' ? 'active' : ''} to="/exercises/musical">
            Musical <span>20</span>
          </Link>
        </div>
        <div className="field-row">
          <label className="filter-search">
            <Icon name="search" />
            <input
              aria-label="Search exercises"
              placeholder="Find an exercise…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Exercise focus"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              'All',
              'Technique',
              'Fretboard',
              'Scale',
              'Arpeggio',
              'Chord tones',
              'Rhythm',
              'Muting',
              'Shifting',
              'Improvisation',
              'Latin / Salsa',
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="exercise-grid">
        {result.map((e) => (
          <Link to={exercisePath(e)} className="exercise-card" key={e.id}>
            <div className="exercise-card-meta">
              <span className="exercise-id">{e.id}</span>
              <span>{e.category} · 05:00</span>
              <Icon name="arrow" size={16} />
            </div>
            <h2>{e.title}</h2>
            <p>{e.target}</p>
            <div className="exercise-card-footer">
              <span>
                {e.startBpm} → {e.targetBpm} BPM
              </span>
              <span>
                {e.tags
                  .filter((t) => t !== 'Technique' && t !== 'Musical')
                  .slice(0, 2)
                  .join(' · ')}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!result.length && (
        <Notice>No exercises match these filters. Try another focus or a shorter search.</Notice>
      )}
      <Notice>
        <strong>The five-minute method:</strong> read for 30 seconds, loop for four minutes, then
        spend 30 seconds recording a clean tempo and one problem. Add 4 BPM after three clean
        repetitions; reduce by 6–8 when timing or muting breaks down.
      </Notice>
    </>
  );
}
export function ExercisePage() {
  const { category, number } = useParams();
  const exercise = exercises.find((e) => e.category === category && e.number === Number(number));
  usePageTitle(exercise ? `${exercise.id} · ${exercise.title}` : 'Exercise not found');
  if (!exercise)
    return (
      <PageHeading
        eyebrow="EXERCISES"
        title="Exercise not found"
        actions={<Link to="/exercises">Browse exercises</Link>}
      />
    );
  return <ExerciseDetail key={exercise.id} exercise={exercise} />;
}
export function ExercisePattern({ exercise }: { exercise: Exercise }) {
  const { root: selectedRoot } = useStore();
  const root = exerciseRoot(exercise, selectedRoot);
  const [labels, setLabels] = useState('Notes');
  const events = useMemo(
    () => transposeRoute(exercise.events, root, exercise.baseRoot),
    [exercise, root],
  );
  return (
    <>
      <Panel
        title="Fretboard"
        aside={
          <Segmented
            label="Exercise fretboard labels"
            value={labels}
            onChange={setLabels}
            options={['Notes', 'Degrees']}
          />
        }
      >
        <Fretboard
          key={exercise.id + root}
          root={root}
          events={events}
          range={routeRange(events)}
          labels={labels as 'Notes' | 'Degrees'}
          title={`${exercise.id} ${exercise.title}`}
          route
        />
      </Panel>
      <Score events={events} meter />
      <div className="reference-play-row">
        <Playback events={events} />
        <span className="small-label">
          {exercise.rhythm} · ROOT {pretty(root)}
        </span>
      </div>
    </>
  );
}
export function ExerciseInstructions({ exercise }: { exercise: Exercise }) {
  const { root: selectedRoot } = useStore();
  const root = exerciseRoot(exercise, selectedRoot);
  return (
    <>
      <Panel title="The five-minute task">
        <div className="exercise-instructions">
          <div>
            <span className="eyebrow">PURPOSE / TARGET</span>
            <p>{exercise.target}</p>
          </div>
          <div>
            <span className="eyebrow">PLAY · BOOK EXAMPLE IN {exercise.baseRoot}</span>
            <p>{exercise.instructions}</p>
          </div>
          {root !== exercise.baseRoot && (
            <p className="transposition-note">
              The diagrams are transposed from the book’s {pretty(exercise.baseRoot)} reference to{' '}
              {pretty(root)}. Apply the same movement and rhythm; note and fret names in the
              instructions describe the original example.
            </p>
          )}
          <div>
            <span className="eyebrow">PROGRESSION</span>
            <p>{exercise.progression}</p>
          </div>
        </div>
      </Panel>
      {exercise.editorialNote && <Notice>{exercise.editorialNote}</Notice>}
    </>
  );
}
function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  const { root: selectedRoot, bpm, setBpm, comfortable, setComfortable, addLog } = useStore();
  const root = exerciseRoot(exercise, selectedRoot);
  const [finished, setFinished] = useState(false),
    [saved, setSaved] = useState(false),
    [notes, setNotes] = useState('');
  const index = exercises.indexOf(exercise);
  const next = exercises[(index + 1) % exercises.length];
  const previous = exercises[(index + exercises.length - 1) % exercises.length];
  return (
    <>
      <PageHeading
        eyebrow={`07 / ${exercise.category.toUpperCase()} / EXERCISE ${exercise.globalNumber}`}
        title={`${exercise.id} · ${exercise.title.replace(new RegExp(`\\b${exercise.baseRoot}\\b`, 'g'), pretty(root))}`}
        description={`${exercise.category === 'physical' ? 'Physical control' : 'Musical vocabulary'} · Five minutes · ${exercise.rhythm}`}
        actions={<ReferenceActions title={`${exercise.id} · ${exercise.title}`} />}
      />
      <div className="exercise-layout">
        <div className="exercise-main">
          <ExerciseInstructions exercise={exercise} />
          <ExercisePattern exercise={exercise} />
        </div>
        <aside className="practice-rail">
          <Timer onComplete={() => setFinished(true)} />
          <Panel title="Tempo & control">
            <div className="tempo-panel">
              <div>
                <span>Starting BPM</span>
                <strong>{exercise.startBpm}</strong>
              </div>
              <div>
                <span>Target BPM</span>
                <strong>{exercise.targetBpm}</strong>
              </div>
              <button onClick={() => setBpm(exercise.startBpm)}>
                Set metronome to {exercise.startBpm}
              </button>
              <label>
                My comfortable BPM
                <input
                  aria-label="Comfortable BPM"
                  type="number"
                  min="30"
                  max="240"
                  value={comfortable[exercise.id] ?? ''}
                  placeholder={String(bpm)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (n >= 30 && n <= 240) setComfortable(exercise.id, n);
                  }}
                />
              </label>
              <button onClick={() => setComfortable(exercise.id, bpm)}>
                Save current tempo · {bpm}
              </button>
              <small>Stored on this device.</small>
            </div>
          </Panel>
          <Panel title="Practice note">
            <div className="practice-note">
              <textarea
                aria-label="Practice note"
                placeholder="One thing to remember next time…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                disabled={!finished || saved}
                onClick={() => {
                  addLog({
                    title: `${exercise.id} · ${exercise.title}`,
                    minutes: 5,
                    completed: [exercise.id],
                    notes,
                  });
                  setSaved(true);
                }}
              >
                {saved
                  ? 'Session saved'
                  : finished
                    ? 'Save completed block'
                    : 'Complete timer to log block'}
              </button>
            </div>
          </Panel>
        </aside>
      </div>
      <div className="page-pagination">
        <Link to={exercisePath(previous)}>
          <span>← PREVIOUS</span>
          {previous.id} · {previous.title}
        </Link>
        <Link to={exercisePath(next)}>
          <span>NEXT →</span>
          {next.id} · {next.title}
        </Link>
      </div>
    </>
  );
}
