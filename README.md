# Bass Reference

A fully static, German-language bass guitar reference and practice workstation, built from `bass.tex` and the original 77-page PDF. The interface is German only; the source book stays in its original English. React + TypeScript + Vite + React Router; VexFlow supplies real bass-clef notation and four-line TAB. Audio uses Web Audio. There are no accounts, APIs, databases, or cloud dependencies.

## Run locally

Install Node.js 22 LTS or newer, then open a terminal in this project folder:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. Stop the server with Ctrl+C.

## Production build

```bash
npm run build
npm run preview
```

The complete static site is in `dist/`. Preview normally runs at `http://localhost:4173`. `npm run build` runs TypeScript checking, bundles the app, and generates a versioned offline service worker from the actual output files.

Use the production preview for offline/PWA testing. The development server intentionally does not register a service worker, so cached code cannot interfere with editing.

## Main features

The app is organised into three areas.

**MUSIKTHEORIE**

- Interactive piano: highlight a scale, play and select keys, choose a diatonic chord from the current key, and reveal its tones on the shared bass fretboard. The app names selected chords and shows alternative readings where a set is ambiguous.
- Akkorde: one catalogue of 71 chord types from power chord to `7alt`, each with its German name, degree formula, spelled notes, fretboard, arpeggio fingering and practice transformations. Chords and arpeggios share one model — there is no second database.
- Every chord distinguishes the theoretical formula from what a player actually sounds, and shows the full tertian stack with the avoided degree struck through where the symbol omits one.
- Woher unsere Töne kommen: an article in seven chapters that derives the scale itself, following the structure of Yuval Nov's _The Mathematical Problem with Music_. It needs two numbers and no acoustics: a musical distance is a ratio rather than a difference, the octave is 2:1 and the fifth is 3:2. Stack the fifth and fold every result back into one octave, and the scale builds itself — after five steps C D F G A, the pentatonic; after seven C D E F G A H, which _is_ C major; after twelve, every key on the piano. Why it stops at 5, 7 and 12 is the same construction: exactly those counts (and the trivial 2 and 3) fill the octave with two step sizes, everything between them needs three and is visibly lumpy — which is where the whole tone (204 cents) and the semitone (90 cents) come from, with no rule to memorise. Then the stack fails to close: twelve fifths against seven octaves would mean 3¹² = 2¹⁹, an odd number against an even one, so no chain of pure fifths ever lands on an octave. Insist anyway and eleven fifths are exact while the twelfth becomes the wolf, 23.46 cents flat. Share that gap over twelve fifths instead, each loses 1.955 cents, every fifth becomes exactly 700 cents — and since intervals are ratios, equal steps mean a constant factor q with q¹² = 2, which is where 1.05946 comes from. Nine experiments sit in the reading flow, each answering the question of the paragraph above it: a sine whose frequency and level move independently on a fixed 20 ms axis; two three-note ladders that print both the ratio and the hertz difference of every step; the pure ratios with their combined wave drawn over exactly one repetition; a scale builder that adds one fifth at a time and draws the octave to scale in cents with its step sizes underneath; a walk of twelve fifths with a zoomed strip that makes the gap readable; the twelve fifths of a Pythagorean circle where the wolf beats at 8.9 Hz; two near-equal sines with the real beat envelope; a pure-versus-equal A/B with a gap instead of a cross-fade; and the chain of fifths sorted into C major, stacked into the seven triads and played around a C and an A centre. There is no overtone material anywhere, by design. Every figure is computed in `src/lib/acoustics.ts`, the sound comes from `src/lib/tone-lab.ts`, and the QA suite checks the oscillators actually created — that the scale builder really sounds 0, 204, 408, 498, 702, 906, 1110, 1200 cents, that a slider retunes rather than restarts, that pure and equal are different synthesis, that the wolf really is a comma flat, and that nothing is still sounding after you leave the page.
- Quintenzirkel: an interactive circle with the twelve major keys outside and their relative minors inside. Picking a key sounds its triad and names its signature, scale, parallel and the two neighbours, which are marked on the figure as subdominant and dominant; the three positions that carry a second spelling can be switched between them. Signatures and neighbours are derived from the same helpers the rest of the app uses, not tabulated.
- Gehörbildung: interval and chord-type drills over three levels each, played melodically or together, scored with a streak. Every answer is revealed on the keyboard and on the bass fretboard, spelled the way the interval or chord is named.
- Twelve scale pages plus Ionian/Aeolian aliases, scale comparison, and ascending/descending/up-down playback.
- Diatonic harmony, key signatures, intervals, rhythm values and notation, and the original PDF.

