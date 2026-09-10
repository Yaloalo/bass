import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { scales, arpeggios, extraChords, theoryPages } from '../data/catalog';
import { readingRows, articulationRows, rhythmRows } from '../data/theory';
import { useStore } from '../lib/store';
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
  intervalNames,
  chromaticDegrees,
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
export function Chords() {
  const { root } = useStore();
  usePageTitle('Chords & formulas');
  return (
    <>
      <PageHeading
        eyebrow="04 / HARMONIC REFERENCE"
        title="Chords & their tones"
        description="Read the symbol. Know the formula. Make the harmony clear."
      />
      <Panel title={`Chord construction from ${pretty(root)}`}>
        <ReferenceTable
          headers={['Chord', 'Symbol', 'Formula', 'Notes', 'Bass priority']}
          rows={[...arpeggios, ...extraChords].map((c) => [
            c.name,
            <strong>{pretty(root + c.symbol)}</strong>,
            c.degreeLabels.map(pretty).join(' '),
            c.degreeLabels.map((d) => pretty(spellDegree(root, d))).join(' · '),
            c.description,
          ])}
        />
      </Panel>
      <div className="two-col">
        <Panel title="Hear the quality">
          <p>
            A root and fifth establish a stable frame. The third tells you major or minor; the
            seventh distinguishes major-seven, dominant-seven and minor-seven harmony.
          </p>
          <Link className="text-link" to="/arpeggios">
            Open the arpeggio atlas →
          </Link>
        </Panel>
        <Panel title="Put chords in a key">
          <p>
            Diatonic harmony stacks thirds using the notes of a key. Change the global root to
            explore the same relationships elsewhere.
          </p>
          <Link className="text-link" to="/harmony">
            Explore diatonic harmony →
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
  usePageTitle('Diatonic harmony');
  return (
    <>
      {!embedded && (
        <PageHeading
          eyebrow="04 / DIATONIC HARMONY"
          title={`${pretty(root)} ${mode.toLowerCase()} harmony`}
          description="Seven degrees. A family of chords. Follow the roots and hear the relationships."
        />
      )}
      <Panel
        title="Chords in the key"
        aside={
          <Segmented
            label="Harmony system"
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
              <strong>{pretty(c.root)}</strong>
              <span>{c.quality}</span>
              <small>{pretty(c.root + c.symbol)}</small>
            </div>
          ))}
        </div>
        <ReferenceTable
          headers={['Degree', 'Triad', 'Seventh chord', 'Triad tones']}
          rows={chords.map((c) => [
            c.roman,
            `${pretty(c.root)} ${c.quality.toLowerCase()}`,
            pretty(c.root + c.symbol),
            (c.quality === 'Major'
              ? ['1', '3', '5']
              : c.quality === 'Minor'
                ? ['1', 'b3', '5']
                : ['1', 'b3', 'b5']
            )
              .map((d) => pretty(spellDegree(c.root, d)))
              .join(' · '),
          ])}
        />
      </Panel>
      <Notice>
        {mode === 'Natural minor'
          ? `In functional minor harmony, v often becomes V7. In ${pretty(root)} minor, ${pretty(spellDegree(root, '5'))}7 contains ${pretty(spellDegree(root, '7'))}, the raised leading tone, and resolves to ${pretty(root)} minor.`
          : 'The major-key pattern is I – ii – iii – IV – V – vi – vii°. Adding another diatonic third gives maj7 – m7 – m7 – maj7 – 7 – m7 – m7♭5.'}
      </Notice>
    </>
  );
}
export function Theory() {
  const { id } = useParams();
  usePageTitle(theoryPages.find((x) => x[0] === id)?.[1] ?? 'Theory quick reference');
  const { root } = useStore();
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
          eyebrow="09 / QUICK LOOKUP"
          title="Theory, within reach"
          description="The things you need to check while the bass is still in your hands."
        />
        <div className="two-col">
          {theoryPages.map(([key, title]) => (
            <Panel key={key}>
              <ItemLink
                title={title}
                description={
                  {
                    fretboard: 'Complete notes, tuning and octave shapes',
                    intervals: 'Degree names, semitones and an interval calculator',
                    'scale-formulas': 'Every scale formula in one table',
                    modes: 'Seven rotations of the major scale',
                    'chord-formulas': 'Triads, sevenths and suspended chords',
                    'key-signatures': 'Altered notes, relative minor and chords',
                    harmony: 'Major and natural-minor chord families',
                    rhythm: 'Durations, rests and counting',
                    notation: 'Bass clef, articulations and TAB symbols',
                    transposition: 'Move a shape without changing its intervals',
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
        eyebrow="09 / THEORY REFERENCE"
        title={theoryPages.find((x) => x[0] === id)?.[1] ?? 'Theory'}
        description="Conventional notation. Clear relationships. Quick answers."
      />
      {id === 'fretboard' && (
        <>
          <Panel title="Complete fretboard · frets 0–24">
            <Fretboard
              root={root}
              events={allPositions(root, chromaticDegrees)}
              range={[0, 24]}
              labels="Notes"
            />
          </Panel>
          <div className="two-col">
            <Panel title="Movable octave">
              <p>
                From an E- or A-string root, move two strings toward G and two frets higher.
                A-string fret 5 (D) → G-string fret 7 (D).
              </p>
            </Panel>
            <Panel title="Same-string octave">
              <p>
                Move twelve frets along any string. The twelfth fret repeats the open-string note
                one octave higher; fret 24 is two octaves above the open string.
              </p>
            </Panel>
          </div>
        </>
      )}
      {id === 'intervals' && (
        <>
          <Panel title="Interval calculator">
            <div className="theory-calculator">
              <div>
                <span className="eyebrow">ROOT</span>
                <strong>{pretty(root)}</strong>
              </div>
              <label>
                Target
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  {[...roots, 'D#', 'G#', 'A#', 'C#', 'Gb', 'Cb'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <span className="calculator-arrow">→</span>
              <div>
                <span className="eyebrow">INTERVAL</span>
                <strong>{intervalBetween(root, target)}</strong>
                <p>{mod(pitchClass(target) - pitchClass(root))} semitones · within one octave</p>
              </div>
            </div>
          </Panel>
          <Panel title="Intervals from the root">
            <ReferenceTable
              headers={['Semitones', 'Degree', 'Name', 'From ' + pretty(root)]}
              rows={chromaticDegrees
                .map((d, i) => [
                  String(i),
                  i === 6 ? '♯4 / ♭5' : pretty(d),
                  intervalNames[i],
                  pretty(spellDegree(root, d)),
                ])
                .concat([['12', '8', 'Octave', pretty(root)]])}
            />
          </Panel>
        </>
      )}
      {(id === 'scale-formulas' || id === 'modes') && (
        <Panel title={id === 'modes' ? 'Modes of major' : 'The complete formula sheet'}>
          <ReferenceTable
            headers={['Scale', 'Formula', 'Identifying tone', 'Harmonic application']}
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
          A mode changes which note acts as the tonal center. Running the same major scale from
          another starting note does not establish a mode unless the harmony and phrasing support
          that root.
        </Notice>
      )}
      {id === 'chord-formulas' && (
        <Panel title={`Triads and seventh chords · ${pretty(root)}`}>
          <ReferenceTable
            headers={['Quality', 'Formula', 'Notes', 'Symbol']}
            rows={[...arpeggios, ...extraChords].map((c) => [
              c.name,
              c.degreeLabels.map(pretty).join(' '),
              c.degreeLabels.map((d) => pretty(spellDegree(root, d))).join(' · '),
              pretty(root + c.symbol),
            ])}
          />
        </Panel>
      )}
      {id === 'key-signatures' && (
        <>
          <Panel title="Key signature selector">
            <div className="theory-calculator">
              <label>
                Major key
                <select value={signatureRoot} onChange={(e) => setSignatureRoot(e.target.value)}>
                  {keyRoots.map((r) => (
                    <option value={r} key={r}>
                      {pretty(r)} major
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="eyebrow">SIGNATURE</span>
                <strong>{signature.altered.map(pretty).join('  ') || 'No sharps or flats'}</strong>
              </div>
              <div>
                <span className="eyebrow">RELATIVE MINOR</span>
                <strong>{pretty(signature.relativeMinor)} minor</strong>
              </div>
            </div>
            <ReferenceTable
              headers={['Degree', 'Diatonic triad', 'Notes']}
              rows={harmony(signatureRoot).map((c) => [
                c.roman,
                `${pretty(c.root)} ${c.quality}`,
                (c.quality === 'Major'
                  ? ['1', '3', '5']
                  : c.quality === 'Minor'
                    ? ['1', 'b3', '5']
                    : ['1', 'b3', 'b5']
                )
                  .map((d) => pretty(spellDegree(c.root, d)))
                  .join(' · '),
              ])}
            />
          </Panel>
          <Notice>
            Relative major and minor share a key signature. The relative minor begins on degree 6 of
            major. Parallel major and minor share the same tonic, with different key signatures.
          </Notice>
        </>
      )}
      {id === 'harmony' && <Harmony embedded />}
      {id === 'rhythm' && (
        <>
          <Panel title="Rhythmic values in 4/4">
            <ReferenceTable
              headers={['Value', 'Length', 'Density', 'Counting reference']}
              rows={rhythmRows}
            />
          </Panel>
          <Score events={rhythm} meter />
          <Notice>
            Every rest occupies its written duration. Count through silence. A dot adds half the
            value; a tie combines the duration of notes of the same pitch.
          </Notice>
        </>
      )}
      {id === 'notation' && (
        <>
          <Panel title="Reading the bass clef">
            <ReferenceTable headers={['Reference', 'Meaning']} rows={readingRows} />
          </Panel>
          <Panel title="Common notation & TAB markings">
            <ReferenceTable headers={['Technique', 'Marking', 'Meaning']} rows={articulationRows} />
          </Panel>
        </>
      )}
      {id === 'transposition' && (
        <>
          <Panel title="Move the intervals, rename the notes">
            <ol className="instruction-list">
              <li>Choose the new root and find the semitone distance from the old root.</li>
              <li>
                Move every note by that same distance. Preserve string choices and rhythmic values.
              </li>
              <li>
                If a fret would fall below 0, move the whole shape up an octave or choose another
                valid position.
              </li>
              <li>Spell scale degrees using their letter names: F major has B♭, not A♯.</li>
              <li>
                Keep notation one octave above sounding pitch; TAB still shows the physical fret.
              </li>
            </ol>
          </Panel>
          <Notice>
            Example: D major → F major shifts the entire fingering three frets higher. A-string fret
            5 becomes fret 8. The formula remains 1 2 3 4 5 6 7; the notes become F G A B♭ C D E.
          </Notice>
        </>
      )}
    </>
  );
}
