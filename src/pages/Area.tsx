import { Link } from 'react-router-dom';
import { areas, areaPresentation } from '../data/navigation';
import type { AreaId } from '../data/navigation';
import { Icon, PageHeading, usePageTitle } from '../components/UI';
import { useStore } from '../lib/store';
import { instrumentProfile } from '../lib/instrument';

export function Area({ id }: { id: AreaId }) {
  const { instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const area = areaPresentation(
    areas.find((item) => item.id === id)!,
    instrument,
  );
  usePageTitle(area.title);
  return (
    <>
      <PageHeading
        eyebrow={`DEINE ${profile.nameUpper}-WERKSTATT`}
        title={area.title}
        description={area.description}
      />
      <div className="area-grid">
        {area.items.map((item) => (
          <Link className="quick-card" to={item.path} key={item.path}>
            <div className="quick-card-top">
              <Icon name={item.icon} size={24} />
              <span>{item.group}</span>
            </div>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <Icon name="arrow" />
          </Link>
        ))}
      </div>
    </>
  );
}
