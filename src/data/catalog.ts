import book from './book.json';
import { scaleName, textDe } from '../lib/i18n';
import { chords } from './chords';
import { exerciseRowsDe, progressionDe, scaleRowsDe } from './catalog-de';
import { basicExercises } from './exercises-basic';
import {
  degreeSemitones,
  chromaticDegrees,
  mod,
  pitchClass,
  soundingMidi,
  isNote,
} from '../lib/music';
import type { MusicEvent, FingeringNote } from '../lib/music';
export interface Scale {
  id: string;
  name: string;
  aliases?: string[];
  degreeLabels: string[];
  intervals: number[];
  stepPattern: string[];
  signature: string;
  applications: string;
  description: string;
  comparison: string;
  fingering: FingeringNote[];
  category: string;
  characteristic: string[];
  parentMode?: number;
}
const characteristics = [
  ['3', '7'],
  ['b6'],
  ['6'],
  ['b2'],
  ['#4'],
  ['b7'],
  ['b5'],
  ['7'],
  ['6', '7'],
  ['3', '6'],
  ['b3', 'b7'],
  ['b5'],
];
export const scales: Scale[] = book.scales.map((s, i) => ({
  ...s,
  name: scaleName(s.id),
  signature: scaleRowsDe[s.id][0],
  applications: scaleRowsDe[s.id][1],
  description: scaleRowsDe[s.id][2],
  comparison: scaleRowsDe[s.id][3],
  intervals: s.degreeLabels.map(degreeSemitones),
  fingering: (s.fingering as FingeringNote[]).map((n) => ({
    ...n,
    role: n.degree === 'b5' && s.id === 'blues' ? 'Passing tone' : undefined,
  })),
  category: i < 2 || i >= 9 ? 'Core' : i < 7 ? 'Modes' : 'Minor systems',
  characteristic: characteristics[i],
  aliases:
    i === 0 ? ['Ionian', 'Ionisch', s.name] : i === 1 ? ['Aeolian', 'Äolisch', s.name] : [s.name],
  parentMode: [1, 6, 2, 3, 4, 5, 7][i],
}));
/* Chords and arpeggios share one model in src/data/chords.ts: a chord is a set of
   degrees, an arpeggio is those degrees in sequence. There is no second database. */
export interface Exercise {
  /** A drum groove that suits this exercise, where one does. */
  groove?: string;
  id: string;
  number: number;
  globalNumber: number;
  category: string;
  title: string;
  startBpm: number;
  targetBpm: number;
  rhythm: string;
  instructions: string;
  target: string;
  progression: string;
  tags: string[];
  baseRoot: string;
  events: MusicEvent[];
  editorialNote?: string;
}
const minorExercises = [2, 4, 5, 7, 9, 18, 19];
export const exercises: Exercise[] = book.exercises.map((e) => {
  const degrees =
    e.category === 'musical' && minorExercises.includes(e.number)
      ? ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']
      : chromaticDegrees;
  const events = (e.events as MusicEvent[]).map((n) =>
    isNote(n) ? { ...n, degree: degrees[mod(soundingMidi(n) - pitchClass(e.baseRoot))] } : n,
  );
  const notes: Record<string, string> = {
    M12: 'Die letzte Gruppe kehrt zu C zurück, statt H zu wiederholen: eine Tonikarückkehr nach dem Cmaj7-Arpeggio.',
    M13: 'Oktavgrundton und Sekunde bilden das Schlussintervall nach der Terzenfolge.',
    M14: 'Beginne die Annäherung als Auftakt auf dem vorherigen Offbeat, damit die Ziele auf betonten Zählzeiten landen. Unten steht die Achtelfolge des Buchs.',
    M19: 'Die sparsame Zweiton-Zelle nutzt auf Zählzeit 4 den aktuellen Grundton. Eine echte Akkordantizipation zielt dagegen auf einen Ton des folgenden Akkords.',
    M20: 'Das Buchbeispiel steht in C: Dm7 | G7 | Cmaj7 | A7. Die Diagramme sind auf deinen gewählten Grundton transponiert; die Zelle legt die Quinte auf 2-und und den Grundton des jeweiligen Akkords auf 4. Nutze für echte Antizipation einen Ton des folgenden Akkords.',
  };
  const [title, instructions, target] = exerciseRowsDe[e.id];
  return {
    ...e,
    title,
    instructions,
    target,
    progression: progressionDe,
    rhythm:
      e.rhythm === 'quarter notes'
        ? 'Viertelnoten'
        : e.rhythm === 'eighth-note grid'
          ? 'Achtelraster'
          : 'Achtelnoten',
    events,
    editorialNote: notes[e.id],
  };
});
/**
 * The book's exercises plus a beginner category written for this app. They share the
 * Exercise shape, so every page — library, player, daily plan, programs — treats them
 * the same.
 */
