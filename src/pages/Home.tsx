import { Link } from 'react-router-dom';
import { areas, areaPath } from '../data/navigation';
import { Icon, usePageTitle } from '../components/UI';

const areaIcon: Record<string, string> = {
  musiktheorie: 'layers',
  bass: 'grid',
  drums: 'metronome',
};

/** One decision on the start page: which of the three chapters you want. */
export function Home() {
  usePageTitle('Workstation');
  return (
    <div className="home-choice">
      <div className="home-choice-intro">
        <span className="eyebrow">DEINE BASS-WERKSTATT</span>
        <h1>Womit willst du anfangen?</h1>
      </div>
      <nav className="home-choice-grid" aria-label="Bereich wählen">
        {areas.map((area) => (
          <Link className="home-choice-card" to={areaPath(area.id)} key={area.id}>
            <Icon name={areaIcon[area.id] ?? 'music'} size={40} />
            <strong>{area.title}</strong>
            <span>{area.description}</span>
            <Icon name="arrow" size={22} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
