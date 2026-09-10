import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { scales, arpeggios, scaleById } from '../data/catalog';
import {
  transposeRoute,
  routeRange,
  isNote,
  pretty,
  spellDegree,
  mod,
  degreeSemitones,
  readableRoot,
} from '../lib/music';
import { useStore } from '../lib/store';
import {
  PageHeading,
  Panel,
  ReferenceActions,
  Segmented,
  ItemLink,
  Icon,
  usePageTitle,
} from '../components/UI';
import { Fretboard } from '../components/Fretboard';
import { Score } from '../components/Score';
import { Playback } from '../components/Playback';
export function ReferenceIndex({ kind }: { kind: 'scales' | 'arpeggios' }) {
  const data = kind === 'scales' ? scales : arpeggios;
  usePageTitle(kind === 'scales' ? 'Scale atlas' : 'Arpeggio atlas');
  const { root } = useStore();
  return (
    <>
      <PageHeading
        eyebrow={kind === 'scales' ? '02 / SCALE ATLAS' : '03 / CHORD-TONE ATLAS'}
        title={kind === 'scales' ? 'Scales & modes' : 'Arpeggios'}
        description={
          kind === 'scales'
            ? 'One fingering. Three ways to see it. Choose a scale to begin.'
            : 'Hear the chord in the line. Roots, thirds, fifths, and sevenths.'
        }
      />
      <div className="catalog-groups">
        {[...new Set(data.map((x) => x.category))].map((group) => (
          <Panel
            key={group}
            title={group}
            aside={
              <span className="small-label">
                {data.filter((x) => x.category === group).length} REFERENCES
              </span>
            }
          >
            {data
              .filter((x) => x.category === group)
              .map((s) => (
                <ItemLink
                  key={s.id}
                  title={s.name}
                  description={s.degreeLabels.map(pretty).join('   ')}
                  to={`/${kind}/${s.id}`}
                  meta={<span className="muted">{pretty(root)}</span>}
                />
              ))}
          </Panel>
        ))}
      </div>
      <div className="notice">
        Start with a root and a formula. A scale is a note collection; an arpeggio identifies the
        chord itself.
      </div>
    </>
  );
}
export function ReferencePage({ kind }: { kind: 'scales' | 'arpeggios' }) {
  const { id = 'major' } = useParams();
  const { root: selectedRoot } = useStore();
  const scale = kind === 'scales' ? scaleById(id) : undefined;
  const item = kind === 'scales' ? scale : arpeggios.find((a) => a.id === id);
  const root = readableRoot(selectedRoot, item?.degreeLabels ?? ['1']);
  const [labels, setLabels] = useState('Degrees');
  const [comparison, setComparison] = useState('');
  const route = useMemo(() => (item ? transposeRoute(item.fingering, root) : []), [item, root]);
  usePageTitle(item?.name ?? 'Reference not found');
  if (!item)
    return (
      <PageHeading
        eyebrow="REFERENCE"
        title="Reference not found"
        actions={<Link to={'/' + kind}>Browse the atlas</Link>}
      />
    );
  const list = kind === 'scales' ? scales : arpeggios;
  const index = list.findIndex((i) => i.id === item.id);
  const next = list[(index + 1) % list.length];
  const previous = list[(index + list.length - 1) % list.length];
  const other = scaleById(comparison);
  const parent = scale?.parentMode
    ? spellDegree(root, ['1', 'b7', 'b6', '5', '4', 'b3', 'b2'][scale.parentMode - 1])
    : undefined;
  const degrees = route.filter(isNote).map((n) => n.degree ?? '1');
  return (
    <>
      <PageHeading
        eyebrow={
          kind === 'scales'
            ? `02 / SCALE ATLAS / ${scale?.category.toUpperCase()}`
            : '03 / ARPEGGIOS'
        }
        title={`${pretty(root)} ${item.name}`}
        description={
          item.description +
          (root !== selectedRoot
            ? ` · ${pretty(selectedRoot)} = ${pretty(root)}; using the simpler key spelling.`
            : '')
        }
        actions={<ReferenceActions title={item.name} />}
      />
      <div className="formula-strip">
        <div>
          <span className="eyebrow">FORMULA</span>
          <div className="degree-row">
            {item.degreeLabels.map((d, i) => (
              <span
                key={i}
                className={`${d === '1' ? 'root' : scale?.characteristic.includes(d) ? 'characteristic' : ''}`}
              >
                {pretty(d)}
              </span>
            ))}
          </div>
        </div>
        {scale && (
          <div>
            <span className="eyebrow">STEP PATTERN</span>
            <strong className="steps">{scale.stepPattern.join(' · ')}</strong>
          </div>
        )}
        <div className="notes-formula">
          <span className="eyebrow">NOTES</span>
          <strong>{degrees.map((d) => pretty(spellDegree(root, d))).join('  ·  ')}</strong>
        </div>
      </div>
      <Panel
        className="fretboard-panel"
        title="Fretboard"
        aside={
          <div className="panel-tools">
            <span className="small-label">ONE OCTAVE · ASCENDING</span>
            <Segmented
              label="Fretboard labels"
              options={['Degrees', 'Notes']}
              value={labels}
              onChange={setLabels}
            />
          </div>
        }
      >
        <Fretboard
          key={`${item.id}-${root}`}
          events={route}
          root={root}
          range={routeRange(route)}
          labels={labels as 'Degrees' | 'Notes'}
          title={`${root} ${item.name}`}
          route
        />
      </Panel>
      <Score events={route} />
      <div className="reference-play-row">
        <Playback events={route} scale label={kind === 'arpeggios' ? 'Play arpeggio' : undefined} />
        <span className="small-label">{item.fingering.length} NOTES · ONE SHARED FINGERING</span>
      </div>
      <div className="two-col">
        <Panel title="At a glance">
          <dl className="reference-details">
            <dt>Harmonic use</dt>
            <dd>{scale?.applications ?? item.description}</dd>
            <dt>Characteristic</dt>
            <dd>{scale?.signature ?? item.degreeLabels.map(pretty).join(' · ')}</dd>
            <dt>Chord tones</dt>
            <dd>
              {item.degreeLabels
                .filter((d) => ['1', 'b3', '3', 'b5', '5', '#5', 'b7', '7', 'bb7'].includes(d))
                .map(pretty)
                .join(' · ')}
            </dd>
            {parent && (
              <>
                <dt>Parent scale</dt>
                <dd>
                  {pretty(parent)} major · mode {scale?.parentMode}
                </dd>
              </>
            )}
            {scale?.id === 'melodic-minor' && (
              <>
                <dt>Descending form</dt>
                <dd>
                  This page uses ascending/jazz melodic minor in both directions. Classical descent
                  often uses natural minor.
                </dd>
              </>
            )}
          </dl>
        </Panel>
        <Panel title={scale ? 'Compare scales' : 'Practice connection'}>
          {scale ? (
            <>
              <div className="comparison-control">
                <label htmlFor="compare-scale">Compare {scale.name} with</label>
                <select
                  id="compare-scale"
                  value={comparison}
                  onChange={(e) => setComparison(e.target.value)}
                >
                  <option value="">Choose a scale…</option>
                  {scales
                    .filter((s) => s.id !== scale.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              {other ? (
                <div className="compare-result">
                  {[scale, other].map((s, i) => (
                    <div key={s.id}>
                      <strong>{s.name}</strong>
                      <div className="compare-degrees">
                        {s.degreeLabels.map((d) => (
                          <span
                            key={d}
                            className={
                              ![other, scale][i].degreeLabels.includes(d) ? 'different' : ''
                            }
                          >
                            {pretty(d)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p>
                    <span className="diff-key" />
                    Highlighted degrees differ.{' '}
                    {other.degreeLabels
                      .filter((d) => !scale.degreeLabels.includes(d))
                      .map(pretty)
                      .join(', ') || 'No added degrees'}{' '}
                    in {other.name}.
                  </p>
                </div>
              ) : (
                <p className="muted">
                  Hear the color of one changed degree. Try Dorian against natural minor, or major
                  against Mixolydian.
                </p>
              )}
            </>
          ) : (
            <>
              <p>
                Place roots on chord changes. Practice landing on the nearest third or seventh when
                the harmony moves.
              </p>
              <Link className="text-link" to="/basslines">
                Use these tones in a bassline <Icon name="arrow" />
              </Link>
            </>
          )}
        </Panel>
      </div>
      <div className="page-pagination">
        <Link to={`/${kind}/${previous.id}`}>
          <span>← PREVIOUS</span>
          {previous.name}
        </Link>
        <Link to={`/${kind}/${next.id}`}>
          <span>NEXT →</span>
          {next.name}
        </Link>
      </div>
      <p className="source-note">
        Adapted from the complete bass reference · {scale ? 'Scale atlas' : 'Chord-tone atlas'} ·{' '}
        {mod(degreeSemitones('8')) === 0 ? 'Standard four-string tuning' : ''}
      </p>
    </>
  );
}