const basics: Exercise[] = basicExercises.map((entry, index) => ({
  id: entry.id,
  number: entry.number,
  globalNumber: exercises.length + index + 1,
  category: 'basics',
  title: entry.title,
  startBpm: entry.startBpm,
  targetBpm: entry.targetBpm,
  rhythm: entry.rhythm,
  instructions: entry.instructions,
  target: entry.target,
  progression: progressionDe,
  tags: ['Grundlagen'],
  baseRoot: 'D',
  events: entry.events.map((event) =>
    isNote(event)
      ? { ...event, degree: chromaticDegrees[mod(soundingMidi(event) - pitchClass('D'))] }
      : event,
  ),
  groove: entry.groove,
}));
exercises.push(...basics);

/**
 * A groove for every exercise, so opening one is enough to start playing: technique
 * cells get a bare pulse or a straight pocket, musical material gets the feel it is
 * written in. The beginner exercises carry their own; these cover the book's forty.
 */
const bookGrooves: Record<string, string> = {
  P1: 'sparse',
  P2: 'sparse',
  P3: 'sparse',
  P4: 'sparse',
  P5: 'pocket',
  P6: 'sparse',
  P7: 'sparse',
  P8: 'pocket',
  P9: 'sparse',
  P10: 'pocket',
  P11: 'four',
  P12: 'four',
  P13: 'pocket',
  P14: 'sparse',
  P15: 'rock-eighth',
  P16: 'rock-eighth',
  P17: 'rock-eighth',
  P18: 'pocket',
  P19: 'pocket',
  P20: 'rock-eighth',
  M1: 'pocket',
  M2: 'pocket',
  M3: 'rock-eighth',
  M4: 'rock-eighth',
  M5: 'shuffle',
  M6: 'pocket',
  M7: 'pocket',
  M8: 'ride',
  M9: 'ride',
  M10: 'four',
  M11: 'pocket',
  M12: 'ride',
  M13: 'pocket',
  M14: 'ride',
  M15: 'ride',
  M16: 'ride',
  M17: 'funk',
  M18: 'funk',
  M19: 'mambo-tumbao',
  M20: 'son-clave-32',
};

/** The drum groove that suits an exercise. Every exercise has one. */
export const exerciseGroove = (id: string) =>
  basicExercises.find((entry) => entry.id === id)?.groove ?? bookGrooves[id];

export const exerciseCategories = [
  { id: 'basics', label: 'Grundlagen', eyebrow: 'GRUNDLAGEN' },
  { id: 'physical', label: 'Technik', eyebrow: 'TECHNIK' },
  { id: 'musical', label: 'Musikalisch', eyebrow: 'MUSIKALISCH' },
] as const;

export interface PracticeProgram {
  id: string;
  number: number;
  section?: ProgramSection;
  name: string;
  blocks: { exerciseId: string }[];
}
/** The three areas the practice programmes are grouped into. */
export const programSections = [
  {
    id: 'grundlagen',
    name: 'Basics, Fingerarbeit & Technik',
    description: 'Von der leeren Saite bis zur sicheren Greifhand. Fang hier an, wenn du neu bist.',
  },
  {
    id: 'harmonie',
    name: 'Tonleitern & Akkorde',
    description: 'Die Töne, aus denen Basslinien gebaut sind – erst greifen, dann verstehen.',
  },
  {
    id: 'groove',
    name: 'Timing, Groove & Griffbrett',
    description: 'Mit dem Schlagzeug spielen und denselben Ton überall finden.',
  },
] as const;

export type ProgramSection = (typeof programSections)[number]['id'];

/**
 * Thirty programmes, ten per section, each six five-minute blocks. They are ordered
 * from easiest to hardest inside a section, so the list itself is the curriculum.
 */
