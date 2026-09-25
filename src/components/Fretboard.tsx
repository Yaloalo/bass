import { useId, useLayoutEffect, useRef, useState } from 'react';
import {
  degreeIntervalName,
  isNote,
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
import { useStore } from '../lib/store';
import { instrumentProfile } from '../lib/instrument';
import type { InstrumentString } from '../lib/instrument';
import type { FretboardChordOverlay } from '../lib/fretboard-chords';
import type { FretboardGuidePath } from '../lib/fretboard-guide';
export interface FretboardPick extends FingeringNote {
  midi: number;
  stringLabel: string;
  positionId: string;
}
interface Props {
  events: MusicEvent[];
  range: [number, number];
  root: string;
  labels?: 'Degrees' | 'Notes' | 'Both';
  title?: string;
  onPick?: (note: FretboardPick) => void;
  conceal?: boolean;
  marked?: string;
  route?: boolean;
  overlays?: readonly FretboardChordOverlay[];
  guidePaths?: readonly FretboardGuidePath[];
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
  overlays = [],
  guidePaths = [],
}: Props) {
  const { instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const displayStrings = profile.stringsHighToLow;
  const [picked, setPicked] = useState<FretboardPick | null>(null);
  const [guideCurves, setGuideCurves] = useState<
    { id: string; color: string; label: string; segments: string[] }[]
  >([]);
  const markerPrefix = `guide${useId().replaceAll(':', '')}`;
  const board = useRef<HTMLDivElement>(null);
  const notes = events.filter(isNote);
  const frets = Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i);
  const wide = frets.length > 14;
  const map = new Map(notes.map((n) => [`${n.string}:${n.fret}`, n]));
  const templates = new Map(
    notes.map((note) => [mod(tuning[note.string] + note.fret), note] as const),
  );
  const positionKey = (string: InstrumentString, fret: number) =>
    `${string.exerciseString ?? string.id}:${fret}`;
  const noteAt = (string: InstrumentString, fret: number): FretboardPick | undefined => {
    const midi = string.midi + fret;
    const exact = string.exerciseString ? map.get(`${string.exerciseString}:${fret}`) : undefined;
    const source = exact ?? (!route ? templates.get(mod(midi)) : undefined);
    if (!source) return undefined;
    return {
      ...source,
      string: string.exerciseString ?? source.string,
      fret,
      name: source.name ?? noteName(midi, root.includes('b')),
      midi,
      stringLabel: string.spokenLabel,
      positionId: positionKey(string, fret),
    };
  };
  const pick = (string: InstrumentString, fret: number) => {
    const midi = string.midi + fret;
    const n = noteAt(string, fret) ?? {
      string: string.exerciseString ?? 'E',
      fret,
      duration: 'q',
      name: noteName(midi, root.includes('b')),
      midi,
      stringLabel: string.spokenLabel,
      positionId: positionKey(string, fret),
    };
    setPicked(n);
    onPick?.(n);
  };
  useLayoutEffect(() => {
    const element = board.current;
    if (!element || !guidePaths.length) {
      setGuideCurves([]);
      return;
    }
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      setGuideCurves(
        guidePaths.map((path) => {
          const points = path.points.flatMap((point) => {
            const cell = element.querySelector<HTMLElement>(
              `[data-position="${point.positionId}"]`,
            );
            if (!cell) return [];
            const box = cell.getBoundingClientRect();
            return [
              {
                x: box.left - bounds.left + box.width / 2,
                y: box.top - bounds.top + box.height / 2,
              },
            ];
          });
          const segments = points.slice(0, -1).map((start, index) => {
            const end = points[index + 1];
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.max(1, Math.hypot(dx, dy));
            const inset = Math.min(18, length / 4);
            const x1 = start.x + (dx / length) * inset;
            const y1 = start.y + (dy / length) * inset;
            const x2 = end.x - (dx / length) * inset;
            const y2 = end.y - (dy / length) * inset;
            const bend = Math.min(34, Math.max(18, length * 0.22));
            const normalX = dy / length;
            const normalY = -dx / length;
            const c1x = x1 + (x2 - x1) * 0.34 + normalX * bend;
            const c1y = y1 + (y2 - y1) * 0.34 + normalY * bend;
            const c2x = x1 + (x2 - x1) * 0.68 + normalX * bend;
            const c2y = y1 + (y2 - y1) * 0.68 + normalY * bend;
            return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
          });
          return { id: path.id, color: path.color, label: path.label, segments };
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [guidePaths]);
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
          {guideCurves.length > 0 && (
            <svg className="fretboard-guide-paths" aria-label="Arpeggio-Pfeile">
              <defs>
                {guideCurves.map((curve, index) => (
                  <marker
                    key={curve.id}
                    id={`${markerPrefix}-${index}`}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={curve.color} />
                  </marker>
                ))}
              </defs>
              {guideCurves.flatMap((curve, pathIndex) =>
                curve.segments.map((segment, segmentIndex) => (
                  <path
                    key={`${curve.id}-${segmentIndex}`}
                    d={segment}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    markerEnd={`url(#${markerPrefix}-${pathIndex})`}
                  >
                    <title>{curve.label}</title>
                  </path>
                )),
              )}
            </svg>
          )}
          <div />
          {frets.map((f) => (
            <div className="fret-number" key={f}>
              {f === 0 ? '0 · leer' : f}
            </div>
          ))}
          {displayStrings.map((string, i) => (
            <div className="string-row" key={string.id}>
              <div className="string-name">{string.label}</div>
              {frets.map((fret) => {
                const key = positionKey(string, fret),
                  n = noteAt(string, fret);
                const midi = string.midi + fret;
                const matches = overlays.filter((overlay) =>
                  overlay.pitchClasses.includes(mod(midi)),
                );
                const overlayRoot = matches.some((overlay) => overlay.rootPitch === mod(midi));
                const overlayBackground = matches.length
                  ? matches.length === 1
                    ? matches[0].color
                    : `conic-gradient(${matches
                        .map(
                          (overlay, index) =>
                            `${overlay.color} ${(index * 100) / matches.length}% ${((index + 1) * 100) / matches.length}%`,
                        )
                        .join(', ')})`
                  : undefined;
                const degree = n?.degree;
                const chord =
                  n?.role !== 'Passing tone' &&
                  degree &&
                  ['3', 'b3', '5', 'b5', '#5', '7', 'b7', 'bb7'].includes(degree);
                const isRoot = degree === '1';
                const isMarked = marked === key;
                const visible = n && !conceal;
                const displayedNote = germanNoteName(n?.name ?? noteName(string.midi + fret));
                const displayedDegree = pretty(degree ?? n?.name ?? noteName(string.midi + fret));
                const label = visible
                  ? labels === 'Notes'
                    ? displayedNote
                    : displayedDegree
                  : isMarked
                    ? '?'
                    : '';
                return (
                  <button
                    key={fret}
                    data-position={key}
                    className={`fret-cell string-${i} ${fret === 0 ? 'open' : ''} ${picked?.positionId === key ? 'picked' : ''}`}
                    aria-label={
                      conceal
                        ? `${string.spokenLabel}-Saite Bund ${fret}`
                        : `${germanNoteName(n?.name ?? noteName(string.midi + fret))}${degree ? `, ${degreeIntervalName(degree)}` : ''}${n?.role === 'Passing tone' ? ', Durchgangston' : ''}${matches.length ? `, enthalten in ${matches.map((overlay) => overlay.label).join(', ')}` : ''}, ${string.spokenLabel}-Saite Bund ${fret}`
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
                      const nextString =
                        displayStrings[Math.max(0, Math.min(displayStrings.length - 1, move[0]))];
                      const nextFret = Math.max(range[0], Math.min(range[1], move[1]));
                      board.current
                        ?.querySelector<HTMLButtonElement>(
                          `[data-position="${positionKey(nextString, nextFret)}"]`,
                        )
                        ?.focus();
                    }}
                  >
                    <span
                      className={`degree-marker ${labels === 'Both' && visible ? 'both' : ''} ${matches.length ? 'overlay' : isRoot ? 'root' : chord ? 'chord' : 'scale'} ${overlayRoot ? 'overlay-root' : ''} ${!visible && !isMarked ? 'empty' : ''} ${isMarked ? 'marked' : ''} ${n?.role === 'Passing tone' ? 'passing' : ''}`}
                      style={overlayBackground ? { background: overlayBackground } : undefined}
                      title={
                        matches.length
                          ? `${germanNoteName(n?.name ?? noteName(midi))}: ${matches.map((overlay) => overlay.label).join(' · ')}`
                          : undefined
                      }
                    >
                      {labels === 'Both' && visible ? (
                        <>
                          <b>{displayedNote}</b>
                          <small>{displayedDegree}</small>
                        </>
                      ) : (
                        label
                      )}
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
        {overlays.length ? (
          <div className="legend overlay-legend" aria-label="Farblegende der Akkorde">
            {overlays.map((overlay, index) => (
              <span key={overlay.id} title={overlay.detail}>
                <i style={{ background: overlay.color }} />
                <b>{index + 1}</b>
                {overlay.label}
              </span>
            ))}
            <span>Geteilte Kreise = gemeinsamer Ton · Ring = Grundton eines Akkords</span>
          </div>
        ) : (
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
        )}
        <span>
          {route
            ? 'Ein Fingersatz · nur gespielte Positionen'
            : `${displayStrings[0].spokenLabel}-Saite oben · Standard ${profile.tuningLabel}`}
        </span>
      </div>
      {!conceal && (
        <div className="position-info" aria-live="polite">
          {picked ? (
            <>
              <strong>{germanNoteName(picked.name ?? noteName(picked.midi))}</strong>
              <span>
                {picked.stringLabel}-Saite · Bund {picked.fret}
              </span>
              <span>
                {picked.name
                  ? textDe(intervalBetween(root, picked.name))
                  : intervalNames[mod(picked.midi - pitchClass(root))]}{' '}
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
