import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { scales, scaleById } from '../data/catalog';
import { phraseRows } from '../data/theory';
import { useStore } from '../lib/store';
import { transposeRoute, routeRange, pretty, spellDegree, readableRoot } from '../lib/music';
import { germanNoteName } from '../lib/i18n';
import {
  PageHeading,
  Panel,
  Notice,
  Icon,
  ReferenceTable,
  Segmented,
  usePageTitle,
} from '../components/UI';
import { Fretboard } from '../components/Fretboard';
import { Playback } from '../components/Playback';
import { instrumentProfile } from '../lib/instrument';

const checklist = [
  'Finde die Tonart oder das tonale Zentrum.',
  'Erkenne die Akkordfolge.',
  'Lokalisiere die Grundtöne in einer Lage.',
  'Beginne mit Terzen und Quinten rund um die Grundtöne.',
  'Wähle eine Tonleiter, die zu Akkord und Kontext passt.',
  'Ziele auf einen Ton des nächsten Akkords.',
  'Baue ein kurzes Motiv aus zwei oder drei Tönen.',
  'Wiederhole es und variiere dann den Rhythmus.',
  'Lass Platz und kontrolliere die Tonlängen.',
  'Höre auf das Schlagzeug und den Rest der Band.',
];

export function Improvisation() {
  const { instrument } = useStore();
  const profile = instrumentProfile(instrument);
  usePageTitle('Improvisation – Einstieg');
  return (
    <>
      <PageHeading
        eyebrow={`${profile.nameUpper} / BEVOR DER TRACK LÄUFT`}
        title="Kurzer Leitfaden zum Improvisieren"
        description="Finde die Harmonie. Wähle eine kleine Idee. Gib ihr Rhythmus und Raum."
        actions={
          <Link to="/improvisation/play" className="button primary">
            <Icon name="play" />
            Spickzettel für den Notenständer
          </Link>
        }
      />
      <div className="impro-top">
        <Panel
          title="Checkliste für den Einstieg"
          className="checklist-panel"
          aside={<span className="small-label">VORBEREITUNG IN 60 SEKUNDEN</span>}
        >
          <ol className="impro-checklist">
            {checklist.map((text, i) => (
              <li key={text}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                {text}
              </li>
            ))}
          </ol>
        </Panel>
        <ScaleChooser />
      </div>
      <div className="note-hierarchy">
        <span>
          <strong>Akkordtöne</strong>
          <small>Sagen, welche Harmonie klingt</small>
        </span>
        <b>›</b>
        <span>
          <strong>Tonleitertöne</strong>
          <small>Verbinden die Zieltöne</small>
        </span>
        <b>›</b>
        <span>
          <strong>Chromatische Töne</strong>
          <small>Machen die Auflösung deutlich</small>
        </span>
      </div>
      <Panel title="Phrasen bilden statt Tonleitern rauf und runter">
        <ReferenceTable headers={['Mittel', 'Probier das']} rows={phraseRows} />
      </Panel>
      <div className="two-col">
        <Panel title="Wenn die Tonart unklar ist">
          <p>
            Bleib beim Hören zunächst bei Grundtönen und Quinten. Teste leise große gegen kleine
            Terz. Prüfe große gegen kleine Septime, wenn der Akkord erweitert klingt. Lass Platz,
            bis die Harmonie für dich Sinn ergibt.
          </p>
        </Panel>
        <Panel title="Eine nützliche Beschränkung">
          <p>
            Nimm für einen ganzen Song nur Grundton, Terz und Quinte jedes Akkords plus eine
            chromatische Annäherung. Spannung entsteht dann aus Rhythmus, Wiederholung, Lage und
            Tonlänge.
          </p>
          <Link className="text-link" to="/improvisation/latin">
            Improvisation in Salsa und Latin <Icon name="arrow" />
          </Link>
        </Panel>
      </div>
    </>
  );
}

