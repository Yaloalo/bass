import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Icon,
  PageHeading,
  Panel,
  ReferenceTable,
  Segmented,
  usePageTitle,
} from '../components/UI';
import { circle, findPosition, keyDetail, positionFor, signatureLabel } from '../lib/circle';
import { degreeSemitones, mod, pitchClass, roots } from '../lib/music';
import { germanNoteName } from '../lib/i18n';
import { usePiano } from '../lib/use-piano';
import { useStore } from '../lib/store';
import '../circle.css';

const size = 520;
const centre = size / 2;
const rings = { outer: 250, split: 172, inner: 100 };

/** Index 0 sits at twelve o'clock and the numbers run clockwise, like a clock face. */
function point(radius: number, index: number): [number, number] {
  const angle = ((index * 30 - 90) * Math.PI) / 180;
  return [centre + radius * Math.cos(angle), centre + radius * Math.sin(angle)];
}

/** One annular sector, 30° wide, centred on its position. */
function sector(from: number, to: number, index: number): string {
  const [x1, y1] = point(to, index - 0.5);
  const [x2, y2] = point(to, index + 0.5);
  const [x3, y3] = point(from, index + 0.5);
  const [x4, y4] = point(from, index - 0.5);
  const f = (value: number) => value.toFixed(2);
  return [
    `M ${f(x1)} ${f(y1)}`,
    `A ${to} ${to} 0 0 1 ${f(x2)} ${f(y2)}`,
    `L ${f(x3)} ${f(y3)}`,
    `A ${from} ${from} 0 0 0 ${f(x4)} ${f(y4)}`,
    'Z',
  ].join(' ');
}

const majorTriad = ['1', '3', '5'];
const minorTriad = ['1', 'b3', '5'];

