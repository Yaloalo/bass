import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { scales, scaleById } from '../data/catalog';
import {
  transposeRoute,
  routeRange,
  scaleStepLabels,
  isNote,
  pretty,
  spellDegree,
  mod,
  degreeSemitones,
  readableRoot,
} from '../lib/music';
import { useStore } from '../lib/store';
import { germanNoteName, textDe } from '../lib/i18n';
import {
  PageHeading,
  Panel,
  Section,
  Segmented,
  ItemLink,
  Icon,
  usePageTitle,
  Konzept,
} from '../components/UI';
import { Fretboard } from '../components/Fretboard';
import { PianoPreview } from '../components/PianoPreview';
import { Score } from '../components/Score';
import { Playback } from '../components/Playback';
import { instrumentProfile } from '../lib/instrument';
import { guitarScaleShapes } from '../lib/guitar-scales';
export function ReferenceIndex() {
  const data = scales;
  usePageTitle('Tonleiter-Atlas');
  const { root } = useStore();
  return (
    <>
      <PageHeading
        eyebrow="MUSIKTHEORIE / TONLEITERN"
        title="Tonleitern & Modi"
        description="Ein Fingersatz, drei Ansichten. Wähle eine Tonleiter zum Einstieg."
      />
      <Konzept title="Wie eine Tonleiter gebaut ist">
        <p>
          Eine Tonleiter ist ein Muster aus Ganz- und Halbtonschritten. Die Durtonleiter ist
          <b> Ganz–Ganz–Halb–Ganz–Ganz–Ganz–Halb</b>. Von jedem Grundton aus ergibt dieses Muster
          Dur – deshalb ist eine Tonleiter eine Formel und keine Liste von Tönen.
        </p>
        <p>
          Die Stufen werden gegen Dur gezählt. Natürliches Moll ist <b>1 2 ♭3 4 5 ♭6 ♭7</b>:
          dieselben Stufennummern, drei davon einen Halbton tiefer. Genau diese veränderten Stufen
          machen den Klangunterschied aus, und genau sie zeigt der Vergleich auf jeder
          Tonleiterseite.
        </p>
        <p>
          Ein <b>Modus</b> nimmt dasselbe Tonmaterial, macht aber einen anderen Ton zum Zentrum.
          Dorisch ist Moll mit großer Sexte, Mixolydisch ist Dur mit kleiner Septime. Ein Modus
          entsteht aber nicht dadurch, dass du eine Durtonleiter woanders beginnst – die Harmonie
          muss den neuen Grundton stützen.
        </p>
      </Konzept>
      <div className="catalog-groups">
        {[...new Set(data.map((x) => x.category))].map((group) => (
          <Panel
            key={group}
            title={textDe(group)}
            aside={
              <span className="small-label">
                {data.filter((x) => x.category === group).length} EINTRÄGE
              </span>
            }
          >
            {data
              .filter((x) => x.category === group)
              .map((s) => (
                <ItemLink
                  key={s.id}
                  title={s.name}
                  description={s.degreeLabels.map(pretty).join('   ')}
                  to={`/scales/${s.id}`}
                  meta={<span className="muted">{germanNoteName(root)}</span>}
                />
              ))}
          </Panel>
        ))}
      </div>
      <div className="notice">
        Beginne mit Grundton und Formel. Eine Tonleiter ist ein Tonvorrat; ein Arpeggio beschreibt
        die Töne eines Akkords.
      </div>
    </>
  );
}
export function ReferencePage() {
  const { id = 'major' } = useParams();
  const { root: selectedRoot, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const scale = scaleById(id);
  const item = scale;
  const root = readableRoot(selectedRoot, item?.degreeLabels ?? ['1']);
  const [labels, setLabels] = useState('Degrees');
  const [comparison, setComparison] = useState('');
  const [guitarShapeIndex, setGuitarShapeIndex] = useState(0);
  const bassRoute = useMemo(() => (item ? transposeRoute(item.fingering, root) : []), [item, root]);
  const guitarShapes = useMemo(
    () => (item ? guitarScaleShapes(root, item.degreeLabels) : []),
    [item, root],
  );
  const route =
    instrument === 'guitar'
      ? (guitarShapes[Math.min(guitarShapeIndex, guitarShapes.length - 1)]?.events ?? bassRoute)
      : bassRoute;
  useEffect(() => {
    setGuitarShapeIndex(0);
  }, [item?.id, root]);
  useEffect(() => {
    setLabels(instrument === 'guitar' ? 'Fingers' : 'Degrees');
  }, [instrument]);
  usePageTitle(item?.name ?? 'Eintrag nicht gefunden');
  if (!item)
    return (
      <PageHeading
        eyebrow="NACHSCHLAGEN"
        title="Eintrag nicht gefunden"
        actions={<Link to="/scales">Zum Atlas</Link>}
      />
    );
  const list = scales;
  const index = list.findIndex((i) => i.id === item.id);
  const next = list[(index + 1) % list.length];
  const previous = list[(index + list.length - 1) % list.length];
  const other = scaleById(comparison);
  const parent = scale?.parentMode
    ? spellDegree(root, ['1', 'b7', 'b6', '5', '4', 'b3', 'b2'][scale.parentMode - 1])
    : undefined;
  const degrees = route.filter(isNote).map((n) => n.degree ?? '1');
  return (
    <>
      <PageHeading
        eyebrow={`MUSIKTHEORIE / ${textDe(scale?.category ?? '').toUpperCase()}`}
        title={`${germanNoteName(root)} ${item.name}`}
        description={
          item.description +
          (root !== selectedRoot
            ? ` · ${germanNoteName(selectedRoot)} = ${germanNoteName(root)}; vereinfachte enharmonische Schreibweise.`
            : '')
        }
      />
      <div className="formula-strip">
        <div>
          <span className="eyebrow">FORMEL · STUFEN GEGENÜBER DUR</span>
          <div className="degree-row">
            {item.degreeLabels.map((d, i) => (
              <span
                key={i}
                className={`${d === '1' ? 'root' : scale?.characteristic.includes(d) ? 'characteristic' : ''}`}
              >
                {pretty(d)}
              </span>
            ))}
          </div>
        </div>
        {scale && (
          <div>
            <span className="eyebrow">TONSCHRITTE · ABSTAND VON TON ZU TON</span>
            <strong className="steps">{scaleStepLabels(item.degreeLabels).join(' · ')}</strong>
          </div>
        )}
        <div className="notes-formula">
          <span className="eyebrow">NOTEN IN DIESER TONART</span>
          <strong>{degrees.map((d) => germanNoteName(spellDegree(root, d))).join('  ·  ')}</strong>
        </div>
      </div>
      <Section className="fretboard-panel" title="Griffbrett" aside="Eine Oktave · aufwärts">
        <div className="panel-tools">
          {instrument === 'guitar' && (
            <div className="guitar-shape-tabs" role="group" aria-label="Tonleiterlage wählen">
              {guitarShapes.map((shape, index) => (
                <button
                  type="button"
                  className={index === guitarShapeIndex ? 'active' : ''}
                  aria-pressed={index === guitarShapeIndex}
                  onClick={() => setGuitarShapeIndex(index)}
                  key={shape.id}
                >
                  {shape.name}
                </button>
              ))}
            </div>
          )}
          <Segmented
            label="Griffbrett-Beschriftung"
            options={
              instrument === 'guitar' ? ['Fingers', 'Degrees', 'Notes'] : ['Degrees', 'Notes']
            }
            value={labels}
            onChange={setLabels}
          />
        </div>
        <Fretboard
          key={`${item.id}-${root}`}
          events={route}
          root={root}
          range={routeRange(route)}
          labels={labels as 'Fingers' | 'Degrees' | 'Notes'}
          title={`${germanNoteName(root)} ${item.name}`}
          route
        />
      </Section>
      <Score events={route} />
      <div className="reference-play-row">
        <Playback events={route} scale />
        <span className="small-label">
          {route.filter(isNote).length} NOTEN ·{' '}
          {instrument === 'guitar' ? 'VERSCHIEBBARE LAGE' : 'EIN GEMEINSAMER FINGERSATZ'}
        </span>
      </div>
      <PianoPreview
        scaleNotes={degrees.map((d) => spellDegree(root, d))}
        highlighted={degrees.map((d) => spellDegree(root, d))}
        caption={`Dieselben Töne auf der Klaviatur: ${degrees.map((d) => germanNoteName(spellDegree(root, d))).join(' · ')}.`}
        to="/piano"
        linkLabel="Im Piano öffnen"
      />
      <div className="two-col">
        <Section title="Auf einen Blick">
          <dl className="reference-details">
            <dt>Harmonische Anwendung</dt>
            <dd>{scale?.applications ?? item.description}</dd>
            <dt>Charakteristik</dt>
            <dd>{scale?.signature ?? item.degreeLabels.map(pretty).join(' · ')}</dd>
            <dt>Akkordtöne</dt>
            <dd>
              {item.degreeLabels
                .filter((d) => ['1', 'b3', '3', 'b5', '5', '#5', 'b7', '7', 'bb7'].includes(d))
                .map(pretty)
                .join(' · ')}
            </dd>
            {parent && (
              <>
                <dt>Ursprungstonleiter</dt>
                <dd>
                  {germanNoteName(parent)}-Dur · Modus {scale?.parentMode}
                </dd>
              </>
            )}
            {scale?.id === 'melodic-minor' && (
              <>
                <dt>Abwärtsform</dt>
                <dd>
                  Hier gilt melodisch Moll auf- und abwärts (Jazz-Konvention). In der Klassik wird
                  abwärts häufig natürliches Moll verwendet.
                </dd>
              </>
            )}
          </dl>
        </Section>
        <Section title={scale ? 'Tonleitern vergleichen' : 'In der Praxis'}>
          {scale ? (
            <>
              <div className="comparison-control">
                <label htmlFor="compare-scale">{scale.name} vergleichen mit</label>
                <select
                  id="compare-scale"
                  value={comparison}
                  onChange={(e) => setComparison(e.target.value)}
                >
                  <option value="">Tonleiter wählen…</option>
                  {scales
                    .filter((s) => s.id !== scale.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              {other ? (
                <div className="compare-result">
                  {[scale, other].map((s, i) => (
                    <div key={s.id}>
                      <strong>{s.name}</strong>
                      <div className="compare-degrees">
                        {s.degreeLabels.map((d) => (
                          <span
                            key={d}
                            className={
                              ![other, scale][i].degreeLabels.includes(d) ? 'different' : ''
                            }
                          >
                            {pretty(d)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p>
                    <span className="diff-key" />
                    Markierte Stufen unterscheiden sich.{' '}
                    {other.degreeLabels
                      .filter((d) => !scale.degreeLabels.includes(d))
                      .map(pretty)
                      .join(', ') || 'Keine zusätzlichen Stufen'}{' '}
                    in {other.name}.
                  </p>
                </div>
              ) : (
                <p className="muted">
                  Höre, wie eine veränderte Stufe die Klangfarbe prägt: Vergleiche Dorisch mit
                  natürlichem Moll oder Dur mit Mixolydisch.
                </p>
              )}
            </>
          ) : (
            <>
              <p>
                Spiele Grundtöne bei Akkordwechseln. Übe anschließend, beim Wechsel die
                nächstgelegene Terz oder Septime anzusteuern.
              </p>
              <Link className="text-link" to="/basslines">
                Diese Töne in einer {profile.lineName} nutzen <Icon name="arrow" />
              </Link>
            </>
          )}
        </Section>
      </div>
      <div className="page-pagination">
        <Link to={`/scales/${previous.id}`}>
          <span>← ZURÜCK</span>
          {previous.name}
        </Link>
        <Link to={`/scales/${next.id}`}>
          <span>WEITER →</span>
          {next.name}
        </Link>
      </div>
      <p className="source-note">
        {profile.name}-Referenz · {scale ? 'Tonleiter-Atlas' : 'Akkordton-Atlas'} ·{' '}
        {mod(degreeSemitones('8')) === 0 ? `Standardstimmung · ${profile.tuningLabel}` : ''}
      </p>
    </>
  );
}
