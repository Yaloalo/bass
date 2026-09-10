import { useState, useRef } from 'react';
import {
  isNote,
  strings,
  tuning,
  noteName,
  mod,
  pitchClass,
  pretty,
  intervalNames,
  intervalBetween,
} from '../lib/music';
import type { FingeringNote, MusicEvent } from '../lib/music';
interface Props {
  events: MusicEvent[];
  range: [number, number];
  root: string;
  labels?: 'Degrees' | 'Notes';
  title?: string;
  onPick?: (note: FingeringNote) => void;
  conceal?: boolean;
  marked?: string;
  route?: boolean;
}
export function Fretboard({
  events,
  range,
  root,
  labels = 'Degrees',
  title = '',
  onPick,
  conceal = false,
  marked,
  route = false,
}: Props) {
  const [picked, setPicked] = useState<FingeringNote | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const notes = events.filter(isNote);
  const frets = Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i);
  const wide = frets.length > 14;
  const map = new Map(notes.map((n) => [`${n.string}:${n.fret}`, n]));
  const pick = (string: FingeringNote['string'], fret: number) => {
    const n = map.get(`${string}:${fret}`) ?? {
      string,
      fret,
      duration: 'q',
      name: noteName(tuning[string] + fret, root.includes('b')),
    };
    setPicked(n);
    onPick?.(n);
  };
  return (
    <div className="fretboard-wrap">
      <div className="fretboard-scroll">
        <div
          ref={board}
          className={`fretboard ${wide ? 'wide' : ''}`}
          style={{
            minWidth: Math.max(520, frets.length * 48),
            gridTemplateColumns: `36px repeat(${frets.length},minmax(44px,1fr))`,
          }}
          role="group"
          aria-label={`${title} fretboard, frets ${range[0]} to ${range[1]}`}
        >
          <div />
          {frets.map((f) => (
            <div className="fret-number" key={f}>
              {f === 0 ? '0 · open' : f}
            </div>
          ))}
          {strings.map((string, i) => (
            <div className="string-row" key={string}>
              <div className="string-name">{string}</div>
              {frets.map((fret) => {
                const key = `${string}:${fret}`,
                  n = map.get(key);
                const degree = n?.degree;
                const chord =
                  n?.role !== 'Passing tone' &&
                  degree &&
                  ['3', 'b3', '5', 'b5', '#5', '7', 'b7', 'bb7'].includes(degree);
                const isRoot = degree === '1';
                const isMarked = marked === key;
                const visible = n && !conceal;
                const label = visible
                  ? labels === 'Notes'
                    ? pretty(n.name ?? noteName(tuning[string] + fret))
                    : pretty(degree ?? n.name ?? noteName(tuning[string] + fret))
                  : isMarked
                    ? '?'
                    : '';
                return (
                  <button
                    key={fret}
                    data-position={key}
                    className={`fret-cell string-${i} ${fret === 0 ? 'open' : ''} ${picked?.string === string && picked?.fret === fret ? 'picked' : ''}`}
                    aria-label={
                      conceal
                        ? `${string} string fret ${fret}`
                        : `${n?.name ?? noteName(tuning[string] + fret)}${degree ? `, degree ${degree}` : ''}${n?.role === 'Passing tone' ? ', passing tone' : ''}, ${string} string fret ${fret}`
                    }
                    onClick={() => pick(string, fret)}
                    onKeyDown={(event) => {
                      if (event.altKey || event.ctrlKey || event.metaKey) return;
                      const moves: Record<string, [number, number]> = {
                        ArrowLeft: [i, fret - 1],
                        ArrowRight: [i, fret + 1],
                        ArrowUp: [i - 1, fret],
                        ArrowDown: [i + 1, fret],
                        Home: [i, range[0]],
                        End: [i, range[1]],
                      };
                      const move = moves[event.key];
                      if (!move) return;
                      event.preventDefault();
                      const nextString = strings[Math.max(0, Math.min(3, move[0]))];
                      const nextFret = Math.max(range[0], Math.min(range[1], move[1]));
                      board.current
                        ?.querySelector<HTMLButtonElement>(
                          `[data-position="${nextString}:${nextFret}"]`,
                        )
                        ?.focus();
                    }}
                  >
                    <span
                      className={`degree-marker ${isRoot ? 'root' : chord ? 'chord' : 'scale'} ${!visible && !isMarked ? 'empty' : ''} ${isMarked ? 'marked' : ''} ${n?.role === 'Passing tone' ? 'passing' : ''}`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          <div />
          {frets.map((f) => (
            <div className="fret-dot" key={f}>
              {[12, 24].includes(f) ? '••' : [3, 5, 7, 9, 15, 17, 19, 21].includes(f) ? '•' : ''}
            </div>
          ))}
        </div>
      </div>
      <div className="fretboard-caption">
        <div className="legend">
          <span>
            <i className="root" />
            Root · 1
          </span>
          <span>
            <i className="chord" />
            Chord tone
          </span>
          <span>
            <i className="scale" />
            Scale tone
          </span>
        </div>
        <span>
          {route ? 'One route · only played positions' : 'G string at top · standard E–A–D–G'}
        </span>
      </div>
      {!conceal && (
        <div className="position-info" aria-live="polite">
          {picked ? (
            <>
              <strong>
                {pretty(picked.name ?? noteName(tuning[picked.string] + picked.fret))}
              </strong>
              <span>
                {picked.string} string · fret {picked.fret}
              </span>
              <span>
                {picked.name
                  ? intervalBetween(root, picked.name)
                  : intervalNames[mod(tuning[picked.string] + picked.fret - pitchClass(root))]}{' '}
                of {pretty(root)}
                {picked.degree ? ` · degree ${pretty(picked.degree)}` : ''}
              </span>
            </>
          ) : (
            <span>Click any position to inspect its note and interval.</span>
          )}
        </div>
      )}
    </div>
  );
}
