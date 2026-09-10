# Source inventory and editorial policy

Inspected before implementation: all 6,112 lines of bass.tex (including 114 diagram blocks and all music blocks), and all 77 rendered PDF pages. The LaTeX is the musical source; the PDF supplies visual direction. Original files remain untouched.

## Book → application

- Notation conventions; complete 0–24 fretboard; interval map → theory data, transposition utilities, interactive fretboard and trainer.
- Reading/rhythm, bass clef, TAB/articulations → quick theory references.
- Chord construction; major/natural-minor harmony; key signatures and relative minors → chord tables and calculated key tools.
- Scale index and atlas → 12 scale records; Ionian/Aeolian are aliases with bookmarkable routes. Formulas, steps, character, applications and original D fingerings are extracted.
- Arpeggio atlas → six original chord types, expanded with diminished/augmented triads and diminished seventh. Clean one-octave routes replace the atlas's all-position diagrams.
- Five bassline layers and Salsa/Latin reference → instructional sections and deterministic bassline builder.
- Chord-to-scale lookup, compact formulas, improvisation guide → search, scale chooser and play-along view.
- Physical P1–P20 and musical M1–M20 → 40 separate exercise routes, original instructions, targets, BPM ranges, exact TAB route and rhythm/rest grid.
- Ten 30-minute programs → original six-block sequences. Program 10 retains the source's Song drill as its sixth block.
- Practice log → optional local entries.

## Visual system

Source colors: Ink #1D2733; Accent #0E7490; AccentLight #DFF3F7; Chord #B76500; ChordLight #FFF0D5; SoftGray #F2F4F6; Green #327A5B; GreenLight #E2F3EA. White sheet surfaces, fine dividers, restrained teal headings, dark filled root circles, amber chord-tone circles, pale teal scale tones. The application expands the page into a desktop work surface with persistent chapter navigation.

## Musical data ownership

Each event holds string, fret, duration and rest status. Sounding MIDI, written pitch (sounding + 12), TAB positions, fretboard markers and playback derive from the same event. Degree-based spelling respects letter identity, including diminished seventh bb7. Scale routes preserve original D TAB fingerings and transpose as a unit without leaving frets 0–24. Exercises preserve original TAB and rhythm; repeated notes appear once on the physical map and repeatedly in the sequence.

## Source corrections and clarifications

- Some MusiXTeX accidental carry-over does not agree with the explicit TAB (notably chromatic exercises). Rendered notation is recalculated from TAB pitch, with explicit accidentals/cancellations per measure.
- P14's source prose says one fret per string, but its TAB has 4–5–6–7 then 6–5–4–3; this exact physical sequence is retained.
- M12 ends its final C-based four-note group on C instead of B; retained as a return to tonic after the preceding Cmaj7 group, and explained in the exercise.
- M13's final pair is octave root–second, after the ascending thirds sequence; retained and identified as a closing pair.
- M14 starts with an approach eighth note. The displayed source grid is preserved; to put targets on beats, begin on the preceding offbeat (a pickup).
- M19/M20 are sparse two-hit study cells, not universal tumbao rules. Their written beat-4 notes are the current bar's roots; do not describe them as literal anticipations of a different next chord. An actual anticipation must belong to the incoming harmony.
- The source scale pages use one-octave ascending/jazz melodic minor. Descending playback uses that same form; classical descending natural minor is described separately.
