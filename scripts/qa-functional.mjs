import { tmpdir } from 'node:os';
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { checkWorkstation } from './qa-workstation.mjs';
import { checkRhythm } from './qa-rhythm.mjs';
import { checkPiano } from './qa-piano.mjs';
import { checkChords } from './qa-chords.mjs';
import { checkEar } from './qa-ear.mjs';
import { checkCircle } from './qa-circle.mjs';
import { checkTuner } from './qa-tuner.mjs';
const server = createServer(async (req, res) => {
  try {
    // Match Pages' extension-less HTML redirect as well as its SPA fallback.
    if (new URL(req.url, 'http://localhost').pathname === '/index.html') {
      res.writeHead(301, { Location: '/' });
      res.end();
      return;
    }
    let path = resolve('dist', '.' + new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith(resolve('dist') + '/')) path = resolve('dist/index.html');
    let file;
    try {
      file = await readFile(path);
    } catch {
      path = resolve('dist/index.html');
      file = await readFile(path);
    }
    res.setHeader(
      'Content-Type',
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.webmanifest': 'application/manifest+json',
        '.pdf': 'application/pdf',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
      }[extname(path)] ?? 'application/octet-stream',
    );
    res.end(file);
  } catch {
    res.writeHead(500);
    res.end();
  }
});
await new Promise((resolve) => server.listen(4175, '127.0.0.1', resolve));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
const errors = [];
const report = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
const go = async (path) => {
  await page.goto('http://127.0.0.1:4175' + path);
  await expect(page.locator('h1')).toBeVisible();
};
const check = async (name, fn) => {
  await fn();
  report.push(name);
  console.log('PASS', name);
};
try {
  await check('production worker installs and controls page', async () => {
    await go('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  });
  await check('fresh installation opens an unvisited scale offline', async () => {
    const fresh = await browser.newContext();
    const freshPage = await fresh.newPage();
    await freshPage.goto('http://127.0.0.1:4175/');
    await freshPage.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await freshPage.reload();
    await freshPage.waitForFunction(() => !!navigator.serviceWorker.controller);
    await fresh.setOffline(true);
    await freshPage.goto('http://127.0.0.1:4175/scales/lydian');
    await expect(freshPage.locator('h1')).toHaveText('D Lydisch');
    await expect(freshPage.locator('.notation-scroll svg')).toHaveCount(2);
    await expect(freshPage.locator('.error-text')).toHaveCount(0);
    await fresh.close();
  });
  await check('root transposition without study-status or favorite controls', async () => {
    await go('/scales/major');
    await expect(page.locator('.notation-scroll svg')).toHaveCount(2);
    await page.getByLabel('Globaler Grundton').selectOption('Eb');
    await expect(page.locator('h1')).toContainText('Es Dur');
    await expect(page.locator('.notes-formula')).toContainText('Es · F · G · As · B · C · D · Es');
    await expect(page.getByRole('button', { name: 'Als Favorit merken', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByLabel('Lernstatus')).toHaveCount(0);
    await page
      .locator('.sidebar-links')
      .getByRole('link', { name: 'Dorisch', exact: true })
      .click();
    await expect(page.locator('h1')).toHaveText('Es Dorisch');
    // Nothing about you is stored, so a reload starts from the defaults again.
    await page.reload();
    await expect(page.getByLabel('Globaler Grundton')).toHaveValue('D');
    // Nothing is written to the browser at all.
    const stored = await page.evaluate(() => Object.keys(localStorage));
    if (stored.length) throw new Error(`the app stored ${stored.join(', ')}`);
    await go('/scales/major');
  });
  await check('fingering and TAB exact sequence, note click, scale comparison', async () => {
    await go('/scales/major');
    await expect(page.locator('.notation-scroll svg')).toHaveCount(2);
    await expect(page.locator('.degree-marker:not(.empty)')).toHaveCount(8);
    await page
      .getByRole('button', { name: 'Fis, Große Terz, A-Saite Bund 9', exact: true })
      .click();
    await expect(page.locator('.position-info')).toContainText('Große Terz über D');
    const nums = await page
      .locator('.score-grid .panel')
      .nth(1)
      .locator('svg text')
      .allTextContents();
    if (nums.filter((t) => /^\d+$/.test(t)).join(',') !== '5,7,9,5,7,9,6,7')
      throw Error('TAB differs: ' + nums);
    await page.getByLabel('Dur vergleichen mit').selectOption('mixolydian');
    await expect(page.locator('.different')).toHaveCount(2);
    await page.getByRole('button', { name: 'Tonleiter abspielen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Stopp', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Stopp', exact: true }).click();
  });
  await check('keyboard search opens and navigates to exercise 14', async () => {
    await page.keyboard.press('Control+k');
    await page.getByLabel('Tonleitern, Übungen und Theorie suchen').fill('exercise 14');
    await expect(page.locator('.search-result')).toHaveCount(3);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/exercises\/physical\/14$/);
    await expect(page.locator('.search-dialog')).toHaveCount(0);
  });
  await check('timer start pause reset and actual completion using virtual clock', async () => {
    await page.clock.install();
    const timer = page.getByRole('region', { name: 'Übetimer' });
    await timer.getByRole('button', { name: 'Start', exact: true }).click();
    await page.clock.fastForward(3200);
    await expect(timer.getByRole('timer')).toHaveText('04:57');
    await timer.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.clock.fastForward(5000);
    await expect(timer.getByRole('timer')).toHaveText('04:57');
    await timer.getByRole('button', { name: 'Timer zurücksetzen' }).click();
    await expect(timer.getByRole('timer')).toHaveText('05:00');
    await timer.focus();
    await page.keyboard.press('Space');
    await page.clock.fastForward(300100);
    await expect(timer.getByRole('status')).toContainText('Block abgeschlossen');
    // No personal tempo is kept any more; the block length is what is adjustable.
    await expect(page.getByLabel('Sicheres Tempo')).toHaveCount(0);
    // Any number of minutes, not a fixed list.
    await page.getByLabel('Blocklänge in Minuten').fill('7');
    await expect(timer.getByRole('timer')).toHaveText('07:00');
    await expect(timer).toContainText('7-MINUTEN-BLOCK');
    await page.getByLabel('Blocklänge in Minuten').fill('12');
    await expect(timer.getByRole('timer')).toHaveText('12:00');
    await page.getByLabel('Blocklänge in Minuten').fill('5');
    await expect(timer.getByRole('timer')).toHaveText('05:00');
  });
  await check(
    'program skip does not complete; finished timer marks only current block',
    async () => {
      await go('/programs/vier-finger');
      await page.clock.install();
      await page.getByRole('button', { name: 'Weiter', exact: true }).click();
      await expect(page.locator('.session-count')).toContainText('0 von 6');
      await expect(page.locator('.program-current-header')).toContainText('P2');
      await page
        .getByRole('region', { name: 'Übetimer' })
        .getByRole('button', { name: 'Start', exact: true })
        .click();
      await page.clock.fastForward(300100);
      await expect(page.locator('.session-count')).toContainText('1 von 6');
      await expect(page.locator('.program-current-header')).toContainText('P2');
    },
  );
  await check('metronome starts and stops, tempo direct entry', async () => {
    await page.getByLabel('Tempo in BPM').fill('110');
    await page.getByRole('button', { name: 'Metronom starten' }).click();
    await expect(page.getByRole('button', { name: 'Metronom stoppen' })).toBeVisible();
    await page.getByRole('button', { name: 'Metronom stoppen' }).click();
    await page.getByRole('button', { name: 'Tempo um 5 erhöhen' }).click();
    await expect(page.getByLabel('Tempo in BPM')).toHaveValue('115');
  });
  await check('builder updates note layers and remains deterministic', async () => {
    await go('/basslines');
    const before = await page.locator('.available-note').count();
    await page.getByLabel('Septime', { exact: true }).check();
    await expect(page.locator('.available-note')).toHaveCount(before + 1);
    await page.getByLabel('Chromatische Annäherung', { exact: true }).check();
    await expect(page.locator('.passing-note')).toHaveCount(1);
    await page.locator('.builder-chords button').nth(1).click();
    await expect(page.locator('.available-notes')).toContainText('TAKT 2');
  });
  await check('fretboard notes, intervals and trainer give valid feedback', async () => {
    await go('/fretboard');
    await page.getByLabel('Globaler Grundton').selectOption('D');
    await page.getByRole('button', { name: 'Lernmodus', exact: true }).click();
    await page.getByLabel('Lernaufgabe').selectOption('Find the note');
    const prompt = await page.locator('.trainer-prompt h2').textContent();
    // The prompt names the note in German syllables: "Finde Fis." / "Finde Es."
    const wanted = prompt.replace('Finde ', '').replace('.', '').trim();
    const german = {
      C: 0,
      Cis: 1,
      Des: 1,
      D: 2,
      Dis: 3,
      Es: 3,
      E: 4,
      F: 5,
      Fis: 6,
      Ges: 6,
      G: 7,
      Gis: 8,
      As: 8,
      A: 9,
      Ais: 10,
      B: 10,
      H: 11,
    };
    const pc = german[wanted];
    if (pc === undefined) throw Error('Unknown German note name in prompt: ' + prompt);
    const fret = (pc - 4 + 12) % 12;
    await page.getByRole('button', { name: `E-Saite Bund ${fret}`, exact: true }).click();
    await expect(page.locator('.trainer-feedback [role=status]')).toContainText('Richtig');
    await page.getByRole('button', { name: 'Nächste Frage' }).click();
    await expect(page.locator('.trainer-feedback [role=status]')).not.toContainText('Richtig');
  });
  await check('mobile menu, chapter selector and search at 390 px', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go('/scales/dorian');
    await page
      .getByRole('navigation', { name: 'Hauptbereiche' })
      .getByRole('link', { name: 'BASS', exact: true })
      .click();
    await expect(page).toHaveURL(/\/bass$/);
    await page.getByRole('link', { name: 'Übeprogramme' }).first().click();
    await expect(page).toHaveURL(/\/programs$/);
    await page.getByLabel('Kapitelseite').selectOption('/programs/erste-toene');
    await expect(page.locator('h1')).toHaveText('Die ersten Töne');
    await page.getByRole('button', { name: 'Workstation durchsuchen' }).click();
    await page.getByLabel('Tonleitern, Übungen und Theorie suchen').fill('quintenzirkel');
    await expect(page.locator('.search-result').first()).toBeVisible();
    await page.keyboard.press('Escape');
  });
  await check('all routes render with no missing pages or notation errors', async () => {
    const book = JSON.parse(await readFile('src/data/book.json', 'utf8'));
    // The programmes and the beginner exercises are the app's own, not the book's.
    // The programmes and the beginner exercises are the app's own, not the book's.
    const programs = [
      'erste-toene',
      'finger-setzen',
      'wechselschlag',
      'daempfen',
      'vier-finger',
      'saitenwechsel',
      'lagen',
      'spinne',
      'ausdauer',
      'technik-check',
      'erste-tonleiter',
      'dur-und-moll',
      'pentatonik',
      'dreiklaenge',
      'septakkorde',
      'intervalle',
      'terzen',
      'stimmfuehrung',
      'annaeherung',
      'harmonie-check',
      'puls-halten',
      'achtel',
      'offbeat',
      'wechsel',
      'shuffle',
      'groove-bauen',
      'latin',
      'griffbrett-oktaven',
      'griffbrett-toene',
      'groove-check',
    ].map((id) => ({ id }));
    const basics = Array.from({ length: 24 }, (_, index) => `/exercises/basics/${index + 1}`);
    const routes = [
      '/',
      '/musiktheorie',
      '/bass',
      '/piano',
      '/fretboard',
      '/scales',
      '/scales/ionian',
      '/scales/aeolian',
      '/arpeggios',
      '/chords',
      '/harmony',
      '/basslines',
      '/basslines/latin',
      '/improvisation',
      '/improvisation/play',
      '/improvisation/latin',
      '/exercises',
      '/exercises/physical',
      '/exercises/musical',
      '/programs',
      '/programs/erste-tonleiter',
      '/theory',
      '/pdf',
      '/tools',
      '/drums',
      '/tools/drums',
      '/tools/metronome',
      ...book.scales.map((s) => '/scales/' + s.id),
      ...[
        'major',
        'minor',
        'diminished',
        'augmented',
        'major-7',
        'dominant-7',
        'minor-7',
        'minor-7b5',
        'diminished-7',
      ].map((id) => '/chords/' + id),
      ...book.exercises.map((e) => `/exercises/${e.category}/${e.number}`),
      ...basics,
      ...programs.map((p) => '/programs/' + p.id),
      ...[
        'fretboard',
        'intervals',
        'scale-formulas',
        'modes',
        'chord-formulas',
        'key-signatures',
        'harmony',
        'rhythm',
        'notation',
        'transposition',
      ].map((id) => '/theory/' + id),
    ];
    for (const path of routes) {
      await go(path);
      await page.waitForTimeout(30);
      await expect(page.locator('h1')).not.toContainText('nicht gefunden');
      await expect(page.locator('.error-text')).toHaveCount(0);
    }
    report.push(`${routes.length} routes checked`);
  });
  await check('all requested viewport sizes have no page overflow', async () => {
    for (const [width, height] of [
      [1366, 768],
      [1440, 900],
      [1920, 1080],
      [2560, 1440],
      [375, 667],
      [390, 844],
      [430, 932],
      [768, 1024],
      [900, 900],
      [1024, 768],
    ]) {
      await page.setViewportSize({ width, height });
      for (const path of [
        '/',
        '/musiktheorie',
        '/bass',
        '/piano',
        '/scales/dorian',
        '/fretboard',
        '/exercises/musical/20',
        '/programs/vier-finger',
        '/theory/key-signatures',
        '/improvisation/play',
        '/basslines',
        '/tools/drums',
        '/tools/metronome',
      ]) {
        await go(path);
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
          throw Error(`${path} overflows at ${width}`);
      }
    }
  });
  await check('PDF local asset and manual offline caching', async () => {
    await go('/pdf');
    await page.getByRole('button', { name: 'PDF offline speichern' }).click();
    await expect(page.getByRole('button', { name: 'PDF offline gespeichert' })).toBeDisabled();
    const response = await page.request.get(
      'http://127.0.0.1:4175/bass_complete_reference_practice_improv_v5-1.pdf',
    );
    if (!(await response.body()).subarray(0, 5).equals(Buffer.from('%PDF-')))
      throw Error('Not a PDF');
  });
  await check('offline reload and unvisited reference navigation with notation/PDF', async () => {
    await context.setOffline(true);
    for (const path of [
      '/scales/harmonic-minor',
      '/piano',
      '/chords/diminished-7',
      '/exercises/musical/20',
      '/programs/vier-finger',
      '/theory/key-signatures',
      '/tools/drums',
      '/tools/metronome',
    ]) {
      await go(path);
      await expect(page.locator('h1')).not.toContainText('nicht gefunden');
      if (path.startsWith('/scales'))
        await expect(page.locator('.notation-scroll svg')).toHaveCount(2);
    }
    const ok = await page.evaluate(async () => {
      const r = await fetch('/bass_complete_reference_practice_improv_v5-1.pdf');
      return r.ok && (await r.blob()).size > 500000;
    });
    if (!ok) throw Error('Offline PDF unavailable');
    await context.setOffline(false);
  });
  await checkWorkstation(browser, check, errors);
  await checkPiano(browser, check, errors);
  await checkEar(browser, check, errors);
  await checkCircle(browser, check, errors);
  await checkTuner(browser, check, errors);
  await checkChords(browser, check, errors);
  await checkRhythm(browser, check, errors);
  if (errors.length) throw Error('Console errors: ' + JSON.stringify(errors));
  await mkdir(tmpdir() + '/bass-qa', { recursive: true });
  await writeFile(
    tmpdir() + '/bass-qa/functional-report.json',
    JSON.stringify({ checks: report, consoleErrors: errors }, null, 2),
  );
  console.log('ALL FUNCTIONAL CHECKS PASSED');
} catch (e) {
  await page.screenshot({ path: tmpdir() + '/bass-qa/failure.png', fullPage: true });
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
