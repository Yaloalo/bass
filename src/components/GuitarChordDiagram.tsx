import type { ChordDefinition } from '../lib/chord-types';
import type { GuitarChordShape } from '../lib/guitar-chords';
import { guitarStringsLowToHigh } from '../lib/guitar-chords';
import { degreeSemitones, mod, pitchClass, pretty, spellDegree } from '../lib/music';
import { germanNoteName } from '../lib/i18n';

export function GuitarChordDiagram({
  shape,
  root,
  chord,
  onPlayNote,
}: {
  shape: GuitarChordShape;
  root: string;
  chord: ChordDefinition;
  onPlayNote?: (midi: number) => void;
}) {
  const playedFrets = shape.frets.filter((fret): fret is number => fret !== null && fret > 0);
  const finalFret = playedFrets.length ? Math.max(...playedFrets) : shape.startFret + 4;
  const rowCount = Math.max(5, finalFret - shape.startFret + 1);
  const frets = Array.from({ length: rowCount }, (_, index) => shape.startFret + index);
  const degreeAt = (midi: number) =>
    chord.formula.find((degree) => mod(degreeSemitones(degree)) === mod(midi - pitchClass(root)));

  return (
    <figure className="guitar-chord-diagram">
      <div className="guitar-chord-open-row">
        <span />
        {shape.frets.map((fret, index) => {
          const string = guitarStringsLowToHigh[index];
          const degree = fret === 0 ? degreeAt(string.midi) : undefined;
          const finger = shape.fingers[index];
          if (!degree) return <b key={string.id}>{fret === null ? '×' : '·'}</b>;
          return (
            <button
              type="button"
              className={degree === '1' ? 'is-root' : ''}
              aria-label={`${germanNoteName(spellDegree(root, degree))}, offene ${string.spokenLabel}-Saite spielen`}
              onClick={() => onPlayNote?.(string.midi)}
              key={string.id}
            >
              <strong>{finger === 0 ? '○' : finger}</strong>
              <small>
                {pretty(degree)} · {germanNoteName(spellDegree(root, degree))}
              </small>
            </button>
          );
        })}
      </div>
      <div
        className="guitar-chord-board"
        role="group"
        aria-label={`${shape.name}, Grundton auf der ${shape.rootString}-Saite`}
      >
        {frets.map((fret, row) => (
          <div className="guitar-chord-fret-row" key={fret}>
            <span>{row === 0 || shape.startFret > 1 ? fret : ''}</span>
            {shape.frets.map((playedFret, stringIndex) => {
              const midi = guitarStringsLowToHigh[stringIndex].midi + fret;
              const degree = playedFret === fret ? degreeAt(midi) : undefined;
              const finger = shape.fingers[stringIndex];
              const isRoot = degree === '1';
              return (
                <div className="guitar-chord-fret" key={guitarStringsLowToHigh[stringIndex].id}>
                  {degree && (
                    <button
                      type="button"
                      className={isRoot ? 'is-root' : ''}
                      aria-label={`${germanNoteName(spellDegree(root, degree))}, Stufe ${pretty(degree)}, ${guitarStringsLowToHigh[stringIndex].spokenLabel}-Saite Bund ${fret} spielen`}
                      onClick={() => onPlayNote?.(midi)}
                    >
                      <strong>{finger}</strong>
                      <small>
                        {pretty(degree)} · {germanNoteName(spellDegree(root, degree))}
                      </small>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="guitar-chord-string-labels" aria-hidden="true">
        <span />
        {guitarStringsLowToHigh.map((string) => (
          <b key={string.id}>{string.label}</b>
        ))}
      </div>
      <figcaption>
        <strong>{shape.name}</strong>
        <span>
          Grundton auf der {shape.rootString}-Saite
          {shape.barreFret ? ` · verschiebbare Lage ab Bund ${shape.barreFret}` : ' · offene Form'}
        </span>
      </figcaption>
      <p className="guitar-finger-key">
        <b>Greifhand:</b> 1 Zeigefinger · 2 Mittelfinger · 3 Ringfinger · 4 kleiner Finger · ○ leer
        · × nicht spielen
      </p>
    </figure>
  );
}
