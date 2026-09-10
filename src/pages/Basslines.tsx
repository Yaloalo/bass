import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { basslineLayers, latinRows } from '../data/theory';
import { exercises } from '../data/catalog';
import { pretty, routeRange, spellDegree } from '../lib/music';
import { buildBassline, layerNames } from '../lib/bassline';
import { PageHeading, Panel, ReferenceTable, Notice, Icon, usePageTitle } from '../components/UI';
import { Fretboard } from '../components/Fretboard';
import { Score } from '../components/Score';
import { Playback } from '../components/Playback';
import { ExercisePattern } from './Exercises';
export function Basslines() {
  usePageTitle('Bassline construction');
  const { root } = useStore();
  const progressionRoots = ['1', '6', '4', '5'].map((degree) => spellDegree(root, degree));
  const progressionFormulas = [
    ['1', '3', '5'],
    ['1', 'b3', '5'],
    ['1', '3', '5'],
    ['1', '3', '5', 'b7'],
  ];
  return (
    <>
      <PageHeading
        eyebrow="05 / BASSLINE CONSTRUCTION"
        title="Build the line in layers"
        description="Rhythm first, roots second, chord tones third, approaches last. Give every added note a purpose."
      />
      <div className="construction-flow">
        {basslineLayers.map(([title], i) => (
          <a href={'#' + title.toLowerCase().replaceAll(' ', '-')} key={title}>
            <span>0{i + 1}</span>
            {title}
            {i < 5 && <Icon name="arrow" size={14} />}
          </a>
        ))}
      </div>
      <BasslineBuilder />
      <div className="two-col">
        {basslineLayers.map(([title, text]) => (
          <Panel title={title} id={title.toLowerCase().replaceAll(' ', '-')} key={title}>
            <p>{text}</p>
            {title === 'Voice leading' && (
              <p>
                In Dm7 → G7 → Cmaj7, F is common to the first two chords, then resolves down to E. B
                in G7 can resolve up to C. Follow the nearest useful target.
              </p>
            )}
            {title === 'Approach notes' && (
              <p>
                For a C target: B → C approaches from below, D♭ → C from above. D → B → C is a
                two-sided enclosure.
              </p>
            )}
          </Panel>
        ))}
      </div>
      <div className="two-col">
        <Panel title={`The book’s first progression · ${pretty(root)} major`}>
          <ReferenceTable
            headers={progressionRoots.map((note, i) => pretty(note + ['', 'm', '', '7'][i]))}
            rows={[
              progressionRoots.map((note, i) =>
                progressionFormulas[i].map((d) => pretty(spellDegree(note, d))).join(' · '),
              ),
              progressionRoots.map((note, i) =>
                ['1', '5', i === 1 ? 'b3' : i === 3 ? 'b7' : '3', '5']
                  .map((d) => pretty(spellDegree(note, d)))
                  .join(' · '),
              ),
            ]}
          />
          <p>
            Keep a repeated quarter-note rhythm. Add a short approach only when the next destination
            is clear.
          </p>
        </Panel>
        <Panel title="Space is part of the line">
          <p>
            Choose where to stop a note as carefully as where to start it. A rest, a short note, or
            a sustain can change the groove without changing any pitches.
          </p>
          <Link className="text-link" to="/basslines/latin">
            Salsa / Latin application <Icon name="arrow" />
          </Link>
        </Panel>
      </div>
    </>
  );
}
function BasslineBuilder() {
  const { root } = useStore();
  const [layers, setLayers] = useState<string[]>(['Root', 'Fifth', 'Third']),
    [bar, setBar] = useState(0);
  const line = useMemo(() => buildBassline(root, layers), [root, layers]);
  const current = line[bar];
  const all = useMemo(() => line.flatMap((b) => b.events), [line]);
  return (
    <Panel title="Bassline builder" aside={<span className="small-label">ii–V–I · FOUR BARS</span>}>
      <div className="builder-body">
        <div className="builder-chords" role="group" aria-label="Select progression bar">
          {line.map((b, i) => (
            <button
              className={i === bar ? 'active' : ''}
              aria-pressed={i === bar}
              onClick={() => setBar(i)}
              key={i}
            >
              <small>BAR {i + 1}</small>
              <strong>{pretty(b.symbol)}</strong>
              <span>{['ii7', 'V7', 'Imaj7', 'Imaj7'][i]}</span>
            </button>
          ))}
        </div>
        <div className="layer-toggles">
          {layerNames.map((layer) => (
            <label key={layer}>
              <input
                type="checkbox"
                checked={layers.includes(layer)}
                onChange={() =>
                  setLayers((old) =>
                    old.includes(layer) ? old.filter((x) => x !== layer) : [...old, layer],
                  )
                }
              />
              {layer}
            </label>
          ))}
        </div>
        <div className="available-notes">
          <span className="eyebrow">AVAILABLE IN BAR {bar + 1}</span>
          {current.available.map((note, i) => (
            <span
              key={i}
              className={`available-note ${note.role === 'Chord tone' ? 'chord-note' : 'passing-note'}`}
            >
              <strong>{pretty(note.name)}</strong>
              <small>
                {note.role === 'Chord tone'
                  ? `Chord tone · ${pretty(note.degree)}`
                  : pretty(note.role)}
              </small>
            </span>
          ))}
        </div>
        <Notice>
          The first note establishes the selected stable tone. Fifths and thirds fill the cell; a
          passing tone can connect beat 3, and a chromatic approach on beat 4 leads to the next
          bar’s root. These are quarter-note teaching examples.
        </Notice>
        {current.events.length ? (
          <>
            <Fretboard
              events={current.events}
              range={routeRange(current.events)}
              root={current.root}
              labels="Notes"
              title={`Bar ${bar + 1} ${current.symbol}`}
              route
            />
            <Score events={current.events} meter />
            <div className="reference-play-row">
              <Playback events={all} />
              <span className="small-label">PLAY ALL FOUR BARS · VIEWING BAR {bar + 1}</span>
            </div>
          </>
        ) : (
          <Notice>
            Enable at least one chord-tone layer to give the line a stable starting point.
          </Notice>
        )}
      </div>
    </Panel>
  );
}
export function Latin({ improvisation = false }: { improvisation?: boolean }) {
  usePageTitle(improvisation ? 'Salsa / Latin improvisation' : 'Salsa / Latin basslines');
  const example = exercises.find((e) => e.id === 'M19')!;
  return (
    <>
      <PageHeading
        eyebrow={improvisation ? '06 / IMPROVISATION / LATIN' : '05 / BASSLINES / LATIN'}
        title="Salsa / Latin: the groove first"
        description="Keep the repeating cell, hear the percussion, and know where the next chord is going."
      />
      <Notice>
        <strong>From the book:</strong> chord-tone construction stays the same; rhythmic placement
        and interaction with percussion shape the line. These are starting points for study, not
        rules for every Latin style or arrangement.
      </Notice>
      <Panel title="A practical reference">
        <ReferenceTable headers={['Focus', 'Application']} rows={latinRows} />
      </Panel>
      <Panel title="The sparse two-hit cell">
        <p>
          The source’s M19 places the fifth on 2-and and the current chord’s root on beat 4, over
          Dm7 then G7. It deliberately leaves beats 1 and 3 empty. An actual anticipation uses a
          tone of the incoming chord and may sustain over the change.
        </p>
        <div className="rhythm-grid">
          {['1', '&', '2', '&', '3', '&', '4', '&'].map((beat, i) => (
            <div className={[3, 6].includes(i) ? 'hit' : ''} key={i}>
              <span>{beat}</span>
              <strong>{i === 3 ? '5' : i === 6 ? '1' : '·'}</strong>
              <small>{i === 3 ? 'fifth' : i === 6 ? 'root' : 'rest'}</small>
            </div>
          ))}
        </div>
      </Panel>
      <ExercisePattern exercise={example} />
      <div className="two-col">
        <Panel title="Listen before varying">
          <p>
            Listen for how the bass, conga, timbales, piano and vocals share space. Repeat a strong
            cell. Change one ending or approach while keeping the rhythmic identity clear.
          </p>
          <Link className="text-link" to="/exercises/musical/20">
            M20 · Latin ii–V–I–VI turnaround →
          </Link>
        </Panel>
        <Panel title="Thirty-minute application">
          <p>
            Clean string crossings, muted skips, dominant and minor-seven chord tones, then two
            Latin study cells.
          </p>
          <Link className="text-link" to="/programs/salsa-latin">
            Start the Salsa / Latin program →
          </Link>
        </Panel>
      </div>
    </>
  );
}