**BASS**

- Stimmgerät: a microphone tuner for four-string, five-string and Drop D, with a cents needle, the sounding string marked, and a reference tone per string. Pitch detection is the McLeod normalised square difference on a low-passed, decimated signal, which reads the fundamental even when a small speaker leaves it out entirely; tested to under five cents on every string of every tuning. Nothing leaves the device and nothing is routed back to the speakers.
- Full 0–24 fretboard with note, interval, scale and chord views, exact fingerings, and four study modes.
- Übeprogramme, the first thing the BASS area offers: thirty programmes in three sections — Basics/Fingerarbeit/Technik, Tonleitern & Akkorde, Timing/Groove/Griffbrett — ten each, six five-minute blocks apiece, ordered easy to hard so the list is the curriculum.
- 64 exercises: the original P1–P20 and M1–M20 with their rhythm and rest patterns, plus 24 beginner exercises written for this app (open strings, one note per click, whole-tone steps, a scale up and down, octave and fifth shapes, offbeats, muting).
- A programme block and the full exercise page render the same component, so they never drift apart; the only difference is that a running programme has no chapter list in the margin, just a link back to the selection. The example can loop, so it keeps running under you while you play along.
- The drum machine and the exercises keep separate patterns. Playing along with an exercise never touches the groove you are building in the drum machine, and opening the drum machine again shows it exactly as you left it. Each exercise still has its own groove; `Groove bearbeiten` opens it in the sequencer with a `Zurück zur Übung` banner that exists only in that mode, and what you change there belongs to that exercise alone.
- Opening any exercise, or moving to the next block of a programme, sets everything up by itself: the exercise's own starting tempo goes into the transport, its drum groove is loaded, any running groove is stopped and the tempo trainer is switched off so the tempo cannot creep while the notes are still new. Changing the tempo by hand afterwards sticks. All 64 exercises carry a groove, and a programme card names the one it opens with.
- The example then plays against a click or that groove. The Ohne / Metronom / Groove switch sits at the top of the exercise, drives the one shared transport (so switching stops the other rather than running both), and the example waits for the next bar line before it starts — the click, the groove and the notes all run on the same audio clock at the app's current tempo. Measured in the browser: every note of the example lands on the click's grid to within a millisecond.
- Bassline builder, improvisation chooser, play-along view, and source-based Salsa/Latin material.
- One bar across the top of every practice block: the timer, the accompaniment, the example and the tempo side by side. Five minutes by default, any whole number of minutes from 1 to 120.

**DRUM-MASCHINE & RHYTHMUS-WERKZEUGE**

- Drum machine: 26 instruments, 42 grooves across seven style groups including Afro-Cuban and Brazilian material, a step sequencer with four velocity levels, per-track mix and choke groups, six kit-wide sound banks, 31 per-voice sound presets, a full-width synthesizer rack with two engines — FM and a resonant analog voice filter — rotary controls and a waveform display rendered from the real voice, and a pattern library.
- One floating chord picker, shared by the piano and the drum machine's chord track: filters by scale degree and by family, searches symbols, German names and alias spellings, and floats in a portal so no scrolling panel clips it. It replaced the native `<select>`s, which cannot be navigated at eighty-odd entries.
- Chords to play over: eight transposable progressions (II–V–I major and minor, blues, jazz blues, turnaround, pop, two vamps) or your own, comped as a held pad or as stabs. They are scheduled from the transport's own clock, so they cannot drift against the groove, and the current chord rides in the sticky transport with the next one queued. The progression also reads as a grid of bars, like a lead sheet, with a repeat sign where a chord holds and the sounding bar lit. Chords are reordered by dragging their handle (arrow keys on the same handle do it without a mouse), and picking one shows it on a collapsible fretboard and keyboard.
- Tempo trainer on the shared transport, so it works in the drum machine and the metronome alike: raises (or lowers) the tempo by a chosen step every N bars and stops at a target. The engine owns the new tempo, so the very next bar is already scheduled with it; changing the BPM by hand hands control back.
- Metronome with subdivisions, selective clicks, count-in and audible/silent gap bars.
- One shared rhythm transport and BPM: the pulse keeps running while you navigate, with a persistent footer stop control.

