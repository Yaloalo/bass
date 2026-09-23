import { emptyPattern, instruments, kitById } from './rhythm';
import type { Bars, DrumPattern, Instrument, KitId, Step, Subdivision } from './rhythm';

export interface DrumPreset {
  id: string;
  group: string;
  /** One line aimed at a bass player: what to do with this groove. */
  hint: string;
  /** Applied on load. A bolero at 132 BPM is simply the wrong exercise. */
  bpm: number;
  kit: KitId;
  pattern: DrumPattern;
}

type Hits = Partial<Record<Instrument, { accent?: number[]; normal?: number[]; ghost?: number[] }>>;

function build(
  name: string,
  kit: KitId,
  hits: Hits,
  subdivision: Subdivision = 4,
  bars: Bars = 1,
  swing = 0.5,
): DrumPattern {
  const pattern = emptyPattern(name, subdivision, bars, kit);
  pattern.swing = swing;
  const write = (id: Instrument, indices: number[] | undefined, value: Step) => {
    for (const index of indices ?? []) pattern.tracks[id].steps[index] = value;
  };
  for (const { id } of instruments) {
    write(id, hits[id]?.ghost, 1);
    write(id, hits[id]?.normal, 2);
    write(id, hits[id]?.accent, 3);
  }
  // Anything the pattern actually plays must be visible, whatever the kit lists.
  const played = instruments
    .filter(({ id }) => pattern.tracks[id].steps.some((step) => step !== 0))
    .map(({ id }) => id);
  pattern.visible = [...new Set([...kitById(kit).tracks, ...played])];
  return pattern;
}

const every = (from: number, to: number, gap: number) => {
  const result: number[] = [];
  for (let index = from; index <= to; index += gap) result.push(index);
  return result;
};

const groups = {
  practice: 'Übe-Grooves',
  swing: 'Shuffle & Swing',
  rock: 'Rock & Pop',
  electronic: 'Elektronisch',
  soul: 'Hip-Hop & Soul',
  cuban: 'Afro-kubanisch',
  brazil: 'Brasilianisch',
} as const;