const programPlans: {
  id: string;
  section: ProgramSection;
  name: string;
  blocks: string[];
}[] = [
  // --- Basics, Fingerarbeit & Technik ---
  {
    id: 'erste-toene',
    section: 'grundlagen',
    name: 'Die ersten Töne',

    blocks: ['B1', 'B2', 'B20', 'B15', 'B3', 'B1'],
  },
  {
    id: 'finger-setzen',
    section: 'grundlagen',
    name: 'Finger setzen',

    blocks: ['B3', 'B4', 'B19', 'P1', 'B3', 'B20'],
  },
  {
    id: 'wechselschlag',
    section: 'grundlagen',
    name: 'Wechselschlag',

    blocks: ['B1', 'B10', 'P16', 'P17', 'B10', 'B2'],
  },
  {
    id: 'daempfen',
    section: 'grundlagen',
    name: 'Sauber dämpfen',

    blocks: ['B20', 'B16', 'P5', 'B15', 'B20', 'B2'],
  },
  {
    id: 'vier-finger',
    section: 'grundlagen',
    name: 'Alle vier Finger',

    blocks: ['P1', 'P2', 'P3', 'P4', 'B19', 'P15'],
  },
  {
    id: 'saitenwechsel',
    section: 'grundlagen',
    name: 'Saitenwechsel',

    blocks: ['P5', 'P6', 'P7', 'P8', 'B19', 'P17'],
  },
  {
    id: 'lagen',
    section: 'grundlagen',
    name: 'Lagenwechsel',

    blocks: ['P9', 'P10', 'B22', 'P14', 'P9', 'B18'],
  },
  {
    id: 'spinne',
    section: 'grundlagen',
    name: 'Spinne & Koordination',

    blocks: ['P6', 'P7', 'P15', 'P18', 'P19', 'P3'],
  },
  {
    id: 'ausdauer',
    section: 'grundlagen',
    name: 'Ausdauer',

    blocks: ['P20', 'B19', 'P15', 'B10', 'P20', 'B1'],
  },
  {
    id: 'technik-check',
    section: 'grundlagen',
    name: 'Technik-Check',

    blocks: ['B1', 'B3', 'P1', 'P5', 'P16', 'P19'],
  },

  // --- Tonleitern & Akkorde ---
  {
    id: 'erste-tonleiter',
    section: 'harmonie',
    name: 'Die erste Tonleiter',

    blocks: ['B5', 'B5', 'B12', 'B21', 'B5', 'B9'],
  },
  {
    id: 'dur-und-moll',
    section: 'harmonie',
    name: 'Dur und Moll',

    blocks: ['B5', 'B6', 'M1', 'M2', 'B9', 'B6'],
  },
  {
    id: 'pentatonik',
    section: 'harmonie',
    name: 'Pentatonik',

    blocks: ['B14', 'M3', 'M4', 'B14', 'M5', 'B14'],
  },
  {
    id: 'dreiklaenge',
    section: 'harmonie',
    name: 'Dreiklänge',

    blocks: ['B9', 'M6', 'M7', 'B9', 'M6', 'B8'],
  },
  {
    id: 'septakkorde',
    section: 'harmonie',
    name: 'Septakkorde',

    blocks: ['M8', 'M9', 'M6', 'M7', 'M8', 'M9'],
  },
  {
    id: 'intervalle',
    section: 'harmonie',
    name: 'Intervalle greifen',

    blocks: ['B7', 'B8', 'B13', 'P12', 'P13', 'B7'],
  },
  {
    id: 'terzen',
    section: 'harmonie',
    name: 'Terzen & Sprünge',

    blocks: ['B12', 'M13', 'B21', 'P13', 'M13', 'B12'],
  },
  {
    id: 'stimmfuehrung',
    section: 'harmonie',
    name: 'Stimmführung',

    blocks: ['M11', 'M12', 'M10', 'M11', 'M12', 'B11'],
  },
  {
    id: 'annaeherung',
    section: 'harmonie',
    name: 'Chromatische Annäherung',

    blocks: ['M14', 'M15', 'M16', 'M14', 'M15', 'M12'],
  },
  {
    id: 'harmonie-check',
    section: 'harmonie',
    name: 'Harmonie-Check',

    blocks: ['B5', 'B9', 'M8', 'M11', 'M12', 'B12'],
  },

  // --- Timing, Groove & Griffbrett ---
  {
    id: 'puls-halten',
    section: 'groove',
    name: 'Puls halten',

    blocks: ['B2', 'B15', 'B16', 'B2', 'B20', 'B15'],
  },
  {
    id: 'achtel',
    section: 'groove',
    name: 'Achtel im Griff',

    blocks: ['B10', 'B10', 'B17', 'M17', 'B10', 'B24'],
  },
  {
    id: 'offbeat',
    section: 'groove',
    name: 'Offbeats',

    blocks: ['B17', 'B16', 'B17', 'M18', 'B17', 'B10'],
  },
  {
    id: 'wechsel',
    section: 'groove',
    name: 'Akkordwechsel im Takt',

    blocks: ['B11', 'B13', 'M10', 'B11', 'M11', 'B13'],
  },
  {
    id: 'shuffle',
    section: 'groove',
    name: 'Shuffle & Swing',

    blocks: ['B24', 'B24', 'M17', 'B10', 'B24', 'B14'],
  },
  {
    id: 'groove-bauen',
    section: 'groove',
    name: 'Groove bauen',

    blocks: ['M17', 'M18', 'B13', 'M10', 'M18', 'B11'],
  },
  {
    id: 'latin',
    section: 'groove',
    name: 'Latin-Zellen',

    blocks: ['M19', 'M20', 'M19', 'B17', 'M20', 'M19'],
  },
  {
    id: 'griffbrett-oktaven',
    section: 'groove',
    name: 'Griffbrett: Oktaven',

    blocks: ['B7', 'B22', 'P11', 'B18', 'B22', 'B23'],
  },
  {
    id: 'griffbrett-toene',
    section: 'groove',
    name: 'Griffbrett: Töne finden',

    blocks: ['B23', 'B18', 'P11', 'P12', 'B23', 'B22'],
  },
  {
    id: 'groove-check',
    section: 'groove',
    name: 'Groove-Check',

    blocks: ['B10', 'B17', 'B11', 'M17', 'B22', 'M10'],
  },
];

