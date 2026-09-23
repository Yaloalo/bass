import assert from 'node:assert/strict';
import { expect } from '@playwright/test';

/** Covers the unified chord/arpeggio section: one model, four views, real transposition. */
export async function checkChords(browser, check, errors) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const base = process.env.BASS_QA_URL || 'http://127.0.0.1:4175';
  const go = async (path) => {
    await page.goto(base + path);
    await expect(page.locator('h1')).toBeVisible();
  };
  const view = (name) => page.getByRole('button', { name, exact: true });

  try {
    await check('arpeggio routes redirect into the single chord section', async () => {
      await go('/arpeggios');
      await expect(page).toHaveURL(/\/chords$/);
      await go('/arpeggios/minor-7b5');
      await expect(page).toHaveURL(/\/chords\/minor-7b5$/);
      await expect(page.locator('h1')).toContainText('m7');
    });

    await check('the atlas lists every family and filters by name and formula', async () => {
      await go('/chords');
      const all = await page.locator('.chord-card').count();
      assert.ok(all >= 40, `expected the full atlas, saw ${all}`);
      await page.getByLabel('Akkordfamilie').selectOption('altered');
      const altered = await page.locator('.chord-card').count();
      assert.ok(altered > 0 && altered < all, 'family filter must narrow the list');
      await page.getByLabel('Akkordfamilie').selectOption('alle');
      await page.getByLabel('Akkorde durchsuchen').fill('1 3 5 b7');
      await expect(page.locator('.chord-card').first()).toBeVisible();
      await page.getByLabel('Akkorde durchsuchen').fill('m7b5');
      await expect(page.locator('.chord-card')).toHaveCount(1);
    });

    await check('a chord separates its symbol from what a bassist actually plays', async () => {
      await go('/chords/dominant-13');
      // Required degrees are solid chips, routinely dropped ones are outlined.
      await expect(page.locator('.formula-chip.is-required')).toHaveCount(4);
      await expect(page.locator('.formula-chip.is-omissible')).toHaveCount(2);
      // The 11 is in the full tertian stack but struck through, because the symbol omits it.
      await expect(page.locator('.tertian-line .is-avoided')).toHaveText('11');
      await expect(page.locator('.voicing-line').first()).toContainText('D');
    });

    await check('every chord section is open at once and can be folded away', async () => {
      await go('/chords/major-7');
      // No tabs any more: fretboard, arpeggio, notation, TAB and the tables all show.
      await expect(page.locator('.fretboard').first()).toBeVisible();
      await expect(page.locator('.notation-scroll svg')).toHaveCount(2);
      await expect(page.locator('.piano-preview .piano-key').first()).toBeVisible();
      const sections = page.locator('.section-panel');
      const count = await sections.count();
      assert.ok(count >= 4, `expected several sections, saw ${count}`);
      for (let index = 0; index < count; index++)
        assert.equal(
          await sections.nth(index).evaluate((element) => element.open),
          true,
          'every section starts open',
        );
      // Folding one hides its body and leaves the others untouched.
      await sections.first().locator('summary').click();
      assert.equal(await sections.first().evaluate((element) => element.open), false);
      assert.equal(await sections.nth(1).evaluate((element) => element.open), true);
    });

    await check('a chord page links into the piano with that chord selected', async () => {
      await go('/chords/dominant-7');
      await page.getByRole('link', { name: 'Akkord im Piano öffnen' }).click();
      await expect(page).toHaveURL(/\/piano\?akkord=dominant-7$/);
      // D7 is D Fis A C, so exactly four keys come up selected.
      await expect(page.locator('.piano-key.is-selected')).toHaveCount(4);
    });

    await check(
      'German note names follow the global root and never contradict the symbol',
      async () => {
        await go('/chords/dominant-7');
        await page.getByLabel('Globaler Grundton').selectOption({ value: 'Bb' });
        // German: international Bb is written B, and the symbol keeps its international suffix.
        await expect(page.locator('h1')).toHaveText('B7');
        await expect(page.locator('.formula-chip').first()).toContainText('B');
        await page.getByLabel('Globaler Grundton').selectOption({ value: 'B' });
        await expect(page.locator('h1')).toHaveText('H7');
        // H7 = H D# F# A, so the third must read Dis, never D#.
        await expect(page.locator('.formula-chip').nth(1)).toContainText('Dis');
        await page.getByLabel('Globaler Grundton').selectOption({ value: 'D' });
      },
    );
  } finally {
    await context.close();
  }
}
