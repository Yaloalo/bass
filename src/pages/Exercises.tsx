import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { exerciseCategories, exercises, exercisePath } from '../data/catalog';
import type { Exercise } from '../data/catalog';
import { useStore } from '../lib/store';
import { useExerciseGroove, usePracticeSetup } from '../lib/use-practice-setup';
import { transposeRoute, routeRange, isNote } from '../lib/music';
import { germanNoteName, textDe } from '../lib/i18n';
import { exerciseRoot, practiceExerciseTitle } from '../lib/practice';
import {
  PageHeading,
  Panel,
  Section,
  Segmented,
  Icon,
  Konzept,
  usePageTitle,
  Notice,
} from '../components/UI';
import { Fretboard } from '../components/Fretboard';
import { PianoPreview } from '../components/PianoPreview';
import { Score } from '../components/Score';
import { Playback } from '../components/Playback';
import { Accompaniment } from '../components/Accompaniment';
import type { AccompanimentMode } from '../components/Accompaniment';
import { Timer } from '../components/Timer';
export function ExerciseLibrary() {
  const { category } = useParams();
  const { root: selectedRoot } = useStore();
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('All');
  const heading = (id?: string) =>
    exerciseCategories.find((item) => item.id === id)?.label ?? 'Übungsbibliothek';
  usePageTitle(category ? `${heading(category)}-Übungen` : 'Übungsbibliothek');
  const result = exercises.filter(
    (e) =>
      (!category || e.category === category) &&
      (filter === 'All' || e.tags.includes(filter)) &&
      `${e.id} ${e.title} ${e.globalNumber}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="BASS / ÜBUNGSBIBLIOTHEK"
        title={category ? `${heading(category)}-Übungen` : `${exercises.length} gezielte Übungen`}
        description="Eigenständige Fünf-Minuten-Blöcke. Fang bei den Grundlagen an, wenn du neu bist."
      />
      <div className="exercise-filters">
        <div className="route-tabs">
          <Link className={!category ? 'active' : ''} to="/exercises">
            Alle Übungen <span>{exercises.length}</span>
          </Link>
          {exerciseCategories.map((item) => (
            <Link
              key={item.id}
              className={category === item.id ? 'active' : ''}
              to={`/exercises/${item.id}`}
            >
              {item.label} <span>{exercises.filter((e) => e.category === item.id).length}</span>
            </Link>
          ))}
        </div>
        <div className="field-row">
          <label className="filter-search">
            <Icon name="search" />
            <input
              aria-label="Übungen suchen"
              placeholder="Übung suchen …"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Übungsschwerpunkt"
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
              <option key={x} value={x}>
                {x === 'All' ? 'Alle' : textDe(x)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="exercise-grid">
        {result.map((e) => (
          <Link to={exercisePath(e)} className="exercise-card" key={e.id}>
            <div className="exercise-card-meta">
              <span className="exercise-id">{e.id}</span>
              <span>{heading(e.category)} · 05:00</span>
              <Icon name="arrow" size={16} />
            </div>
            <h2>{practiceExerciseTitle(e, selectedRoot)}</h2>
            <p>{e.target}</p>
            <div className="exercise-card-footer">
              <span>
                {e.startBpm} → {e.targetBpm} BPM
              </span>
              <span>
                {e.tags
                  .filter((t) => t !== 'Technique' && t !== 'Musical')
                  .slice(0, 2)
                  .map(textDe)
                  .join(' · ')}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!result.length && (
        <Notice>
          Keine passenden Übungen. Wähle einen anderen Schwerpunkt oder einen kürzeren Suchbegriff.
        </Notice>
      )}
      <p className="library-method">
        Jede Übung dauert fünf Minuten: lesen, wiederholen, Tempo notieren.
      </p>
    </>
  );
}
export function ExercisePage() {
  const { category, number } = useParams();
  const exercise = exercises.find((e) => e.category === category && e.number === Number(number));
  usePageTitle(exercise ? `${exercise.id} · ${exercise.title}` : 'Übung nicht gefunden');
  if (!exercise)
    return (
      <PageHeading
        eyebrow="EXERCISES"
        title="Übung nicht gefunden"
        actions={<Link to="/exercises">Übungen ansehen</Link>}
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
  const noteNames = useMemo(
    () => [...new Set(events.filter(isNote).map((note) => note.name ?? ''))].filter(Boolean),
    [events],
  );
  return (
    <>
      <Section title="Griffbrett" defaultOpen={false}>
        <div className="panel-tools">
          <Segmented
            label="Griffbrettbeschriftung der Übung"
            value={labels}
            onChange={setLabels}
            options={['Notes', 'Degrees']}
          />
        </div>
        <Fretboard
          key={exercise.id + root}
          root={root}
          events={events}
          range={routeRange(events)}
          labels={labels as 'Notes' | 'Degrees'}
          title={`${exercise.id} ${exercise.title}`}
          route
        />
      </Section>
      <Score events={events} meter defaultOpen={false} />
      <p className="pattern-caption">
        <span className="small-label">
          {exercise.rhythm} · GRUNDTON {germanNoteName(root)}
        </span>
      </p>
      <PianoPreview
        defaultOpen={false}
        scaleNotes={noteNames}
        highlighted={noteNames}
        caption={`Dieselben Töne auf der Klaviatur: ${noteNames.map(germanNoteName).join(' · ')}.`}
        to="/piano"
        linkLabel="Im Piano öffnen"
      />
    </>
  );
}
/**
 * What you need in order to start, and nothing else. Everything that explains *why* —
 * the long instruction, the progression, the editorial notes and the usual mistakes —
 * waits behind one disclosure, so the page is a task rather than a reading exercise.
 */
export function ExerciseInstructions({ exercise }: { exercise: Exercise }) {
  const { root: selectedRoot } = useStore();
  const root = exerciseRoot(exercise, selectedRoot);
  return (
    <Panel className="exercise-task">
      <div className="exercise-facts">
        <span>
          <b>{exercise.startBpm}</b> BPM Start
        </span>
        <span>
          <b>{exercise.targetBpm}</b> BPM Ziel
        </span>
        <span>{exercise.rhythm}</span>
        <span>Grundton {germanNoteName(root)}</span>
      </div>
      <Konzept title="Genauer erklärt und häufige Fehler">
        <p>{exercise.target}</p>
        <p>{exercise.instructions}</p>
        <p>
          <b>Steigerung:</b> {exercise.progression}
        </p>
        {root !== exercise.baseRoot && (
          <p>
            Die Diagramme sind von {germanNoteName(exercise.baseRoot)} nach {germanNoteName(root)}{' '}
            transponiert. Bewegung und Rhythmus bleiben gleich; Ton- und Bundangaben im Text
            beschreiben das ursprüngliche Beispiel.
          </p>
        )}
        {exercise.editorialNote && <p>{exercise.editorialNote}</p>}
        <p>
          <b>Häufige Fehler:</b> zu schnell anfangen, statt sauber zu bleiben; Töne früher
          abdämpfen, als der Rhythmus es verlangt; mit dem Anschlag lauter werden, sobald die
          Greifhand mehr zu tun hat; den Klick mitschieben, statt ihn stehen zu lassen.
        </p>
      </Konzept>
    </Panel>
  );
}
/**
 * The exercise itself: accompaniment, the material, a timer and the tempo panel. The
 * exercise page and a programme block render exactly this, so the two never drift apart.
 */
export function ExerciseView({
  exercise,
  onComplete,
  autoStart = false,
  standaloneLink = false,
  backTo,
}: {
  exercise: Exercise;
  /** A programme marks its block done when this block's timer runs out. */
  onComplete?: () => void;
  autoStart?: boolean;
  /** Inside a programme, offers the exercise on its own page. */
  standaloneLink?: boolean;
  /** Where a detour should return to; the exercise's own page by default. */
  backTo?: string;
}) {
  const { setBpm } = useStore();
  const navigate = useNavigate();
  const groove = useExerciseGroove(exercise);
  const [accompaniment, setAccompaniment] = useState<AccompanimentMode>('off');
  const { root: selectedRoot } = useStore();
  const root = exerciseRoot(exercise, selectedRoot);
  const events = useMemo(
    () => transposeRoute(exercise.events, root, exercise.baseRoot),
    [exercise, root],
  );
  usePracticeSetup(exercise);
  return (
    <>
      {/* One bar across the top: how long, what you play against, and the example —
          everything you touch while practising, in one place. */}
      <section className="practice-bar" aria-label="Übe-Leiste">
        <Timer key={exercise.id} adjustable autoStart={autoStart} onComplete={onComplete} />
        <div className="practice-bar-play">
          <span className="eyebrow">Begleitung</span>
          <Accompaniment groove={groove} value={accompaniment} onChange={setAccompaniment} />
        </div>
        <div className="practice-bar-play">
          <span className="eyebrow">Beispiel</span>
          <Playback events={events} loopable label="Abspielen" />
        </div>
        <div className="practice-bar-tempo">
          <span className="eyebrow">Tempo</span>
          <strong>
            {exercise.startBpm} → {exercise.targetBpm}
          </strong>
          <div className="practice-bar-links">
            <button type="button" onClick={() => setBpm(exercise.startBpm)}>
              Zurücksetzen
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/drums?uebung=${exercise.id}` +
                    (backTo ? `&zurueck=${encodeURIComponent(backTo)}` : ''),
                )
              }
            >
              Groove bearbeiten
            </button>
            {standaloneLink && (
              <Link className="text-link" to={exercisePath(exercise)}>
                Übung einzeln öffnen
              </Link>
            )}
          </div>
        </div>
      </section>
      <ExerciseInstructions exercise={exercise} />
      <ExercisePattern exercise={exercise} />
    </>
  );
}

function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  const { root: selectedRoot } = useStore();
  const index = exercises.indexOf(exercise);
  const next = exercises[(index + 1) % exercises.length];
  const previous = exercises[(index + exercises.length - 1) % exercises.length];
  return (
    <>
      <PageHeading
        eyebrow={`BASS / ${
          exerciseCategories.find((item) => item.id === exercise.category)?.eyebrow ?? 'ÜBUNG'
        } / ÜBUNG ${exercise.id}`}
        title={`${exercise.id} · ${practiceExerciseTitle(exercise, selectedRoot)}`}
      />
      <ExerciseView exercise={exercise} />
      <div className="page-pagination">
        <Link to={exercisePath(previous)}>
          <span>← ZURÜCK</span>
          {previous.id} · {previous.title}
        </Link>
        <Link to={exercisePath(next)}>
          <span>WEITER →</span>
          {next.id} · {next.title}
        </Link>
      </div>
    </>
  );
}