export const programs: PracticeProgram[] = programPlans.map((plan, index) => ({
  id: plan.id,
  number: index + 1,
  section: plan.section,
  name: plan.name,
  blocks: plan.blocks.map((exerciseId) => ({ exerciseId })),
}));

/**
 * The groove a programme runs on: the one its opening block uses. Every block still
 * loads its own, so a programme that changes feel halfway does exactly that.
 */
export const programGroove = (program: PracticeProgram) =>
  exerciseGroove(program.blocks[0].exerciseId);

export const exercisePath = (e: Exercise) => `/exercises/${e.category}/${e.number}`;
export const scaleById = (id: string) =>
  scales.find(
    (s) => s.id === (id === 'ionian' ? 'major' : id === 'aeolian' ? 'natural-minor' : id),
  );
export const theoryPages = [
  ['fretboard', 'Fretboard & octaves'],
  ['intervals', 'Intervals'],
  ['scale-formulas', 'Scale formulas'],
  ['modes', 'Modes'],
  ['chord-formulas', 'Chord formulas'],
  ['key-signatures', 'Key signatures'],
  ['harmony', 'Diatonic harmony'],
  ['rhythm', 'Rhythm values'],
  ['notation', 'Bass clef & symbols'],
  ['transposition', 'Transposition'],
];
export interface SearchItem {
  title: string;
  path: string;
  category: string;
  keywords: string;
}
export const searchIndex: SearchItem[] = [
  {
    title: 'Interaktives Piano',
    path: '/piano',
    category: 'Musiktheorie',
    keywords: 'Klavier Tastatur Tonart Tonleiter Akkorde Noten chord piano keyboard',
  },
  ...scales.map((s) => ({
    title: s.name,
    path: `/scales/${s.id}`,
    category: 'Tonleitern',
    keywords: [...(s.aliases ?? []), ...s.degreeLabels, s.description, s.applications].join(' '),
  })),
  ...chords.map((s) => ({
    title: s.nameDe,
    path: '/chords/' + s.id,
    category: 'Akkorde',
    keywords:
      s.symbol + ' ' + s.formula.join(' ') + ' ' + s.descriptionDe + ' ' + s.aliases.join(' '),
  })),
  ...exercises.map((e) => ({
    title: `${e.id} · ${e.title}`,
    path: exercisePath(e),
    category: 'Übungen',
    keywords: `exercise ${e.number} exercise ${e.globalNumber} ${e.tags.join(' ')} ${e.instructions} ${book.exercises.find((x) => x.id === e.id)?.title ?? ''}`,
  })),
  ...programs.map((p) => ({
    title: p.name,
    path: `/programs/${p.id}`,
    category: 'Programme',
    // Searchable by the exercises it runs and by the section it belongs to.
    keywords:
      p.blocks.map((b) => b.exerciseId).join(' ') +
      ' ' +
      (programSections.find((section) => section.id === p.section)?.name ?? ''),
  })),
  ...theoryPages.map(([id, title]) => ({
    title: textDe(title),
    path: `/theory/${id}`,
    category: 'Theorie',
    keywords:
      title +
      ' ' +
      textDe(title) +
      ' ' +
      (id === 'key-signatures'
        ? 'Vorzeichen Paralleltonart Kreuze Bes relative major relative minor sharps flats'
        : ''),
  })),
  ...[
    [
      'Übeprogramme',
      '/programs',
      'Programm Einheit Timer Blöcke fünf Minuten Basics Technik Tonleitern Akkorde Groove session',
    ],
    ['Stimmgerät', '/stimmgeraet', 'stimmen Tuner Mikrofon Cent Saite Referenzton tuning'],
    [
      'Quintenzirkel',
      '/quintenzirkel',
      'Tonarten Vorzeichen Kreuze Bes Parallele circle of fifths',
    ],
    ['Gehörbildung', '/gehoer', 'hören Intervalle Akkorde erkennen Training ear'],
    [
      'Drum-Maschine',
      '/drums',
      'Schlagzeug Groove Sequencer Funk Swing Rhythmus Patterns Tempo tippen FM-Synthese drums',
    ],
    [
      'Metronom',
      '/tools/metronome',
      'Klick Lücken stille Takte Einzähler Unterteilung Tempo tippen metronome',
    ],
    ['Griffbrett', '/fretboard', 'Noten Intervalle Trainer fretboard'],
    ['Diatonische Harmonie', '/harmony', 'Dur Moll Stufen Akkordfolge harmony'],
    [
      'Basslinien bauen',
      '/basslines',
      'Grundton Quinte Terz Oktave Durchgangstöne Rhythmus bassline',
    ],
    [
      'Stimmführung',
      '/basslines#voice-leading',
      'Zielton nächster Akkord gemeinsame Töne voice leading',
    ],
    ['Chromatische Annäherung', '/basslines#approach-notes', 'Durchgangston Umspielung approach'],
    ['Salsa / Latin', '/basslines/latin', 'Tumbao Antizipation Percussion Clave'],
    [
      'Improvisation – Einstieg',
      '/improvisation',
      'Motive Frage Antwort Tonleiterwahl improvisation',
    ],
    ['Play-Along-Ansicht', '/improvisation/play', 'Zieltöne charakteristische Stufe play along'],
    ['Latin-Improvisation', '/improvisation/latin', 'Salsa Clave Zurückhaltung'],
    ['Das komplette PDF', '/pdf', 'Buch Original Nachschlagewerk book'],
    ['Akkorde', '/chords', 'Akkord-Atlas Arpeggien Dreiklänge Septakkorde Formeln chords'],
    ['Tonleitern & Modi', '/scales', 'Tonleiter-Atlas Skalen Modi Dur Moll scales'],
    ['Musiktheorie', '/musiktheorie', 'Bereich Übersicht Piano Tonleitern Akkorde'],
    ['Bass', '/bass', 'Bereich Übersicht Üben Griffbrett Übungen Programme'],
  ].map(([title, path, keywords]) => ({
    title,
    path,
    category:
      path.startsWith('/tools') || path === '/drums'
        ? 'Tools'
        : path.startsWith('/programs') || path === '/stimmgeraet'
          ? 'Üben'
          : 'Nachschlagen',
    keywords,
  })),
];
export function search(query: string) {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replaceAll('♭', 'b')
      .replaceAll('♯', '#')
      .replace(/[-–·]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const q = normalize(query);
  if (!q) return searchIndex.slice(0, 8);
  const words = q.split(' ');
  // Rank by how directly the title matches, so a keyword-only hit never outranks the
  // page actually named after the query.
  const score = (item: SearchItem) => {
    const title = normalize(item.title);
    if (title === q) return 4;
    if (title.startsWith(q)) return 3;
    if (title.includes(q)) return 2;
    return words.every((word) => title.includes(word)) ? 1 : 0;
  };
  return searchIndex
    .filter((x) =>
      words.every((w) => normalize(x.title + ' ' + x.keywords + ' ' + x.category).includes(w)),
    )
    .map((item) => ({ item, rank: score(item) }))
    .sort((a, b) => b.rank - a.rank)
    .map((entry) => entry.item)
    .slice(0, 30);
}