Throughout: global root selection with enharmonic spelling, dark mode, and full offline use. The start page offers three direct choices: music theory, bass practice, or the drum machine.

### German note names

The musical model is international everywhere — `B` is 11, `Bb` is 10 — because degree arithmetic, key signatures and VexFlow all depend on the letter order C D E F G A B, and VexFlow rejects an `H` key outright. German names are produced at the presentation layer only, by `germanNoteName()` in `src/lib/i18n.ts`: `B → H`, `Bb → B`, `Eb → Es`, `F# → Fis`, `Bbb → Heses`. Chord-symbol _suffixes_ are never translated (`maj7`, `m7b5`, `7b9` stay as written in real charts); the chord-symbol _root letter_ follows the same single convention as every other note name, so no screen can show `H` beside `Bm7`.

Search with `/` or Ctrl+K (Cmd+K also works). Arrow keys and Enter select a search result. Arrow keys move between focused fretboard positions; Home/End move to the first/last visible fret. Space starts/pauses a focused exercise timer; it does not hijack page scrolling or input controls.

## Start practicing

From the start page choose **BASS → Heute üben**, then **Einheit starten**. The first five-minute block starts immediately. Subsequent blocks start when you are ready; skipping a block never counts as completed practice. Save completed blocks with a note, then review them under **Übetagebuch**. Session choices and saved logs persist; an in-progress timer and unsaved completion state reset if you leave the session or reload.

Open **DRUM-MASCHINE** to build a groove, or open the metronome from its tool link. Both use the same global BPM and one rhythm transport, so starting one replaces the other. The footer remains available on reference and exercise pages, and its Stop control stops the active rhythm tool. Sound always requires an explicit start and never resumes automatically after reloading.

Custom drum patterns and the current working pattern stay on this device. The drum grid uses quarter-note BPM and either eighth- or sixteenth-note steps. Swing delays every second step of the selected grid while preserving the total bar length. The metronome's count-in uses every quarter-note beat before selective clicks or gap bars begin.

The repository analysis, scope choices, and deferred work are recorded in [the workstation evolution plan](docs/WORKSTATION_EVOLUTION.md).

## Create a GitHub repository

1. Sign in to GitHub.
2. Click **New repository** from the + menu.
3. Name it `bass-reference` (or choose your own name), choose public or private, and create it. Leave “Add a README”, license, and `.gitignore` unchecked because the project already has files.
4. Copy the repository’s HTTPS or SSH URL.

From this project directory, initialize Git if it is not already initialized:

```bash
git init
git add .
git commit -m "Build bass reference and practice workstation"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/bass-reference.git
git push -u origin main
```

Replace the example URL with your own. If `origin` already exists, inspect it with `git remote -v`; use `git remote set-url origin YOUR-REPOSITORY-URL` when appropriate. Authenticate using your configured GitHub credential manager or SSH key. Do not put credentials in source files. `node_modules/`, build output and local test artifacts are ignored.

## Deploy on Cloudflare Pages

1. Push the source to GitHub using the steps above.
2. Open Cloudflare → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**. The dashboard wording may vary slightly.
3. Connect GitHub and select this repository.
4. Select the production branch, normally `main`.
5. Use these build settings:

| Setting          | Value                                              |
| ---------------- | -------------------------------------------------- |
| Framework preset | React (Vite), or None                              |
| Build command    | `npm run build`                                    |
| Output directory | `dist`                                             |
| Root directory   | Leave blank when the app is at the repository root |
| Node version     | 22 or newer; set `NODE_VERSION=22` if needed       |

