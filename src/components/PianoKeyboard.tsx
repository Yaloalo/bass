import { useMemo, useRef } from 'react';
import { mod, noteName } from '../lib/music';
import { pianoKeys, pianoRange, pianoNoteName } from '../lib/piano';
import type { CSSProperties } from 'react';

export function PianoKeyboard({
  first = pianoRange.first,
  last = pianoRange.last,
  scaleNotes,
  scalePitchClasses,
  rootPitch,
  selected,
  pressed,
  selecting,
  noteLabel,
  onStart,
  onEnd,
  onToggle,
  onTap,
  showContext = true,
}: {
  /** Lowest and highest MIDI note drawn; wide enough for whatever must be shown. */
  first?: number;
  last?: number;
  scaleNotes: readonly string[];
  scalePitchClasses: ReadonlySet<number>;
  rootPitch: number;
  selected: ReadonlySet<number>;
  pressed: ReadonlySet<number>;
  selecting: boolean;
  noteLabel: (name: string) => string;
  onStart: (midi: number, key: string) => void;
  onEnd: (key: string) => void;
  onToggle: (midi: number) => void;
  onTap: (midi: number) => void;
  /** False for quizzes where highlighting the scale would reveal the answer. */
  showContext?: boolean;
}) {
  const keyboard = useRef<HTMLDivElement>(null);
  const keys = useMemo(() => pianoKeys(first, last), [first, last]);
  const whiteCount = keys.filter((key) => !key.black).length;
  return (
    <div className="piano-scroll" tabIndex={0} aria-label="Tastatur horizontal verschieben">
      <div
        className="piano-keyboard"
        role="group"
        aria-label={`Klaviatur von ${noteName(first, true)}${Math.floor(first / 12) - 1} bis ${noteName(last, true)}${Math.floor(last / 12) - 1}`}
        ref={keyboard}
        style={{ '--piano-whites': whiteCount } as CSSProperties}
      >
        {keys.map(({ midi, black, whiteIndex }) => {
          const spelled = pianoNoteName(midi, scaleNotes);
          const name = noteLabel(spelled);
          // Fis-Dur really does call this white key Eis. Show the plain name too, or a
          // learner hunting for F never finds it.
          const plain = noteLabel(noteName(midi, true));
          const alias = plain === name ? '' : plain;
          const octave = Math.floor(midi / 12) - 1;
          const inScale = showContext && scalePitchClasses.has(mod(midi));
          const isSelected = selected.has(midi);
          const width = black ? 0.64 : 1;
          const left = whiteIndex - (black ? width / 2 : 0);
          return (
            <button
              key={midi}
              data-midi={midi}
              type="button"
              className={`piano-key ${black ? 'is-black' : 'is-white'} ${showContext ? (inScale ? 'in-scale' : 'outside-scale') : 'is-neutral'} ${showContext && mod(midi) === rootPitch ? 'is-root' : ''} ${isSelected ? 'is-selected' : ''} ${pressed.has(midi) ? 'is-playing' : ''}`}
              style={{
                left: `${(left / whiteCount) * 100}%`,
                width: `${(width / whiteCount) * 100}%`,
              }}
              aria-label={`${name}${octave}`}
              aria-pressed={selecting ? isSelected : undefined}
              aria-description={`${showContext ? (inScale ? 'Ton der gewählten Skala. ' : 'Außerhalb der gewählten Skala. ') : ''}${selecting ? 'Spielen und Auswahl umschalten.' : 'Spielen.'}`}
              title={`${name}${octave}${showContext ? ` · ${inScale ? 'Skalenton' : 'skalenfremd'}` : ''}`}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                onStart(midi, `pointer-${event.pointerId}`);
              }}
              onPointerUp={(event) => onEnd(`pointer-${event.pointerId}`)}
              onPointerCancel={(event) => onEnd(`pointer-${event.pointerId}`)}
              onLostPointerCapture={(event) => onEnd(`pointer-${event.pointerId}`)}
              onClick={(event) => {
                // Screen-reader activation has no preceding pointer event.
                if (event.detail === 0) onTap(midi);
                if (selecting) onToggle(midi);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.code === 'Space') {
                  event.preventDefault();
                  if (event.repeat) return;
                  onStart(midi, `keyboard-${midi}`);
                  if (selecting) onToggle(midi);
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  event.preventDefault();
                  const next = midi + (event.key === 'ArrowLeft' ? -1 : 1);
                  keyboard.current
                    ?.querySelector<HTMLButtonElement>(`[data-midi="${next}"]`)
                    ?.focus();
                }
              }}
              onKeyUp={(event) => {
                if (event.key === 'Enter' || event.code === 'Space') {
                  event.preventDefault();
                  onEnd(`keyboard-${midi}`);
                }
              }}
              onBlur={() => onEnd(`keyboard-${midi}`)}
              onContextMenu={(event) => event.preventDefault()}
            >
              <span className="piano-key-scale" aria-hidden="true">
                {showContext && inScale ? (mod(midi) === rootPitch ? '1' : '•') : ''}
              </span>
              <span className="piano-key-name">
                {name}
                {alias && <i className="piano-key-alias">{alias}</i>}
                <small>{octave}</small>
              </span>
              {isSelected && (
                <span className="piano-key-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
