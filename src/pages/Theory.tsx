import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { scales, theoryPages } from '../data/catalog';
import { chords } from '../data/chords';
import { readingRows, articulationRows, rhythmRows } from '../data/theory';
import { useStore } from '../lib/store';
import { germanNoteName, textDe } from '../lib/i18n';
import { chordLabel } from '../lib/music';
import {
  pretty,
  spellDegree,
  harmony,
  keySignature,
  keyRoots,
  roots,
  intervalBetween,
  pitchClass,
  mod,
  chromaticDegreesFor,
  degreeIntervalName,
  allPositions,
  readableRoot,
} from '../lib/music';
import type { MusicEvent } from '../lib/music';
import {
  PageHeading,
  Panel,
  ReferenceTable,
  Segmented,
  ItemLink,
  Notice,
  usePageTitle,
} from '../components/UI';
import { Fretboard } from '../components/Fretboard';
import { Score } from '../components/Score';
import { instrumentProfile } from '../lib/instrument';
export function Chords() {
  const { root, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  usePageTitle('Akkorde & Formeln');
  return (
    <>
      <PageHeading
        eyebrow="MUSIKTHEORIE / AKKORDE"
        title="Akkorde & ihre Töne"
        description="Symbole lesen, Formeln verstehen und Harmonie hörbar machen."
      />
      <Panel title={`Akkordaufbau ab ${germanNoteName(root)}`}>
        <ReferenceTable
          headers={['Akkord', 'Symbol', 'Formel', 'Noten', `${profile.name}-Praxis`]}
          rows={chords
            .filter((c) => ['triad', 'suspended', 'seventh'].includes(c.family))
            .map((c) => [
              <Link to={`/chords/${c.id}`}>{c.nameDe}</Link>,
              <strong>{chordLabel(root, c.symbol)}</strong>,
              c.formula.map(pretty).join(' '),
              c.formula.map((d) => germanNoteName(spellDegree(root, d))).join(' · '),
              c.descriptionDe,
            ])}
        />
        <p className="tool-footnote">
          Das sind die Grundtypen. Alle {chords.length} Akkorde – bis in die erweiterte Jazzharmonik
          – findest du im <Link to="/chords">Akkord-Atlas</Link>.
        </p>
      </Panel>
      <div className="two-col">
        <Panel title="Akkordcharakter hören">
          <p>
            Grundton und Quinte geben Stabilität. Die Terz unterscheidet Dur und Moll; die Septime
            prägt den Dur-, Dominant- oder Mollseptakkord.
          </p>
          <Link className="text-link" to="/chords">
            Zum Akkord-Atlas →
          </Link>
        </Panel>
        <Panel title="Akkorde einer Tonart">
          <p>
            Diatonische Harmonie schichtet Terzen aus den Tönen einer Tonart. Ändere den globalen
            Grundton, um dieselben Beziehungen in anderen Tonarten zu erkunden.
          </p>
          <Link className="text-link" to="/harmony">
            Diatonische Harmonie erkunden →
          </Link>
        </Panel>
      </div>
    </>
  );
}
export function Harmony({ embedded = false }: { embedded?: boolean }) {
  const { root: selectedRoot } = useStore();
  const [mode, setMode] = useState('Major');
  const root = readableRoot(
    selectedRoot,
    mode === 'Major' ? ['1', '2', '3', '4', '5', '6', '7'] : ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
  );
  const chords = harmony(root, mode === 'Natural minor');
  usePageTitle('Diatonische Harmonie');
  return (
    <>
      {!embedded && (
        <PageHeading
          eyebrow="MUSIKTHEORIE / DIATONISCHE HARMONIE"
          title={`${germanNoteName(root)} · ${textDe(mode)}`}
          description="Sieben Stufen, eine Akkordfamilie. Folge den Grundtönen und höre die Zusammenhänge."
        />
      )}
      <Panel
        title="Akkorde der Tonart"
        aside={
          <Segmented
            label="Tongeschlecht"
            value={mode}
            onChange={setMode}
            options={['Major', 'Natural minor']}
          />
        }
      >
        <div className="harmony-cards">
          {chords.map((c) => (
            <div key={c.roman}>
              <span className="roman">{c.roman}</span>
              <strong>{germanNoteName(c.root)}</strong>
              <span>{textDe(c.quality)}</span>
              <small>{chordLabel(c.root, c.symbol)}</small>
            </div>
          ))}
        </div>
        <ReferenceTable
          headers={['Stufe', 'Dreiklang', 'Septakkord', 'Dreiklangstöne']}
          rows={chords.map((c) => [
            c.roman,
            `${germanNoteName(c.root)} ${textDe(c.quality)}`,
            chordLabel(c.root, c.symbol),
            (c.quality === 'Major'
              ? ['1', '3', '5']
              : c.quality === 'Minor'
                ? ['1', 'b3', '5']
                : ['1', 'b3', 'b5']
            )
              .map((d) => germanNoteName(spellDegree(c.root, d)))
              .join(' · '),
          ])}
        />
      </Panel>
      <Notice>
        {mode === 'Natural minor'
          ? `In funktionaler Mollharmonik wird v oft zu V7. In ${germanNoteName(root)}-Moll enthält ${germanNoteName(spellDegree(root, '5'))}7 den erhöhten Leitton ${germanNoteName(spellDegree(root, '7'))} und löst sich nach ${germanNoteName(root)}-Moll auf.`
          : 'Das Stufenmuster in Dur lautet I – ii – iii – IV – V – vi – vii°. Eine weitere diatonische Terz ergibt maj7 – m7 – m7 – maj7 – 7 – m7 – m7♭5.'}
      </Notice>
    </>
  );
}
/** Each chromatic step with every spelling that is actually used for it. */
const intervalRows: [number, string[]][] = [
  [0, ['1']],
  [1, ['b2', '#1']],
  [2, ['2']],
  [3, ['b3', '#2']],
  [4, ['3']],
  [5, ['4']],
  [6, ['#4', 'b5']],
  [7, ['5']],
  [8, ['b6', '#5']],
  [9, ['6']],
  [10, ['b7']],
  [11, ['7']],
];

export function Theory() {
  const { id } = useParams();
  usePageTitle(textDe(theoryPages.find((x) => x[0] === id)?.[1] ?? 'Theorie kompakt'));
  const { root, instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const notationRows =
    instrument === 'bass'
      ? [
          ['Standardstimmung', 'E–A–D–G, von tief nach hoch.'],
          ...readingRows.slice(1),
        ]
      : [
          [
            'Standardstimmung',
            'E–A–D–G–H–E, von tief nach hoch. Die hohe E-Saite steht in TAB auf der obersten Linie.',
          ],
          ['Linien im Violinschlüssel', 'E–G–H–D–F, von der untersten Linie aufwärts.'],
          ['Zwischenräume im Violinschlüssel', 'F–A–C–E, von unten aufwärts.'],
          [
            'Notierter Tonumfang',
            'Leersaiten werden als E3, A3, D4, G4, H4, E5 notiert. Sie klingen eine Oktave tiefer.',
          ],
          ...readingRows.slice(4),
        ];
  const instrumentArticulationRows =
    instrument === 'bass'
      ? articulationRows.map((row) => {
          if (row[0] === 'Glissando / Slide') return [row[0], 'Glissando-Linie', row[2]];
          if (row[0] === 'Hammer-on / Pull-off') return [row[0], 'Bindebogen · H / P', row[2]];
          return row;
        })
      : articulationRows;
  const [target, setTarget] = useState('Eb');
  const [signatureRoot, setSignatureRoot] = useState(root);
  useEffect(() => setSignatureRoot(root), [root]);
  const signature = keySignature(signatureRoot);
  const rhythm = useMemo(
    () =>
      [
        { string: 'A', fret: 5, duration: 'w' },
        ...Array.from({ length: 2 }, () => ({ string: 'A', fret: 5, duration: 'h' })),
        ...Array.from({ length: 4 }, () => ({ string: 'A', fret: 5, duration: 'q' })),
        ...Array.from({ length: 8 }, () => ({ string: 'A', fret: 5, duration: '8' })),
      ] as MusicEvent[],
    [],
  );
  if (!id)
    return (
      <>
        <PageHeading
          eyebrow="MUSIKTHEORIE / NACHSCHLAGEN"
          title="Theorie kompakt"
          description={`Schnelle Antworten, während ${profile.name === 'Bass' ? 'der Bass' : 'die Gitarre'} in deinen Händen bleibt.`}
        />
        <div className="two-col">
          {theoryPages.map(([key, title]) => (
            <Panel key={key}>
              <ItemLink
                title={textDe(title)}
                description={
                  {
                    fretboard: 'Alle Noten, Stimmung und Oktavgriffe',
                    intervals: 'Stufen, Halbtonschritte und Intervallrechner',
                    'scale-formulas': 'Alle Tonleiterformeln in einer Tabelle',
                    modes: 'Die sieben Modi der Durtonleiter',
                    'chord-formulas': 'Dreiklänge, Septakkorde und Vorhalte',
                    'key-signatures': 'Vorzeichen, paralleles Moll und Akkorde',
                    harmony: 'Akkordfamilien in Dur und natürlichem Moll',
                    rhythm: 'Notenwerte, Pausen und Zählweise',
                    notation:
                      instrument === 'bass'
                        ? 'Bassschlüssel, Notenwerte und Artikulation'
                        : 'Violinschlüssel, Artikulation und TAB-Zeichen',
                    transposition: 'Griffe verschieben und Intervalle erhalten',
                  }[key]
                }
                to={'/theory/' + key}
              />
            </Panel>
          ))}
        </div>
      </>
    );
  return (
    <>
      <PageHeading
        eyebrow="MUSIKTHEORIE / GRUNDLAGEN"
        title={textDe(theoryPages.find((x) => x[0] === id)?.[1] ?? 'Musiktheorie')}
        description="Vertraute Notation. Klare Zusammenhänge. Schnelle Antworten."
      />
      {id === 'fretboard' && (
        <>
          <Panel title="Das gesamte Griffbrett · Bünde 0–24">
            <Fretboard
              root={root}
              events={allPositions(root, chromaticDegreesFor(root))}
              range={[0, 24]}
              labels="Notes"
            />
          </Panel>
          <div className="two-col">
            <Panel title="Verschiebbare Oktave">
              <p>
                Vom Grundton auf E- oder A-Saite gehst du zwei Saiten Richtung G und zwei Bünde
                höher. A-Saite, Bund 5 (D) → G-Saite, Bund 7 (D).
              </p>
            </Panel>
            <Panel title="Oktave auf derselben Saite">
              <p>
                Gehe auf einer Saite zwölf Bünde weiter. Bund 12 erklingt eine Oktave über der
                Leersaite, Bund 24 zwei Oktaven darüber.
              </p>
            </Panel>
          </div>
        </>
      )}
      {id === 'intervals' && (
        <>
          <Panel title="Intervallrechner">
            <div className="theory-calculator">
              <div>
                <span className="eyebrow">GRUNDTON</span>
                <strong>{germanNoteName(root)}</strong>
              </div>
              <label>
                Zielton
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  {[...roots, 'D#', 'G#', 'A#', 'C#', 'Gb', 'Cb'].map((r) => (
                    <option key={r} value={r}>
                      {germanNoteName(r)}
                    </option>
                  ))}
                </select>
              </label>
              <span className="calculator-arrow">→</span>
              <div>
                <span className="eyebrow">INTERVALL</span>
                <strong>{textDe(intervalBetween(root, target))}</strong>
                <p>
                  {mod(pitchClass(target) - pitchClass(root))}{' '}
                  {mod(pitchClass(target) - pitchClass(root)) === 1
                    ? 'Halbtonschritt'
                    : 'Halbtonschritte'}{' '}
                  · innerhalb einer Oktave
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Intervalle vom Grundton">
            <ReferenceTable
              headers={['Halbtonschritte', 'Stufe', 'Name', 'Ab ' + germanNoteName(root)]}
              rows={intervalRows
                .map(([semitones, degrees]) => [
                  String(semitones),
                  degrees.map(pretty).join(' / '),
                  degrees.map(degreeIntervalName).join(' / '),
                  degrees.map((d) => germanNoteName(spellDegree(root, d))).join(' / '),
                ])
                .concat([['12', '8', 'Oktave', germanNoteName(root)]])}
            />
            <p className="tool-footnote">
              Gleich klingende Stufen sind nicht dasselbe Intervall: Dis ist die übermäßige Prime,
              Es die kleine Sekunde. Welche Schreibweise richtig ist, entscheidet die Harmonie.
            </p>
          </Panel>
        </>
      )}
      {(id === 'scale-formulas' || id === 'modes') && (
        <Panel title={id === 'modes' ? 'Modi der Durtonleiter' : 'Alle Formeln im Überblick'}>
          <ReferenceTable
            headers={['Tonleiter', 'Formel', 'Charakteristischer Ton', 'Harmonische Anwendung']}
            rows={scales
              .filter((s) => id !== 'modes' || s.parentMode)
              .sort((a, b) => (id === 'modes' ? (a.parentMode ?? 0) - (b.parentMode ?? 0) : 0))
              .map((s) => [
                <Link to={'/scales/' + s.id}>
                  {s.name}
                  {s.aliases?.length ? ` / ${s.aliases[0]}` : ''}
                </Link>,
                s.degreeLabels.map(pretty).join(' '),
                s.signature,
                s.applications,
              ])}
          />
        </Panel>
      )}
      {id === 'modes' && (
        <Notice>
          Ein Modus verändert das tonale Zentrum. Dieselbe Durtonleiter von einem anderen Ton aus zu
          spielen genügt nicht: Harmonie und Phrasierung müssen den neuen Grundton stützen.
        </Notice>
      )}
      {id === 'chord-formulas' && (
        <Panel title={`Dreiklänge und Septakkorde · ${germanNoteName(root)}`}>
          <ReferenceTable
            headers={['Akkordtyp', 'Formel', 'Noten', 'Symbol']}
            rows={chords.map((c) => [
              <Link to={`/chords/${c.id}`}>{c.nameDe}</Link>,
              c.formula.map(pretty).join(' '),
              c.formula.map((d) => germanNoteName(spellDegree(root, d))).join(' · '),
              chordLabel(root, c.symbol),
            ])}
          />
        </Panel>
      )}
      {id === 'key-signatures' && (
        <>
          <Panel title="Tonart und Vorzeichen">
            <div className="theory-calculator">
              <label>
                Durtonart
                <select value={signatureRoot} onChange={(e) => setSignatureRoot(e.target.value)}>
                  {keyRoots.map((r) => (
                    <option value={r} key={r}>
                      {germanNoteName(r)}-Dur
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="eyebrow">VORZEICHEN</span>
                <strong>
                  {signature.altered.map(germanNoteName).join('  ') || 'Keine Vorzeichen'}
                </strong>
              </div>
              <div>
                <span className="eyebrow">PARALLELES MOLL</span>
                <strong>{germanNoteName(signature.relativeMinor)}-Moll</strong>
              </div>
            </div>
            <ReferenceTable
              headers={['Stufe', 'Diatonischer Dreiklang', 'Noten']}
              rows={harmony(signatureRoot).map((c) => [
                c.roman,
                `${germanNoteName(c.root)} ${textDe(c.quality)}`,
                (c.quality === 'Major'
                  ? ['1', '3', '5']
                  : c.quality === 'Minor'
                    ? ['1', 'b3', '5']
                    : ['1', 'b3', 'b5']
                )
                  .map((d) => germanNoteName(spellDegree(c.root, d)))
                  .join(' · '),
              ])}
            />
          </Panel>
          <Notice>
            Dur und paralleles Moll teilen dieselben Vorzeichen. Die Mollparallele beginnt auf Stufe
            6 der Durtonleiter. Gleichnamiges Dur und Moll haben denselben Grundton, aber andere
            Vorzeichen.
          </Notice>
        </>
      )}
      {id === 'harmony' && <Harmony embedded />}
      {id === 'rhythm' && (
        <>
          <Panel title="Notenwerte im 4/4-Takt">
            <ReferenceTable
              headers={['Notenwert', 'Dauer', 'Dichte', 'Zählweise']}
              rows={rhythmRows}
            />
          </Panel>
          <Score events={rhythm} meter />
          <Notice>
            Jede Pause dauert ihren notierten Wert. Zähle auch in der Stille weiter. Ein Punkt
            verlängert um den halben Wert; ein Haltebogen verbindet gleich hohe Töne zu einer Dauer.
          </Notice>
        </>
      )}
      {id === 'notation' && (
        <>
          <Panel
            title={
              profile.notationClef === 'bass' ? 'Bassschlüssel lesen' : 'Violinschlüssel lesen'
            }
          >
            <ReferenceTable headers={['Begriff', 'Bedeutung']} rows={notationRows} />
          </Panel>
          <Panel title={instrument === 'bass' ? 'Artikulation und Notationszeichen' : 'Notation und TAB-Zeichen'}>
            <ReferenceTable
              headers={['Technik', 'Zeichen', 'Bedeutung']}
              rows={instrumentArticulationRows}
            />
          </Panel>
        </>
      )}
      {id === 'transposition' && (
        <>
          <Panel title="Intervalle verschieben, Noten neu benennen">
            <ol className="instruction-list">
              <li>Wähle den neuen Grundton und bestimme den Abstand in Halbtonschritten.</li>
              <li>
                Verschiebe jeden Ton um denselben Abstand. Behalte Saitenwahl und Notenwerte bei.
              </li>
              <li>
                Läge ein Bund unter 0, verschiebe den ganzen Griff eine Oktave höher oder wähle eine
                andere spielbare Lage.
              </li>
              <li>Schreibe Stufen mit ihren passenden Stammtönen: F-Dur enthält B, nicht Ais.</li>
              <li>
                {instrument === 'bass'
                  ? 'Notiere den Bass eine Oktave über dem Klang.'
                  : 'Notiere die Gitarre eine Oktave über dem Klang; TAB zeigt weiterhin den gespielten Bund.'}
              </li>
            </ol>
          </Panel>
          <Notice>
            Beispiel: D-Dur → F-Dur verschiebt den Fingersatz drei Bünde höher. Bund 5 auf der
            A-Saite wird zu Bund 8. Die Formel bleibt 1 2 3 4 5 6 7; die Töne heißen F G A B C D E.
          </Notice>
        </>
      )}
    </>
  );
}
