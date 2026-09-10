import { Link } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { useStore } from '../lib/store';
import { scales } from '../data/catalog';
import { transposeRoute, routeRange, pretty } from '../lib/music';
import { PageHeading, Panel, Icon, ItemLink } from '../components/UI';
import { Fretboard } from '../components/Fretboard';
const shortcuts = [
  ['grid', 'Fretboard', 'Find your way around the neck.', '/fretboard'],
  ['layers', 'Scales & modes', 'Twelve formulas. Every root.', '/scales'],
  ['music', 'Arpeggios', 'Make the harmony audible.', '/arpeggios'],
  ['book', 'Quick impro guide', 'Find the changes. Build a phrase.', '/improvisation'],
];
export function Home() {
  const { root, recent, favorites, logs } = useStore();
  useEffect(() => {
    document.title = 'Workstation · Bass Reference';
  }, []);
  const route = useMemo(() => transposeRoute(scales[2].fingering, root), [root]);
  return (
    <>
      <PageHeading
        eyebrow="REFERENCE / STUDY / PRACTICE"
        title="Your bass workstation"
        description="A clear view of the neck. A little theory. Time to play."
        actions={
          <Link to="/programs" className="primary button">
            <Icon name="play" />
            Start 30-minute practice
          </Link>
        }
      />
      <div className="quick-grid">
        {shortcuts.map(([icon, title, description, to], i) => (
          <Link key={to} to={to} className="quick-card">
            <div className="quick-card-top">
              <Icon name={icon} size={23} />
              <span>0{i + 1}</span>
            </div>
            <h2>{title}</h2>
            <p>{description}</p>
            <Icon name="arrow" />
          </Link>
        ))}
      </div>
      <div className="home-workspace">
        <Panel
          title="On the fretboard"
          aside={
            <Link to="/scales/dorian" className="text-link">
              Open reference <Icon name="arrow" size={15} />
            </Link>
          }
        >
          <div className="home-scale">
            <div>
              <span className="eyebrow">A MINOR SOUND WITH A NATURAL SIXTH</span>
              <h3>{pretty(root)} Dorian</h3>
            </div>
            <span className="formula-inline">
              1 2 ♭3 4 5 <b>6</b> ♭7
            </span>
          </div>
          <Fretboard
            root={root}
            events={route}
            range={routeRange(route)}
            route
            title={`${root} Dorian`}
          />
        </Panel>
        <div className="home-aside">
          <Panel className="practice-feature">
            <div className="eyebrow">MAKE TIME FOR THE INSTRUMENT</div>
            <h2>
              30 minutes.
              <br />
              Six focused blocks.
            </h2>
            <p>Start with clean movement. Add musical intent. Finish with something you can use.</p>
            <Link to="/programs/clean-restart" className="button primary">
              <Icon name="play" />
              Clean restart
            </Link>
            <Link to="/programs/salsa-latin" className="text-link">
              Salsa / Latin program <Icon name="arrow" />
            </Link>
          </Panel>
          <Panel>
            <div className="eyebrow">THE REFERENCE PRINCIPLE</div>
            <p className="principle">
              Chord tones define the harmony.
              <br />
              Scales organize the notes.
              <br />
              <strong>Rhythm makes the bassline.</strong>
            </p>
          </Panel>
        </div>
      </div>
      <div className="three-col">
        <Panel title="Recently viewed" aside={<Icon name="clock" />}>
          {recent
            .filter((r) => r.path !== '/')
            .slice(0, 5)
            .map((r) => (
              <ItemLink key={r.path} title={r.title} to={r.path} />
            ))}
          {!recent.length && (
            <p className="empty-state">The references you open will appear here.</p>
          )}
        </Panel>
        <Panel title="Your favorites" aside={<Icon name="star" />}>
          {favorites.length ? (
            favorites.slice(0, 5).map((r) => <ItemLink key={r.path} title={r.title} to={r.path} />)
          ) : (
            <p className="empty-state">
              Star a scale, arpeggio, exercise, or program to keep it close.
            </p>
          )}
        </Panel>
        <Panel title="On the music stand">
          <ItemLink
            title="40 five-minute exercises"
            description="Physical control & musical vocabulary"
            to="/exercises"
          />
          <ItemLink
            title="Theory, at a glance"
            description="Intervals, keys, chords & rhythm"
            to="/theory"
          />
          <ItemLink
            title="The complete book"
            description="Original 77-page PDF · offline copy"
            to="/pdf"
          />
        </Panel>
      </div>
      {logs.length > 0 && (
        <Panel title="Practice log">
          {logs.slice(0, 3).map((l) => (
            <div className="log-row" key={l.id}>
              <span>{new Date(l.date).toLocaleDateString()}</span>
              <strong>{l.title}</strong>
              <span>{l.minutes} min</span>
              <p>{l.notes}</p>
            </div>
          ))}
        </Panel>
      )}
      <div className="home-footer">
        <span>BASS GUITAR FRETBOARD & COMPLETE REFERENCE</span>
        <span>Standard four-string · E–A–D–G</span>
      </div>
    </>
  );
}
