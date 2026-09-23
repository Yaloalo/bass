import { useState, useRef } from 'react';
import {
  degreeIntervalName,
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
import { germanNoteName, textDe } from '../lib/i18n';
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
          aria-label={`${title} Griffbrett, Bünde ${range[0]} bis ${range[1]}`}
        >
          <div />
          {frets.map((f) => (
            <div className="fret-number" key={f}>
              {f === 0 ? '0 · leer' : f}
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
                    ? germanNoteName(n.name ?? noteName(tuning[string] + fret))
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
                        ? `${string}-Saite Bund ${fret}`
                        : `${germanNoteName(n?.name ?? noteName(tuning[string] + fret))}${degree ? `, ${degreeIntervalName(degree)}` : ''}${n?.role === 'Passing tone' ? ', Durchgangston' : ''}, ${string}-Saite Bund ${fret}`
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
            Grundton · 1
          </span>
          <span>
            <i className="chord" />
            Akkordton
          </span>
          <span>
            <i className="scale" />
            Tonleiterton
          </span>
        </div>
        <span>
          {route ? 'Ein Fingersatz · nur gespielte Positionen' : 'G-Saite oben · Standard E–A–D–G'}
        </span>
      </div>
      {!conceal && (
        <div className="position-info" aria-live="polite">
          {picked ? (
            <>
              <strong>
                {germanNoteName(picked.name ?? noteName(tuning[picked.string] + picked.fret))}
              </strong>
              <span>
                {picked.string}-Saite · Bund {picked.fret}
              </span>
              <span>
                {picked.name
                  ? textDe(intervalBetween(root, picked.name))
                  : intervalNames[mod(tuning[picked.string] + picked.fret - pitchClass(root))]}{' '}
                über {germanNoteName(root)}
                {picked.degree ? ` · Stufe ${pretty(picked.degree)}` : ''}
              </span>
            </>
          ) : (
            <span>Tippe eine Position an, um Note und Intervall zu sehen.</span>
          )}
        </div>
      )}
    </div>
  );
}
