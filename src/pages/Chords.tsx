import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { chordById, chords } from '../data/chords';
import { chordFamilies } from '../lib/chord-types';
import type { ChordDefinition, ChordFamily } from '../lib/chord-types';
import { practicalVoicing } from '../lib/chord-practice';
import { buildChordRoute } from '../lib/route';
import {
  degreeIntervalName,
  noteName,
  pitchClass,
  pretty,
  readableRoot,
  routeRange,
  spellDegree,
  transposeRoute,
} from '../lib/music';
import { useNoteLabel, useStore } from '../lib/store';
import {
  Icon,
  Notice,
  PageHeading,
  ReferenceTable,
  Section,
  Segmented,
  usePageTitle,
  Konzept,
} from '../components/UI';
import { Fretboard } from '../components/Fretboard';
import { PianoPreview } from '../components/PianoPreview';
import { Score } from '../components/Score';
import { Playback } from '../components/Playback';
import { GuitarChordVoicings } from '../components/GuitarChordVoicings';
import '../chords.css';
import { instrumentProfile } from '../lib/instrument';

/* ------------------------------------------------------------------ index */

export function ChordIndex() {
  usePageTitle('Akkorde');
  const { root, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const label = useNoteLabel();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<ChordFamily | 'alle'>('alle');
  const matches = chords.filter(
    (chord) =>
      (family === 'alle' || chord.family === family) &&
      `${chord.symbol} ${chord.nameDe} ${chord.aliases.join(' ')} ${chord.formula.join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="HARMONIE / AKKORDE & ARPEGGIEN"
        title="Akkorde"
        description="Ein Akkord ist ein Vorrat an Tönen. Ein Arpeggio ist derselbe Vorrat nacheinander gespielt. Beides steht hier auf einer Seite."
      />
      <Konzept title="Wie ein Akkordsymbol gebaut ist">
        <p>
          Ein Akkordsymbol besteht aus zwei Teilen: dem <b>Grundton</b> und einem <b>Zusatz</b>, der
          alles andere beschreibt. In <b>Cmaj7</b> ist C der Grundton und maj7 der Zusatz. Der
          Zusatz bleibt in jeder Tonart gleich – deshalb ist ein Akkord eine Formel aus Stufen und
          keine feste Liste von Tönen.
        </p>
        <p>
          Die Stufen werden gegen die Durtonleiter gezählt: <b>1 3 5</b> ist ein Durdreiklang,
          <b> 1 ♭3 5</b> ein Mollakkord. Die <b>Terz</b> entscheidet über das Tongeschlecht, die
          <b> Septime</b> über die Funktion. Alles ab der <b>9</b> ist eine Erweiterung: 9, 11 und
          13 sind dieselben Töne wie 2, 4 und 6, nur eine Oktave höher gedacht.
        </p>
        <p>
          Wichtig auf {profile.name === 'Bass' ? 'dem Bass' : 'der Gitarre'}: Ein Symbol sagt,
          welche Töne <i>gemeint</i> sind, nicht welche gespielt werden. Bei erweiterten Akkorden
          lässt man regelmäßig Quinte und None weg. Jede Akkordseite zeigt beides getrennt an.
        </p>
      </Konzept>
      <div className="chord-filters">
        <label className="filter-search">
          <Icon name="search" />
          <input
            aria-label="Akkorde durchsuchen"
            placeholder="Symbol, Name oder Formel…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="tool-field">
          <span>Familie</span>
          <select
            aria-label="Akkordfamilie"
            value={family}
            onChange={(event) => setFamily(event.target.value as ChordFamily | 'alle')}
          >
            <option value="alle">Alle {chords.length} Akkorde</option>
            {chordFamilies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {chordFamilies
        .filter((item) => matches.some((chord) => chord.family === item.id))
        .map((item) => (
          <section className="chord-family" key={item.id}>
            <div className="chord-family-head">
              <h2>{item.name}</h2>
              <p>{item.description}</p>
            </div>
            <div className="chord-grid">
              {matches
                .filter((chord) => chord.family === item.id)
                .map((chord) => (
                  <Link className="chord-card" to={`/chords/${chord.id}`} key={chord.id}>
                    <strong>{label.chord(root, chord.symbol)}</strong>
                    <span className="chord-card-name">{chord.nameDe}</span>
                    <span className="chord-card-formula">
                      {chord.formula.map(pretty).join(' ')}
                    </span>
                    <span className="chord-card-notes">
                      {chord.formula
                        .map((degree) => label.note(spellDegree(root, degree)))
                        .join(' · ')}
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        ))}
      {!matches.length && (
        <Notice>Kein Akkord passt zu dieser Suche. Versuche „m7“, „alt“ oder „1 3 5 b7“.</Notice>
      )}
      <Notice>
        <strong>Symbol und Voicing sind nicht dasselbe.</strong> Die Formel sagt, was das Symbol
        bedeutet. Was du tatsächlich greifst, ist fast immer weniger – bei erweiterten Akkorden
        zeigt jede Akkordseite beides.
      </Notice>
    </>
  );
}

/** Old /arpeggios/:id links keep working: the ids never changed. */
export function ArpeggioRedirect() {
  const { id } = useParams();
  return <Navigate to={`/chords/${id ?? ''}`} replace />;
}

/* ----------------------------------------------------------------- detail */

export function ChordPage() {
  const { id } = useParams();
  const chord = id ? chordById(id) : undefined;
  usePageTitle(chord ? chord.nameDe : 'Akkord nicht gefunden');
  if (!chord)
    return (
      <PageHeading
        eyebrow="AKKORDE"
        title="Akkord nicht gefunden"
        actions={<Link to="/chords">Zur Akkord-Übersicht</Link>}
      />
    );
  return <ChordDetail key={chord.id} chord={chord} />;
}

function ChordDetail({ chord }: { chord: ChordDefinition }) {
  const { root: selectedRoot, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const label = useNoteLabel();
  const root = readableRoot(selectedRoot, [...chord.formula]);
  const [labels, setLabels] = useState('Degrees');

  const base = useMemo(() => buildChordRoute(chord), [chord]);
  const route = useMemo(() => transposeRoute(base, root), [base, root]);

  const notes = chord.formula.map((degree) => spellDegree(root, degree));
  const guide = chord.formula.filter((degree) => ['3', 'b3', 'b7', '7', 'bb7'].includes(degree));
  const voicing = practicalVoicing(chord);
  const omitted = chord.formula.filter((degree) => !voicing.includes(degree));

  return (
    <>
      <PageHeading
        eyebrow={`HARMONIE / ${chordFamilies.find((item) => item.id === chord.family)!.name.toUpperCase()}`}
        title={label.chord(root, chord.symbol)}
        description={`${chord.nameDe} · ${chord.descriptionDe}`}
      />

      <div className="chord-formula-strip">
        {chord.formula.map((degree) => (
          <span
            key={degree}
            className={`formula-chip ${chord.required.includes(degree) ? 'is-required' : 'is-omissible'} ${chord.alterations.includes(degree) ? 'is-altered' : ''}`}
            title={chord.required.includes(degree) ? 'Kernton' : 'wird oft weggelassen'}
          >
            <b>{pretty(degree)}</b>
            <small>{label.note(spellDegree(root, degree))}</small>
            {/* Heses is correct but unplayable as read; say what it sounds like. */}
            {spellDegree(root, degree).length > 2 && (
              <em>
                klingt wie {label.note(noteName(pitchClass(spellDegree(root, degree)), true))}
              </em>
            )}
          </span>
        ))}
        {/* Only explain the marks this chord actually uses. */}
        <span className="formula-legend">
          {[
            'Gefüllt = Kerntöne',
            chord.omissible.length ? 'Umrandet = oft weggelassen' : '',
            chord.alterations.length ? 'Rahmen = alteriert' : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>

      {instrument === 'guitar' && <GuitarChordVoicings root={root} chord={chord} />}

      <Section className="fretboard-panel" title="Griffbrett" aside="Alle Positionen · Bünde 0–15">
        <div className="panel-tools">
          <Segmented
            label="Griffbrett-Beschriftung"
            value={labels}
            onChange={setLabels}
            options={['Degrees', 'Notes']}
          />
        </div>
        <Fretboard
          key={root + chord.id}
          root={root}
          events={route}
          range={[0, 15]}
          labels={labels as 'Degrees' | 'Notes'}
          title={`${label.chord(root, chord.symbol)}`}
        />
        <p className="tool-footnote">
          Tippe eine Position an, um Ton und Intervall zu sehen. Die Töne sind{' '}
          {notes.map(label.note).join(' · ')}.
        </p>
      </Section>

      <Section title="Arpeggio · ein Fingersatz in einer Lage" aside="Aufwärts">
        <Fretboard
          key={`arp-${root}-${chord.id}`}
          root={root}
          events={route}
          range={routeRange(route)}
          labels="Degrees"
          route
          title={`${label.chord(root, chord.symbol)} Arpeggio`}
        />
      </Section>

      <Score events={route} />
      <div className="reference-play-row">
        <Playback events={route} scale label="Arpeggio abspielen" />
        <span className="small-label">{route.length} TÖNE · EIN GEMEINSAMER FINGERSATZ</span>
      </div>

      <PianoPreview
        scaleNotes={notes}
        highlighted={notes}
        caption={`Derselbe Akkord auf der Klaviatur: ${notes.map(label.note).join(' · ')}.`}
        to={`/piano?akkord=${chord.id}`}
        linkLabel="Akkord im Piano öffnen"
      />

      <div className="two-col">
        <Section title="Was das Symbol bedeutet">
          <ReferenceTable
            headers={['Stufe', 'Ton', 'Intervall', 'Rolle']}
            rows={chord.formula.map((degree) => [
              pretty(degree),
              label.note(spellDegree(root, degree)),
              degreeIntervalName(degree),
              chord.required.includes(degree)
                ? 'Kernton'
                : chord.alterations.includes(degree)
                  ? 'Alteration'
                  : chord.extensions.includes(degree)
                    ? 'Erweiterung'
                    : 'oft weggelassen',
            ])}
          />
          {chord.noteDe && <Notice>{chord.noteDe}</Notice>}
        </Section>
        <Section
          title={`Praktische Tonauswahl auf ${profile.name === 'Bass' ? 'dem Bass' : 'der Gitarre'}`}
        >
          <p className="voicing-line">
            {voicing.map((degree) => label.note(spellDegree(root, degree))).join('  ·  ')}
          </p>
          <p className="tool-footnote">
            {omitted.length
              ? `Hier ohne ${omitted.map(pretty).join(' und ')}: Die Kerntöne bleiben erhalten.`
              : 'Hier ist die vollständige Akkordformel zu sehen.'}
          </p>
          {chord.tertianStack && (
            <>
              <div className="eyebrow">Vollständiger Terzaufbau</div>
              <p className="tertian-line">
                {chord.tertianStack.map((degree) => (
                  <span key={degree} className={chord.avoid?.includes(degree) ? 'is-avoided' : ''}>
                    {pretty(degree)}
                  </span>
                ))}
              </p>
              <p className="tool-footnote">
                Durchgestrichen: im Symbol bewusst ausgelassen, weil dieser Ton mit einem Akkordton
                reibt.
              </p>
            </>
          )}
        </Section>
      </div>

      <div className="two-col">
        {guide.length === 2 && (
          <Section title="Die beiden wichtigsten Töne">
            <p className="voicing-line">
              {guide
                .map((degree) => `${pretty(degree)} = ${label.note(spellDegree(root, degree))}`)
                .join('   ·   ')}
            </p>
            <p>
              Terz und Septime heißen <b>Gerüsttöne</b> (im Jazz meist „Guide Tones“). Sie bestimmen
              das Tongeschlecht und die Funktion; Grundton und Quinte tun das nicht. Wenn du eine
              Verbindung zwischen zwei Akkorden suchst, führe zuerst diese beiden Töne.
            </p>
          </Section>
        )}
        {chord.aliases.length > 0 && (
          <Section title="Andere Schreibweisen">
            <p className="alias-row">
              {chord.aliases.map((alias) => (
                <span key={alias}>{alias}</span>
              ))}
            </p>
          </Section>
        )}
      </div>

      <div className="chord-nav">
        <Link to="/chords">
          <Icon name="arrow" size={15} /> Alle {chords.length} Akkorde
        </Link>
        <Link to="/harmony">Stufenakkorde in {label.key(root, false)}</Link>
      </div>
    </>
  );
}
