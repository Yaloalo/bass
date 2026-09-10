import { tmpdir } from 'node:os';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
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
  ['/scales/dorian', 'dorian'],
  ['/fretboard', 'fretboard'],
  ['/exercises/musical/19', 'exercise'],
  ['/programs/salsa-latin', 'program'],
  ['/improvisation', 'impro'],
  ['/basslines', 'basslines'],
]) {
  await page.goto('http://localhost:5173' + route);
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
  ['/scales/dorian', 'dorian'],
  ['/fretboard', 'fretboard'],
  ['/programs/salsa-latin', 'program'],
  ['/exercises/physical/14', 'exercise'],
]) {
  await page.goto('http://localhost:5173' + route);
  await page.waitForTimeout(500);
  await page.screenshot({ path: tmpdir() + '/bass-qa/' + name + '-390.png', fullPage: true });
  console.log(
    route,
    '390 overflow',
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  );
}
console.log('ERRORS', JSON.stringify(errors));
await writeFile(tmpdir() + '/bass-qa/console.json', JSON.stringify(errors, null, 2));
await browser.close();
