# Verification notes

Verification date: 10 September 2026.

## Source and content

The complete LaTeX source and all 77 rendered PDF pages were inspected before implementation. The original files remain in the project. The public PDF is byte-for-byte identical to the supplied PDF. See [source inventory](SOURCE_INVENTORY.md) for the content mapping and editorial corrections.

The catalog contains 12 scales (plus Ionian/Aeolian aliases), nine arpeggio types, all 20 physical and 20 musical exercises, and all ten original six-block programs. One event sequence supplies physical fret positions, TAB, sounding pitches, written notation and playback.

## Automated checks

- `npm run check`: strict TypeScript checking and 12 musical tests. These cover all 100 positions on the four-string 0–24 fretboard; all scale/arpeggio routes at every selectable root; one-octave routes; spelling and enharmonic intervals; written versus sounding octaves; exercise rhythms/rests; original program blocks; harmony; search; and deterministic bassline construction.
- `npm run build`: successful static production build, with versioned offline service worker. VexFlow is a separate lazy-loaded chunk; Vite reports its expected large-chunk warning.
- `npm run test:browser`: production Chromium checks for all 101 registered URLs, exact D-major TAB positions, root transposition and persistence, favorites and study status, search, timers including completion, program sequencing, comfortable BPM persistence, metronome controls, bassline layers, trainer feedback, and mobile navigation.
- Responsive overflow checks cover eight representative pages at 1366×768, 1440×900, 1920×1080, 2560×1440, 375×667, 390×844 and 430×932.
- Offline checks cover service-worker installation/control, a freshly installed app opening an unvisited scale with real notation offline, nested reference routes, and the original PDF after explicit caching. The local production test server includes Pages-style HTML redirects and SPA fallback.
- `npm run test:visual`: desktop and mobile screenshots of the workstation, scale, fretboard, exercise and program pages, plus desktop improvisation and bassline views. The browser scripts collect console and page errors, and report notation errors and page overflow.

Reports and screenshots are written to `bass-qa` in the operating system's temporary directory. Run the commands in the [README](../README.md#verification) to reproduce them.

## Practical limits

Browser checks use installed Chromium on Linux. Responsive emulation does not replace testing on physical iOS/Android devices. Web Audio controls and scheduling were exercised; audio tone quality and performance with a live instrument still benefit from personal listening. Background audio behavior depends on the device/browser.

The project is configured for Cloudflare Pages and documented for deployment; it has not been published to a Cloudflare account. Native installation prompts and deployed HTTPS behavior should be checked once the user deploys it. Core offline operation was verified against the actual production build locally.
