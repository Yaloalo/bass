import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { audioEvents, installAudioProbe } from './qa-audio-probe.mjs';

export async function checkPiano(browser, check, errors) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installAudioProbe(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const key = (midi) => page.locator(`.piano-key[data-midi="${midi}"]`);
  const result = page.locator('.piano-analysis-result h2');
  const select = async (midis) => {
    if (await page.getByRole('button', { name: 'Auswahl leeren', exact: true }).isEnabled())
      await page.getByRole('button', { name: 'Auswahl leeren', exact: true }).click();
    for (const midi of midis) await key(midi).click({ position: { x: 10, y: 180 } });
  };
  try {
    await check(
      'the main areas and metronome slot preserve existing tools and link to the piano',
      async () => {
        await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/musiktheorie');
        const nav = page.getByRole('navigation', { name: 'Hauptbereiche' });
        for (const name of ['MUSIKTHEORIE', 'BASS', 'DRUM-MASCHINE', 'METRONOM'])
          await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
        await page.locator('main a[href="/piano"]').click();
        await expect(page.locator('h1')).toHaveText('Interaktives Piano');
        await expect(page.locator('.nav-chapter.active')).toContainText('MUSIKTHEORIE');
      },
    );
    await check(
      'piano highlights scale, recognizes chords and freely accepts outside notes',
      async () => {
        await page.getByLabel('Piano-Grundton').selectOption('C');
        await expect(page.locator('.piano-key.in-scale')).toHaveCount(15);
        await select([60, 64, 67]);
        await expect(result).toHaveText('C-Dur');
        await expect(page.locator('.piano-key.is-selected')).toHaveCount(3);
        await key(64).click({ position: { x: 10, y: 180 } });
        await key(63).click();
        await expect(result).toHaveText('C-Moll');
        await expect(key(63)).toHaveClass(/outside-scale.*is-selected/);
        await page.getByLabel('Piano-Tonleiter').selectOption('natural-minor');
        await expect(key(63)).toHaveClass(/in-scale.*is-selected/);
        await expect(result).toHaveText('C-Moll');
        await page.getByLabel('Piano-Tonleiter').selectOption('major');
        await select([60, 62, 67]);
        await expect(result).toHaveText('Csus2');
        await select([60, 64, 67, 71]);
        await expect(result).toHaveText('Cmaj7');
        await expect(key(71)).toHaveAccessibleName('H4');
        await expect(key(70)).toHaveAccessibleName('B4');
        await select([60, 64, 67, 69]);
        await expect(result).toHaveText('C6');
        await expect(page.locator('.piano-alternatives')).toContainText('Am7/C');
        await select([64, 67, 72]);
        await expect(result).toHaveText('C-Dur / E');
        await page.getByRole('link', { name: 'Akkord verstehen und auf dem Bass üben' }).click();
        await expect(page).toHaveURL(/\/chords\/major$/);
        await expect(page.getByLabel('Globaler Grundton')).toHaveValue('C');
      },
    );
    await check('diatonic chord picker and bass fretboard follow the piano selection', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/piano');
      await page.getByLabel('Piano-Grundton').selectOption('C');
      await page.getByLabel('Piano-Tonleiter').selectOption('major');
      const picker = page.locator('.chord-picker-panel');
      const cards = picker.locator('.chord-picker-card');
      await page.getByRole('button', { name: 'Akkorde der Tonart', exact: true }).click();
      await expect(picker).toBeVisible();
      // The key offers its whole catalogue, not only triads and sevenths.
      assert.ok((await cards.count()) > 40, 'the key should offer a rich chord list');
      // Filters have to narrow that list, otherwise it is not navigable.
      const all = await cards.count();
      await picker.getByRole('button', { name: 'Septakkorde' }).click();
      const sevenths = await cards.count();
      assert.ok(sevenths > 0 && sevenths < all, 'the family filter did not narrow anything');
      await picker.getByLabel('Akkorde der Tonart durchsuchen').fill('G7');
      await expect(cards.filter({ hasText: 'G7' }).first()).toBeVisible();
      await picker.getByLabel('Akkorde der Tonart durchsuchen').fill('gibtesnicht');
      await expect(cards).toHaveCount(0);
      await expect(picker.locator('.chord-picker-empty')).toBeVisible();
      await picker.getByLabel('Akkorde der Tonart durchsuchen').fill('');
      await picker
        .getByRole('group', { name: 'Nach Stufe filtern' })
        .getByRole('button', { name: 'V G', exact: true })
        .click();
      await cards.filter({ hasText: 'G7' }).first().click();
      // Picking closes the floating panel and shows the choice on the trigger.
      await expect(picker).toHaveCount(0);
      await expect(page.locator('.chord-picker-trigger').first()).toContainText('G7');
      for (const midi of [55, 59, 62, 65]) await expect(key(midi)).toHaveClass(/is-selected/);
      await expect(result).toHaveText('G7');
      await page.getByRole('button', { name: 'Bass-Griffbrett anzeigen' }).click();
      const board = page.locator('#piano-bass-fretboard');
      await expect(board).toBeVisible();
      for (const position of ['E:3', 'E:7', 'A:5', 'D:3', 'G:10']) {
        await expect(board.locator(`[data-position="${position}"] .degree-marker`)).not.toHaveClass(
          /empty/,
        );
      }
      await expect(board.locator('[data-position="E:8"] .degree-marker')).toHaveClass(/empty/);
      await key(59).click();
      // Editing keys by hand drops the chord the picker had set.
      await expect(page.locator('.chord-picker-trigger').first()).toContainText('Akkord wählen');
      await expect(board.locator('[data-position="E:7"] .degree-marker')).toHaveClass(/empty/);
      await key(60).click();
      await expect(board.locator('[data-position="E:8"] .degree-marker')).not.toHaveClass(/empty/);
      await page.getByRole('button', { name: 'Bass-Griffbrett ausblenden' }).click();
      await expect(board).toHaveCount(0);
    });
    await check(
      'piano plays actual pitch, supports keyboard input and play-only mode',
      async () => {
        await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/piano');
        await key(60).focus();
        await page.keyboard.press('Space');
        await expect(key(60)).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(async () => (await audioEvents(page)).length).toBeGreaterThanOrEqual(3);
        assert.ok(
          (await audioEvents(page)).some((event) => Math.abs(event.frequency - 261.6256) < 0.01),
        );
        await page.keyboard.press('ArrowRight');
        await expect(key(61)).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(key(61)).toHaveAttribute('aria-pressed', 'true');
        await page.getByRole('button', { name: 'Nur spielen', exact: true }).click();
        await key(64).click({ position: { x: 10, y: 180 } });
        await expect(page.locator('.piano-key.is-selected')).toHaveCount(2);
        await page.getByRole('button', { name: 'Auswahl spielen', exact: true }).click();
        await page.getByRole('button', { name: 'Auswahl leeren', exact: true }).click();
        await expect(page.locator('.piano-key.is-selected')).toHaveCount(0);
        await expect(page.locator('.piano-key.is-playing')).toHaveCount(0);
      },
    );
    await check('selected piano notes sound together as a sustained chord', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/piano');
      // A browser without this optional AudioParam method must still play the
      // complete selection. It previously aborted while releasing the first note.
      await page.evaluate(() => {
        const unsupported = () => {
          throw new Error('cancelAndHoldAtTime is unavailable');
        };
        AudioParam.prototype.cancelAndHoldAtTime = unsupported;
        if (AudioParam.prototype.cancelAndHoldAtTime !== unsupported)
          throw new Error('Could not simulate the missing Web Audio method');
      });
      await select([60, 64, 67]);
      const before = (await audioEvents(page)).length;
      await page.getByRole('button', { name: 'Auswahl spielen', exact: true }).click();
      await expect
        .poll(async () => (await audioEvents(page)).length - before)
        .toBeGreaterThanOrEqual(9);
      const chordEvents = (await audioEvents(page)).slice(before);
      const fundamentals = [261.6256, 329.6276, 391.9954].map((frequency) => {
        const event = chordEvents.find(
          (entry) => entry.kind === 'oscillator' && Math.abs(entry.frequency - frequency) < 0.03,
        );
        assert.ok(event, `missing chord pitch ${frequency} Hz`);
        assert.ok(event.stop - event.at > 1, `chord pitch ${frequency} Hz was cut short`);
        return event;
      });
      assert.ok(
        Math.max(...fundamentals.map((event) => event.at)) -
          Math.min(...fundamentals.map((event) => event.at)) <
          0.001,
        'chord pitches did not start together',
      );
      await expect(page.getByRole('alert')).toHaveCount(0);
    });
    await check('the quick selection is folded away and sets whole chords', async () => {
      await page.goto(url('/piano'));
      const panel = page.locator('.quick-chords');
      await expect(panel.locator('.section-heading h2')).toHaveText('Schnellauswahl');
      // Folded by default: the shortcut must not push the keyboard down the page.
      assert.equal(await panel.evaluate((el) => el.open), false, 'it should start collapsed');
      await expect(panel.locator('.quick-chord-grid button').first()).toBeHidden();

      await panel.locator('summary').click();
      await expect(panel.locator('.quick-chord-grid button').first()).toBeVisible();
      assert.deepEqual(
        await panel.locator('.quick-chord-group > header > strong').allInnerTexts(),
        ['Dreiklänge', 'Septakkorde'],
      );
      const triads = panel.locator('.quick-chord-group').nth(0).locator('button');
      const sevenths = panel.locator('.quick-chord-group').nth(1).locator('button');
      await expect(triads).toHaveCount(7);
      await expect(sevenths).toHaveCount(7);
      await expect(panel.locator('.section-aside')).toContainText('14');
      // The degrees of the key, with German note names and the right chord qualities.
      assert.deepEqual(
        (await triads.allInnerTexts()).map((text) => text.split('\n').slice(0, 2).join(' ')),
        ['I D', 'ii Em', 'iii Fism', 'IV G', 'V A', 'vi Hm', 'vii° Cisdim'],
      );
      assert.deepEqual(
        (await sevenths.allInnerTexts()).map((text) => text.split('\n')[1]),
        ['Dmaj7', 'Em7', 'Fism7', 'Gmaj7', 'A7', 'Hm7', 'Cism7♭5'],
      );

      // Picking lays the chord on the keyboard; picking again takes it off.
      const keys = page.locator('.piano-key.is-selected');
      await triads.nth(1).click();
      await expect(keys).toHaveCount(3);
      await expect(triads.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await triads.nth(1).click();
      await expect(keys).toHaveCount(0);
      await expect(triads.nth(1)).toHaveAttribute('aria-pressed', 'false');

      // A seventh replaces the triad instead of adding to it, and only one is ever lit.
      await triads.first().click();
      await expect(keys).toHaveCount(3);
      await sevenths.first().click();
      await expect(keys).toHaveCount(4);
      await expect(panel.locator('button.active')).toHaveCount(1);

      // Touching a key by hand drops the highlight, so it never claims a chord you left.
      await page.locator('.piano-key').nth(5).click();
      await expect(panel.locator('button.active')).toHaveCount(0);

      // A scale without seven distinct notes says so instead of showing an empty grid.
      await page.locator('.piano-context select').last().selectOption({ label: 'Dur-Pentatonik' });
      await expect(panel.locator('.section-aside')).toContainText('NICHT VERFÜGBAR');
      await expect(panel.locator('.quick-chords-empty')).toContainText('sieben verschiedenen Töne');
      await expect(panel.locator('.quick-chord-grid')).toHaveCount(0);
    });

    await check('piano and main navigation remain usable on phones in both themes', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark')
          await page.getByRole('button', { name: 'Dunkelmodus aktivieren' }).click();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        for (const name of ['MUSIKTHEORIE', 'BASS', 'DRUM-MASCHINE', 'METRONOM'])
          await expect(
            page
              .getByRole('navigation', { name: 'Hauptbereiche' })
              .getByRole('link', { name, exact: true }),
          ).toBeVisible();
        await page.getByRole('button', { name: 'Auswählen + spielen', exact: true }).click();
        await key(72).scrollIntoViewIfNeeded();
        await key(72).click({ position: { x: 10, y: 180 } });
        await expect(key(72)).toHaveAttribute('aria-pressed', 'true');
        await page.getByRole('button', { name: 'Auswahl leeren', exact: true }).click();
        await page.screenshot({ path: `/tmp/bass-qa/piano-${theme}-390.png`, fullPage: true });
      }
    });
  } finally {
    await context.close();
  }
}
