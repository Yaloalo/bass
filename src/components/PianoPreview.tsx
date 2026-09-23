import { Link } from 'react-router-dom';
import { PianoKeyboard } from './PianoKeyboard';
import { Icon, Section } from './UI';
import { pitchClass } from '../lib/music';
import { useNoteLabel } from '../lib/store';
import { germanNoteName } from '../lib/i18n';
import { usePiano } from '../lib/use-piano';
import '../piano.css';

/**
 * The same keyboard as the piano page and just as playable — it only leaves out that
 * page's analysis and selection tools. "Im Piano öffnen" hands over for the full view.
 */
export function PianoPreview({
  title = 'Klaviatur',
  defaultOpen = true,
  scaleNotes,
  highlighted,
  caption,
  to,
  linkLabel,
}: {
  title?: string;
  /** Folded away by default where the keyboard is a detail rather than the point. */
  defaultOpen?: boolean;
  /** Spelling context, so the keys read F♯ or G♭ the way the page does. */
  scaleNotes: string[];
  /** The notes to mark; every octave of them lights up. */
  highlighted: string[];
  caption: string;
  to: string;
  linkLabel: string;
}) {
  const label = useNoteLabel();
  const piano = usePiano();
  const display = (name: string) =>
    label.style === 'de' ? germanNoteName(name) : label.note(name);
  const classes = new Set(highlighted.map(pitchClass));
  const rootPitch = highlighted.length ? pitchClass(highlighted[0]) : -1;
  return (
    <Section
      className="piano-preview"
      title={title}
      defaultOpen={defaultOpen}
      aside="C3–C5 · zum Spielen antippen"
    >
      <PianoKeyboard
        scaleNotes={scaleNotes}
        scalePitchClasses={classes}
        rootPitch={rootPitch}
        selected={new Set()}
        pressed={new Set(piano.held.values())}
        selecting={false}
        noteLabel={display}
        onStart={piano.start}
        onEnd={piano.end}
        onToggle={() => {}}
        onTap={(midi) => piano.playChord([midi])}
      />
      <div className="piano-preview-foot">
        <p>{caption}</p>
        <Link className="button primary" to={to}>
          <Icon name="play" size={15} />
          {linkLabel}
        </Link>
      </div>
      {piano.audioError && (
        <p className="tool-notice" role="alert">
          {piano.audioError}
        </p>
      )}
    </Section>
  );
}