/** The ids stay stable so the branching below reads the same as the source book. */
const qualities = [
  { id: 'Major', label: 'Dur-Dreiklang' },
  { id: 'Major 7', label: 'Großer Septakkord (maj7)' },
  { id: 'Minor', label: 'Moll-Dreiklang' },
  { id: 'Minor 7', label: 'Kleiner Septakkord (m7)' },
  { id: 'Dominant 7', label: 'Dominantseptakkord (7)' },
  { id: 'Half-diminished', label: 'Halbvermindert (m7♭5)' },
  { id: 'Minor-major 7', label: 'Moll mit großer Septime' },
];
const contexts = [
  { id: 'Major key', label: 'Dur-Tonart' },
  { id: 'Minor key', label: 'Moll-Tonart' },
  { id: 'Blues', label: 'Blues' },
  { id: 'Funk', label: 'Funk' },
  { id: 'Latin / Salsa', label: 'Latin / Salsa' },
];

export function ScaleChooser() {
  const { root } = useStore();
  const [quality, setQuality] = useState('Minor 7'),
    [context, setContext] = useState('Funk');
  let ids: string[] = [];
  let explanation = '';
  if (context === 'Blues') {
    ids = ['minor-pentatonic', 'blues', 'mixolydian'];
    explanation =
      'Die Bluessprache mischt große und kleine Terz stilistisch. Löse ausdrucksstarke Spannungen auf und folge trotzdem der Akkordfolge.';
  } else if (quality === 'Dominant 7' && context === 'Minor key') {
    ids = ['mixolydian', 'harmonic-minor'];
    explanation =
      'Für V7 → i nimm harmonisch Moll vom tonalen Zentrum aus; sein fünfter Modus passt auf die Dominante. Spiele harmonisch Moll nicht einfach vom Dominantgrundton aus. Prüfe Erweiterungen und Auflösung.';
  } else if (quality === 'Dominant 7') {
    ids = ['mixolydian'];
    explanation =
      'Beginne mit 1–3–5–♭7. Mixolydisch ist der Ausgangspunkt für eine unalterierte Dominante; alterierte Erweiterungen brauchen mehr Kontext.';
  } else if (quality === 'Half-diminished') {
    ids = ['locrian'];
    explanation =
      'Priorisiere 1–♭3–♭5–♭7. Lokrisch mit großer Sekunde kommt in Moll-Zusammenhängen ebenfalls vor.';
  } else if (quality === 'Minor-major 7') {
    ids = ['melodic-minor', 'harmonic-minor'];
    explanation =
      'Entscheidend ist die große Septime über dem Mollakkord. Prüfe, ob die Sexte groß oder klein ist.';
  } else if (quality.startsWith('Minor')) {
    ids =
      context === 'Minor key'
        ? ['natural-minor', 'minor-pentatonic']
        : ['dorian', 'minor-pentatonic', 'natural-minor'];
    explanation =
      'Eine große Sexte spricht für Dorisch, eine kleine für Äolisch. Moll-Pentatonik ist ein kompakter Ausgangsvorrat, solange die Sexte unklar ist. Entscheidend sind Akkordfunktion und Melodie.';
  } else {
    ids = quality === 'Major 7' ? ['major', 'lydian'] : ['major-pentatonic', 'major', 'lydian'];
    explanation =
      'Lande auf 1–3–5, bei maj7-Harmonie zusätzlich auf der 7. Lydisch passt, wenn die ♯4 getragen wird; eine Tonleiter garantiert nicht, dass jeder Ton ausgehalten werden kann.';
  }
  return (
    <Panel title="Eine Tonleiter zum Einstieg finden">
      <div className="scale-chooser">
        <div className="chooser-inputs">
          <label>
            Akkordtyp
            <select
              aria-label="Akkordtyp"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
            >
              {qualities.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Zusammenhang
            <select
              aria-label="Zusammenhang"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            >
              {contexts.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="eyebrow">WAHRSCHEINLICHE AUSGANGSPUNKTE</div>
        {ids.map((id, i) => {
          const s = scaleById(id)!;
          return (
            <Link className="suggested-scale" key={id} to={'/scales/' + id}>
              <span>
                <strong>
                  {context === 'Minor key' && quality === 'Dominant 7' && id === 'harmonic-minor'
                    ? 'Von der Zieltonart: '
                    : germanNoteName(root) + ' '}
                  {s.name}
                </strong>
                <small>{s.degreeLabels.map(pretty).join(' ')}</small>
              </span>
              {i === 0 ? (
                <span className="pill">Hier anfangen</span>
              ) : (
                <Icon name="arrow" size={15} />
              )}
            </Link>
          );
        })}
        <p>{explanation}</p>
      </div>
    </Panel>
  );
}

export function PlayAlong() {
  const { root: selectedRoot, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const [id, setId] = useState('dorian'),
    [labels, setLabels] = useState('Degrees');
  const scale = scaleById(id)!;
  const root = readableRoot(selectedRoot, scale.degreeLabels);
  const route = useMemo(() => transposeRoute(scale.fingering, root), [scale, root]);
  usePageTitle('Spickzettel für den Notenständer');
  const chord = scale.degreeLabels.filter(
    (d) => ['1', '3', 'b3', '5', 'b5', '7', 'b7'].includes(d) && !(id === 'blues' && d === 'b5'),
  );
  const rest = scale.degreeLabels.filter((d) => !chord.includes(d));
  return (
    <>
      <PageHeading
        eyebrow={`${profile.nameUpper} / FÜR DEN NOTENSTÄNDER`}
        title={`${germanNoteName(root)} ${scale.name}`}
        description="Halte die Zieltöne klar. Wiederhole ein kurzes Motiv. Lass Platz."
        actions={
          <label className="play-scale-select">
            <span>Tonleiter</span>
            <select aria-label="Tonleiter" value={id} onChange={(e) => setId(e.target.value)}>
              {scales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        }
      />
      <div className="play-priorities">
        <Panel>
          <span className="eyebrow">01 / AKKORDTÖNE ZUERST</span>
          <strong>{chord.map(pretty).join('  ·  ')}</strong>
          <p>{chord.map((d) => germanNoteName(spellDegree(root, d))).join(' · ')}</p>
        </Panel>
        <Panel>
          <span className="eyebrow">02 / VERBINDENDE TONLEITERTÖNE</span>
          <strong>{rest.map(pretty).join('  ·  ') || 'Nimm die Akkordtöne'}</strong>
          <p>{rest.map((d) => germanNoteName(spellDegree(root, d))).join(' · ')}</p>
        </Panel>
        <Panel>
          <span className="eyebrow">CHARAKTERISTISCHE FARBE</span>
          <strong>{scale.characteristic.map(pretty).join('  ·  ')}</strong>
          <p>{scale.signature}</p>
        </Panel>
      </div>
      <Panel
        title="Dein kompakter Fingersatz"
        aside={
          <Segmented
            label="Beschriftung"
            value={labels}
            onChange={setLabels}
            options={['Degrees', 'Notes']}
          />
        }
      >
        <Fretboard
          key={root + id}
          events={route}
          root={root}
          range={routeRange(route)}
          labels={labels as 'Degrees' | 'Notes'}
          route
        />
        <div className="play-formula">
          <span>{scale.degreeLabels.map(pretty).join('   ')}</span>
          <span>
            {scale.degreeLabels.map((d) => germanNoteName(spellDegree(root, d))).join(' · ')}
          </span>
        </div>
      </Panel>
      <Notice>
        Die Akkordton-Priorität beschreibt hier die Tonika-Harmonie der gewählten Tonleiter. Folge
        jedem tatsächlichen Akkordwechsel; verbindende Töne sind nicht überall sichere Ruhepunkte.
        Die ♭5 im Blues ist eine Durchgangsspannung.
      </Notice>
      <div className="reference-play-row">
        <Playback events={route} scale />
        <Link className="text-link" to="/drums">
          Groove dazu starten <Icon name="arrow" size={15} />
        </Link>
      </div>
      <div className="play-reminders">
        <span>GRUNDTÖNE → AKKORDTÖNE → DURCHGANGSTÖNE</span>
        <span>Wiederholen · Antworten · Atmen</span>
        <Link to={'/scales/' + id}>Zur vollständigen Tonleiter →</Link>
      </div>
    </>
  );
}
