import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useRhythm, useRhythmStatus } from '../lib/rhythm-store';
import { Icon } from './UI';
import { TempoInput } from './tools/TempoInput';

export function Metronome() {
  const { bpm, setBpm } = useStore();
  const { preferences, start, stop } = useRhythm();
  const status = useRhythmStatus();
  const { pathname } = useLocation();
  const running = status.running || status.starting;
  // On the drum page the footer Start must start the groove the user just built,
  // not a click track. While something plays, it always controls what is playing.
  const target = running ? status.mode : pathname === '/drums' ? 'drums' : 'metronome';
  const drums = target === 'drums';
  const beats = drums ? 4 : preferences.metronome.beats;
  const label = drums ? 'Drum-Maschine' : 'Metronom';
  return (
    <div className="metronome">
      <Link
        className="metronome-label"
        to={drums ? '/drums' : '/tools/metronome'}
        aria-label="Rhythmus-Werkzeuge öffnen"
      >
        <Icon name="metronome" />
        {label}
      </Link>
      <div
        className="beat-lights"
        role="img"
        aria-label={`${label}: ${running ? 'läuft' : 'gestoppt'}`}
      >
        {Array.from({ length: beats }, (_, i) => (
          <i key={i} className={running && status.pulse?.beat === i ? 'on' : ''} />
        ))}
      </div>
      <button aria-label="Tempo um 5 verringern" onClick={() => setBpm(bpm - 5)}>
        −5
      </button>
      <label>
        <TempoInput label="Tempo in BPM" />
        <span>BPM</span>
      </label>
      <button aria-label="Tempo um 5 erhöhen" onClick={() => setBpm(bpm + 5)}>
        +5
      </button>
      <button
        className={running ? 'metro-toggle active' : 'metro-toggle'}
        aria-label={`${label} ${running ? 'stoppen' : 'starten'}`}
        onClick={() => (running ? stop() : start(target))}
      >
        <Icon name={running ? 'pause' : 'play'} size={14} />
        <span>{running ? 'Stopp' : 'Start'}</span>
      </button>
      {/* One owner for the transport error: the footer is always mounted. */}
      {status.error && (
        <span className="footer-audio-error" role="alert">
          {status.error}
        </span>
      )}
    </div>
  );
}
