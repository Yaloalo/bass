import { tmpdir } from 'node:os';
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
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
    await expect(freshPage.locator('h1')).toHaveText('D Lydian');
    await expect(freshPage.locator('.notation-scroll svg')).toHaveCount(2);
    await expect(freshPage.locator('.error-text')).toHaveCount(0);
    await fresh.close();
  });
  await check('root transposition and persisted favorites/progress', async () => {
    await go('/scales/major');
    await expect(page.locator('.notation-scroll svg')).toHaveCount(2);
    await page.getByLabel('Global root').selectOption('Eb');
    await expect(page.locator('h1')).toContainText('E♭ Major');
    await expect(page.locator('.notes-formula')).toContainText('E♭ · F · G · A♭ · B♭ · C · D · E♭');
    await page.getByRole('button', { name: 'Add favorite', exact: true }).click();
    await page.getByLabel('Study status').selectOption('Learning');
    await page.locator('.sidebar-links').getByRole('link', { name: 'Dorian', exact: true }).click();
    await expect(page.locator('h1')).toHaveText('E♭ Dorian');
    await page.reload();
    await expect(page.getByLabel('Global root')).toHaveValue('Eb');
    await go('/scales/major');
    await expect(page.getByLabel('Study status')).toHaveValue('Learning');
    await expect(
      page.getByRole('button', { name: 'Remove favorite', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('Global root').selectOption('D');
  });
  await check('fingering and TAB exact sequence, note click, scale comparison', async () => {
    await go('/scales/major');
    await expect(page.locator('.notation-scroll svg')).toHaveCount(2);
    await expect(page.locator('.degree-marker:not(.empty)')).toHaveCount(8);
    await page.getByRole('button', { name: 'F#, degree 3, A string fret 9', exact: true }).click();
    await expect(page.locator('.position-info')).toContainText('Major third of D');
    const nums = await page
      .locator('.score-grid .panel')
      .nth(1)
      .locator('svg text')
      .allTextContents();
    if (nums.filter((t) => /^\d+$/.test(t)).join(',') !== '5,7,9,5,7,9,6,7')
      throw Error('TAB differs: ' + nums);
    await page.getByLabel('Compare Major with').selectOption('mixolydian');
    await expect(page.locator('.different')).toHaveCount(2);
    await page.getByRole('button', { name: 'Play scale', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
  });
  await check('keyboard search opens and navigates to exercise 14', async () => {
    await page.keyboard.press('Control+k');
    await page.getByLabel('Search scales, exercises and theory').fill('exercise 14');
    await expect(page.locator('.search-result')).toHaveCount(2);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/exercises\/physical\/14$/);
    await expect(page.locator('.search-dialog')).toHaveCount(0);
  });
  await check('timer start pause reset and actual completion using virtual clock', async () => {
    await page.clock.install();
    const timer = page.getByRole('region', { name: 'Exercise timer' });
    await timer.getByRole('button', { name: 'Start', exact: true }).click();
    await page.clock.fastForward(3200);
    await expect(timer.getByRole('timer')).toHaveText('04:57');
    await timer.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.clock.fastForward(5000);
    await expect(timer.getByRole('timer')).toHaveText('04:57');
    await timer.getByRole('button', { name: 'Reset timer' }).click();
    await expect(timer.getByRole('timer')).toHaveText('05:00');
    await timer.focus();
    await page.keyboard.press('Space');
    await page.clock.fastForward(300100);
    await expect(timer.getByRole('status')).toContainText('Five minutes complete');
    await page.getByLabel('Practice note', { exact: true }).fill('Clean, relaxed shift.');
    await page.getByRole('button', { name: 'Save completed block' }).click();
    await expect(page.getByRole('button', { name: 'Session saved' })).toBeVisible();
    await page.getByLabel('Comfortable BPM').fill('92');
    await page.reload();
    await expect(page.getByLabel('Comfortable BPM')).toHaveValue('92');
  });
  await check(
    'program skip does not complete; finished timer marks only current block',
    async () => {
      await go('/programs/salsa-latin');
      await page.clock.install();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.locator('.session-count')).toContainText('0 of 6');
      await expect(page.locator('.program-current-header')).toContainText('P8');
      await page
        .getByRole('region', { name: 'Exercise timer' })
        .getByRole('button', { name: 'Start', exact: true })
        .click();
      await page.clock.fastForward(300100);
      await expect(page.locator('.session-count')).toContainText('1 of 6');
      await expect(page.locator('.program-current-header')).toContainText('P8');
    },
  );
  await check('metronome starts and stops, tempo direct entry', async () => {
    await page.getByLabel('Metronome BPM').fill('110');
    await page.getByRole('button', { name: 'Start metronome' }).click();
    await expect(page.getByRole('button', { name: 'Stop metronome' })).toBeVisible();
    await page.getByRole('button', { name: 'Stop metronome' }).click();
    await page.getByRole('button', { name: 'Increase tempo by 5' }).click();
    await expect(page.getByLabel('Metronome BPM')).toHaveValue('115');
  });
  await check('builder updates note layers and remains deterministic', async () => {
    await go('/basslines');
    const before = await page.locator('.available-note').count();
    await page.getByLabel('Seventh', { exact: true }).check();
    await expect(page.locator('.available-note')).toHaveCount(before + 1);
    await page.getByLabel('Chromatic approach', { exact: true }).check();
    await expect(page.locator('.passing-note')).toHaveCount(1);
    await page.locator('.builder-chords button').nth(1).click();
    await expect(page.locator('.available-notes')).toContainText('BAR 2');
  });
  await check('fretboard notes, intervals and trainer give valid feedback', async () => {
    await go('/fretboard');
    await page.getByLabel('Global root').selectOption('D');
    await page.getByRole('button', { name: 'Study mode', exact: true }).click();
    await page.getByLabel('Study task').selectOption('Find the note');
    const prompt = await page.locator('.trainer-prompt h2').textContent();
    const wanted = prompt
      .replace('Find ', '')
      .replace('.', '')
      .replaceAll('♯', '#')
      .replaceAll('♭', 'b');
    const pitches = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const flats = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
    const pc = pitches.indexOf(flats[wanted] ?? wanted);
    const fret = (pc - 4 + 12) % 12;
    await page.getByRole('button', { name: `E string fret ${fret}`, exact: true }).click();
    await expect(page.locator('.trainer-feedback [role=status]')).toContainText('Correct');
    await page.getByRole('button', { name: 'Next question' }).click();
    await expect(page.locator('.trainer-feedback [role=status]')).not.toContainText('Correct');
  });
  await check('mobile menu, chapter selector and search at 390 px', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go('/scales/dorian');
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await page
      .getByRole('navigation', { name: 'Main chapters' })
      .getByRole('link', { name: 'Programs', exact: true })
      .click();
    await expect(page).toHaveURL(/\/programs$/);
    await page.getByLabel('Chapter page').selectOption('/programs/clean-restart');
    await expect(page.locator('h1')).toHaveText('Clean restart');
    await page.getByRole('button', { name: 'Search the reference…' }).click();
    await page.getByLabel('Search scales, exercises and theory').fill('salsa');
    await expect(page.locator('.search-result').first()).toBeVisible();
    await page.keyboard.press('Escape');
  });
  await check('all routes render with no missing pages or notation errors', async () => {
    const book = JSON.parse(await readFile('src/data/book.json', 'utf8'));
    const routes = [
      '/',
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
      '/programs/balanced',
      '/theory',
      '/pdf',
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
      ].map((id) => '/arpeggios/' + id),
      ...book.exercises.map((e) => `/exercises/${e.category}/${e.number}`),
      ...book.programs.map((p) => '/programs/' + p.id),
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
      await expect(page.locator('h1')).not.toContainText('not found');
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
    ]) {
      await page.setViewportSize({ width, height });
      for (const path of [
        '/',
        '/scales/dorian',
        '/fretboard',
        '/exercises/musical/20',
        '/programs/salsa-latin',
        '/theory/key-signatures',
        '/improvisation/play',
        '/basslines',
      ]) {
        await go(path);
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
          throw Error(`${path} overflows at ${width}`);
      }
    }
  });
  await check('PDF local asset and manual offline caching', async () => {
    await go('/pdf');
    await page.getByRole('button', { name: 'Save PDF for offline use' }).click();
    await expect(page.getByRole('button', { name: 'PDF saved offline' })).toBeDisabled();
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
      '/arpeggios/diminished-7',
      '/exercises/musical/20',
      '/programs/salsa-latin',
      '/theory/key-signatures',
    ]) {
      await go(path);
      await expect(page.locator('h1')).not.toContainText('not found');
      if (path.startsWith('/scales') || path.startsWith('/arpeggios'))
        await expect(page.locator('.notation-scroll svg')).toHaveCount(2);
    }
    const ok = await page.evaluate(async () => {
      const r = await fetch('/bass_complete_reference_practice_improv_v5-1.pdf');
      return r.ok && (await r.blob()).size > 500000;
    });
    if (!ok) throw Error('Offline PDF unavailable');
    await context.setOffline(false);
  });
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
