import book from './book.json';
import {
  arpeggioRoute,
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
  name: s.name[0].toUpperCase() + s.name.slice(1),
  intervals: s.degreeLabels.map(degreeSemitones),
  fingering: (s.fingering as FingeringNote[]).map((n) => ({
    ...n,
    role: n.degree === 'b5' && s.id === 'blues' ? 'Passing tone' : undefined,
  })),
  category: i < 2 || i >= 9 ? 'Core' : i < 7 ? 'Modes' : 'Minor systems',
  characteristic: characteristics[i],
  aliases: i === 0 ? ['Ionian'] : i === 1 ? ['Aeolian'] : [],
  parentMode: [1, 6, 2, 3, 4, 5, 7][i],
}));
export interface Arpeggio {
  id: string;
  name: string;
  degreeLabels: string[];
  intervals: number[];
  description: string;
  symbol: string;
  fingering: FingeringNote[];
  category: string;
}
const arpRows = [
  [
    'major',
    'Major triad',
    '1 3 5',
    '',
    'Root first; the third states major, the fifth supplies stability.',
  ],
  ['minor', 'Minor triad', '1 b3 5', 'm', 'Root and minor third define the sound.'],
  [
    'diminished',
    'Diminished triad',
    '1 b3 b5',
    'dim',
    'The lowered fifth is essential; common on vii° in major and ii° in minor.',
  ],
  [
    'augmented',
    'Augmented triad',
    '1 3 #5',
    'aug',
    'The raised fifth creates instability and direction.',
  ],
  ['major-7', 'Major 7', '1 3 5 7', 'maj7', 'The major seventh is the characteristic color.'],
  [
    'dominant-7',
    'Dominant 7',
    '1 3 5 b7',
    '7',
    'The third and flat seventh form the defining tritone; hear their resolution.',
  ],
  [
    'minor-7',
    'Minor 7',
    '1 b3 5 b7',
    'm7',
    'Root, flat third and flat seventh identify minor-seven harmony.',
  ],
  [
    'minor-7b5',
    'Minor 7♭5',
    '1 b3 b5 b7',
    'm7b5',
    'Half-diminished harmony; the flat fifth is essential.',
  ],
  [
    'diminished-7',
    'Diminished 7',
    '1 b3 b5 bb7',
    'dim7',
    'A symmetrical stack of minor thirds. Spell the final tone as a diminished seventh, not a sixth.',
  ],
];
export const arpeggios: Arpeggio[] = arpRows.map(([id, name, formula, symbol, description], i) => ({
  id,
  name,
  degreeLabels: formula.split(' '),
  intervals: formula.split(' ').map(degreeSemitones),
  symbol,
  description,
  fingering: arpeggioRoute(formula.split(' ')),
  category: i < 4 ? 'Triads' : 'Seventh chords',
}));
export const extraChords = [
  {
    name: 'Power chord',
    symbol: '5',
    degreeLabels: ['1', '5'],
    description: 'No third: neither major nor minor.',
  },
  {
    name: 'Suspended 2',
    symbol: 'sus2',
    degreeLabels: ['1', '2', '5'],
    description: 'The second replaces the third.',
  },
  {
    name: 'Suspended 4',
    symbol: 'sus4',
    degreeLabels: ['1', '4', '5'],
    description: 'The fourth replaces the third; follow its resolution.',
  },
  {
    name: 'Minor-major 7',
    symbol: 'm(maj7)',
    degreeLabels: ['1', 'b3', '5', '7'],
    description: 'A minor triad with a major seventh.',
  },
];
export interface Exercise {
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
    M12: 'The last C-based group returns to C rather than repeating B: a tonic return after the preceding Cmaj7 arpeggio.',
    M13: 'The final octave-root to second is a closing pair after the sequence of thirds.',
    M14: 'To land targets on strong beats, begin the first approach on the preceding offbeat as a pickup. The source eighth-note sequence is shown below.',
    M19: 'This is the book’s sparse two-hit study cell. Beat 4 uses the current bar’s root. A literal chord anticipation must instead target a tone of the incoming chord.',
    M20: 'Four bars in C: Dm7 | G7 | Cmaj7 | A7. Beat 4 uses each current bar’s root. Use a chord tone of the incoming harmony when practicing literal anticipation.',
  };
  return { ...e, events, editorialNote: notes[e.id] };
});
export interface PracticeProgram {
  id: string;
  number: number;
  name: string;
  blocks: { exerciseId: string; purpose: string }[];
}
export const programs: PracticeProgram[] = book.programs.map((p) => ({
  ...p,
  name: p.name.replace('latin', 'Latin'),
}));
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
  ...scales.map((s) => ({
    title: s.name,
    path: `/scales/${s.id}`,
    category: 'Scales',
    keywords: [...(s.aliases ?? []), ...s.degreeLabels, s.description, s.applications].join(' '),
  })),
  ...arpeggios.map((s) => ({
    title: s.name,
    path: `/arpeggios/${s.id}`,
    category: 'Arpeggios',
    keywords: s.degreeLabels.join(' ') + ' ' + s.description + ' ' + s.symbol,
  })),
  ...extraChords.map((s) => ({
    title: s.name,
    path: '/chords#' + s.symbol,
    category: 'Chords',
    keywords: s.degreeLabels.join(' ') + ' ' + s.symbol,
  })),
  ...exercises.map((e) => ({
    title: `${e.id} · ${e.title}`,
    path: exercisePath(e),
    category: 'Exercises',
    keywords: `exercise ${e.number} exercise ${e.globalNumber} ${e.tags.join(' ')} ${e.instructions}`,
  })),
  ...programs.map((p) => ({
    title: p.name,
    path: `/programs/${p.id}`,
    category: 'Programs',
    keywords: p.blocks.map((b) => b.purpose).join(' '),
  })),
  ...theoryPages.map(([id, title]) => ({
    title,
    path: `/theory/${id}`,
    category: 'Theory',
    keywords:
      title + ' ' + (id === 'key-signatures' ? 'relative major relative minor sharps flats' : ''),
  })),
  ...[
    ['Fretboard', '/fretboard', 'notes intervals trainer'],
    ['Diatonic harmony', '/harmony', 'major minor chord progression'],
    ['Bassline construction', '/basslines', 'root fifth third octave passing tones rhythm'],
    ['Voice leading', '/basslines#voice-leading', 'targeting next chord common tones'],
    ['Chromatic approach', '/basslines#approach-notes', 'passing tone enclosure'],
    ['Salsa / Latin', '/basslines/latin', 'tumbao anticipation percussion'],
    ['Quick improvisation guide', '/improvisation', 'motifs question answer scale chooser'],
    ['Play-along screen', '/improvisation/play', 'safe tones characteristic degree'],
    ['Latin improvisation', '/improvisation/latin', 'salsa clave restraint'],
    ['Complete PDF', '/pdf', 'book static reference'],
  ].map(([title, path, keywords]) => ({ title, path, category: 'Reference', keywords })),
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
  return searchIndex
    .filter((x) =>
      words.every((w) => normalize(x.title + ' ' + x.keywords + ' ' + x.category).includes(w)),
    )
    .sort((a, b) => Number(normalize(b.title).includes(q)) - Number(normalize(a.title).includes(q)))
    .slice(0, 30);
}
