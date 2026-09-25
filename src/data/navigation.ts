export interface AreaItem {
  title: string;
  path: string;
  group: string;
  description: string;
  icon: string;
}

/**
 * Three areas, deliberately short. Pages that are not listed here still exist at their
 * own URL — they are simply not part of the everyday navigation.
 */
export const areas = [
  {
    id: 'musiktheorie',
    title: 'MUSIKTHEORIE',
    description: 'Töne hören, Zusammenhänge sehen, Harmonie verstehen.',
    items: [
      {
        title: 'Interaktives Piano',
        path: '/piano',
        group: 'Entdecken',
        icon: 'music',
        description: 'Tonleitern sehen, Töne spielen und Akkorde erkennen.',
      },
      {
        title: 'Auswendig lernen',
        path: '/auswendig-lernen',
        group: 'Üben',
        icon: 'check',
        description: 'Tonleitern und Akkorde Ton für Ton selbst zusammensetzen.',
      },
      {
        title: 'Gehörbildung',
        path: '/gehoer',
        group: 'Entdecken',
        icon: 'music',
        description: 'Intervalle und Akkorde hören, benennen und sofort sehen.',
      },
      {
        title: 'Quintenzirkel',
        path: '/quintenzirkel',
        group: 'Entdecken',
        icon: 'repeat',
        description: 'Alle Tonarten im Kreis: Vorzeichen, Parallelen und Nachbarn.',
      },
      {
        title: 'Tonleitern & Modi',
        path: '/scales',
        group: 'Nachschlagen',
        icon: 'layers',
        description: 'Dur, Moll und die Klangfarben der Modi in jeder Tonart.',
      },
      {
        title: 'Akkorde',
        path: '/chords',
        group: 'Nachschlagen',
        icon: 'music',
        description: 'Vom Dreiklang bis zu erweiterten Akkorden: Formeln, Klänge und Arpeggien.',
      },
      {
        title: 'Grundlagen der Musiktheorie',
        path: '/grundlagen',
        group: 'Verstehen',
        icon: 'book',
        description:
          'Ein langer Artikel von der Sinuswelle bis zum Jazz-Akkord – für alle, die Systeme lieber verstehen als auswendig lernen.',
      },
    ] as AreaItem[],
  },
  {
    id: 'bass',
    title: 'BASS',
    description: 'Vom Griffbrett zur eigenen Basslinie. Eine Aufgabe wählen und losspielen.',
    items: [
      {
        title: 'Übeprogramme',
        path: '/programs',
        group: 'Üben',
        icon: 'clock',
        description: 'Strukturierte Einheiten mit sechs Fünf-Minuten-Blöcken.',
      },
      {
        title: 'Stimmgerät',
        path: '/stimmgeraet',
        group: 'Instrument',
        icon: 'music',
        description: 'Über das Mikrofon stimmen, mit Referenztönen für jede Saite.',
      },
      {
        title: 'Griffbrett',
        path: '/fretboard',
        group: 'Instrument',
        icon: 'grid',
        description: 'Noten, Intervalle und Fingersätze entdecken und trainieren.',
      },
      {
        title: 'Übungsbibliothek',
        path: '/exercises',
        group: 'Üben',
        icon: 'layers',
        description: '40 Übungen für Technik und musikalischen Ausdruck.',
      },
    ] as AreaItem[],
  },
  {
    id: 'drums',
    title: 'DRUM-MASCHINE',
    description: 'Grooves, Sequencer, eigene Patterns und FM-Drumsynthese.',
    items: [
      {
        title: 'Drum-Maschine',
        path: '/drums',
        group: 'Rhythmus',
        icon: 'grid',
        description: 'Grooves, Sequencer, eigene Patterns und FM-Drumsynthese.',
      },
    ] as AreaItem[],
  },
] as const;

export type AreaId = (typeof areas)[number]['id'];

export function areaForPath(path: string): AreaId | undefined {
  const segment = path.split('/')[1];
  if (segment === 'drums') return 'drums';
  if (
    [
      'bass',
      'fretboard',
      'stimmgeraet',
      'exercises',
      'programs',
      'basslines',
      'improvisation',
    ].includes(segment)
  )
    return 'bass';
  if (
    [
      'musiktheorie',
      'piano',
      'auswendig-lernen',
      'gehoer',
      'quintenzirkel',
      'grundlagen',
      'scales',
      'chords',
      'arpeggios',
      'harmony',
      'theory',
      'pdf',
    ].includes(segment)
  )
    return 'musiktheorie';
}

/** The drum area is a single tool, so its nav entry goes straight there. */
export const areaPath = (id: AreaId) => (id === 'drums' ? '/drums' : '/' + id);