6. Save and deploy. Open the generated HTTPS `pages.dev` URL.
7. Check a direct nested URL such as `/scales/dorian` and `/programs/salsa-latin`.

Cloudflare Pages supplies its native SPA fallback when the build has no top-level `404.html`, so nested routes load the application while existing JavaScript, PDF and service-worker files remain directly accessible. Keep this configuration: do not add a universal `_redirects` rewrite, because redirects also apply to matching assets. See [Pages routing and SPA behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/) and [redirect matching](https://developers.cloudflare.com/pages/configuration/redirects/).

`public/_headers` avoids long caching of the worker/manifest and lets hashed assets be cached. No Pages Functions, server process or Worker backend is needed.

Cloudflare’s official build settings: [React/Vite build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) and [Vite deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/).

To update the live site, commit and push changes. Pages rebuilds the selected branch automatically.

## Install and use offline

Open the production site once while online and allow its service worker to finish installing. Core pages, search data, JS/CSS, icons and notation are precached. The worker serves the app shell for offline nested routes.

The PDF is approximately 556 KB and is deliberately excluded from initial precaching. Open it once or use **PDF → Save PDF for offline use** to cache it. The PDF page includes an install button; where the install prompt is unavailable, use the browser’s **Install app** or **Add to Home Screen** command. HTTPS is required on hosting; localhost is also a secure context for development testing.

The app does not upload your data. Clearing site data removes comfortable tempos, practice logs, saved drum patterns, preferences and cached assets. Browser storage eviction can also remove offline files. Reopen online to refresh them.

Timers use an absolute wall-clock deadline, so the remaining time recovers when a background tab wakes. Browser audio can be suspended when a mobile device locks; keep the practice screen active for the metronome.

## Musical source of truth

Read [the source inventory and corrections](docs/SOURCE_INVENTORY.md) before changing musical content.

```text
bass.tex                          Original primary source (untouched)
bass_complete_...pdf              Original visual/static source (untouched)
scripts/import_book.py            Deterministic book importer
src/data/book.json                Imported scales, exercises, programs
src/data/catalog.ts               Typed catalog: scales, exercises, programs, search
src/data/chords.ts                The single chord/arpeggio model (71 types, 124 alias spellings)
src/data/navigation.ts            The three areas and their entries
src/lib/chord-types.ts            ChordDefinition and chord families
src/lib/chord-practice.ts         Pure degree-list practice transformations
src/lib/route.ts                  Playable chord fingerings and walking routes
src/lib/i18n.ts                   German note names, scale names and labels
src/lib/rhythm.ts                 Drum instruments, kits, sound banks, patterns
src/lib/rhythm-audio.ts           Drum synthesis and the shared transport
src/lib/piano.ts                  Piano keys and chord recognition
src/lib/harmony-play.ts           Chord progressions, comping voicings, the bar clock
src/lib/ear.ts                    Ear-training levels and question generation
src/lib/circle.ts                 Circle-of-fifths positions and key details
src/lib/acoustics.ts              Ratios, temperament and every figure the article quotes
src/lib/tone-lab.ts               Sustained and sequenced sine playback for the experiments
src/lib/tuner.ts                  Tunings and the microphone pitch detector
src/lib/voice-scope.ts            Offline render of a drum voice for the synth display
src/data/theory.ts                Concise source-based reference prose
src/lib/music.ts                  Spelling, tuning, intervals, harmony, routes
src/lib/bassline.ts               Deterministic educational line construction
src/lib/audio.ts                  Bass-like playback and metronome tones
src/lib/store.tsx                 Device-local preferences and records
src/components/Fretboard.tsx      Shared physical note-position view
src/components/Score.tsx          VexFlow staff + TAB from the same events
src/components/Timer.tsx          Five-minute timer with wall-clock deadline
src/pages/                       Reusable routed application pages
src/styles.css                   PDF-derived tokens and responsive layouts
scripts/build-sw.mjs              Production cache generation
public/                          PDF, manifest, icons and Pages configuration
```

A `MusicEvent` is either a note (`string`, `fret`, `degree`, `duration`) or a rest (`rest: true`, `duration`). Derive pitch from the tuning and fret; do not add an independent TAB or notation sequence. `soundingMidi()` derives the audible pitch; `writtenPitch()` adds the bass guitar’s conventional written octave. VexFlow receives exactly these events, including rests and accidentals. Repeated events appear repeatedly in the score, but only once at each physical fretboard position.

The book’s original D scale fingerings are transposed as complete routes, using an octave-equivalent offset when necessary to keep every fret within 0–24. The UI can use a simpler enharmonic tonic for a formula while preserving the selected root’s pitch class (for example, C♯ rather than D♭ natural minor). Diminished sevenths retain conventional degree spelling, including double flats where required.

Some original MusiXTeX accidentals disagree with the explicit TAB. The imported physical TAB and rhythmic grid define the app’s events; staff pitches are recalculated. Source-specific editorial notes explain relevant exceptions. The original PDF is not modified.

Exercise prose preserves the book’s original key and fret references, labelled **Book example in …**. A transposition notice distinguishes those instructions from the live diagrams. The same movement and rhythm apply in the selected root.

## Update musical content

### When the original book changes

1. Edit `bass.tex` and rebuild the PDF through your LaTeX workflow.
2. Run the importer (Python 3, standard library only):

   ```bash
   npm run content:import
   ```

3. Inspect the generated `src/data/book.json` diff. The importer validates scale/exercise/program counts, matching note counts, and six-block program lengths; it deliberately fails on unexpected source structures instead of silently guessing.
4. Update catalog editorial notes if the source corrected an old inconsistency.
5. Copy the updated PDF to `public/bass_complete_reference_practice_improv_v5-1.pdf` (keep the filename, or update the PDF page and worker rules together).
6. Run `npm run check`, `npm run build`, and browser checks.
7. Commit and push to deploy.

### Add new interactive material

- Add a chord as a `ChordDefinition` record in `src/data/chords.ts`: a degree formula plus which degrees are required and which are routinely omitted. The fingering, the arpeggio, the fretboard view and the search entry are all derived from it. Never add a second note-array database.
- Add scales as structured records in `catalog.ts`, with degree labels and one canonical fingering. Calculate intervals from degrees rather than typing duplicate formulas.
- Add exercises with a stable ID, source key, instructions, BPM range, tags, and a complete event/rest sequence. Do not edit imported JSON by hand if you plan to rerun the importer; keep additions in the catalog.
- Add a program as six references to exercise IDs. The special `song` ID is the book’s improvisation drill.
- Add theory prose in `theory.ts` and register its route/search entry in `catalog.ts`.
- Preserve exact degree identity when spelling a note: `#4` and `b5` are enharmonic but serve different functions.

## Verification

```bash
npm run check
npm run build
```

`check` runs strict TypeScript checking and musical tests covering all roots, all scales, all 71 chord types (formula shape, ascending order, playable fingering and correct spelling in every root), 100 string/fret positions, written/sounding octaves, exercises/rests, source programs, harmony, piano chord recognition, drum pattern sequencing, and search.

Browser scripts use the development-only Playwright package. They default to installed Chromium at `/usr/bin/chromium`; set `CHROMIUM_PATH` to your browser executable on another system.

```bash
# Visual screenshots against a running npm run dev server
npm run test:visual

# Production functional checks, with an ephemeral static server on 127.0.0.1:4175
npm run build
npm run test:browser
```

The functional script tests routes, notation/TAB values, transposition and persistence, search, timer completion using a virtual clock, program sequencing, trainer feedback, mobile navigation, all seven requested viewport sizes, service-worker installation, and offline reference/PDF access. Screenshots and reports go to the OS temporary directory. These tests require local browser execution and a free local port; they do not use external services.

See [verification notes](docs/VERIFICATION.md) for the latest performed checks and limitations.

## Storage

The app stores nothing about you. There is no `localStorage`, no `sessionStorage` and no
cookie: the key, the tempo, the theme, the drum patterns, the chord progression and every
setting live in the open tab and are gone when it closes. Client-side navigation keeps
them; a reload starts from the defaults. The offline service worker caches the
application's own files, never anything you do with it. A browser check asserts that
`localStorage` is empty after a session of editing patterns and changing settings.
