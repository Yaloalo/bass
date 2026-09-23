# Workstation evolution · September 2026

## Repository analysis before implementation

The application is an existing static React 19 / TypeScript / Vite application, with React Router browser routes and no server API. Cloudflare Pages routing, cache headers, and static deployment are documented. There is no Sites hosting configuration; this iteration retains the existing deployment arrangement.

The starting worktree was clean. Repository inspection covered the application shell, routed pages, shared components, music/audio/state modules, catalog and imported data structure, styling, import/build/QA scripts, tests, source inventory, and deployment/PWA files. The original LaTeX and PDF remain reference assets; this iteration does not alter their musical content.

### What already works well

- One `MusicEvent` sequence supplies fretboard positions, notation, TAB, and audio. Pitch derives from standard tuning plus fret; degree spelling preserves harmonic function and the written bass octave.
- The catalog contains 12 scales, nine arpeggios, 40 source exercises, and ten six-block programs. Existing fretboard study tasks and layered bassline construction already cover substantial parts of the proposed trainers.
- Shared fretboard, score, playback, timer, panel, and reference controls make extension preferable to replacement.
- The restrained white/teal/amber visual system is coherent on desktop and phone. Baseline Chromium screenshots showed no document overflow or console errors on representative pages.
- Preferences, favorites, recent references, study status, comfortable tempos, and practice logs already live locally. The wall-clock timer recovers elapsed time after delayed updates.
- A generated service worker precaches the app, notation, and data; the original PDF is cached on demand. Installation assets and static hosting rules already exist.

### Gaps and technical debt

- Home prioritizes lookup, and its practice action leads to another program choice. Short, specific daily recommendations are missing.
- There is no Tools route or drum machine. The footer metronome only offers a fixed four-beat click and BPM entry.
- The existing metronome uses Web Audio lookahead correctly for sound, but updates the visual beat while scheduling ahead and has no explicit recovery policy after long scheduler stalls.
- Rhythm transport lives inside the footer component, so adding a separate tool naïvely would create independent clocks and overlapping playback.
- The program runner hardcodes six blocks and 30 minutes. Generalizing it is a better fit than adding another timer/logging system.
- The generic storage hook catches parse/write errors but does not validate parsed shapes. New persisted rhythm records need validation; existing settings should not be broadly migrated as part of this iteration.
- The main stylesheet is large, with multiple responsive sections. New feature styles should be scoped separately rather than layering broad overrides onto reference layouts.
- Duration conversion is repeated in notation and example playback. A future progression/rhythm event system should consolidate that only when it is actually needed.

## Selected scope and priorities

| Priority | Improvement                         | Impact and architectural fit                                                                      | Effort      |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- | ----------- |
| 1        | Shared rhythm clock and transport   | Foundation for reliable drum/metronome practice, one active source and consistent footer controls | Medium–high |
| 2        | Drum machine and expanded metronome | Addresses the largest missing practical capability without modifying musical source data          | High        |
| 3        | Daily Practice                      | Answers what to practice through curated existing exercises and a reusable program runner         | Medium      |
| 4        | Discoverability and verification    | Home/navigation/search entry points, local recovery, responsive and offline regression coverage   | Medium      |

Keep existing chapter URLs and visual language. Add skill-oriented **Practice** and **Tools** entries. Jazz and funk belong in useful patterns and musical exercises, never separate top-level destinations.

Daily sessions use existing five-minute exercise blocks and the existing log. A short default session reduces setup while longer sessions reuse the same runner. The tool workspace uses shared global BPM, explicit audio start, local preferences and patterns, and no external service.

Drum sequencing and metronome timing use `AudioContext.currentTime` with a short scheduling horizon. Polling feeds the audio queue; it does not determine sound onset. Audio cancellation, count-in, swing, gap bars, transport switches, and recovery after delayed callbacks require focused tests. Visual indicators follow the audio clock.

## Deliberately deferred

- **Microphone tuner:** deserves bass-register pitch detection, confidence filtering, permission handling, and testing with physical instruments. It is not necessary for this rhythm-focused iteration.
- **Backing/progression player and drone:** useful follow-ups, but require decisions about voicing, ranges, harmony entry, and how pitched playback shares transport.
- **Separate ear, rhythm, guide-tone, walking, and 12-key trainers:** first reuse and extend the existing fretboard, harmony, and bassline systems. Adding independent trainers now would multiply state and navigation without finishing the core practice loop.
- **Large navigation redesign (initial iteration):** the first pass retained the existing chapter structure. A later user request led to three visible destinations while retaining the original routes.
- **New cloud services, accounts, analytics, or deployment platform:** unnecessary for a personal static workstation.

## Review approach

Implementation is delegated; the primary agent reviews the resulting code independently. Review covers actual task flow, mobile/touch operation, visual consistency, musical timing, state transitions, local persistence, bounded resource use, and preservation of reference/PWA behavior. A score below 8/10 requires a further implementation and verification cycle.

## Later product direction

The current start page now presents three large choices: MUSIKTHEORIE, BASS, and DRUM-MASCHINE. Existing reference, exercise, program, bassline, and rhythm URLs remain intact. The interactive piano uses the same scale and chord definitions as the rest of the app. Selecting a diatonic chord highlights its notes, and the optional shared bass fretboard shows the same pitch classes at playable fret positions. Favorites and New/Learning/Known labels were removed from the user interface because the user preferred a simpler practice flow; local practice logs and tempo settings remain.
