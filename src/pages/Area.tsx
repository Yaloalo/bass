import { Link } from 'react-router-dom';
import { areas } from '../data/navigation';
import type { AreaId } from '../data/navigation';
import { Icon, PageHeading, usePageTitle } from '../components/UI';

export function Area({ id }: { id: AreaId }) {
  const area = areas.find((item) => item.id === id)!;
  usePageTitle(area.title);
  return (
    <>
      <PageHeading
        eyebrow="DEINE BASS-WERKSTATT"
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
