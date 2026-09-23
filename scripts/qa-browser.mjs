import { tmpdir } from 'node:os';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const baseUrl = process.env.BASS_VISUAL_URL || 'http://localhost:5173';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
await mkdir(tmpdir() + '/bass-qa', { recursive: true });
for (const [route, name] of [
  ['/', 'home'],
  ['/musiktheorie', 'musiktheorie'],
  ['/bass', 'bass'],
  ['/piano', 'piano'],
  ['/scales/dorian', 'dorian'],
  ['/fretboard', 'fretboard'],
  ['/exercises/musical/19', 'exercise'],
  ['/programs/vier-finger', 'program'],
  ['/improvisation', 'impro'],
  ['/basslines', 'basslines'],
  ['/tools/drums', 'drums'],
  ['/tools/metronome', 'metronome'],
]) {
  await page.goto(baseUrl + route);
  await page.waitForTimeout(800);
  await page.screenshot({ path: tmpdir() + '/bass-qa/' + name + '-1920.png', fullPage: true });
  console.log(
    route,
    await page.locator('h1').textContent(),
    'overflow',
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    'notation errors',
    await page.locator('.error-text').allTextContents(),
  );
}
await page.setViewportSize({ width: 390, height: 844 });
for (const [route, name] of [
  ['/', 'home'],
  ['/musiktheorie', 'musiktheorie'],
  ['/bass', 'bass'],
  ['/piano', 'piano'],
  ['/scales/dorian', 'dorian'],
  ['/fretboard', 'fretboard'],
  ['/programs/vier-finger', 'program'],
  ['/exercises/physical/14', 'exercise'],
  ['/tools/drums', 'drums'],
  ['/tools/metronome', 'metronome'],
]) {
  await page.goto(baseUrl + route);
  await page.waitForTimeout(500);
  await page.screenshot({ path: tmpdir() + '/bass-qa/' + name + '-390.png', fullPage: true });
  if (name === 'drums')
    await page.screenshot({ path: tmpdir() + '/bass-qa/drums-first-screen-390.png' });
  console.log(
    route,
    '390 overflow',
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  );
}
for (const width of [1920, 390]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
  await page.goto(baseUrl + '/drums');
  await page.getByLabel('Globaler Grundton').selectOption('C');
  await page.locator('.harmony-preset-picker summary').click();
  await page.screenshot({ path: tmpdir() + `/bass-qa/drum-picker-${width}.png` });
  await page.getByRole('button', { name: /II–V–I in Dur/ }).click();
  await page
    .getByRole('button', { name: width === 390 ? 'Drum-Maschine starten' : 'Groove starten' })
    .click();
  await page.locator('.drum-focus-dialog').waitFor();
  await page.screenshot({ path: tmpdir() + `/bass-qa/drum-focus-${width}.png` });
  console.log(
    'drum focus',
    width,
    'overflow',
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  );
  await page
    .getByRole('dialog', { name: 'Mitspielansicht' })
    .getByRole('button', { name: 'Stopp' })
    .click();
  if (width === 390) {
    await page.getByRole('button', { name: 'Dunkelmodus aktivieren' }).click();
    await page.getByRole('button', { name: 'Drum-Maschine starten' }).click();
    await page.locator('.drum-focus-dialog').waitFor();
    await page.screenshot({ path: tmpdir() + '/bass-qa/drum-focus-dark-390.png' });
    await page
      .getByRole('dialog', { name: 'Mitspielansicht' })
      .getByRole('button', { name: 'Stopp' })
      .click();
  }
}
console.log('ERRORS', JSON.stringify(errors));
await writeFile(tmpdir() + '/bass-qa/console.json', JSON.stringify(errors, null, 2));
await browser.close();