export function CircleOfFifths() {
  usePageTitle('Quintenzirkel');
  const { root: globalRoot, setRoot } = useStore();
  const piano = usePiano(55);
  const [mode, setMode] = useState('Dur');
  const [alternative, setAlternative] = useState(false);
  // Open on the key the rest of the app is already set to.
  const [index, setIndex] = useState(() => findPosition(globalRoot)?.index ?? 0);

  const position = positionFor(index);
  const useAlt = alternative && !!position.alternative;
  const detail = useMemo(() => keyDetail(position, useAlt), [position, useAlt]);
  const minor = mode === 'Moll';
  const tonic = minor ? detail.minor : detail.major;

  const sound = (root: string, isMinor: boolean) => {
    const base = 60 + mod(pitchClass(root) - 60);
    piano.playChord((isMinor ? minorTriad : majorTriad).map((d) => base + degreeSemitones(d)));
  };
  const choose = (next: number, isMinor: boolean) => {
    setIndex(next);
    setMode(isMinor ? 'Moll' : 'Dur');
    if (next !== index) setAlternative(false);
    const target = positionFor(next);
    const spelling =
      alternative && next === index && target.alternative ? target.alternative : target;
    sound(isMinor ? spelling.minor : spelling.major, isMinor);
  };

  const role = (item: (typeof circle)[number]) =>
    item.index === index
      ? 'tonic'
      : item.index === mod(index + 1, 12)
        ? 'dominant'
        : item.index === mod(index - 1, 12)
          ? 'subdominant'
          : '';

  const segment = (item: (typeof circle)[number], isMinor: boolean) => {
    const spelling = item.index === index && useAlt && item.alternative ? item.alternative : item;
    const name = germanNoteName(isMinor ? spelling.minor : spelling.major);
    const selected = item.index === index && minor === isMinor;
    const label = isMinor ? `${name}-Moll` : `${name}-Dur`;
    return (
      <g
        key={`${isMinor ? 'm' : 'M'}${item.index}`}
        role="button"
        tabIndex={0}
        aria-label={`${label}, ${signatureLabel(spelling.accidentals)}`}
        aria-pressed={selected}
        className={`circle-segment ${isMinor ? 'is-minor' : 'is-major'} ${role(item)} ${
          selected ? 'is-selected' : ''
        }`}
        onClick={() => choose(item.index, isMinor)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            choose(item.index, isMinor);
          } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            choose(mod(item.index + (event.key === 'ArrowRight' ? 1 : -1), 12), isMinor);
          }
        }}
      >
        <path
          d={
            isMinor
              ? sector(rings.inner, rings.split, item.index)
              : sector(rings.split, rings.outer, item.index)
          }
        />
        <text
          className="circle-name"
          x={point(isMinor ? 136 : 203, item.index)[0]}
          y={point(isMinor ? 136 : 203, item.index)[1]}
        >
          {name}
          {isMinor && <tspan className="circle-minor-mark">m</tspan>}
        </text>
        {!isMinor && (
          <text
            className="circle-accidentals"
            x={point(234, item.index)[0]}
            y={point(234, item.index)[1]}
          >
            {spelling.accidentals === 0
              ? '–'
              : `${Math.abs(spelling.accidentals)}${spelling.accidentals > 0 ? '♯' : '♭'}`}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="circle-page">
      <PageHeading
        eyebrow="MUSIKTHEORIE / ORDNUNG DER TONARTEN"
        title="Quintenzirkel"
        description="Im Uhrzeigersinn eine Quinte weiter und ein Kreuz mehr, gegen den Uhrzeigersinn eine Quarte weiter und ein Be mehr. Innen steht die Mollparallele mit denselben Vorzeichen."
      />

      <div className="circle-layout">
        <Panel className="circle-figure">
          <svg viewBox={`0 0 ${size} ${size}`} className="circle-svg">
            <title>Quintenzirkel mit Dur-Tonarten außen und Mollparallelen innen</title>
            {circle.map((item) => segment(item, false))}
            {circle.map((item) => segment(item, true))}
            <circle className="circle-hub" cx={centre} cy={centre} r={rings.inner - 6} />
            <text className="circle-hub-name" x={centre} y={centre - 12}>
              {germanNoteName(tonic)}
              <tspan className="circle-hub-mode">{minor ? '-Moll' : '-Dur'}</tspan>
            </text>
            <text className="circle-hub-signature" x={centre} y={centre + 16}>
              {signatureLabel(detail.accidentals)}
            </text>
            <text className="circle-hub-notes" x={centre} y={centre + 38}>
              {detail.signature.map(germanNoteName).join(' ') || '—'}
            </text>
          </svg>
          <p className="circle-legend">
            <span className="key tonic" /> Tonika
            <span className="key subdominant" /> Subdominante (IV)
            <span className="key dominant" /> Dominante (V)
            <span className="circle-legend-note">
              Antippen spielt den Dreiklang. Pfeiltasten gehen einen Schritt weiter.
            </span>
          </p>
        </Panel>

        <div className="circle-detail">
          <Panel
            className="circle-key"
            title={`${germanNoteName(tonic)}-${minor ? 'Moll' : 'Dur'}`}
            aside={<span className="small-label">{signatureLabel(detail.accidentals)}</span>}
          >
            <div className="circle-key-controls">
              <Segmented
                label="Tongeschlecht"
                options={['Dur', 'Moll']}
                value={mode}
                onChange={setMode}
              />
              {position.alternative && (
                <button
                  type="button"
                  className="circle-enharmonic"
                  onClick={() => setAlternative((old) => !old)}
                >
                  <Icon name="repeat" size={15} />
                  {germanNoteName(useAlt ? position.major : position.alternative.major)} schreiben
                </button>
              )}
            </div>
            <dl className="circle-facts">
              <dt>Vorzeichen</dt>
              <dd>{detail.signature.map(germanNoteName).join(' · ') || 'keine'}</dd>
              <dt>Tonleiter</dt>
              <dd>{detail.notes.map(germanNoteName).join(' · ')}</dd>
              <dt>Parallele</dt>
              <dd>
                {minor
                  ? `${germanNoteName(detail.major)}-Dur`
                  : `${germanNoteName(detail.minor)}-Moll`}{' '}
                – dieselben Vorzeichen
              </dd>
              <dt>Nachbarn</dt>
              <dd>
                {germanNoteName(detail.subdominant)} (IV) und {germanNoteName(detail.dominant)} (V)
                – je ein Vorzeichen weniger und mehr
              </dd>
            </dl>
            <div className="circle-actions">
              {/* `roots` is indexed by pitch class, so an enharmonic spelling such as
                  Ges still maps onto the one global root the rest of the app uses. */}
              <button
                type="button"
                className="primary"
                onClick={() => setRoot(roots[pitchClass(tonic)])}
              >
                Grundton {germanNoteName(roots[pitchClass(tonic)])} übernehmen
              </button>
              <Link className="button" to={`/scales/${minor ? 'natural-minor' : 'major'}`}>
                Tonleiter ansehen
              </Link>
              <Link className="button" to="/piano">
                Im Piano öffnen
              </Link>
            </div>
          </Panel>

          <Panel className="circle-chords" title={`Akkorde in ${germanNoteName(detail.major)}-Dur`}>
            <ReferenceTable
              headers={['Stufe', 'Akkord', 'Klang']}
              rows={detail.chords.map((chord) => [
                chord.roman,
                <button
                  key={chord.roman}
                  type="button"
                  className="circle-chord"
                  onClick={() => sound(chord.root, chord.symbol.startsWith('m'))}
                >
                  {germanNoteName(chord.root)}
                  {chord.symbol}
                </button>,
                chord.quality === 'Major'
                  ? 'Dur'
                  : chord.quality === 'Minor'
                    ? 'Moll'
                    : 'vermindert',
              ])}
            />
            <p className="circle-note">
              Die drei Dur-Akkorde sind genau die drei Nachbarn auf dem Zirkel: Subdominante, Tonika
              und Dominante. Deshalb liegen die Stufen einer Tonart auf dem Zirkel immer
              beieinander.
            </p>
          </Panel>
        </div>
      </div>

      {piano.audioError && (
        <p className="tool-notice" role="alert">
          {piano.audioError}
        </p>
      )}
    </div>
  );
}
