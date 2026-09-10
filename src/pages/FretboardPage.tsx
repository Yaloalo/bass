import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { scales, arpeggios } from '../data/catalog';
import {
  allPositions,
  chromaticDegrees,
  transposeRoute,
  isNote,
  strings,
  tuning,
  mod,
  pitchClass,
  noteName,
  pretty,
  intervalNames,
  degreeSemitones,
  readableRoot,
} from '../lib/music';
import { Fretboard } from '../components/Fretboard';
import { PageHeading, Panel, Segmented, Notice, usePageTitle, Icon } from '../components/UI';
import { Score } from '../components/Score';
import { Playback } from '../components/Playback';
export function FretboardPage() {
  const { root: selectedRoot } = useStore();
  usePageTitle('Interactive fretboard');
  const [mode, setMode] = useState('Notes'),
    [rangeName, setRangeName] = useState('0–24'),
    [view, setView] = useState('All positions'),
    [scaleId, setScaleId] = useState('major'),
    [arpId, setArpId] = useState('major'),
    [noteFilter, setNoteFilter] = useState('All notes'),
    [selectedNote, setSelectedNote] = useState('C'),
    [labels, setLabels] = useState('Degrees'),
    [trainer, setTrainer] = useState(false);
  const ranges: Record<string, [number, number]> = {
    '0–12': [0, 12],
    '0–24': [0, 24],
    '5–12': [5, 12],
    '12–24': [12, 24],
  };
  const range = ranges[rangeName];
  const item =
    mode === 'Arpeggio'
      ? arpeggios.find((s) => s.id === arpId)!
      : scales.find((s) => s.id === scaleId)!;
  const root = readableRoot(
    selectedRoot,
    mode === 'Scale' || mode === 'Arpeggio' ? item.degreeLabels : chromaticDegrees,
  );
  const route = useMemo(() => transposeRoute(item.fingering, root), [item, root]);
  const events = useMemo(() => {
    if (mode === 'Scale' || mode === 'Arpeggio')
      return view === 'Fingering' ? route : allPositions(root, item.degreeLabels, ...range);
    let all = allPositions(root, chromaticDegrees, ...range);
    if (mode === 'Notes') {
      all = all.map((n) => ({
        ...n,
        name: noteName(tuning[n.string] + n.fret, root.includes('b')),
      }));
      if (noteFilter === 'Natural notes') all = all.filter((n) => !/[#b]/.test(n.name!));
      if (noteFilter === 'One note')
        all = all.filter((n) => mod(tuning[n.string] + n.fret) === pitchClass(selectedNote));
    }
    return all;
  }, [mode, view, route, root, item, rangeName, noteFilter, selectedNote]);
  const activeFingering = (mode === 'Scale' || mode === 'Arpeggio') && view === 'Fingering';
  const visibleRange: [number, number] = activeFingering
    ? [
        Math.max(0, Math.min(...route.filter(isNote).map((n) => n.fret)) - 1),
        Math.min(24, Math.max(...route.filter(isNote).map((n) => n.fret)) + 1),
      ]
    : range;
  return (
    <>
      <PageHeading
        eyebrow="01 / THE COMPLETE NECK"
        title="Interactive fretboard"
        description="Every note, interval, and position. Make the neck familiar."
        actions={
          <button className={trainer ? 'primary' : ''} onClick={() => setTrainer((v) => !v)}>
            <Icon name="grid" />
            {trainer ? 'Close study mode' : 'Study mode'}
          </button>
        }
      />
      <div className="fretboard-toolbar">
        <Segmented
          label="Fretboard mode"
          value={mode}
          onChange={setMode}
          options={['Notes', 'Intervals', 'Scale', 'Arpeggio']}
        />
        <div className="field-row">
          {mode === 'Scale' && (
            <label>
              Scale
              <select value={scaleId} onChange={(e) => setScaleId(e.target.value)}>
                {scales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'Arpeggio' && (
            <label>
              Arpeggio
              <select value={arpId} onChange={(e) => setArpId(e.target.value)}>
                {arpeggios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'Notes' ? (
            <>
              <label>
                Show
                <select value={noteFilter} onChange={(e) => setNoteFilter(e.target.value)}>
                  {['All notes', 'Natural notes', 'One note'].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              {noteFilter === 'One note' && (
                <label>
                  Note
                  <select value={selectedNote} onChange={(e) => setSelectedNote(e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => noteName(i)).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : (
            <Segmented
              label="Fretboard label type"
              value={labels}
              onChange={setLabels}
              options={['Degrees', 'Notes']}
            />
          )}
        </div>
      </div>
      <Panel
        title={
          trainer
            ? 'Fretboard study'
            : mode === 'Notes'
              ? 'The note map'
              : `${pretty(root)} ${mode === 'Intervals' ? 'intervals' : item.name}`
        }
        aside={
          <div className="field-row">
            {(mode === 'Scale' || mode === 'Arpeggio') && !trainer && (
              <Segmented
                label="Position display"
                value={view}
                onChange={setView}
                options={['All positions', 'Fingering']}
              />
            )}
            <select
              aria-label="Fret range"
              value={rangeName}
              onChange={(e) => setRangeName(e.target.value)}
              disabled={activeFingering && !trainer}
            >
              {Object.keys(ranges).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
        }
      >
        {trainer ? (
          <Trainer key={root + rangeName + scaleId} root={root} range={range} scaleId={scaleId} />
        ) : (
          <Fretboard
            key={root + mode + view}
            events={events}
            range={visibleRange}
            root={root}
            labels={mode === 'Notes' ? 'Notes' : (labels as 'Degrees' | 'Notes')}
            title={mode}
            route={activeFingering}
          />
        )}
      </Panel>
      {activeFingering && !trainer && (
        <>
          <Score events={route} />
          <div className="reference-play-row">
            <Playback events={route} scale />
          </div>
        </>
      )}
      <div className="three-col">
        <Panel title="Orient yourself">
          <p>
            G is the highest string and the top line. E is the lowest. Fret 0 is an open string;
            each fret adds one semitone.
          </p>
        </Panel>
        <Panel title="Find the octave">
          <p>
            Move two strings toward G and two frets higher. Or move twelve frets along the same
            string. The note name stays the same.
          </p>
        </Panel>
        <Panel title="All positions or a route?">
          <p>
            All positions maps the whole note collection. Fingering shows only the exact physical
            route used by the matching notation and TAB.
          </p>
        </Panel>
      </div>
      {mode === 'Intervals' && (
        <Notice>
          The tritone can be spelled ♯4 or ♭5, depending on its function. This chromatic map uses
          ♭5; scale pages use the formula’s exact degree spelling.
        </Notice>
      )}
    </>
  );
}
function Trainer({
  root,
  range,
  scaleId,
}: {
  root: string;
  range: [number, number];
  scaleId: string;
}) {
  const [kind, setKind] = useState('Find the note'),
    [stringConstraint, setStringConstraint] = useState('Any string'),
    [round, setRound] = useState(0),
    [feedback, setFeedback] = useState(''),
    [correct, setCorrect] = useState(false);
  const scale = scales.find((s) => s.id === scaleId)!;
  const question = useMemo(() => {
    const all = allPositions(
      root,
      kind === 'Find scale degree' ? scale.degreeLabels : chromaticDegrees,
      ...range,
    ).filter((n) => stringConstraint === 'Any string' || n.string === stringConstraint);
    const n =
      all[Math.floor(Math.random() * all.length)] ??
      allPositions(root, chromaticDegrees, ...range)[0];
    const pc = mod(tuning[n.string] + n.fret),
      interval = mod(pc - pitchClass(root));
    const answers = [pc, mod(pc + 1), mod(pc + 5), mod(pc + 9)].sort(() => Math.random() - 0.5);
    return { n, pc, interval, answers };
  }, [root, range[0], range[1], kind, round, stringConstraint, scale]);
  const next = () => {
    setRound((n) => n + 1);
    setFeedback('');
    setCorrect(false);
  };
  const answer = (pc: number, string?: string) => {
    const yes =
      pc === question.pc &&
      (kind === 'Identify the note' ||
        stringConstraint === 'Any string' ||
        string === stringConstraint);
    setCorrect(yes);
    setFeedback(
      yes
        ? `Correct · ${pretty(question.n.name ?? noteName(pc))}.`
        : 'Try again. Listen to the interval and check the string.',
    );
  };
  return (
    <div className="trainer">
      <div className="trainer-controls">
        <label>
          Study task
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setFeedback('');
              setCorrect(false);
            }}
          >
            {['Find the note', 'Find the interval', 'Find scale degree', 'Identify the note'].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </label>
        <label>
          String
          <select
            value={stringConstraint}
            onChange={(e) => {
              setStringConstraint(e.target.value);
              setFeedback('');
              setCorrect(false);
            }}
          >
            <option>Any string</option>
            {strings.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <span className="small-label">QUESTION {round + 1}</span>
      </div>
      <div className="trainer-prompt">
        <span className="eyebrow">
          {kind === 'Find scale degree' ? `${pretty(root)} ${scale.name}` : `ROOT ${pretty(root)}`}
        </span>
        <h2>
          {kind === 'Identify the note'
            ? 'What note is marked?'
            : kind === 'Find the interval'
              ? `Find the ${intervalNames[question.interval].toLowerCase()}.`
              : kind === 'Find scale degree'
                ? `Find degree ${pretty(question.n.degree!)}.`
                : `Find ${pretty(noteName(question.pc, root.includes('b')))}.`}
        </h2>
        {stringConstraint !== 'Any string' && <p>On the {stringConstraint} string.</p>}
      </div>
      <Fretboard
        events={[]}
        range={range}
        root={root}
        conceal
        marked={
          kind === 'Identify the note' ? `${question.n.string}:${question.n.fret}` : undefined
        }
        onPick={(n) => {
          if (kind !== 'Identify the note') answer(mod(tuning[n.string] + n.fret), n.string);
        }}
      />
      {kind === 'Identify the note' && (
        <div className="trainer-answers">
          {question.answers.map((pc) => (
            <button key={pc} onClick={() => answer(pc)}>
              {pretty(noteName(pc, root.includes('b')))}
            </button>
          ))}
        </div>
      )}
      <div className="trainer-feedback">
        <span role="status" className={correct ? 'correct' : ''}>
          {feedback || 'Choose a position on the fretboard.'}
        </span>
        <button onClick={next}>
          {correct ? 'Next question' : 'Skip question'}
          <Icon name="arrow" />
        </button>
      </div>
      <span className="sr-only">
        Interval size: {degreeSemitones(question.n.degree ?? '1')} semitones
      </span>
    </div>
  );
}
