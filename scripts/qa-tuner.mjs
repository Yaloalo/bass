import assert from 'node:assert/strict';
import { expect } from '@playwright/test';

/** Replaces the microphone with a generated bass string, so the whole chain is real. */
const fakeMicrophone = () => {
  window.__tone = 41.2;
  navigator.mediaDevices.getUserMedia = async () => {
    const ac = new AudioContext();
    const destination = ac.createMediaStreamDestination();
    const gain = ac.createGain();
    gain.gain.value = 0.35;
    window.__oscillators = [1, 2, 3].map((harmonic, index) => {
      const oscillator = ac.createOscillator();
      oscillator.frequency.value = window.__tone * harmonic;
      const level = ac.createGain();
      level.gain.value = [0.6, 1, 0.5][index];
      oscillator.connect(level);
      level.connect(gain);
      oscillator.start();
      return oscillator;
    });
    gain.connect(destination);
    window.__setTone = (hz) => {
      window.__tone = hz;
      window.__oscillators.forEach((osc, i) => (osc.frequency.value = hz * (i + 1)));
    };
    return destination.stream;
  };
};

export async function checkTuner(browser, check, errors) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ['microphone'],
  });
  await context.addInitScript(fakeMicrophone);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const url = (path) => (process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + path;
  const note = () => page.locator('.tuner-note strong');
  const play = async (hz) => {
    await page.evaluate((value) => window.__setTone(value), hz);
    await page.waitForTimeout(700);
  };
  try {
    await check('the tuner hears each open string and names it in German', async () => {
      await page.goto(url('/stimmgeraet'));
      await expect(page.locator('h1')).toHaveText('Stimmgerät');
      await expect(page.locator('.nav-chapter.active')).toContainText('BASS');
      // Nothing is measured before the microphone is switched on.
      await expect(note()).toHaveText('—');
      await expect(page.locator('.tuner-string')).toHaveCount(4);
      await page.getByRole('button', { name: /Mikrofon einschalten/ }).click();
      await expect(page.getByRole('button', { name: /Mikrofon aus/ })).toBeVisible();
      for (const [hz, name] of [
        [41.2, 'E1'],
        [55, 'A1'],
        [73.42, 'D2'],
        [98, 'G2'],
      ]) {
        await play(hz);
        await expect(note()).toHaveText(name);
        await expect(page.locator('.tuner-verdict')).toHaveText('Stimmt');
      }
      // The string that is sounding is the one marked.
      await expect(page.locator('.tuner-string.is-active strong')).toHaveText('G');
      await expect(page.locator('.tuner-string.is-tuned')).toHaveCount(1);
    });

    await check('the tuner says which way a string is out, and by how much', async () => {
      await play(41.2 * 2 ** (22 / 1200));
      await expect(note()).toHaveText('E1');
      await expect(page.locator('.tuner-verdict')).toHaveText('Zu hoch');
      await expect(page.locator('.tuner-meter.is-tuned')).toHaveCount(0);
      // The smoothing takes a moment to settle, so this checks the direction and the
      // rough size rather than an exact reading.
      const sharp = Number(
        /([+-]?\d+) Cent/.exec(await page.locator('.tuner-note small').innerText())[1],
      );
      assert.ok(sharp > 10 && sharp < 35, `expected roughly +22 cents, read ${sharp}`);
      await play(41.2 * 2 ** (-30 / 1200));
      await expect(page.locator('.tuner-verdict')).toHaveText('Zu tief');
      const flatCents = Number(
        /([+-]?\d+) Cent/.exec(await page.locator('.tuner-note small').innerText())[1],
      );
      assert.ok(
        flatCents < -12 && flatCents > -45,
        `expected roughly -30 cents, read ${flatCents}`,
      );
      // The needle follows the reading rather than sitting still.
      const flat = await page.locator('.tuner-needle').evaluate((el) => el.style.left);
      await play(41.2);
      await expect(page.locator('.tuner-verdict')).toHaveText('Stimmt');
      assert.notEqual(await page.locator('.tuner-needle').evaluate((el) => el.style.left), flat);
    });

    await check('the five-string tuning adds the low H', async () => {
      await page.getByLabel('Stimmung').selectOption('standard5');
      await expect(page.locator('.tuner-string')).toHaveCount(5);
      await play(30.87);
      await expect(note()).toHaveText('H0');
      await expect(page.locator('.tuner-string.is-active strong')).toHaveText('H');
      // Switching the microphone off clears the reading rather than freezing it.
      await page.getByRole('button', { name: /Mikrofon aus/ }).click();
      await expect(note()).toHaveText('—');
      // Nothing is stored, so a reload returns to the four-string default.
      await page.reload();
      await expect(page.getByLabel('Stimmung')).toHaveValue('standard4');
    });

    await check('a refused microphone explains itself instead of failing silently', async () => {
      const blocked = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await blocked.addInitScript(() => {
        navigator.mediaDevices.getUserMedia = async () => {
          throw new DOMException('denied', 'NotAllowedError');
        };
      });
      const denied = await blocked.newPage();
      denied.on('pageerror', (error) => errors.push(error.message));
      await denied.goto(url('/stimmgeraet'));
      await denied.getByRole('button', { name: /Mikrofon einschalten/ }).click();
      await expect(denied.getByRole('alert')).toContainText('Mikrofonfreigabe');
      // The reference tones still work without a microphone.
      await expect(denied.locator('.tuner-string')).toHaveCount(4);
      await denied.locator('.tuner-string').first().click();
      await expect(denied.getByRole('alert')).toHaveCount(1);
      await blocked.close();
    });

    await check('the tuner fits a phone in both themes', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark')
          await page.getByRole('button', { name: 'Dunkelmodus aktivieren' }).click();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        await expect(page.locator('.tuner-string')).toHaveCount(4);
        await page.screenshot({ path: `/tmp/bass-qa/tuner-${theme}-390.png`, fullPage: true });
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    });
  } finally {
    await context.close();
  }
}
