/** Presentation helpers only: musical storage and calculations retain international B/Bb. */
const scaleNames: Record<string, string> = {
  major: 'Dur',
  'natural-minor': 'Natürliches Moll',
  dorian: 'Dorisch',
  phrygian: 'Phrygisch',
  lydian: 'Lydisch',
  mixolydian: 'Mixolydisch',
  locrian: 'Lokrisch',
  'harmonic-minor': 'Harmonisches Moll',
  'melodic-minor': 'Melodisches Moll',
  'major-pentatonic': 'Dur-Pentatonik',
  'minor-pentatonic': 'Moll-Pentatonik',
  blues: 'Blues-Tonleiter',
  ionian: 'Ionisch (Dur)',
  aeolian: 'Äolisch (natürliches Moll)',
};
export const scaleName = (id: string) => scaleNames[id] ?? id;

export function germanNoteName(name: string): string {
  const normalized = name.replaceAll('♭', 'b').replaceAll('♯', '#');
  const match = /^([A-G])([#b]*)$/.exec(normalized);
  if (!match) return name;
  const [, letter, accidentals] = match;
  const base = letter === 'B' ? 'H' : letter;
  if (!accidentals) return base;
  if (/^#+$/.test(accidentals)) return base + 'is'.repeat(accidentals.length);
  if (letter === 'B' && accidentals === 'b') return 'B';
  if (/^b+$/.test(accidentals)) {
    const first = letter === 'E' ? 'Es' : letter === 'A' ? 'As' : base + 'es';
    return first + 'es'.repeat(accidentals.length - 1);
  }
  return name;
}

const labels: Record<string, string> = {
  Notes: 'Noten',
  Degrees: 'Stufen',
  'All positions': 'Alle Positionen',
  Fingering: 'Fingersatz',
  Ascending: 'Aufwärts',
  Descending: 'Abwärts',
  'Up / down': 'Auf und ab',
  Core: 'Grundlagen',
  Modes: 'Modi',
  'Minor systems': 'Moll-Systeme',
  Triads: 'Dreiklänge',
  'Seventh chords': 'Septakkorde',
  Scales: 'Tonleitern',
  Arpeggios: 'Arpeggien',
  Chords: 'Akkorde',
  Exercises: 'Übungen',
  Programs: 'Übeprogramme',
  Theory: 'Musiktheorie',
  Reference: 'Nachschlagen',
  Practice: 'Üben',
  Tools: 'Tools',
  Major: 'Dur',
  Minor: 'Moll',
  'Natural minor': 'Natürliches Moll',
  Diminished: 'Vermindert',
  'Major triad': 'Durdreiklang',
  'Minor triad': 'Molldreiklang',
  'Diminished triad': 'Verminderter Dreiklang',
  'Augmented triad': 'Übermäßiger Dreiklang',
  'Major 7': 'Großer Septakkord',
  'Minor 7': 'Mollseptakkord',
  'Dominant 7': 'Dominantseptakkord',
  'Minor 7♭5': 'Halbverminderter Septakkord',
  'Diminished 7': 'Verminderter Septakkord',
  'Power chord': 'Quintklang',
  'Suspended 2': 'Sekundvorhalt',
  'Suspended 4': 'Quartvorhalt',
  'Minor-major 7': 'Moll mit großer Septime',
  Technique: 'Technik',
  Musical: 'Musikalisch',
  Fretboard: 'Griffbrett',
  Scale: 'Tonleiter',
  Arpeggio: 'Arpeggio',
  'Chord tones': 'Akkordtöne',
  Rhythm: 'Rhythmus',
  Muting: 'Dämpfen',
  Shifting: 'Lagenwechsel',
  Improvisation: 'Improvisation',
  'Latin / Salsa': 'Latin / Salsa',
  'Fretboard & octaves': 'Griffbrett & Oktaven',
  Intervals: 'Intervalle',
  'Scale formulas': 'Tonleiterformeln',
  'Chord formulas': 'Akkordformeln',
  'Key signatures': 'Tonarten & Vorzeichen',
  'Diatonic harmony': 'Diatonische Harmonie',
  'Rhythm values': 'Notenwerte',
  'Bass clef & symbols': 'Bassschlüssel & Zeichen',
  Transposition: 'Transposition',
  Root: 'Grundton',
  Fifth: 'Quinte',
  Third: 'Terz',
  Seventh: 'Septime',
  'Chromatic approach': 'Chromatische Annäherung',
  'Passing tones': 'Durchgangstöne',
  Unison: 'Prime',
  'Minor second': 'Kleine Sekunde',
  'Major second': 'Große Sekunde',
  'Minor third': 'Kleine Terz',
  'Major third': 'Große Terz',
  'Perfect fourth': 'Reine Quarte',
  Tritone: 'Tritonus',
  'Perfect fifth': 'Reine Quinte',
  'Minor sixth': 'Kleine Sexte',
  'Major sixth': 'Große Sexte',
  'Minor seventh': 'Kleine Septime',
  'Major seventh': 'Große Septime',
  'Augmented fourth': 'Übermäßige Quarte',
  'Augmented second': 'Übermäßige Sekunde',
  'Diminished fifth': 'Verminderte Quinte',
  'Half-diminished': 'Halbvermindert',
};
export const textDe = (text: string): string => {
  if (labels[text]) return labels[text];
  // intervalBetween retains its stable English model/API; only the presentation changes.
  const interval =
    /^(Perfect|Major|Minor|Augmented|Diminished|\d+× augmented|\d+× diminished|\d+ alterations) (unison|second|third|fourth|fifth|sixth|seventh)$/.exec(
      text,
    );
  if (!interval) return text;
  const quality =
    (
      {
        Perfect: 'Reine',
        Major: 'Große',
        Minor: 'Kleine',
        Augmented: 'Übermäßige',
        Diminished: 'Verminderte',
      } as Record<string, string>
    )[interval[1]] ??
    interval[1]
      .replace('augmented', 'übermäßige')
      .replace('diminished', 'verminderte')
      .replace('alterations', 'Alterationen:');
  const name = (
    {
      unison: 'Prime',
      second: 'Sekunde',
      third: 'Terz',
      fourth: 'Quarte',
      fifth: 'Quinte',
      sixth: 'Sexte',
      seventh: 'Septime',
    } as Record<string, string>
  )[interval[2]];
  return `${quality} ${name}`;
};
