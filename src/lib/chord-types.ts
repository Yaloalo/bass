/** Any degree string degreeSemitones() accepts: /^([b#]*)(\d+)$/ */
export type Degree = string;

/**
 * The degrees a chord *symbol* may contain. Deliberately narrower than Degree, so a
 * typo in the catalogue is a compile error rather than a runtime throw in degreeSemitones().
 * Practice transformations widen back to Degree because they emit 10, b14, 16 and so on.
 */
export type ChordDegree =
  | '1'
  | 'b2'
  | '2'
  | '#2'
  | 'b3'
  | '3'
  | '4'
  | '#4'
  | 'b5'
  | '5'
  | '#5'
  | 'b6'
  | '6'
  | 'bb7'
  | 'b7'
  | '7'
  | 'b9'
  | '9'
  | '#9'
  | '11'
  | '#11'
  | 'b13'
  | '13';

export type ChordFamily =
  | 'interval'
  | 'triad'
  | 'suspended'
  | 'added'
  | 'seventh'
  | 'ninth'
  | 'eleventh'
  | 'thirteenth'
  | 'altered';

export const chordFamilies: { id: ChordFamily; name: string; description: string }[] = [
  { id: 'interval', name: 'Intervallklänge', description: 'Zwei Töne. Kein Tongeschlecht.' },
  { id: 'triad', name: 'Dreiklänge', description: 'Grundton, Terz, Quinte – das Fundament.' },
  { id: 'suspended', name: 'Vorhalte (sus)', description: 'Die Terz ist ersetzt, nicht ergänzt.' },
  { id: 'added', name: 'Hinzugefügte Töne & Sexten', description: 'Farbe ohne Septime.' },
  { id: 'seventh', name: 'Septakkorde', description: 'Die vier Grundtypen der Jazzharmonik.' },
  { id: 'ninth', name: 'None-Akkorde', description: 'Erste Erweiterung über der Septime.' },
  { id: 'eleventh', name: 'Undezim-Akkorde', description: 'Die Quarte als Farbe – mit Vorsicht.' },
  {
    id: 'thirteenth',
    name: 'Tredezim-Akkorde',
    description: 'Der volle Klang, praktisch reduziert.',
  },
  {
    id: 'altered',
    name: 'Alterierte Dominanten',
    description: 'Quinte und None systematisch verändert.',
  },
];

export interface ChordDefinition {
  /** Stable slug; also the route segment /chords/<id>. */
  readonly id: string;
  /** Canonical symbol suffix appended to the root: '' | 'm' | 'maj7' | '7#9' … */
  readonly symbol: string;
  /** Other spellings seen in real charts. Feeds search only. */
  readonly aliases: readonly string[];
  readonly nameDe: string;
  /** What the symbol denotes, ascending by degreeSemitones(). */
  readonly formula: readonly ChordDegree[];
  readonly family: ChordFamily;
  /** Without these the symbol is no longer identifiable. Subset of formula. */
  readonly required: readonly ChordDegree[];
  /** Routinely dropped in real voicings. Subset of formula, disjoint from required. */
  readonly omissible: readonly ChordDegree[];
  /** Degrees that alter the 5 or the 9 relative to the plain parent chord. */
  readonly alterations: readonly ChordDegree[];
  /** Degrees above the seventh. */
  readonly extensions: readonly ChordDegree[];
  readonly descriptionDe: string;
  /** Full tertian stack where the symbol deliberately omits a stack member. */
  readonly tertianStack?: readonly ChordDegree[];
  /** Stack members excluded because they clash with a chord tone. */
  readonly avoid?: readonly ChordDegree[];
  /** true ⇒ the symbol names a family of voicings, not one pitch set. */
  readonly voicingFamily?: boolean;
  /** The pitch supply a voicing family actually draws on, used for its fingering. */
  readonly practiceSet?: readonly Degree[];
  /** Editorial caveat, shown as a footnote. Only where genuinely needed. */
  readonly noteDe?: string;
}
