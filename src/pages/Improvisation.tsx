import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { scales, scaleById } from '../data/catalog';
import { phraseRows } from '../data/theory';
import { useStore } from '../lib/store';
import { transposeRoute, routeRange, pretty, spellDegree, readableRoot } from '../lib/music';
import {
  PageHeading,
  Panel,
  Notice,
  Icon,
  ReferenceTable,
  Segmented,
  usePageTitle,
} from '../components/UI';
import { Fretboard } from '../components/Fretboard';
const checklist = [
  'Find the key or tonal center.',
  'Identify the chord progression.',
  'Locate the roots in one area.',
  'Begin with thirds and fifths around the roots.',
  'Choose a scale that fits the chord and context.',
  'Target a tone of the next chord.',
  'Build a short two- or three-note motif.',
  'Repeat it, then vary the rhythm.',
  'Leave space; control note lengths.',
  'Listen to the drums and the rest of the band.',
];
export function Improvisation() {
  usePageTitle('Quick improvisation guide');
  return (
    <>
      <PageHeading
        eyebrow="06 / BEFORE THE TRACK STARTS"
        title="A quick guide to improvising"
        description="Find the harmony. Choose a small idea. Give it rhythm and space."
        actions={
          <Link to="/improvisation/play" className="button primary">
            <Icon name="play" />
            Open play-along screen
          </Link>
        }
      />
      <div className="impro-top">
        <Panel
          title="Quick impro checklist"
          className="checklist-panel"
          aside={<span className="small-label">60-SECOND PREPARATION</span>}
        >
          <ol className="impro-checklist">
            {checklist.map((text, i) => (
              <li key={text}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                {text}
              </li>
            ))}
          </ol>
        </Panel>
        <ScaleChooser />
      </div>
      <div className="note-hierarchy">
        <span>
          <strong>Chord tones</strong>
          <small>State the harmony</small>
        </span>
        <b>›</b>
        <span>
          <strong>Scale tones</strong>
          <small>Connect the targets</small>
        </span>
        <b>›</b>
        <span>
          <strong>Chromatic tones</strong>
          <small>Create a clear resolution</small>
        </span>
      </div>
      <Panel title="Make phrases, not scale runs">
        <ReferenceTable headers={['Tool', 'Try this']} rows={phraseRows} />
      </Panel>
      <div className="two-col">
        <Panel title="When the key is unclear">
          <p>
            Stay with roots and fifths while listening. Test major versus minor thirds quietly.
            Check major versus flat sevenths if the chord sounds extended. Leave space until the
            changes make sense.
          </p>
        </Panel>
        <Panel title="One useful constraint">
          <p>
            For an entire song, use only each chord’s root, third and fifth plus one chromatic
            approach. Create interest through rhythm, repetition, register and note length.
          </p>
          <Link className="text-link" to="/improvisation/latin">
            Salsa / Latin improvisation <Icon name="arrow" />
          </Link>
        </Panel>
      </div>
    </>
  );
}
export function ScaleChooser() {
  const { root } = useStore();
  const [quality, setQuality] = useState('Minor 7'),
    [context, setContext] = useState('Funk');
  let ids: string[] = [];
  let explanation = '';
  if (context === 'Blues') {
    ids = ['minor-pentatonic', 'blues', 'mixolydian'];
    explanation =
      'Blues language can mix major and minor thirds stylistically. Resolve expressive tensions and still follow the chord changes.';
  } else if (quality === 'Dominant 7' && context === 'Minor key') {
    ids = ['mixolydian', 'harmonic-minor'];
    explanation =
      'For V7 → i, use harmonic minor around the tonic key center; its fifth mode fits the dominant. Do not simply run harmonic minor from the dominant root. Check extensions and resolution.';
  } else if (quality === 'Dominant 7') {
    ids = ['mixolydian'];
    explanation =
      'Start with 1–3–5–♭7. Mixolydian is a starting point for an unaltered dominant; altered extensions require more context.';
  } else if (quality === 'Half-diminished') {
    ids = ['locrian'];
    explanation = 'Prioritize 1–♭3–♭5–♭7. Locrian natural 2 can also occur in minor-key contexts.';
  } else if (quality === 'Minor-major 7') {
    ids = ['melodic-minor', 'harmonic-minor'];
    explanation =
      'The major seventh over a minor triad matters. Check whether the sixth is natural or flat.';
  } else if (quality.startsWith('Minor')) {
    ids =
      context === 'Minor key'
        ? ['natural-minor', 'minor-pentatonic']
        : ['dorian', 'minor-pentatonic', 'natural-minor'];
    explanation =
      'Natural 6 suggests Dorian; ♭6 suggests Aeolian. Minor pentatonic is a compact starting pool when the sixth is unclear. Chord function and melody decide.';
  } else {
    ids = quality === 'Major 7' ? ['major', 'lydian'] : ['major-pentatonic', 'major', 'lydian'];
    explanation =
      'Land on 1–3–5, adding 7 for major-seven harmony. Use Lydian when ♯4 is supported; a scale is not a guarantee that every tone can be sustained.';
  }
  return (
    <Panel title="Find a starting scale">
      <div className="scale-chooser">
        <div className="chooser-inputs">
          <label>
            Chord quality
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              {[
                'Major',
                'Major 7',
                'Minor',
                'Minor 7',
                'Dominant 7',
                'Half-diminished',
                'Minor-major 7',
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Context
            <select value={context} onChange={(e) => setContext(e.target.value)}>
              {['Major key', 'Minor key', 'Blues', 'Funk', 'Latin / Salsa'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="eyebrow">LIKELY STARTING POINTS</div>
        {ids.map((id, i) => {
          const s = scaleById(id)!;
          return (
            <Link className="suggested-scale" key={id} to={'/scales/' + id}>
              <span>
                <strong>
                  {context === 'Minor key' && quality === 'Dominant 7' && id === 'harmonic-minor'
                    ? 'Tonic-key '
                    : pretty(root) + ' '}
                  {s.name}
                </strong>
                <small>{s.degreeLabels.map(pretty).join(' ')}</small>
              </span>
              {i === 0 ? <span className="pill">Start here</span> : <Icon name="arrow" size={15} />}
            </Link>
          );
        })}
        <p>{explanation}</p>
      </div>
    </Panel>
  );
}
export function PlayAlong() {
  const { root: selectedRoot } = useStore();
  const [id, setId] = useState('dorian'),
    [labels, setLabels] = useState('Degrees');
  const scale = scaleById(id)!;
  const root = readableRoot(selectedRoot, scale.degreeLabels);
  const route = useMemo(() => transposeRoute(scale.fingering, root), [scale, root]);
  usePageTitle('Play-along screen');
  const chord = scale.degreeLabels.filter(
    (d) => ['1', '3', 'b3', '5', 'b5', '7', 'b7'].includes(d) && !(id === 'blues' && d === 'b5'),
  );
  const rest = scale.degreeLabels.filter((d) => !chord.includes(d));
  return (
    <>
      <PageHeading
        eyebrow="06 / KEEP THIS ON THE MUSIC STAND"
        title={`${pretty(root)} ${scale.name}`}
        description="Keep the targets clear. Repeat a short motif. Leave space."
        actions={
          <label className="play-scale-select">
            <span>Scale</span>
            <select value={id} onChange={(e) => setId(e.target.value)}>
              {scales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        }
      />
      <div className="play-priorities">
        <Panel>
          <span className="eyebrow">01 / CHORD-TONE PRIORITY</span>
          <strong>{chord.map(pretty).join('  ·  ')}</strong>
          <p>{chord.map((d) => pretty(spellDegree(root, d))).join(' · ')}</p>
        </Panel>
        <Panel>
          <span className="eyebrow">02 / CONNECTING SCALE TONES</span>
          <strong>{rest.map(pretty).join('  ·  ') || 'Use the chord tones'}</strong>
          <p>{rest.map((d) => pretty(spellDegree(root, d))).join(' · ')}</p>
        </Panel>
        <Panel>
          <span className="eyebrow">CHARACTERISTIC COLOR</span>
          <strong>{scale.characteristic.map(pretty).join('  ·  ')}</strong>
          <p>{scale.signature}</p>
        </Panel>
      </div>
      <Panel
        title="Your compact fingering"
        aside={
          <Segmented
            label="Play-along labels"
            value={labels}
            onChange={setLabels}
            options={['Degrees', 'Notes']}
          />
        }
      >
        <Fretboard
          key={root + id}
          events={route}
          root={root}
          range={routeRange(route)}
          labels={labels as 'Degrees' | 'Notes'}
          route
        />
        <div className="play-formula">
          <span>{scale.degreeLabels.map(pretty).join('   ')}</span>
          <span>{scale.degreeLabels.map((d) => pretty(spellDegree(root, d))).join(' · ')}</span>
        </div>
      </Panel>
      <Notice>
        Chord-tone priorities here describe the selected scale’s tonic harmony. Follow each actual
        chord change; connecting tones are not universally safe resting points. The blues ♭5 is a
        passing tension.
      </Notice>
      <div className="play-reminders">
        <span>ROOTS → CHORD TONES → PASSING TONES</span>
        <span>Repeat · Answer · Breathe</span>
        <Link to={'/scales/' + id}>Open full scale reference →</Link>
      </div>
    </>
  );
}
