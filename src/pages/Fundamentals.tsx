import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeading, usePageTitle } from '../components/UI';
import {
  BeatLab,
  FifthWalkLab,
  IntervalLab,
  LabTransport,
  RatioLab,
  ScaleBuildLab,
  ScaleLab,
  TemperamentLab,
  VibrationLab,
  WolfLab,
} from '../components/TheoryLab';
import {
  commaCents,
  equalRatio,
  evenSide,
  fifthNearMiss,
  fifthScale,
  nearMissCandidates,
  oddSide,
  pureFifthCents,
  pureIntervals,
  ratioValue,
  scaleEvenness,
  scaleSizes,
  tuningComparison,
  wolfFifth,
} from '../lib/acoustics';
import { germanNoteName } from '../lib/i18n';
import '../piano.css';
import '../fundamentals.css';

const chapters = [
  { id: 'verhaeltnisse', title: 'Töne sind Frequenzen, Abstände sind Verhältnisse' },
  { id: 'quinte', title: 'Die beiden einfachsten Verhältnisse' },
  { id: 'bauen', title: 'Eine Tonleiter aus Quinten bauen' },
  { id: 'fuenfsiebenzwoelf', title: 'Warum 5, 7 und 12' },
  { id: 'luecke', title: 'Der Kreis schließt sich nicht' },
  { id: 'kompromiss', title: 'Die Lücke verteilen' },
  { id: 'durtonleiter', title: 'Von den zwölf Tönen zur Dur-Tonleiter' },
  { id: 'quellen', title: 'Quellen und weiterführendes Lesen' },
];

const de = (value: number, digits = 2) => value.toFixed(digits).replace('.', ',');