export const drumPresets: DrumPreset[] = [
  {
    id: 'pocket',
    group: groups.practice,
    bpm: 90,
    kit: 'standard',
    hint: 'Leg deine Grundtöne auf die Bassdrum auf 1 und 3. Halte jede Note gleich lang – das macht den Pocket aus, nicht die Tonhöhen.',
    pattern: build('Gerader Pocket', 'standard', {
      kick: { accent: [0, 8] },
      snare: { accent: [4, 12] },
      closedHat: { accent: [0, 4, 8, 12], normal: [2, 6, 10, 14] },
    }),
  },
  {
    id: 'funk',
    group: groups.practice,
    bpm: 92,
    kit: 'standard',
    hint: 'Die Bassdrum schiebt auf das „und“ von 2 und 3. Lass den Backbeat in Ruhe und antworte auf dem „und“ von 4 eine Oktave höher.',
    pattern: build('Synkopierter Funk', 'standard', {
      kick: { accent: [0, 10], normal: [6] },
      snare: { accent: [4, 12], ghost: [7, 11] },
      closedHat: { accent: [0, 4, 8], normal: [2, 6, 10, 12] },
      openHat: { normal: [14] },
    }),
  },
  {
    id: 'halftime',
    group: groups.practice,
    bpm: 80,
    kit: 'standard',
    hint: 'Nur eine Snare, auf der 3. Zähl vier Schläge darunter weiter, sonst kippt der Takt in einen Zweier.',
    pattern: build('Halftime', 'standard', {
      kick: { accent: [0, 6] },
      snare: { accent: [8] },
      closedHat: { accent: [0, 4, 8, 12], normal: [2, 6, 10, 14] },
    }),
  },
  {
    id: 'four',
    group: groups.practice,
    bpm: 124,
    kit: 'standard',
    hint: 'Jede Zählzeit ist besetzt. Spiel die Offbeats – das „und“ jeder Zählzeit – und überlass die Schläge der Bassdrum.',
    pattern: build('Four on the Floor', 'standard', {
      kick: { accent: [0, 4, 8, 12] },
      clap: { accent: [4, 12] },
      closedHat: { normal: [2, 6, 10, 14] },
    }),
  },
  {
    id: 'sparse',
    group: groups.practice,
    bpm: 70,
    kit: 'standard',
    hint: 'Fast nichts ist vorgegeben. Liefere den Puls selbst – erst gehende Viertel, dann nimm Töne weg.',
    pattern: build('Viel Platz zum Üben', 'standard', {
      kick: { accent: [0] },
      rim: { accent: [4, 12] },
    }),
  },
  {
    id: 'motown',
    group: groups.practice,
    bpm: 116,
    kit: 'extended',
    hint: 'Snare und Tambourin teilen sich 2 und 4. Spiel gleichmäßige Achtel und lass nur den Auftakt zur 1 sich bewegen.',
    pattern: build('Motown-Backbeat', 'extended', {
      kick: { accent: [0, 8], normal: [6] },
      snare: { accent: [4, 12] },
      tambourine: { accent: [4, 12], normal: [0, 2, 6, 8, 10, 14] },
      closedHat: { normal: every(0, 14, 2) },
    }),
  },
  {
    id: 'secondline',
    group: groups.practice,
    bpm: 88,
    kit: 'extended',
    hint: 'Die Bassdrum spielt in beiden Takten das Tresillo (1, das „a“ von 1, das „und“ von 2) und betont die 4 im zweiten Takt. Second Line ist eine improvisierte Tradition – nimm das als Gerüst, nicht als Transkription.',
    pattern: build(
      'New Orleans Second Line',
      'extended',
      {
        kick: { accent: [0, 28], normal: [3, 6, 16, 19, 22] },
        snare: { accent: [4, 12, 20], ghost: [7, 11, 15, 23, 27] },
        closedHat: { normal: every(0, 30, 2) },
      },
      4,
      2,
    ),
  },
  {
    id: 'reggae',
    group: groups.practice,
    bpm: 76,
    kit: 'extended',
    hint: 'Die 1 bleibt bewusst leer – Bassdrum und Cross-Stick landen zusammen auf der 3. Spiel kurz und spät. Schalte den Shaker stumm, sobald du den Puls allein halten kannst.',
    pattern: build('Reggae One Drop', 'extended', {
      kick: { accent: [8] },
      rim: { accent: [8] },
      closedHat: { normal: [2, 6, 10, 14] },
      shaker: { normal: every(0, 14, 2) },
    }),
  },
  {
    id: 'afrobeat',
    group: groups.practice,
    bpm: 108,
    kit: 'extended',
    hint: 'Der Backbeat sitzt auf der 4, nicht auf 2 und 4. Das Ensemble deutet die 1 nur an – füll die Lücke nicht mit Grundtönen. Ein Übe-Gerüst, keine Transkription.',
    pattern: build(
      'Afrobeat',
      'extended',
      {
        kick: { accent: [0, 16], normal: [7, 10, 23, 26] },
        snare: { accent: [12, 28], ghost: [5, 11, 21, 27] },
        rim: { normal: [4, 20] },
        closedHat: {
          accent: every(0, 28, 4),
          normal: [2, 3, 6, 7, 10, 11, 14, 15, 18, 19, 22, 23, 26, 27, 30, 31],
        },
        shaker: { normal: every(0, 30, 2) },
        cabasa: { normal: every(0, 28, 4) },
        congaHigh: { normal: [6, 14, 22, 30] },
        congaLow: { normal: [3, 19] },
      },
      4,
      2,
    ),
  },
  {
    id: 'toms',
    group: groups.practice,
    bpm: 92,
    kit: 'extended',
    hint: 'Kein Becken-Teppich und keine Hi-Hat zum Mitzählen. Toms verwischen die Tonhöhe – deine Linie muss Harmonie und Unterteilung allein tragen.',
    pattern: build(
      'Tom-Groove',
      'extended',
      {
        crash: { accent: [0] },
        kick: { accent: [0, 8, 16, 22] },
        snare: { accent: [4, 12, 20, 28] },
        tomHigh: { normal: [2, 6, 18] },
        tomMid: { normal: [10, 14, 26] },
        tom: { normal: [24, 30] },
      },
      4,
      2,
    ),
  },
  {
    id: 'shuffle',
    group: groups.swing,
    bpm: 96,
    kit: 'standard',
    hint: 'Lang–kurze Achtel. Triff das Triolengefühl erst mit zwei Tönen pro Zählzeit, bevor du etwas hinzufügst.',
    pattern: build(
      'Achtel-Shuffle',
      'standard',
      {
        kick: { accent: [0, 4] },
        snare: { accent: [2, 6] },
        closedHat: { accent: [0, 2, 4, 6], normal: [1, 3, 5, 7] },
      },
      2,
      1,
      2 / 3,
    ),
  },
  {
    id: 'shuffle-triplet',
    group: groups.swing,
    bpm: 96,
    kit: 'standard',
    hint: 'Derselbe Shuffle, ausgeschrieben im Triolenraster: die Hi-Hat spielt die erste und dritte Triole. Swing ist aus, weil die Triolen echt notiert sind. Leg deine Töne auf das „let“.',
    pattern: build(
      'Triolen-Shuffle',
      'standard',
      {
        kick: { accent: [0, 6] },
        snare: { accent: [3, 9], ghost: [5, 11] },
        closedHat: { accent: [0, 3, 6, 9], normal: [2, 5, 8, 11] },
      },
      3,
    ),
  },
  {
    id: 'ride',
    group: groups.swing,
    bpm: 132,
    kit: 'standard',
    hint: 'Geh in Vierteln gegen das geswingte Ride. Halte die Linie durch 2 und 4 in Bewegung, wo das Ride verdoppelt.',
    pattern: build(
      'Swing-Ride',
      'standard',
      {
        kick: { accent: [0, 4] },
        rim: { accent: [2, 6] },
        ride: { accent: [2, 6], normal: [0, 3, 4, 7] },
      },
      2,
      1,
      2 / 3,
    ),
  },
  {
    id: 'son-clave-32',
    group: groups.cuban,
    bpm: 96,
    kit: 'afroCuban',
    hint: 'Takt eins: 1, das „und“ von 2, die 4. Takt zwei: 2 und 3. Das ist eine zweitaktige Zelle – zähl über den Taktstrich hinweg, nicht innerhalb.',
    pattern: build(
      'Son Clave 3-2',
      'afroCuban',
      { clave: { accent: [0, 6, 12, 20, 24] }, maracas: { normal: every(0, 30, 2) } },
      4,
      2,
    ),
  },
  {
    id: 'son-clave-23',
    group: groups.cuban,
    bpm: 96,
    kit: 'afroCuban',
    hint: 'Dieselbe Zelle, von ihrer Zwei-Seite aus begonnen. Viele Arrangements stehen in 2-3 – die Richtung gehört zum Stück, nicht zum Percussionisten.',
    pattern: build(
      'Son Clave 2-3',
      'afroCuban',
      { clave: { accent: [4, 8, 16, 22, 28] }, maracas: { normal: every(0, 30, 2) } },
      4,
      2,
    ),
  },
  {
    id: 'rumba-clave-32',
    group: groups.cuban,
    bpm: 100,
    kit: 'afroCuban',
    hint: 'Wie die Son Clave, nur kommt der dritte Schlag der Drei-Seite später. Spiel sie direkt gegen die Son Clave, bis der Unterschied eindeutig ist.',
    pattern: build(
      'Rumba Clave 3-2',
      'afroCuban',
      { clave: { accent: [0, 6, 14, 20, 24] }, maracas: { normal: every(0, 30, 2) } },
      4,
      2,
    ),
  },
  {
    id: 'cascara',
    group: groups.cuban,
    bpm: 96,
    kit: 'afroCuban',
    hint: 'Eine Einstiegsreduktion: durchlaufende Achtel auf dem Kessel, auf der Clave akzentuiert. Die traditionelle Cáscara lässt mehrere davon weg – sichere erst die Akzente, dann nimm Schläge heraus.',
    pattern: build(
      'Cáscara (Einstiegsform)',
      'afroCuban',
      {
        timbaleShell: {
          accent: [0, 6, 12, 20, 24],
          normal: [2, 4, 8, 10, 14, 16, 18, 22, 26, 28, 30],
        },
        clave: { accent: [0, 6, 12, 20, 24] },
      },
      4,
      2,
    ),
  },
  {
    id: 'songo',
    group: groups.cuban,
    bpm: 100,
    kit: 'afroCuban',
    hint: 'Die Bassdrum verlässt die Schläge und landet mit der Clave auf dem „und“ von 2 und auf der 4. Songo hat viele persönliche Varianten – das ist ein Gerüst zum Üben der Bassrolle.',
    pattern: build(
      'Songo (Grundgerüst)',
      'afroCuban',
      {
        clave: { accent: [0, 6, 12, 20, 24] },
        kick: { accent: [6, 12, 22, 28] },
        snare: { accent: [15, 31], ghost: [2, 5, 10, 13, 18, 21, 26, 29] },
        closedHat: { normal: every(0, 30, 2) },
        congaSlap: { normal: [4, 20] },
        congaLow: { normal: [8, 24] },
        congaHigh: { normal: [14, 30] },
      },
      4,
      2,
    ),
  },
  {
    id: 'mambo-tumbao',
    group: groups.cuban,
    bpm: 96,
    kit: 'afroCuban',
    hint: 'Gebaut für die Zellen M19/M20 aus dem Buch. Keine Bassdrum – der tiefe Bereich gehört dir. Leg die Quinte auf das „und“ von 2 und den Grundton auf die 4.',
    pattern: build(
      'Mambo / Tumbao-Bett',
      'afroCuban',
      {
        clave: { accent: [0, 6, 12, 20, 24] },
        cowbell: { accent: [0, 8, 16, 24], normal: [2, 4, 6, 10, 12, 14, 18, 20, 22, 26, 28, 30] },
        congaSlap: { normal: [4, 20] },
        congaHigh: { accent: [12, 14, 28, 30] },
        congaLow: { ghost: [0, 2, 6, 8, 10, 16, 18, 22, 24, 26] },
        maracas: { normal: every(0, 30, 2) },
      },
      4,
      2,
    ),
  },
  {
    id: 'chachacha',
    group: groups.cuban,
    bpm: 112,
    kit: 'afroCuban',
    hint: 'Die dreischlägige Figur, die dem Stil den Namen gibt, liegt auf 4, dem „und“ von 4 und der folgenden 1. Cha-Cha-Chá ist clave-basiert, auch wenn keine Clave klingt – hier bleibt sie bewusst stumm.',
    pattern: build('Cha-Cha-Chá', 'afroCuban', {
      cowbell: { accent: [0, 8], normal: [4, 6, 12, 14] },
      guiro: { accent: [0, 8], normal: [4, 6, 12, 14] },
      timbaleHigh: { accent: [12, 14] },
      timbaleLow: { accent: [0] },
      congaSlap: { normal: [4] },
      congaHigh: { accent: [12, 14] },
      congaLow: { ghost: [0, 2, 6, 8, 10] },
      maracas: { normal: every(0, 14, 2) },
    }),
  },
  {
    id: 'bolero',
    group: groups.cuban,
    bpm: 72,
    kit: 'afroCuban',
    hint: 'Langsam, etwa 60 bis 90 BPM. Die Stockfigur ist das Cinquillo: das Tresillo mit zwei zusätzlichen Schlägen. Lass Töne klingen – der Bolero-Bass lebt von langen Tönen und Raum.',
    pattern: build('Bolero', 'afroCuban', {
      timbaleShell: { accent: [0, 6, 12], normal: [4, 10] },
      congaSlap: { normal: [4] },
      congaHigh: { accent: [12, 14] },
      congaLow: { ghost: [0, 2, 6, 8, 10] },
      maracas: { normal: every(0, 14, 2) },
    }),
  },
  {
    id: 'bembe',
    group: groups.cuban,
    bpm: 108,
    kit: 'afroCuban',
    hint: 'Vier Schläge zu je drei – ein 12/8-Takt. Die sieben Glockenschläge stehen im Abstand 2-2-1-2-2-2-1, der Shaker markiert die vier Hauptschläge. Finde die 3, ohne von der 1 zu zählen.',
    pattern: build(
      '6/8-Glocke (12/8-Raster)',
      'afroCuban',
      {
        cowbell: { accent: [0], normal: [2, 4, 5, 7, 9, 11] },
        shaker: { accent: [0], normal: [3, 6, 9] },
      },
      3,
    ),
  },
  {
    id: 'bossa',
    group: groups.brazil,
    bpm: 132,
    kit: 'brazilian',
    hint: 'Die zweitaktige Cross-Stick-Figur ist die Son-3-2-Form mit dem letzten Schlag auf dem „und“ von 3. Denk in Zweiern: punktierte Viertel und Achtel, keine gehenden Viertel.',
    pattern: build(
      'Bossa Nova',
      'brazilian',
      {
        rim: { accent: [0, 6, 12, 20, 26] },
        kick: { accent: [8, 24], normal: [0, 16] },
        closedHat: { normal: every(0, 30, 2) },
      },
      4,
      2,
    ),
  },
  {
    id: 'samba',
    group: groups.brazil,
    bpm: 100,
    kit: 'brazilian',
    hint: 'Ein 2/4-Gefühl in 4/4 geschrieben: die Surdo landet hier auf 2 und 4, mit einem leichteren Schlag auf dem vorangehenden „und“. Spiel in Zweiern. Eine Reduktion einer Batucada, keine Transkription.',
    pattern: build(
      'Samba (Grundgerüst)',
      'brazilian',
      {
        kick: { accent: [4, 12, 20, 28], normal: [2, 10, 18, 26] },
        rim: { accent: [0, 6, 12, 20, 26] },
        shaker: { normal: every(0, 31, 1) },
        tambourine: {
          accent: [4, 12, 20, 28],
          normal: [0, 2, 6, 8, 10, 14, 16, 18, 22, 24, 26, 30],
        },
      },
      4,
      2,
    ),
  },
  {
    id: 'rock-eighth',
    group: groups.rock,
    bpm: 118,
    kit: 'standard',
    hint: 'Die Standardbegleitung. Spiel Achtel auf dem Grundton mit und lass 2 und 4 der Snare.',
    pattern: build('Achtel-Rock', 'standard', {
      kick: { accent: [0, 8], normal: [10] },
      snare: { accent: [4, 12] },
      closedHat: { accent: [0, 8], normal: [2, 4, 6, 10, 12, 14] },
    }),
  },
  {
    id: 'rock-sixteen',
    group: groups.rock,
    bpm: 92,
    kit: 'standard',
    hint: 'Durchgehende Sechzehntel auf der Hi-Hat. Spiel selbst Viertel – das Raster hörst du schon.',
    pattern: build('Sechzehntel-Rock', 'standard', {
      kick: { accent: [0, 8], normal: [3, 11] },
      snare: { accent: [4, 12] },
      closedHat: { accent: every(0, 12, 4), normal: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15] },
    }),
  },
  {
    id: 'stomp',
    group: groups.rock,
    bpm: 82,
    kit: 'standard',
    hint: 'Zwei Stampfer, ein Klatscher, sonst nichts. Der ganze Rest des Taktes gehört dir.',
    pattern: build('Stadion-Stampf', 'standard', {
      kick: { accent: [0, 4] },
      clap: { accent: [8] },
    }),
  },
  {
    id: 'punk',
    group: groups.rock,
    bpm: 168,
    kit: 'standard',
    hint: 'Schnell und gerade. Spiel Achtel mit Wechselschlag und halte die Länge konstant.',
    pattern: build('Punk-Achtel', 'standard', {
      kick: { accent: [0, 8], normal: [2, 10] },
      snare: { accent: [4, 12] },
      closedHat: { accent: every(0, 14, 2) },
    }),
  },
  {
    id: 'ska',
    group: groups.rock,
    bpm: 158,
    kit: 'standard',
    hint: 'Die Hi-Hat spielt nur die „und“-Zählzeiten. Halte du den Puls auf den Vierteln.',
    pattern: build('Ska-Offbeat', 'standard', {
      kick: { accent: [0, 8] },
      snare: { accent: [4, 12] },
      closedHat: { accent: [2, 6, 10, 14] },
    }),
  },
  {
    id: 'train',
    group: groups.rock,
    bpm: 128,
    kit: 'standard',
    hint: 'Die Snare rollt in Sechzehnteln durch. Spiel Wechselbass in Vierteln – mehr braucht es nicht.',
    pattern: build('Country-Train', 'standard', {
      kick: { accent: [0, 8] },
      snare: { accent: [4, 12], ghost: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15] },
    }),
  },
  {
    id: 'disco',
    group: groups.rock,
    bpm: 118,
    kit: 'standard',
    hint: 'Die offene Hi-Hat markiert jedes „und“. Achtel mit Oktavsprüngen passen hier von selbst.',
    pattern: build('Disco', 'standard', {
      kick: { accent: every(0, 12, 4) },
      snare: { accent: [4, 12] },
      closedHat: { normal: every(0, 12, 4) },
      openHat: { normal: [2, 6, 10, 14] },
    }),
  },
  {
    id: 'ballad68',
    group: groups.rock,
    bpm: 64,
    kit: 'standard',
    hint: 'Triolenraster: zähl 1-2-3 4-5-6. Der Backbeat liegt auf der zweiten Hälfte des Taktes.',
    pattern: build(
      'Ballade im 6/8',
      'standard',
      {
        kick: { accent: [0], normal: [7] },
        snare: { accent: [6] },
        ride: { accent: [0, 3, 6, 9], normal: [1, 2, 4, 5, 7, 8, 10, 11] },
      },
      3,
    ),
  },
  {
    id: 'house',
    group: groups.electronic,
    bpm: 124,
    kit: 'extended',
    hint: 'Jede Zählzeit ist besetzt. Übe Oktavwechsel auf den Offbeats gegen die Bassdrum.',
    pattern: build('House', 'extended', {
      kick: { accent: every(0, 12, 4) },
      clap: { accent: [4, 12] },
      closedHat: { normal: [2, 6, 10, 14] },
      shaker: { ghost: every(0, 15, 1) },
    }),
  },
  {
    id: 'techno',
    group: groups.electronic,
    bpm: 134,
    kit: 'extended',
    hint: 'Ein gleichmäßiges Raster ohne Backbeat. Gut, um lange Töne exakt abzustoppen.',
    pattern: build('Techno-Treiber', 'extended', {
      kick: { accent: every(0, 12, 4) },
      rim: { normal: [7, 15] },
      closedHat: { accent: [2, 6, 10, 14], normal: [0, 1, 3, 4, 5, 8, 9, 11, 12, 13] },
    }),
  },
  {
    id: 'breakbeat',
    group: groups.electronic,
    bpm: 164,
    kit: 'standard',
    hint: 'Zwei Takte, verschobene Bassdrum. Zähl mit – die 1 des zweiten Taktes ist leicht zu verlieren.',
    pattern: build(
      'Breakbeat',
      'standard',
      {
        kick: { accent: [0, 10], normal: [16, 22, 26] },
        snare: { accent: [4, 12, 20, 28], ghost: [7, 15, 23] },
        closedHat: { normal: every(0, 30, 2) },
      },
      4,
      2,
    ),
  },
  {
    id: 'trap',
    group: groups.electronic,
    bpm: 72,
    kit: 'standard',
    hint: 'Halftime: nur eine Snare auf der 3. Die Hi-Hat zählt Sechzehntel, dein Bass darf lange stehen.',
    pattern: build('Trap-Halftime', 'standard', {
      kick: { accent: [0], normal: [6, 11] },
      snare: { accent: [8] },
      closedHat: { accent: every(0, 12, 4), normal: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15] },
    }),
  },
  {
    id: 'twostep',
    group: groups.electronic,
    bpm: 172,
    kit: 'standard',
    hint: 'Sehr schnell gezählt, aber halbe Geschwindigkeit gespielt. Denk in halben Noten.',
    pattern: build('Drum & Bass (Two Step)', 'standard', {
      kick: { accent: [0], normal: [10] },
      snare: { accent: [4, 12] },
      closedHat: { normal: every(0, 14, 2) },
    }),
  },
  {
    id: 'boombap',
    group: groups.soul,
    bpm: 88,
    kit: 'standard',
    hint: 'Die zweite Bassdrum kommt spät, auf dem „und“ von 3. Lass sie stehen, statt sie zu verdoppeln.',
    pattern: build('Boom Bap', 'standard', {
      kick: { accent: [0, 10], normal: [6] },
      snare: { accent: [4, 12], ghost: [14] },
      closedHat: { accent: [0, 8], normal: [2, 4, 6, 10, 12, 14] },
    }),
  },
  {
    id: 'neosoul',
    group: groups.soul,
    bpm: 82,
    kit: 'standard',
    hint: 'Leicht verschleppt. Spiel bewusst etwas hinter dem Klick – aber jede Note gleich weit hinten.',
    pattern: build(
      'Neo-Soul (verschleppt)',
      'standard',
      {
        kick: { accent: [0], normal: [6, 11] },
        snare: { accent: [4, 12], ghost: [2, 7, 10, 15] },
        closedHat: { accent: every(0, 12, 4), normal: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15] },
      },
      4,
      1,
      0.57,
    ),
  },
  {
    id: 'slowjam',
    group: groups.soul,
    bpm: 68,
    kit: 'extended',
    hint: 'Viel Platz und ein Cross-Stick statt Snare. Ideal für lange Töne und Slides.',
    pattern: build('Slow Jam', 'extended', {
      kick: { accent: [0, 8], normal: [11] },
      rim: { accent: [4, 12] },
      closedHat: { normal: every(0, 14, 2) },
      shaker: { ghost: every(0, 15, 1) },
    }),
  },
  {
    id: 'gospel',
    group: groups.soul,
    bpm: 74,
    kit: 'standard',
    hint: 'Triolen-Shuffle mit Backbeat. Die mittlere Triole bleibt frei – spiel sie nicht versehentlich mit.',
    pattern: build(
      'Gospel-Shuffle',
      'standard',
      {
        kick: { accent: [0, 6], normal: [9] },
        snare: { accent: [3, 9] },
        closedHat: { accent: [0, 3, 6, 9], normal: [2, 5, 8, 11] },
      },
      3,
    ),
  },
  {
    id: 'baiao',
    group: groups.brazil,
    bpm: 100,
    kit: 'brazilian',
    hint: 'Die tiefe Trommel spielt 1 und das „und“ von 2. Ein Übe-Gerüst, keine Transkription.',
    pattern: build('Baião (Grundgerüst)', 'brazilian', {
      kick: { accent: [0], normal: [6] },
      rim: { accent: [4, 12] },
      shaker: { normal: every(0, 15, 1) },
    }),
  },
];

export const presetById = (id: string) => drumPresets.find((preset) => preset.id === id);
export const presetGroups = [...new Set(drumPresets.map((preset) => preset.group))];
