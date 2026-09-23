import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { audioEvents, installAudioProbe } from './qa-audio-probe.mjs';

export async function checkEar(browser, check, errors) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await installAudioProbe(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const url = (path) => (process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + path;
  const button = (name) => page.getByRole('button', { name, exact: true });
  try {
    await check('ear training plays a question and only scores a real answer', async () => {
      await page.goto(url('/gehoer'));
      await expect(page.locator('h1')).toHaveText('Gehörbildung');
      await expect(page.locator('.nav-chapter.active')).toContainText('MUSIKTHEORIE');
      // Nothing sounds until the user asks for it.
      assert.equal((await audioEvents(page)).length, 0);
      await expect(page.locator('.ear-answer')).toHaveCount(0);
      await button('Aufgabe starten').click();
      await expect
        .poll(async () => (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length)
        .toBeGreaterThanOrEqual(2);
      // The five basic intervals, and no answer revealed before one is picked.
      await expect(page.locator('.ear-answer')).toHaveCount(5);
      await expect(page.locator('.ear-answer.is-right')).toHaveCount(0);
      await expect(page.getByText('/ 0 richtig')).toBeVisible();

      const answered = await audioEvents(page);
      await button('Nochmal hören').click();
      await expect
        .poll(async () => (await audioEvents(page)).length)
        .toBeGreaterThan(answered.length);
      await expect(page.locator('.ear-answer.is-right')).toHaveCount(0);

      await page.locator('.ear-answer').first().click();
      // Exactly one right answer is revealed, and the score moved by one.
      await expect(page.locator('.ear-answer.is-right')).toHaveCount(1);
      await expect(page.locator('.ear-verdict')).toHaveClass(/is-(right|wrong)/);
      await expect(page.locator('.ear-score')).toContainText('/ 1 richtig');
      await expect(page.locator('.ear-answer').first()).toBeDisabled();
    });

    await check('the answer is revealed on both the keyboard and the neck', async () => {
      const keys = page.locator('.ear-reveal .piano-key.is-selected');
      await expect(keys).toHaveCount(2);
      const marks = page.locator('.ear-reveal .degree-marker:not(.empty)');
      assert.ok((await marks.count()) > 0, 'the interval should appear on the fretboard');
      // Both notes of the interval are named, spelled to match the interval.
      const verdict = await page.locator('.ear-verdict strong').innerText();
      assert.match(verdict, /^(Richtig|Daneben) · /);
      await button('Nächste Aufgabe').click();
      await expect(page.locator('.ear-reveal')).toHaveCount(0);
      await expect(page.locator('.ear-answer.is-right')).toHaveCount(0);
    });

    await check('chord mode, levels and the score reset behave', async () => {
      await button('Akkorde').click();
      await expect(page.locator('.ear-idle')).toBeVisible();
      await button('Aufgabe starten').click();
      await expect(page.locator('.ear-answer')).toHaveCount(4);
      await expect(page.locator('.ear-answer').first()).toContainText('Durdreiklang');
      await button('Jazz-Farben').click();
      // Switching level clears the stage rather than leaving a stale question.
      await expect(page.locator('.ear-idle')).toBeVisible();
      await button('Aufgabe starten').click();
      await expect(page.locator('.ear-answer')).toHaveCount(13);
      await page.locator('.ear-answer').first().click();
      await button('Zurücksetzen').click();
      await expect(page.locator('.ear-score')).toContainText('/ 0 richtig');
      // Nothing is stored, so a reload starts from the first mode and level again.
      await page.reload();
      await expect(page.getByRole('button', { name: 'Intervalle', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByRole('button', { name: 'Grundlagen', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    await check('ear training works on a phone in both themes', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark')
          await page.getByRole('button', { name: 'Dunkelmodus aktivieren' }).click();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        // After "Nächste Aufgabe" a question is already running, so the play button
        // reads "Nochmal hören" instead.
        if (await button('Aufgabe starten').count()) await button('Aufgabe starten').click();
        await page.locator('.ear-answer').first().click();
        await expect(page.locator('.ear-reveal')).toBeVisible();
        await page.screenshot({ path: `/tmp/bass-qa/ear-${theme}-390.png`, fullPage: true });
        await button('Nächste Aufgabe').click();
      }
    });
  } finally {
    await context.close();
  }
}
