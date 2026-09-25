import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { basslineLayers, latinRows } from '../data/theory';
import { exercises } from '../data/catalog';
import { pretty, routeRange, spellDegree } from '../lib/music';
import { germanNoteName } from '../lib/i18n';
import { buildBassline, layerNames } from '../lib/bassline';

import { PageHeading, Panel, ReferenceTable, Notice, Icon, usePageTitle } from '../components/UI';
import { Fretboard } from '../components/Fretboard';
import { Score } from '../components/Score';
import { Playback } from '../components/Playback';
import { ExercisePattern } from './Exercises';
import { instrumentProfile } from '../lib/instrument';
/** The layer ids stay stable for buildBassline(); only the labels are translated. */
const layerLabels: Record<string, string> = {
  Root: 'Grundton',
  Fifth: 'Quinte',
  Third: 'Terz',
  Seventh: 'Septime',
  'Chromatic approach': 'Chromatische Annäherung',
  'Passing tones': 'Durchgangstöne',
};

export function Basslines() {
  const { root, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  usePageTitle(`${profile.lineName} bauen`);
  const progressionRoots = ['1', '6', '4', '5'].map((degree) => spellDegree(root, degree));
  const progressionFormulas = [
    ['1', '3', '5'],
    ['1', 'b3', '5'],
    ['1', '3', '5'],
    ['1', '3', '5', 'b7'],
  ];
  return (
    <>
      <PageHeading
        eyebrow={`${profile.nameUpper} / LINIEN GESTALTEN`}
        title="Die Linie in Schichten bauen"
        description="Erst der Rhythmus, dann die Grundtöne, dann die Akkordtöne, zuletzt die Annäherungen. Jeder zusätzliche Ton braucht eine Aufgabe."
      />
      <div className="construction-flow">
        {basslineLayers.map(([title], i) => (
          <a href={'#' + title.toLowerCase().replaceAll(' ', '-')} key={title}>
            <span>0{i + 1}</span>
            {title}
            {i < 5 && <Icon name="arrow" size={14} />}
          </a>
        ))}
      </div>
      <BasslineBuilder />
      <div className="two-col">
        {basslineLayers.map(([title, text]) => (
          <Panel title={title} id={title.toLowerCase().replaceAll(' ', '-')} key={title}>
            <p>{text}</p>
            {title === 'Stimmführung' && (
              <p>
                In Dm7 → G7 → Cmaj7 ist F beiden ersten Akkorden gemeinsam und löst sich dann
                abwärts nach E auf. Das H in G7 kann aufwärts zum C führen. Nimm immer das nächste
                sinnvolle Ziel.
              </p>
            )}
            {title === 'Annäherungstöne' && (
              <p>
                Zielton C: H → C nähert sich von unten, D♭ → C von oben. D → H → C umspielt das Ziel
                von beiden Seiten.
              </p>
            )}
          </Panel>
        ))}
      </div>
      <div className="two-col">
        <Panel title={`Die erste Akkordfolge aus dem Buch · ${germanNoteName(root)}-Dur`}>
          <ReferenceTable
            headers={progressionRoots.map(
              (note, i) => germanNoteName(note) + ['', 'm', '', '7'][i],
            )}
            rows={[
              progressionRoots.map((note, i) =>
                progressionFormulas[i].map((d) => germanNoteName(spellDegree(note, d))).join(' · '),
              ),
              progressionRoots.map((note, i) =>
                ['1', '5', i === 1 ? 'b3' : i === 3 ? 'b7' : '3', '5']
                  .map((d) => germanNoteName(spellDegree(note, d)))
                  .join(' · '),
              ),
            ]}
          />
          <p>
            Bleib bei einem gleichmäßigen Viertelpuls. Setze eine kurze Annäherung erst dann ein,
            wenn das nächste Ziel klar ist.
          </p>
        </Panel>
        <Panel title="Pausen gehören zur Linie">
          <p>
            Überlege dir genauso sorgfältig, wo ein Ton aufhört, wie du entscheidest, wo er beginnt.
            Eine Pause, ein kurzer Ton oder ein ausgehaltener Ton verändern den Groove, ohne dass
            sich eine einzige Tonhöhe ändert.
          </p>
          <Link className="text-link" to="/basslines/latin">
            Anwendung in Salsa und Latin <Icon name="arrow" />
          </Link>
        </Panel>
      </div>
    </>
  );
}
function BasslineBuilder() {
  const { root, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const [layers, setLayers] = useState<string[]>(['Root', 'Fifth', 'Third']),
    [bar, setBar] = useState(0);
  const line = useMemo(() => buildBassline(root, layers), [root, layers]);
  const current = line[bar];
  const all = useMemo(() => line.flatMap((b) => b.events), [line]);
  return (
    <Panel
      title={`${profile.lineName}n-Baukasten`}
      aside={<span className="small-label">ii–V–I · VIER TAKTE</span>}
    >
      <div className="builder-body">
        <div className="builder-chords" role="group" aria-label="Takt der Akkordfolge wählen">
          {line.map((b, i) => (
            <button
              className={i === bar ? 'active' : ''}
              aria-pressed={i === bar}
              onClick={() => setBar(i)}
              key={i}
            >
              <small>TAKT {i + 1}</small>
              <strong>{pretty(b.symbol)}</strong>
              <span>{['ii7', 'V7', 'Imaj7', 'Imaj7'][i]}</span>
            </button>
          ))}
        </div>
        <div className="layer-toggles">
          {layerNames.map((layer) => (
            <label key={layer}>
              <input
                type="checkbox"
                checked={layers.includes(layer)}
                onChange={() =>
                  setLayers((old) =>
                    old.includes(layer) ? old.filter((x) => x !== layer) : [...old, layer],
                  )
                }
              />
              {layerLabels[layer]}
            </label>
          ))}
        </div>
        <div className="available-notes">
          <span className="eyebrow">VERFÜGBAR IN TAKT {bar + 1}</span>
          {current.available.map((note, i) => (
            <span
              key={i}
              className={`available-note ${note.role === 'Akkordton' ? 'chord-note' : 'passing-note'}`}
            >
              <strong>{germanNoteName(note.name)}</strong>
              <small>
                {note.role === 'Akkordton'
                  ? `Akkordton · ${pretty(note.degree)}`
                  : pretty(note.role)}
              </small>
            </span>
          ))}
        </div>
        <Notice>
          Der erste Ton setzt den gewählten stabilen Ton. Quinten und Terzen füllen die Zelle, ein
          Durchgangston kann die 3 verbinden, und eine chromatische Annäherung auf der 4 führt zum
          Grundton des nächsten Takts. Das sind Lehrbeispiele in Vierteln.
        </Notice>
        {current.events.length ? (
          <>
            <Fretboard
              events={current.events}
              range={routeRange(current.events)}
              root={current.root}
              labels="Notes"
              title={`Takt ${bar + 1} · ${current.symbol}`}
              route
            />
            <Score events={current.events} meter />
            <div className="reference-play-row">
              <Playback events={all} />
              <span className="small-label">
                ALLE VIER TAKTE ABSPIELEN · ANSICHT TAKT {bar + 1}
              </span>
            </div>
          </>
        ) : (
          <Notice>
            Aktiviere mindestens eine Akkordton-Schicht, damit die Linie einen stabilen Startpunkt
            bekommt.
          </Notice>
        )}
      </div>
    </Panel>
  );
}
export function Latin({ improvisation = false }: { improvisation?: boolean }) {
  const { instrument } = useStore();
  const profile = instrumentProfile(instrument);
  usePageTitle(
    improvisation ? 'Salsa- und Latin-Improvisation' : `Salsa- und Latin-${profile.lineName}n`,
  );
  const example = exercises.find((e) => e.id === 'M19')!;
  return (
    <>
      <PageHeading
        eyebrow={
          improvisation
            ? `${profile.nameUpper} / IMPROVISATION / LATIN`
            : `${profile.nameUpper} / ${profile.lineName.toUpperCase()}N / LATIN`
        }
        title="Salsa und Latin: zuerst der Groove"
        description="Halte die wiederkehrende Zelle, höre die Percussion und wisse, wohin der nächste Akkord geht."
      />
      <Notice>
        <strong>Aus dem Buch:</strong> Der Aufbau aus Akkordtönen bleibt derselbe; die rhythmische
        Platzierung und das Zusammenspiel mit der Percussion formen die Linie. Das sind
        Ausgangspunkte zum Üben, keine Regeln für jeden Latin-Stil und jedes Arrangement.
      </Notice>
      <Panel title="Kurz und praktisch">
        <ReferenceTable headers={['Schwerpunkt', 'Anwendung']} rows={latinRows} />
      </Panel>
      <Panel title="Die sparsame Zwei-Ton-Zelle">
        <p>
          M19 aus dem Buch legt die Quinte auf das „und“ von 2 und den Grundton des aktuellen
          Akkords auf die 4 – über Dm7, dann G7. Die Zählzeiten 1 und 3 bleiben bewusst frei. Eine
          echte Antizipation nimmt dagegen einen Ton des kommenden Akkords und kann über den Wechsel
          hinweg klingen.
        </p>
        <div className="rhythm-grid">
          {['1', '&', '2', '&', '3', '&', '4', '&'].map((beat, i) => (
            <div className={[3, 6].includes(i) ? 'hit' : ''} key={i}>
              <span>{beat}</span>
              <strong>{i === 3 ? '5' : i === 6 ? '1' : '·'}</strong>
              <small>{i === 3 ? 'Quinte' : i === 6 ? 'Grundton' : 'Pause'}</small>
            </div>
          ))}
        </div>
      </Panel>
      <ExercisePattern exercise={example} />
      <div className="two-col">
        <Panel title="Erst hören, dann variieren">
          <p>
            Achte darauf, wie sich {profile.name}, Conga, Timbales, Klavier und Gesang den Raum
            teilen. Wiederhole eine tragfähige Zelle. Verändere einen Schluss oder eine Annäherung
            und lass die rhythmische Identität dabei klar erkennbar.
          </p>
          <Link className="text-link" to="/exercises/musical/20">
            M20 · Latin-Turnaround ii–V–I–VI →
          </Link>
        </Panel>
        <Panel title="Anwendung in dreißig Minuten">
          <p>
            Saubere Saitenwechsel, gedämpfte Sprünge, Akkordtöne von Dominant- und Mollseptakkorden,
            dann zwei Latin-Übezellen.
          </p>
          <Link className="text-link" to="/programs/salsa-latin">
            Das Salsa- und Latin-Programm starten →
          </Link>
        </Panel>
      </div>
    </>
  );
}
