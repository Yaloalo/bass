import type { BassString } from './music';

export type InstrumentId = 'bass' | 'guitar';

export interface InstrumentString {
  /** Unique even where an instrument has two E strings. */
  id: string;
  label: string;
  spokenLabel: string;
  midi: number;
  /** Existing exercises use the four common E–A–D–G strings. */
  exerciseString?: BassString;
}

export interface InstrumentProfile {
  id: InstrumentId;
  name: string;
  nameUpper: string;
  player: string;
  lineName: string;
  stringsHighToLow: InstrumentString[];
  tuningLabel: string;
  tagline: string;
  defaultTuning: string;
  notationClef: 'bass' | 'treble';
}

export const instrumentProfiles: Record<InstrumentId, InstrumentProfile> = {
  bass: {
    id: 'bass',
    name: 'Bass',
    nameUpper: 'BASS',
    player: 'Bassist:in',
    lineName: 'Basslinie',
    stringsHighToLow: [
      { id: 'G2', label: 'G', spokenLabel: 'G', midi: 43, exerciseString: 'G' },
      { id: 'D2', label: 'D', spokenLabel: 'D', midi: 38, exerciseString: 'D' },
      { id: 'A1', label: 'A', spokenLabel: 'A', midi: 33, exerciseString: 'A' },
      { id: 'E1', label: 'E', spokenLabel: 'E', midi: 28, exerciseString: 'E' },
    ],
    tuningLabel: 'E · A · D · G',
    tagline: 'DEIN BEGLEITER AUF VIER SAITEN',
    defaultTuning: 'bass-standard4',
    notationClef: 'bass',
  },
  guitar: {
    id: 'guitar',
    name: 'Gitarre',
    nameUpper: 'GITARRE',
    player: 'Gitarrist:in',
    lineName: 'Gitarrenlinie',
    stringsHighToLow: [
      { id: 'E4', label: 'E', spokenLabel: 'hohe E', midi: 64 },
      { id: 'B3', label: 'H', spokenLabel: 'H', midi: 59 },
      { id: 'G3', label: 'G', spokenLabel: 'G', midi: 55, exerciseString: 'G' },
      { id: 'D3', label: 'D', spokenLabel: 'D', midi: 50, exerciseString: 'D' },
      { id: 'A2', label: 'A', spokenLabel: 'A', midi: 45, exerciseString: 'A' },
      { id: 'E2', label: 'E', spokenLabel: 'tiefe E', midi: 40, exerciseString: 'E' },
    ],
    tuningLabel: 'E · A · D · G · H · E',
    tagline: 'DEIN BEGLEITER AUF SECHS SAITEN',
    defaultTuning: 'guitar-standard6',
    notationClef: 'treble',
  },
};

export const instrumentProfile = (id: InstrumentId) => instrumentProfiles[id];
