# Bass Reference

A desktop-first, fully static bass guitar reference and practice workstation, built from `bass.tex` and the original 77-page PDF. React + TypeScript + Vite + React Router; VexFlow supplies real bass-clef notation and four-line TAB. Audio uses Web Audio. There are no accounts, APIs, databases, or cloud dependencies.

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

- Sticky desktop chapter navigation and click-operated chapter menus; persistent sidebars and mobile chapter selectors.
- Global root selection, enharmonic note spelling, formulas and transposition.
- Full 0–24 fretboard, note/interval/scale/arpeggio views, exact fingering views, and four quick study modes.
- Twelve scale pages plus Ionian/Aeolian aliases; nine arpeggio types; matching fretboard, bass-clef notation and TAB.
- Scale comparison and ascending, descending, or up/down playback.
- Chord formulas, major/minor harmony, key signatures, relative minors, intervals, rhythm and notation references.
- Bassline builder, improvisation chooser, play-along view, and source-based Salsa/Latin material.
- All original P1–P20 and M1–M20 exercises, including their rhythm/rest patterns, plus all ten original six-block programs.
- Five-minute timers, global 30–240 BPM metronome, comfortable BPM records, balanced practice sessions, local practice logs.
- Local favorites, recently viewed references, and New/Learning/Known study status.
- Original PDF reader, download, and optional offline PDF caching.

Search with `/` or Ctrl+K (Cmd+K also works). Arrow keys and Enter select a search result. Arrow keys move between focused fretboard positions; Home/End move to the first/last visible fret. Space starts/pauses a focused exercise timer; it does not hijack page scrolling or input controls.

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

The app does not upload your data. Clearing site data removes favorites, history, progress, comfortable tempos, logs and cached assets. Browser storage eviction can also remove offline files. Reopen online to refresh them.

Timers use an absolute wall-clock deadline, so the remaining time recovers when a background tab wakes. Browser audio can be suspended when a mobile device locks; keep the practice screen active for the metronome.

## Musical source of truth

Read [the source inventory and corrections](docs/SOURCE_INVENTORY.md) before changing musical content.

```text
bass.tex                          Original primary source (untouched)
bass_complete_...pdf              Original visual/static source (untouched)
scripts/import_book.py            Deterministic book importer
src/data/book.json                Imported scales, exercises, programs
src/data/catalog.ts               Typed catalog, added arpeggios, tags, search
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

- Add scales/arpeggios as structured records in `catalog.ts`, with degree labels and one canonical fingering. Calculate intervals from degrees rather than typing duplicate formulas.
- Add exercises with a stable ID, source key, instructions, BPM range, tags, and a complete event/rest sequence. Do not edit imported JSON by hand if you plan to rerun the importer; keep additions in the catalog.
- Add a program as six references to exercise IDs. The special `song` ID is the book’s improvisation drill.
- Add theory prose in `theory.ts` and register its route/search entry in `catalog.ts`.
- Preserve exact degree identity when spelling a note: `#4` and `b5` are enharmonic but serve different functions.

## Verification

```bash
npm run check
npm run build
```

`check` runs strict TypeScript checking and musical tests covering all roots, all scales/arpeggios, 100 string/fret positions, written/sounding octaves, exercises/rests, source programs, harmony, and search.

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
