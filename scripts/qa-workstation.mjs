import assert from 'node:assert/strict';
import { expect } from '@playwright/test';

export async function checkWorkstation(browser, check, errors) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const go = async (path) => {
    await page.goto('http://127.0.0.1:4175' + path);
    await expect(page.locator('h1')).toBeVisible();
  };
  try {
    await check('three clear home destinations lead to the programme library', async () => {
      await go('/');
      const destinations = page.locator('.home-choice-grid a');
      await expect(destinations).toHaveCount(3);
      assert.deepEqual(
        await destinations.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
        ['/musiktheorie', '/bass', '/drums'],
      );
      await page.locator('.home-choice-grid a[href="/bass"]').click();
      // Übeprogramme is the first thing the BASS area offers.
      await expect(page.locator('main .area-grid .quick-card').first()).toContainText(
        'Übeprogramme',
      );
      await page.locator('main a[href="/programs"]').first().click();
      await expect(page.locator('h1')).toHaveText('Dreißig Minuten sinnvoll üben');
      // Three sections, ten programmes each.
      await expect(page.locator('.program-section')).toHaveCount(3);
      await expect(page.locator('.program-card')).toHaveCount(30);
      for (const name of [
        'Basics, Fingerarbeit & Technik',
        'Tonleitern & Akkorde',
        'Timing, Groove & Griffbrett',
      ])
        await expect(
          page.locator('.program-section-head h2').filter({ hasText: name }),
        ).toHaveCount(1);
      // The daily section and the practice diary are gone for good.
      await go('/practice');
      await expect(page.locator('h1')).toContainText('nicht gefunden');
      await go('/practice/log');
      await expect(page.locator('h1')).toContainText('nicht gefunden');
    });

    await check('a programme runs six five-minute blocks from real exercises', async () => {
      await go('/programs/erste-toene');
      await expect(page.locator('h1')).toHaveText('Die ersten Töne');
      await expect(page.locator('.session-count')).toContainText('0 von 6');
      await expect(page.locator('.program-current-header')).toContainText('B1');
      await page.getByRole('button', { name: 'Weiter', exact: true }).click();
      await expect(page.locator('.program-current-header')).toContainText('B2');
      // Nothing offers to save a diary entry any more.
      await expect(page.getByRole('button', { name: /speichern/ })).toHaveCount(0);
    });

    await check('a beginner exercise plays against a click or a groove', async () => {
      await go('/exercises/basics/5');
      await expect(page.locator('h1')).toContainText('Tonleiter hoch und runter');
      // Nothing accompanies the example until it is asked for.
      await expect(page.getByRole('button', { name: 'Ohne', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await page.getByRole('button', { name: 'Groove', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Stopp', exact: true })).toBeVisible();
      // Switching to the click stops the drums rather than running both.
      await page.getByRole('button', { name: 'Metronom', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Metronom', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await page.getByRole('button', { name: 'Ohne', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Stopp', exact: true })).toHaveCount(0);
    });

    await check('an exercise shows the task first and the detail on demand', async () => {
      await go('/exercises/basics/5');
      // Fretboard, notation, TAB and keyboard all start folded.
      await expect(page.locator('main details[open]')).toHaveCount(0);
      assert.ok((await page.locator('main details').count()) >= 4);
      const short = (await page.locator('main').innerText()).length;
      assert.ok(
        short < 1200,
        `the exercise page shows ${short} characters before opening anything`,
      );
      // Only the goal and the numbers are visible up front.
      const task = await page.locator('.exercise-task').innerText();
      assert.match(task, /55 BPM Start/);
      assert.match(task, /Genauer erklärt und häufige Fehler/);
      await page.getByText('Genauer erklärt und häufige Fehler').click();
      const long = (await page.locator('main').innerText()).length;
      assert.ok(long > short, 'the disclosure should reveal the longer explanation');
      await expect(page.locator('.exercise-task')).toContainText('Häufige Fehler');
    });

    await check('a running programme keeps the other twenty-nine out of the way', async () => {
      await go('/programs/latin');
      await expect(page.locator('.chapter-sidebar')).toHaveCount(0);
      await page.getByRole('link', { name: /Anderes Programm/ }).click();
      await expect(page).toHaveURL(/\/programs$/);
      // The list itself still has its sidebar.
      await expect(page.locator('.chapter-sidebar')).toHaveCount(1);
    });

    await check('programme cards carry no slogans and no decorative bars', async () => {
      await go('/programs');
      await expect(page.locator('.program-section')).toHaveCount(3);
      await expect(page.locator('.program-card')).toHaveCount(30);
      await expect(page.locator('.program-block-preview')).toHaveCount(0);
      // Name, length and the exercises it runs — nothing else.
      const card = await page.locator('.program-card').first().innerText();
      assert.match(card, /Die ersten Töne/);
      assert.match(card, /B1 · B2/);
      // The card names the groove the programme opens with.
      assert.match(card, /Viel Platz zum Üben/);
    });

    await check('reference pages have no favorite or familiarity controls', async () => {
      await go('/scales/major');
      await expect(page.getByRole('button', { name: /Favorit|Stern/i })).toHaveCount(0);
      await expect(page.getByLabel('Lernstatus')).toHaveCount(0);
    });

    await check('dark mode keeps reference notation and search usable', async () => {
      await page.getByRole('button', { name: 'Dunkelmodus aktivieren', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      // It lasts as long as the tab does; nothing is written to the browser.
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await page.getByRole('button', { name: 'Dunkelmodus aktivieren', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      for (const path of [
        '/scales/dorian',
        '/fretboard',
        '/programs/erste-toene',
        '/theory/key-signatures',
        '/drums',
        '/tools/metronome',
      ]) {
        await go(path);
        // A full page load starts light again, since nothing is stored.
        await page.getByRole('button', { name: 'Dunkelmodus aktivieren', exact: true }).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
          path + ' dark-mode overflow',
        );
        const colors = await page.locator('h1').evaluate((heading) => ({
          text: getComputedStyle(heading).color,
          background: getComputedStyle(document.documentElement).backgroundColor,
        }));
        assert.notEqual(
          colors.text,
          colors.background,
          path + ' heading must contrast with background',
        );
        if (path === '/scales/dorian')
          await expect(page.locator('.notation-scroll svg')).toHaveCount(2);
      }
      await page.getByRole('button', { name: 'Workstation durchsuchen' }).click();
      await page.getByLabel('Tonleitern, Übungen und Theorie suchen').fill('drum');
      await expect(page.locator('.search-result').first()).toBeVisible();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Hellmodus aktivieren', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });
  } finally {
    await context.close();
  }
}