/** Marks whichever chapter is currently on screen, so the list tracks the reading. */
function useCurrentChapter() {
  const [active, setActive] = useState(chapters[0].id);
  const seen = useRef(new Map<string, number>());
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          seen.current.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        const best = [...seen.current.entries()]
          .filter(([, ratio]) => ratio > 0)
          .sort((a, b) => b[1] - a[1])[0];
        if (best) setActive(best[0]);
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: [0, 0.25, 0.6, 1] },
    );
    for (const chapter of chapters) {
      const element = document.getElementById(chapter.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return active;
}

const sources = [
  {
    href: 'https://www.youtube.com/watch?v=nK2jYk37Rlg',
    title: 'The Mathematical Problem with Music, and How to Solve It',
    who: 'Yuval Nov (2022), Video',
    what: 'Der Aufbau dieses Artikels folgt diesem Video: Quinten stapeln, die Lücke finden, sie verteilen.',
  },
  {
    href: 'https://www.youtube.com/watch?v=EdYzqLgMmgk',
    title: 'How Pythagoras Broke Music (and how we kind of fixed it)',
    who: '2021, Video',
    what: 'Die Quintenkette, das Komma und die Wolfsquinte, mit Hörbeispielen.',
  },
  {
    href: 'https://phys.unsw.edu.au/jw/tartini-temperament.html',
    title: 'Tartini tones and temperament: an introduction for musicians',
    who: 'Joe Wolfe / UNSW',
    what: 'Reine Intervalle, Stimmungskonflikte und Temperierung.',
  },
  {
    href: 'https://phys.unsw.edu.au/jw/strings.html',
    title: 'Strings, standing waves and harmonics',
    who: 'Joe Wolfe / UNSW',
    what: 'Wie eine Saite schwingt und woher ihre Frequenz kommt.',
  },
  {
    href: 'https://mcdermottlab.mit.edu/bib2php/pubs/makeAbs.php?loc=mcdermott10b',
    title: 'Individual differences reveal the basis of consonance',
    who: 'McDermott, Lehr & Oxenham (2010)',
    what: 'Warum einfache Verhältnisse als zusammenpassend erlebt werden – und wie unterschiedlich das ausfällt.',
  },
  {
    href: 'https://mcdermottlab.mit.edu/bib2php/pubs/makeAbs.php?loc=mcdermott16',
    title: 'Indifference to dissonance in native Amazonians reveals cultural variation',
    who: 'McDermott u. a. (2016)',
    what: 'Kulturvergleich: die Vorliebe für konsonante Zusammenklänge ist nicht überall gleich.',
  },
  {
    href: 'https://www.animations.physics.unsw.edu.au/jw/beats.htm',
    title: 'Interference beats and Tartini tones',
    who: 'UNSW Physclips',
    what: 'Schwebungen mit Hörbeispielen.',
  },
];

function Note({ index }: { index: number }) {
  return (
    <a className="ref" href="#quellen" aria-label={`Quelle ${index}`}>
      [{index}]
    </a>
  );
}

export function Fundamentals() {
  usePageTitle('Woher unsere Töne kommen');
  const active = useCurrentChapter();
  const fifth = tuningComparison.find((row) => row.name === 'Quinte')!;
  const third = tuningComparison.find((row) => row.name === 'Große Terz')!;
  const seven = fifthScale(7);

  return (
    <div className="fundamentals">
      <PageHeading
        eyebrow="MUSIKTHEORIE / GRUNDLAGEN"
        title="Woher unsere Töne kommen"
        description="Eine Tonleiter hat sieben Töne, ein Klavier zwölf pro Oktave. Beides ist keine Willkür und auch keine bloße Gewohnheit: Es fällt aus einer einzigen Rechnung heraus. Dieser Artikel baut die Tonleiter von Grund auf – mit zwei Zahlen, einer Wiederholung und einem Problem, das sich nicht ganz lösen lässt."
      />

      <div className="fundamentals-layout">
        <nav className="fundamentals-toc" aria-label="Kapitel">
          <span className="eyebrow">Kapitel</span>
          <ol>
            {chapters.map((chapter, index) => (
              <li key={chapter.id}>
                <a
                  href={`#${chapter.id}`}
                  className={active === chapter.id ? 'active' : ''}
                  aria-current={active === chapter.id ? 'true' : undefined}
                >
                  <span>
                    {index < chapters.length - 1 ? String(index + 1).padStart(2, '0') : '—'}
                  </span>
                  {chapter.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="fundamentals-body">
          <p className="lede">
            Der Weg ist kurz und hat nur vier Schritte: Ein Ton ist eine Frequenz. Musikalische
            Abstände sind Verhältnisse zwischen Frequenzen. Stapelt man das einfachste dieser
            Verhältnisse immer wieder, entsteht ganz von selbst eine Tonleiter – erst mit fünf
            Tönen, dann mit sieben, dann mit zwölf. Und dann stellt sich heraus, dass dieser Stapel
            nie ganz aufgeht, was erklärt, warum ein Klavier heute so gestimmt ist, wie es gestimmt
            ist.
          </p>

          <LabTransport />

          <section id="verhaeltnisse">
            <h2>1 · Töne sind Frequenzen, Abstände sind Verhältnisse</h2>
            <p>
              Zupfst du eine Saite, schwingt sie hin und her und versetzt die Luft in Bewegung. Wie
              oft sich ein Schwingungszyklus pro Sekunde wiederholt, heißt <b>Frequenz</b>, gemessen
              in <b>Hertz</b> (Hz). Höhere Frequenz heißt höherer Ton; stärkere Schwingung heißt
              lauterer Ton. Das sind zwei verschiedene Dinge.
            </p>
            <p className="cue">
              Verändere zuerst die Frequenz und dann die Lautstärke. Im ersten Fall steigt oder
              fällt der Ton; im zweiten wird er vor allem lauter oder leiser.
            </p>
            <VibrationLab />

            <p>
              Jetzt kommt der Punkt, an dem Musik anfängt, sich von normalem Rechnen zu
              unterscheiden. Ein musikalischer Abstand ist{' '}
              <b>kein Unterschied, sondern ein Verhältnis</b>.
            </p>
            <p>
              Von 110 Hz auf 220 Hz sind es 110 Hz mehr — und wir hören eine Oktave. Von 220 Hz auf
              330 Hz sind es wieder 110 Hz mehr — aber wir hören keine Oktave, sondern einen
              kleineren Schritt. Was beim ersten Paar gleich geblieben ist, ist nicht die Differenz,
              sondern der Faktor: Beide Male wurde <em>verdoppelt</em>, um eine Oktave zu erhalten.
            </p>
            <p className="cue">
              Vergleiche „immer verdoppeln“ mit „immer 110 Hz dazu“. Nur beim Verdoppeln bleibt der
              musikalische Abstand gleich.
            </p>
            <RatioLab />
            <p>
              Alles Weitere in diesem Artikel ist deshalb Multiplikation. Ein Intervall ist eine
              Zahl, mit der man die Frequenz multipliziert, und zwei Intervalle hintereinander
              heißt: die beiden Zahlen multiplizieren.
            </p>
          </section>

          <section id="quinte">
            <h2>2 · Die beiden einfachsten Verhältnisse</h2>
            <p>
              Wenn Intervalle Verhältnisse sind, liegt die Frage nahe, welche Verhältnisse man
              nimmt. Die Antwort, auf die sehr verschiedene Musikkulturen unabhängig voneinander
              gekommen sind: die mit den kleinsten Zahlen.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Verhältnis</th>
                    <th>Name</th>
                    <th>Beispiel ab 220 Hz</th>
                  </tr>
                </thead>
                <tbody>
                  {pureIntervals.map((interval) => {
                    const value = 220 * ratioValue(interval);
                    return (
                      <tr
                        key={interval.id}
                        className={interval.id === 'fifth' ? 'highlight' : undefined}
                      >
                        <td className="mono">
                          {interval.p}:{interval.q}
                        </td>
                        <td>{interval.name}</td>
                        <td className="mono">
                          {Number.isInteger(value) ? `${value} Hz` : `etwa ${de(value, 2)} Hz`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p>
              Ganz oben steht <b>2:1</b>, die <b>Oktave</b>. Sie ist so eng, dass wir beide Töne
              denselben Namen geben: Ein A bleibt ein A, auch eine Oktave höher. Das ist der Grund,
              warum eine Tonleiter sich nach einer Oktave wiederholt — wir brauchen nur den Bereich
              von einem Ton bis zu seiner Verdopplung zu füllen, alles darüber und darunter ist eine
              Kopie.
            </p>
            <p>
              Direkt danach kommt <b>3:2</b>, die <b>Quinte</b>. Sie ist das einfachste Verhältnis,
              das <em>nicht</em> nur eine Kopie ist, und deshalb das einzige Werkzeug, das wir
              brauchen, um die Oktave zu füllen.
            </p>
            <p>
              Warum gerade einfache Verhältnisse als zusammengehörig erlebt werden, ist eine Frage
              der Wahrnehmung und nicht der Rechnung; die Forschung dazu steht in den Quellen, und
              die Vorliebe ist auch nicht überall gleich stark ausgeprägt. <Note index={5} />{' '}
              <Note index={6} /> Sichtbar ist aber sofort etwas anderes: Bei einem einfachen
              Verhältnis wiederholt sich das gemeinsame Wellenbild sehr schnell. Bei 3:2 ist das
              Muster nach zwei Schwingungen des tieferen Tons zu Ende, bei 16:15 erst nach fünfzehn.
            </p>
            <p className="cue">
              Höre die Verhältnisse einzeln und zusammen und achte darauf, wie kurz sich das untere
              Wellenbild wiederholt.
            </p>
            <IntervalLab />
            <p className="callout">
              Für den Rest des Artikels brauchen wir nur zwei Zahlen: <b>2</b> für die Oktave und{' '}
              <b>3/2</b> für die Quinte. Alles, was jetzt kommt, entsteht daraus.
            </p>
          </section>

          <section id="bauen">
            <h2>3 · Eine Tonleiter aus Quinten bauen</h2>
            <p>Das Rezept ist denkbar einfach und hat zwei Regeln:</p>
            <ol className="recipe">
              <li>
                Nimm einen Ton und gehe eine <b>Quinte</b> nach oben: mal <code>3/2</code>.
              </li>
              <li>
                Landest du über der Oktave, <b>halbiere</b> die Frequenz, bis du wieder im Bereich
                zwischen dem Grundton und seiner Verdopplung bist. Nach Kapitel 2 ist das derselbe
                Ton, nur eine Oktave tiefer.
              </li>
            </ol>
            <p>
              Dann wiederhole. Jeder Schritt legt einen neuen Ton in die Oktave — und man kann
              einfach zuschauen, wie sie sich füllt.
            </p>
            <p>
              Wir starten eine Quinte <em>unter</em> C, also auf F. Das ändert am Muster nichts, es
              sorgt nur dafür, dass die Namen am Ende vertraut aussehen.
            </p>
            <p className="cue">
              Drücke ein paarmal auf „Quinte dazu“ und beobachte, wann die Oktave gleichmäßig
              gefüllt ist und wann ein Ton unangenehm dicht neben einem anderen sitzt.
            </p>
            <ScaleBuildLab />
            <p>Drei Zwischenstände fallen auf, und alle drei tragen einen Namen, den du kennst:</p>
            <ul>
              <li>
                <b>Nach 5 Tönen</b> stehen{' '}
                {fifthScale(5)
                  .map((tone) => germanNoteName(tone.name))
                  .join(', ')}{' '}
                da — die <b>Pentatonik</b>. Fünf Töne, keine Halbtonschritte, auf unzähligen
                Instrumenten von Volksmusik bis Blues.
              </li>
              <li>
                <b>Nach 7 Tönen</b> stehen{' '}
                {seven.map((tone) => germanNoteName(tone.name)).join(', ')} da — das ist{' '}
                <b>C-Dur</b>. Die Dur-Tonleiter ist nichts anderes als sieben Quinten, sortiert.
              </li>
              <li>
                <b>Nach 12 Tönen</b> ist die Oktave voll: alle weißen und schwarzen Tasten.
              </li>
            </ul>
            <p>
              Das ist der Kern des Ganzen. Es gibt keine Extraregel für die Dur-Tonleiter, kein
              Auswendiglernen von „ganz, ganz, halb, …“: Diese sieben Töne sind das, was übrig
              bleibt, wenn man sieben Quinten stapelt und in eine Oktave faltet.
            </p>
          </section>

          <section id="fuenfsiebenzwoelf">
            <h2>4 · Warum 5, 7 und 12</h2>
            <p>
              Bleibt die Frage, warum ausgerechnet bei 5, 7 und 12 angehalten wird und nicht bei 6,
              8 oder 9. Auch darauf gibt die Konstruktion selbst die Antwort — man muss nur die{' '}
              <b>Schrittgrößen</b> anschauen, also die Abstände zwischen benachbarten Tönen.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Töne</th>
                    <th>Leiter</th>
                    <th>Schrittgrößen</th>
                    <th>Wie viele</th>
                  </tr>
                </thead>
                <tbody>
                  {scaleSizes.map((size) => {
                    const row = scaleEvenness(size);
                    return (
                      <tr key={size} className={row.even && size >= 5 ? 'highlight' : undefined}>
                        <td className="mono">{size}</td>
                        <td>{row.notes.map(germanNoteName).join(' ')}</td>
                        <td className="mono">
                          {row.sizes.map((step) => de(step, 0)).join(' / ')} Cent
                        </td>
                        <td className={row.even ? 'good' : 'off'}>
                          {row.sizes.length === 2 ? 'zwei' : 'drei'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p>
              Das Muster ist eindeutig. Bei 5, 7 und 12 Tönen kommt die Oktave mit{' '}
              <b>zwei Schrittgrößen</b> aus. Dazwischen — bei 4, 6, 8, 9 — braucht sie <b>drei</b>,
              weil ein frisch dazugekommener Ton dicht neben einem alten landet und einen auffällig
              kleinen Rest lässt.
            </p>
            <p>
              Eine Leiter mit zwei Schrittgrößen ist brauchbar: Man kann sich darin orientieren,
              Melodien darin verschieben, Muster wiedererkennen. Eine mit drei, von denen eine
              winzig ist, fühlt sich an wie eine Treppe mit einer zu niedrigen Stufe.
            </p>
            <p>
              Deshalb sind es 5, 7 und 12 geworden — und deshalb hat die Dur-Tonleiter genau zwei
              Schrittgrößen, die wir <b>Ganzton</b> ({de(scaleEvenness(7).sizes[1], 0)} Cent) und{' '}
              <b>Halbton</b> ({de(scaleEvenness(7).sizes[0], 0)} Cent) nennen.
            </p>
            <p className="callout">
              <b>Cent</b> ist dabei nur eine bequeme Maßeinheit für Tonhöhenabstände: Eine Oktave
              hat 1200 Cent, ein Halbton auf dem Klavier genau 100. Sie misst Verhältnisse, aber man
              darf mit ihr addieren statt multiplizieren, was das Vergleichen erleichtert.
            </p>
          </section>

          <section id="luecke">
            <h2>5 · Der Kreis schließt sich nicht</h2>
            <p>
              Bei 12 Tönen ist die Oktave voll, und das Naheliegende wäre: noch eine Quinte, und man
              landet wieder auf dem Anfangston. Genau das passiert aber nicht.
            </p>
            <p>
              Gehe von C zwölf reine Quinten nach oben. Die Notennamen laufen über G, D, A und
              weiter, bis nach zwölf Schritten <b>His</b> erreicht ist — auf dem Klavier dieselbe
              Taste wie C. Zwölf Quinten müssten also genau sieben Oktaven ergeben. Sie ergeben
              etwas mehr: Der Quintweg landet um {de(commaCents, 2)} Cent zu hoch, gut ein Fünftel
              eines Halbtons. Diese Lücke heißt <b>pythagoreisches Komma</b>.
            </p>
            <p className="cue">
              Folge den zwölf Quinten und vergleiche Anfangs- und Endton in derselben Oktavlage. Sie
              liegen nah beieinander, sind aber nicht gleich.
            </p>
            <FifthWalkLab />

            <h3>Warum das nie aufgehen kann</h3>
            <p>
              Man könnte hoffen, dass eine andere Anzahl Schritte es richtet. Tut sie nicht, und der
              Grund passt in zwei Zeilen.
            </p>
            <p>
              Zwölf Quinten sind <code>(3/2)¹² = 3¹² / 2¹²</code>. Sieben Oktaven sind{' '}
              <code>2⁷</code>. Damit beides gleich wäre, müsste gelten:
            </p>
            <p className="series">3¹² = 2¹⁹</p>
            <p>
              Links ein Produkt aus lauter Dreien, rechts eines aus lauter Zweien. Das eine ist
              immer ungerade, das andere immer gerade:
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Zwölf Quinten</th>
                    <th>Sieben Oktaven</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="mono">
                      3¹² = {oddSide.toLocaleString('de-DE')} <small>ungerade</small>
                    </td>
                    <td className="mono">
                      2¹⁹ = {evenSide.toLocaleString('de-DE')} <small>gerade</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Sie liegen nur {(oddSide - evenSide).toLocaleString('de-DE')} auseinander, aber sie
              treffen sich nie. Und das Argument hängt nicht an der Zwölf:{' '}
              <b>Egal wie viele Quinten man stapelt, man landet nie exakt auf einer Oktave.</b> Eine
              Zahl aus lauter Dreien ist niemals eine Zahl aus lauter Zweien. <Note index={1} />
            </p>
            <p>
              Der Quintenkreis ist also gar kein Kreis, sondern eine Spirale, die sich bei jeder
              Umrundung ein kleines Stück weiterschiebt. Wer alle zwölf Quinten rein haben will,
              braucht unendlich viele Töne.
            </p>

            <h3>Was passiert, wenn man trotzdem darauf besteht</h3>
            <p>
              Man kann das Problem verschieben. Stimme elf Quinten hintereinander exakt rein — Es,
              B, F, C, G, D, A, E, H, Fis, Cis, Gis. Zwölf Töne, elf perfekte Quinten.
            </p>
            <p>
              Damit ist aber auch die zwölfte festgelegt, ohne dass sie jemand gestimmt hätte: Sie
              ist das, was zwischen dem letzten und dem ersten Ton der Kette übrig bleibt, und muss
              die ganze Lücke allein tragen. Statt {de(pureFifthCents, 0)} Cent misst sie nur{' '}
              {de(wolfFifth.cents, 0)}. Sie heißt <b>Wolfsquinte</b>, nach dem heulenden Klang, und
              macht ganze Tonarten unbrauchbar. Das Problem verschwindet nicht, es sammelt sich nur
              an einer Stelle. <Note index={2} />
            </p>
            <p className="cue">
              Höre ein paar der reinen Quinten und dann die zwölfte. Der Unterschied ist keine
              Feinheit.
            </p>
            <WolfLab />
            <p>
              Warum die Wolfsquinte so unangenehm klingt, hört man am besten an einem einfacheren
              Fall: Liegen zwei Frequenzen dicht beieinander, verstärken und schwächen sie sich
              abwechselnd, und der Klang pulsiert. Das heißt <b>Schwebung</b>, und genau das
              passiert, wenn ein Intervall knapp neben seinem reinen Verhältnis liegt.{' '}
              <Note index={7} />
            </p>
            <BeatLab />
          </section>

          <section id="kompromiss">
            <h2>6 · Die Lücke verteilen</h2>
            <p>
              Ein einzelner Wolf ist die eine Möglichkeit: elf gute Quinten, eine unbrauchbare. Die
              andere ist naheliegend, sobald man die Lücke als Zahl vor sich hat — man verteilt sie.
            </p>
            <p>
              Die Lücke beträgt {de(commaCents, 2)} Cent und entsteht auf zwölf Quinten. Also nimm
              jeder Quinte ein Zwölftel davon weg:
            </p>
            <p className="series">
              {de(commaCents, 2)} Cent ÷ 12 = {de(commaCents / 12, 3)} Cent pro Quinte
            </p>
            <p>
              Jede Quinte misst dann {de(pureFifthCents, 3)} − {de(commaCents / 12, 3)} ={' '}
              <b>{de(fifthNearMiss(12).tempered, 0)} Cent</b>. Zwölf davon ergeben 8400 Cent, und
              das sind exakt sieben Oktaven. Der Kreis schließt sich — nicht weil das Problem gelöst
              wäre, sondern weil der Fehler gleichmäßig verteilt ist. Keine Quinte ist mehr exakt,
              aber statt elf perfekter und einem Wolf hat man zwölf fast perfekte.
            </p>

            <h3>Warum daraus ein fester Faktor wird</h3>
            <p>
              Sind alle zwölf Quinten gleich groß und alle Oktaven rein, dann sind auch alle zwölf
              Halbtonschritte gleich groß. „Gleich groß“ heißt nach Kapitel 1 nicht „gleich viele
              Hertz“, sondern <b>gleicher Faktor</b>. Nennen wir ihn <code>q</code>: Zwölf Schritte
              müssen eine Oktave ergeben.
            </p>
            <p className="series">
              q¹² = 2 &nbsp;&nbsp;→&nbsp;&nbsp; q = ¹²√2 ≈ {de(equalRatio(1), 5)}
            </p>
            <p>
              Mehr steckt nicht dahinter. Der krumme Faktor {de(equalRatio(1), 5)} ist weder
              willkürlich noch gemessen: Er ist die Zahl, die man zwölfmal mit sich selbst
              multiplizieren muss, um 2 zu erhalten. Genau deshalb ist er irrational — und genau
              deshalb trifft er die reinen Verhältnisse <code>3/2</code> und <code>5/4</code> nie
              exakt, sondern nur sehr knapp daneben. Das ist die{' '}
              <b>zwölfstufige gleichstufige Stimmung</b>.
            </p>

            <h3>Warum ausgerechnet zwölf Schritte</h3>
            <p>
              Die Zwölf steckt schon in der Rechnung: Wir konnten durch zwölf teilen, weil zwölf
              Quinten <em>nahe</em> an sieben Oktaven liegen. Bei anderen Anzahlen liegen sie
              weniger nahe — und je größer die Lücke, desto mehr muss man jeder Quinte wegnehmen,
              desto schlechter wird sie.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Quinten</th>
                    <th>≈ Oktaven</th>
                    <th>Lücke</th>
                    <th>Korrektur je Quinte</th>
                    <th>Quinte danach</th>
                  </tr>
                </thead>
                <tbody>
                  {nearMissCandidates.map((count) => {
                    const row = fifthNearMiss(count);
                    return (
                      <tr key={count} className={count === 12 ? 'highlight' : undefined}>
                        <td className="mono">{count}</td>
                        <td className="mono">{row.octaves}</td>
                        <td className="mono">{de(Math.abs(row.miss), 2)} Cent</td>
                        <td
                          className={
                            Math.abs(row.perFifth) < 2.2
                              ? 'good'
                              : Math.abs(row.perFifth) > 6
                                ? 'off'
                                : ''
                          }
                        >
                          {de(Math.abs(row.perFifth), 3)} Cent
                        </td>
                        <td className="mono">{de(row.tempered, 2)} Cent</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p>
              Fünf und sieben Stufen verbiegen die Quinte um mehr als 16 Cent. Zwölf ist die erste
              Anzahl, bei der die Korrektur unter zwei Cent fällt — und zwölf Tasten pro Oktave sind
              noch spielbar. 41 und 53 wären genauer, verlangen aber Instrumente mit 41 oder 53
              Tasten pro Oktave. 19 Stufen verschlechtern die Quinte deutlich, treffen dafür die
              Terz besser; das ist keine schlechtere Lösung, sondern eine andere Gewichtung.
            </p>
            <p>
              Zwölf ist also keine von der Natur vorgeschriebene Zahl. Sie ist die kleinste, bei der
              die Rechnung gut genug aufgeht — und sie passt zu den fünf und sieben Tönen, die aus
              derselben Konstruktion schon vorher herausgefallen sind. Außereuropäische
              Musiktraditionen lassen sich nicht einfach als ungenauere Versionen davon verstehen.
            </p>

            <h3>Was der Kompromiss kostet</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Intervall</th>
                    <th>Rein</th>
                    <th>Gleichstufig</th>
                    <th>Unterschied</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{fifth.name}</td>
                    <td className="mono">{de(fifth.pure, 1)}</td>
                    <td className="mono">etwa {de(fifth.equal, 5)}</td>
                    <td>knapp {de(Math.abs(fifth.offset), 0)} Cent enger</td>
                  </tr>
                  <tr>
                    <td>{third.name}</td>
                    <td className="mono">{de(third.pure, 2)}</td>
                    <td className="mono">etwa {de(third.equal, 5)}</td>
                    <td>knapp {de(Math.abs(third.offset), 0)} Cent weiter</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Die Quinte bleibt sehr nahe am reinen Verhältnis — genau die {de(commaCents / 12, 3)}{' '}
              Cent aus der Aufteilung oben. Die große Terz weicht deutlicher ab, weil die Aufteilung
              auf die Quinte hin gerechnet wurde und die Terz nur mitläuft. Wie deutlich man das
              hört, hängt von Klangfarbe, Lage, Dauer und Hörerfahrung ab. <Note index={3} />
            </p>
            <p className="cue">
              Vergleiche die reine und die gleichstufige große Terz, danach die Quinte und einen
              ganzen Dur-Dreiklang. Achte weniger auf „richtig oder falsch“ als auf Ruhe, Pulsieren
              und Klangcharakter.
            </p>
            <TemperamentLab />
            <p>
              Der Gewinn ist Beweglichkeit: Eine Melodie behält beim Verschieben in eine andere
              Tonart dieselben Verhältnisse, und jede der zwölf Tonarten klingt gleich gut. Dafür
              ist außer der Oktave kein Intervall mehr exakt. Das ist die Abwägung, auf der unser
              alltäglicher Tonvorrat beruht.
            </p>
          </section>

          <section id="durtonleiter">
            <h2>7 · Von den zwölf Tönen zur Dur-Tonleiter</h2>
            <p>
              Damit ist alles beisammen. Zwölf Töne pro Oktave, alle im gleichen Abstand, und
              mittendrin die sieben aus Kapitel 3:
            </p>
            <p className="series">F – C – G – D – A – E – H</p>
            <p>
              Der Höhe nach sortiert ergeben sie{' '}
              {seven.map((tone) => germanNoteName(tone.name)).join(' – ')} – C, also C-Dur. Zwischen
              ihnen liegen die zwei Schrittgrößen aus Kapitel 4, in dieser Reihenfolge:{' '}
              <b>ganz – ganz – halb – ganz – ganz – ganz – halb</b>. Genau dieses Muster verschiebt
              man, wenn man eine andere Dur-Tonart spielt.
            </p>
            <p>
              Aus derselben Auswahl entstehen auch die vertrauten Akkorde. Nimm jeden zweiten Ton ab
              C: <b>C–E–G</b>, ein Dur-Dreiklang. Ab D: <b>D–F–A</b>, ein Moll-Dreiklang. Die
              Dreiklänge fallen unterschiedlich aus, weil die Tonleiter eben nicht aus lauter
              gleichen Schritten besteht.
            </p>
            <p>
              Und der Tonvorrat allein macht noch keine Tonart. Dieselben sieben Töne ergeben C-Dur
              oder A-Moll, je nachdem, welcher Ton als Zentrum etabliert wird — durch den Basston,
              den Schlusston, die Akkorde.
            </p>
            <p className="cue">
              Baue die Kette auf, sortiere sie zur Tonleiter, spiele Dreiklänge daraus und
              vergleiche dieselben sieben Töne über einem C- und einem A-Zentrum.
            </p>
            <ScaleLab />
            <p>
              Wenn du jetzt auf einem Bass, einer Gitarre oder dem Piano spielst, benutzt du diese
              Kette ständig: zwei Zahlen, eine Faltung in die Oktave, ein Kompromiss beim Schließen
              des Kreises. Weiterhören kannst du im <Link to="/piano">interaktiven Piano</Link>, bei{' '}
              <Link to="/scales">Tonleitern</Link> und <Link to="/chords">Akkorden</Link> oder im{' '}
              <Link to="/quintenzirkel">Quintenzirkel</Link>, der genau die Kette aus Kapitel 3
              zeigt.
            </p>
          </section>

          <section id="quellen" className="fundamentals-further">
            <h2>Quellen und weiterführendes Lesen</h2>
            <ol className="source-list">
              {sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                  <small>
                    {source.who} — {source.what}
                  </small>
                </li>
              ))}
            </ol>
            <p className="lab-caption">
              Alle Zahlen in diesem Artikel sind berechnet, nicht abgetippt: Das pythagoreische
              Komma ergibt {de(commaCents, 2)} Cent, der Ganzton der Dur-Tonleiter{' '}
              {de(scaleEvenness(7).sizes[1], 2)} Cent, ihr Halbton{' '}
              {de(scaleEvenness(7).sizes[0], 2)} Cent.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
