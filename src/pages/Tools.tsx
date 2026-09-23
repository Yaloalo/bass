import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { PageHeading, usePageTitle } from '../components/UI';
import { MetronomeTool } from '../components/tools/MetronomeTool';
import { useTransportShortcuts } from '../components/tools/DrumTransport';
import '../tools.css';

export function ToolsPage() {
  const page = useRef<HTMLDivElement>(null);
  usePageTitle('Metronom');
  useTransportShortcuts(page, 'metronome');
  return (
    <div className="tools-page" ref={page}>
      <PageHeading
        eyebrow="WERKZEUGE / RHYTHMUS"
        title="Metronom"
        description="Puls setzen, Lücken lassen, spielen. Der Rhythmus läuft weiter, während du durch die Werkstatt navigierst."
      />
      <nav className="tools-tabs" aria-label="Rhythmus-Werkzeuge">
        <Link to="/drums">Drum-Maschine</Link>
        <Link aria-current="page" className="selected" to="/tools/metronome">
          Metronom
        </Link>
        <span>
          <kbd>Leertaste</kbd> startet und stoppt, sobald du auf dieser Seite etwas angeklickt hast
        </span>
      </nav>
      <MetronomeTool />
    </div>
  );
}
