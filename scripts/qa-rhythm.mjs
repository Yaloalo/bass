import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { audioEvents, installAudioProbe } from './qa-audio-probe.mjs';

export async function checkRhythm(browser, check, errors) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installAudioProbe(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const field = (name) => page.getByLabel(name, { exact: true });
  const reset = () =>
    page.evaluate(() => {
      window.__bassAudioProbe.length = 0;
    });
  const stop = async () => {
    const focus = page.getByRole('dialog', { name: 'Mitspielansicht' });
    if (await focus.isVisible().catch(() => false)) {
      await focus.getByRole('button', { name: 'Stopp', exact: true }).click();
    } else await page.locator('main .transport-play').click();
  };
  const chooseProgression = async (name) => {
    await page.locator('.harmony-preset-picker summary').click();
    await page.getByRole('button', { name }).click();
  };
  // The quick-groove chips are gone; the library is the one place grooves load from.
  const pocket = () =>
    page
      .locator('.library-cards')
      .getByRole('button', { name: /Gerader Pocket/ })
      .click();
  /** Knobs are ARIA sliders, not range inputs: read and set them through the role. */
  const knob = (name) => page.getByRole('slider', { name, exact: true });
  /** Converges on a value by reading the dial back, so step clamping cannot drift. */
  const turn = async (name, target) => {
    const dial = knob(name);
    await dial.focus();
    await page.keyboard.press('Home');
    const min = Number(await dial.getAttribute('aria-valuemin'));
    const max = Number(await dial.getAttribute('aria-valuemax'));
    const jump = (max - min) / 10;
    for (let guard = 0; guard < 200; guard++) {
      const gap = target - Number(await dial.getAttribute('aria-valuenow'));
      if (Math.abs(gap) < 1e-9) break;
      const far = Math.abs(gap) >= jump;
      await page.keyboard.press(
        gap > 0 ? (far ? 'PageUp' : 'ArrowUp') : far ? 'PageDown' : 'ArrowDown',
      );
    }
    await expect(dial).toHaveAttribute('aria-valuenow', String(target));
  };
  try {
    await check(
      'first drag paints; keyboard edits and focused buttons preserve native activation',
      async () => {
        await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
        await field('Übe-Tempo').fill('');
        await field('Übe-Tempo').pressSequentially('96');
        await field('Übe-Tempo').press('Tab');
        await expect(field('Tempo in BPM')).toHaveValue('96');
        await button('Schritte löschen').click();
        const pads = page.locator('.track-row').first().locator('.pad');
        await pads.nth(0).scrollIntoViewIfNeeded();
        const first = await pads.nth(0).boundingBox(),
          third = await pads.nth(2).boundingBox();
        await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
        await page.mouse.down();
        await page.mouse.move(third.x + third.width / 2, third.y + third.height / 2, { steps: 8 });
        await page.mouse.up();
        for (let i = 0; i < 3; i++)
          await expect(pads.nth(i)).toHaveAttribute('aria-pressed', 'true');
        await pads.nth(4).focus();
        await page.keyboard.press('3');
        await expect(pads.nth(4)).toHaveClass(/v-3/);
        await button('Schritte löschen').focus();
        await page.keyboard.press('Space');
        await expect(page.locator('.pad[aria-pressed="true"]')).toHaveCount(0);
        await expect(button('Groove starten')).toBeVisible();
      },
    );
    await check(
      'the library loads grooves and the optional sequencer help stays reachable',
      async () => {
        // Nothing loads grooves from the top of the page any more.
        await expect(page.locator('.drum-quickbar')).toHaveCount(0);
        await pocket();
        await expect(page.getByLabel('Pattern-Name')).toHaveValue('Gerader Pocket');
        const guide = page.locator('.seq-guide');
        await expect(guide).not.toHaveAttribute('open');
        await guide.locator('summary').click();
        await expect(guide).toHaveAttribute('open');
        await expect(guide).toContainText('Rechtsklick');
        await guide.locator('summary').click();
        await expect(guide).not.toHaveAttribute('open');
        // The library now groups grooves well beyond the original practice set.
        assert.ok(
          (await page.locator('.library-group').count()) >= 7,
          'the preset library should offer several groove groups',
        );
        assert.ok(
          (await page.locator('.library-cards button').count()) >= 40,
          'the preset library should offer many grooves',
        );
        // A voice preset rewrites exactly the knobs of the selected track.
        const kickPresets = page.getByRole('group', { name: 'Klang-Voreinstellungen Kick' });
        await kickPresets.getByRole('button', { name: '808-Sub' }).click();
        await expect(knob('Kick Oszillator Stimmung')).toHaveAttribute('aria-valuenow', '-5');
        await expect(knob('Kick Oszillator Klangfarbe')).toHaveAttribute('aria-valuenow', '0.2');
        await kickPresets.getByRole('button', { name: 'Punch', exact: true }).click();
        await expect(knob('Kick Oszillator Stimmung')).toHaveAttribute('aria-valuenow', '1');
        await expect(knob('Kick Ausgang Sättigung')).toHaveAttribute('aria-valuenow', '0.4');
        await button('Klang zurücksetzen').click();
        await expect(knob('Kick Oszillator Stimmung')).toHaveAttribute('aria-valuenow', '0');
        // Song mode is gone; the library is the only drawer left.
        await expect(page.getByText('Song-Modus')).toHaveCount(0);
      },
    );
    await check('the synth scope renders the real voice and nothing is written down', async () => {
      await pocket();
      await turn('Kick FM Stärke', 0);
      // The display is an offline render of the same graph, so it has to appear.
      await expect(page.locator('.synth-trace')).toHaveAttribute('d', /^M [\d.]/);
      const plainTrace = await page.locator('.synth-trace').getAttribute('d');
      await expect(page.locator('.synth-readout')).toContainText('Index 0.0');
      await reset();
      await button('Anspielen').click();
      await expect
        .poll(async () => (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length)
        .toBeGreaterThanOrEqual(1);
      const plain = (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length;
      await turn('Kick FM Stärke', 2);
      // A modulator is a second oscillator, and the drawn waveform must change with it.
      await expect(page.locator('.synth-readout')).toContainText('Index 2.0');
      await expect.poll(() => page.locator('.synth-trace').getAttribute('d')).not.toBe(plainTrace);
      await reset();
      await button('Anspielen').click();
      await expect
        .poll(async () => (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length)
        .toBeGreaterThan(plain);
      await page.getByRole('button', { name: 'Hülle', exact: true }).click();
      await expect(page.locator('.synth-fill')).toBeVisible();
      await turn('Kick Oszillator Stimmung', 7);
      await button('Erzeugen').click();
      await expect(knob('Kick Oszillator Stimmung')).toHaveAttribute('aria-valuenow', '7');
      // A pattern saved in this session is there until the tab is reloaded; nothing is
      // written to the browser, so a reload starts from the default groove again.
      await field('Pattern-Name').fill('QA Pocket');
      await button('Als neues Pattern sichern').click();
      await expect(button('QA Pocket duplizieren')).toBeVisible();
      await page.reload();
      await expect(field('Pattern-Name')).toHaveValue('Gerader Pocket');
      await expect(button('QA Pocket duplizieren')).toHaveCount(0);
      const stored = await page.evaluate(() => Object.keys(localStorage));
      assert.deepEqual(stored, [], `the drum machine stored ${stored.join(', ')}`);
    });
    await check('the analog engine filters the voice and the rail shows full names', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      const trace = () => page.locator('.synth-trace').getAttribute('d');
      await expect(page.locator('.synth-readout')).toContainText('Modulator');
      const fm = await trace();
      await page
        .getByRole('group', { name: 'Synthese-Modell Kick' })
        .getByRole('button', { name: 'Analog', exact: true })
        .click();
      // A different synthesis model has to reach both the readout and the render.
      await expect(page.locator('.synth-readout')).toContainText('Filter');
      await expect(page.locator('.synth-readout')).toContainText('Q ');
      await expect.poll(trace).not.toBe(fm);
      await expect(page.getByRole('slider', { name: 'Kick FM Stärke', exact: true })).toHaveCount(
        0,
      );
      const filtered = await trace();
      await turn('Kick Analog Resonanz', 1);
      await expect.poll(trace).not.toBe(filtered);
      await turn('Kick Analog Rauschen', 0);
      await expect(
        page.getByRole('slider', { name: 'Kick Analog Rauschen', exact: true }),
      ).toHaveAttribute('aria-valuetext', 'nur Körper');
      await page
        .getByRole('group', { name: 'Synthese-Modell Kick' })
        .getByRole('button', { name: 'FM', exact: true })
        .click();
      await expect(page.locator('.synth-readout')).toContainText('Modulator');

      // The name rail must fit the longest instrument names without clipping.
      await field('Instrumenten-Set').selectOption('afroCuban');
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll('.track-name')]
          .filter((el) => el.scrollWidth > el.clientWidth)
          .map((el) => el.textContent),
      );
      assert.deepEqual(clipped, [], 'instrument names are clipped in the rail');
      await expect(
        page.locator('.track-name').filter({ hasText: 'Conga tief (offen)' }),
      ).toHaveCount(1);
    });
    await check('FM controls create an audible body even on a noise-based shaker', async () => {
      await field('Instrumenten-Set').selectOption('extended');
      await page.locator('.track-name').filter({ hasText: 'Shaker' }).click();
      await turn('Shaker FM Stärke', 0);
      await reset();
      await button('Anspielen').click();
      await expect.poll(async () => (await audioEvents(page)).length).toBeGreaterThan(0);
      const plain = (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length;
      await turn('Shaker FM Stärke', 3);
      await reset();
      await button('Anspielen').click();
      await expect
        .poll(async () => (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length)
        .toBeGreaterThan(plain);
    });
    await check('a newly chosen FM preset is the sound previewed on that same click', async () => {
      await field('Instrumenten-Set').selectOption('extended');
      await page.locator('.track-name').filter({ hasText: 'Tom tief' }).click();
      await reset();
      await page
        .getByRole('group', { name: 'Klang-Voreinstellungen Tom tief' })
        .getByRole('button', { name: 'FM-Trommel' })
        .click();
      // The modulator is a second oscillator. The former preview read stale React state.
      await expect
        .poll(async () => (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length)
        .toBeGreaterThanOrEqual(2);
      await page
        .locator('.track-row.is-selected')
        .getByRole('button', { name: 'Tom tief stummschalten' })
        .click();
      await reset();
      await button('Anspielen').click();
      await expect
        .poll(async () => (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length)
        .toBeGreaterThanOrEqual(2);
    });
    await check('the chord progression comps in time with the groove', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      const rows = page.locator('.harmony-steps li');
      await expect(rows).toHaveCount(0);
      await page.getByLabel('Globaler Grundton').selectOption({ value: 'C' });
      await chooseProgression(/II–V–I in Dur/);
      // The preset is built in the app's global key, not hard-coded.
      await expect(rows).toHaveCount(3);
      await expect(rows.nth(0).locator('.harmony-name')).toHaveText('Dm7');
      await expect(rows.nth(1).locator('.harmony-name')).toHaveText('G7');
      await expect(rows.nth(2).locator('.harmony-name')).toHaveText('Cmaj7');
      await page.getByLabel('Globaler Grundton').selectOption({ value: 'F' });
      await chooseProgression(/II–V–I in Dur/);
      await expect(rows.nth(0).locator('.harmony-name')).toHaveText('Gm7');
      await expect(rows.nth(1).locator('.harmony-name')).toHaveText('C7');
      await expect(rows.nth(2).locator('.harmony-name')).toHaveText('Fmaj7');
      await expect(page.getByRole('switch', { name: 'Akkorde mitspielen' })).toBeChecked();
      // Both visualisations exist but stay folded away until they are wanted.
      const board = page.locator('.harmony-board');
      const keyboard = page.locator('.harmony-views .piano-preview');
      await expect(board).not.toHaveAttribute('open');
      await expect(keyboard).not.toHaveAttribute('open');
      await board.locator('summary').click();
      await expect(board.locator('.degree-marker:not(.empty)').first()).toBeVisible();
      await keyboard.locator('summary').click();
      await expect(keyboard.locator('.piano-key.in-scale').first()).toBeVisible();
      await board.locator('summary').click();

      await reset();
      await page.locator('main .transport-play').click();
      const focus = page.getByRole('dialog', { name: 'Mitspielansicht' });
      await expect(focus).toBeVisible();
      await expect(focus.locator('.drum-focus-chord h1')).toHaveText('Gm7');
      // A pad is extra oscillators on top of the drums, and the strip has to follow.
      await expect
        .poll(async () => (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length)
        .toBeGreaterThanOrEqual(6);
      await expect(page.locator('.harmony-now strong')).not.toHaveText('—');
      await expect(page.locator('.harmony-steps li.is-current')).toHaveCount(1);
      await expect(page.locator('.harmony-now')).toContainText('danach');
      await stop();

      // Turning it off silences the chords without touching the drums.
      await page.getByRole('switch', { name: 'Akkorde mitspielen' }).uncheck();
      await expect(page.locator('.harmony-now')).toHaveCount(0);
      // Reordering is a drag on the handle; no arrow buttons are left. Collapse the
      // sections above first so they cannot shift the rows mid-gesture.
      await board.locator('summary').click();
      await keyboard.locator('summary').click();
      await expect(rows.nth(0).locator('.harmony-name')).toHaveText('Gm7');
      await expect(page.locator('.harmony-move')).toHaveCount(0);
      const handle = (index) =>
        rows.nth(index).getByRole('button', { name: `Akkord ${index + 1} verschieben` });
      // Measure after scrolling: the boxes must be the ones the pointer will hit.
      await handle(0).scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const from = await handle(0).boundingBox();
      const onto = await rows.nth(2).boundingBox();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      for (let step = 1; step <= 10; step++) {
        const y =
          from.y +
          from.height / 2 +
          ((onto.y + onto.height / 2 - from.y - from.height / 2) * step) / 10;
        await page.mouse.move(from.x + from.width / 2, y);
        // The list reorders on each crossing, so give React a frame to apply it.
        await page.waitForTimeout(40);
      }
      await page.mouse.up();
      await expect(rows.nth(0).locator('.harmony-name')).toHaveText('C7');
      await expect(rows.nth(2).locator('.harmony-name')).toHaveText('Gm7');
      await expect(page.locator('.harmony-steps li.is-dragging')).toHaveCount(0);
      // The same handle still reorders from the keyboard, so this is not mouse-only.
      await handle(0).focus();
      await page.keyboard.press('ArrowDown');
      await expect(rows.nth(0).locator('.harmony-name')).toHaveText('Fmaj7');
      await expect(rows.nth(1).locator('.harmony-name')).toHaveText('C7');
      // The chord type opens the same floating picker the piano uses.
      await rows.nth(0).getByRole('button', { name: 'Akkordtyp von Akkord 1' }).click();
      const typePicker = page.locator('.chord-picker-panel');
      await expect(typePicker).toBeVisible();
      await typePicker.getByLabel('Akkordtyp von Akkord 1 durchsuchen').fill('maj9');
      await typePicker.locator('.chord-picker-card').first().click();
      await expect(typePicker).toHaveCount(0);
      await expect(rows.nth(0).locator('.harmony-name')).toHaveText('Fmaj9');

      // The visualisations follow whichever chord is selected, not always the first.
      await rows.nth(0).locator('.harmony-name').click();
      await expect(page.locator('.harmony-board summary')).toContainText('Akkord 1');
      await rows.nth(2).locator('.harmony-name').click();
      await expect(page.locator('.harmony-board summary')).toContainText('Akkord 3');
      await expect(page.locator('.harmony-steps li.is-shown')).toHaveCount(1);
      await expect(page.locator('.harmony-steps li.is-shown .harmony-name')).toHaveText(
        await rows.nth(2).locator('.harmony-name').innerText(),
      );
      const clear = page.getByRole('button', { name: 'Folge leeren' });
      // Throwing the progression away is styled as destructive, not as a neutral action.
      assert.equal(await clear.evaluate((el) => getComputedStyle(el).color), 'rgb(180, 57, 44)');
      await clear.click();
      await expect(rows).toHaveCount(0);
      await expect(page.locator('.harmony-empty')).toBeVisible();
    });
    await check(
      'chords audition, switch on mid-bar and edit without stopping the drummer',
      async () => {
        await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
        await field('Übe-Tempo').fill('90');
        await field('Einzähler in Takten').selectOption('0');
        await button('Schritte löschen').click();
        await page.getByLabel('Globaler Grundton').selectOption({ value: 'F' });
        await chooseProgression(/II–V–I in Dur/);
        await page.getByRole('switch', { name: 'Akkorde mitspielen' }).uncheck();
        await reset();
        await page.getByRole('button', { name: 'Akkord 2 vorhören' }).click();
        await expect(page.locator('.harmony-board summary')).toContainText('C7');
        await expect
          .poll(async () => (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length)
          .toBeGreaterThan(0);
        await button('Groove starten').click();
        await page.waitForTimeout(220);
        await reset();
        await page.getByRole('switch', { name: 'Akkorde mitspielen' }).check();
        // At 90 BPM the next chord boundary is >2s away: a new attack must happen on the next beat.
        await expect
          .poll(
            async () => (await audioEvents(page)).filter((e) => e.kind === 'oscillator').length,
            { timeout: 1200 },
          )
          .toBeGreaterThan(0);
        await page.locator('.harmony-steps li').first().locator('select').first().selectOption('E');
        await expect(button('Stopp')).toBeVisible();
        await page
          .getByRole('group', { name: 'Akkordfolge transponieren' })
          .getByRole('button', { name: '+1 HT' })
          .click();
        await expect(page.locator('.harmony-steps li').first().locator('.harmony-name')).toHaveText(
          'Fm7',
        );
        await expect(button('Stopp')).toBeVisible();
        await stop();
        // The edit lives in this session only: a reload starts from an empty progression.
        await page.reload();
        await expect(page.locator('.harmony-steps li')).toHaveCount(0);
      },
    );
    await check('offbeat comping stays aligned with the audio clock', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      await field('Übe-Tempo').fill('240');
      await field('Einzähler in Takten').selectOption('0');
      await button('Schritte löschen').click();
      await chooseProgression(/II–V–I in Dur/);
      await page.getByRole('button', { name: 'Offbeats' }).click();
      await reset();
      await button('Groove starten').click();
      await page.waitForTimeout(800);
      const starts = [
        ...new Set(
          (await audioEvents(page)).filter((e) => e.kind === 'oscillator').map((e) => e.at),
        ),
      ].sort((a, b) => a - b);
      assert.ok(starts.length >= 2, 'offbeat chords should sound between beats');
      for (let i = 1; i < starts.length; i++)
        assert.ok(
          Math.abs(starts[i] - starts[i - 1] - 0.25) < 0.003,
          'offbeat cadence remains one quarter note',
        );
      await stop();
    });
    await check(
      'the searchable progression picker stays compact and transposes its choice',
      async () => {
        await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
        await page.getByLabel('Globaler Grundton').selectOption('C');
        const picker = page.locator('.harmony-preset-picker');
        await expect(picker).not.toHaveAttribute('open');
        await picker.locator('summary').click();
        await field('Akkordfolgen durchsuchen').fill('Neo-Soul');
        await expect(picker.locator('.harmony-preset-group button')).toHaveCount(1);
        await expect(picker.locator('.harmony-preset-group h3')).toHaveText('R&B');
        await picker.getByRole('button', { name: /Neo-Soul/ }).click();
        await expect(picker).not.toHaveAttribute('open');
        await expect(page.locator('.harmony-steps li')).toHaveCount(4);
        await expect(page.locator('.harmony-steps li').first().locator('.harmony-name')).toHaveText(
          'Cmaj9',
        );
        await expect(page.locator('.harmony-steps li').last().locator('.harmony-name')).toHaveText(
          'Fm9',
        );
      },
    );
    await check('the player view follows chords and pause resumes in the same phrase', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      await page.getByLabel('Globaler Grundton').selectOption('C');
      await field('Übe-Tempo').fill('240');
      await field('Einzähler in Takten').selectOption('0');
      await chooseProgression(/II–V–I in Dur/);
      await reset();
      await button('Groove starten').click();
      const focus = page.getByRole('dialog', { name: 'Mitspielansicht' });
      await expect(focus).toBeVisible();
      await expect(focus.locator('.drum-focus-chord h1')).toHaveText('Dm7');
      await expect(focus.locator('.drum-focus-tone')).toHaveCount(4);
      await expect(focus.locator('.drum-focus-upcoming li')).toHaveCount(2);
      await expect(focus.locator('.drum-focus-upcoming li').first()).toContainText('G7');
      await expect
        .poll(() => focus.locator('.drum-focus-chord h1').textContent(), { timeout: 3500 })
        .toBe('G7');
      await focus.getByRole('button', { name: 'Pause' }).click();
      await expect(focus.locator('.drum-focus-state')).toHaveText('Pausiert');
      const heldChord = await focus.locator('.drum-focus-chord h1').textContent();
      const heldEvents = (await audioEvents(page)).length;
      await page.waitForTimeout(350);
      assert.equal((await audioEvents(page)).length, heldEvents, 'pause schedules no new notes');
      await expect(focus.locator('.drum-focus-chord h1')).toHaveText(heldChord);
      await focus.getByRole('button', { name: 'Fortsetzen' }).click();
      await page.waitForTimeout(160);
      assert.notEqual(
        await focus.locator('.drum-focus-chord h1').textContent(),
        'Dm7',
        'resume must not restart the phrase',
      );
      await expect
        .poll(() => focus.locator('.drum-focus-chord h1').textContent(), { timeout: 1700 })
        .toBe('Cmaj7');
      await focus.getByRole('button', { name: 'Stopp', exact: true }).click();
      await expect(focus).toHaveCount(0);
      await expect(button('Groove starten')).toBeVisible();
      await chooseProgression(/I–vi–ii–V/);
      await button('Groove starten').click();
      await expect(focus).toBeVisible();
      await expect(focus.locator('.drum-focus-upcoming li')).toHaveCount(3);
      await expect(focus.locator('.drum-focus-upcoming li').first()).toContainText('Am7');
      await focus.getByRole('button', { name: 'Stopp' }).click();
      await expect(focus).toHaveCount(0);
      await page.getByRole('button', { name: 'Mitspielansicht öffnen' }).click();
      await expect(focus).toBeVisible();
      await focus.getByRole('button', { name: 'Stopp' }).click();
      await expect(focus).toHaveCount(0);
    });
    await check('the synth and chord editor remain usable at phone width', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      const settings = page.locator('.drum-controls');
      await expect(settings).not.toHaveAttribute('open');
      await expect(page.getByRole('button', { name: 'Drum-Maschine starten' })).toBeVisible();
      await settings.locator('summary').click();
      await expect(settings).toHaveAttribute('open');
      await expect(field('Einzähler in Takten')).toBeVisible();
      await settings.locator('summary').click();
      await expect(settings).not.toHaveAttribute('open');
      const patternSettings = page.locator('.grid-settings');
      await expect(patternSettings).not.toHaveAttribute('open');
      await patternSettings.locator('summary').click();
      await expect(field('Raster')).toBeVisible();
      await patternSettings.locator('summary').click();
      await expect(patternSettings).not.toHaveAttribute('open');
      await page.getByRole('link', { name: 'Akkorde', exact: true }).click();
      await expect(page).toHaveURL(/#drum-harmony$/);
      await expect
        .poll(async () => {
          const top = await page
            .locator('#drum-harmony')
            .evaluate((el) => el.getBoundingClientRect().top);
          return top >= 150 && top < 400;
        })
        .toBe(true);
      await expect(page.locator('.drum-jumps')).toBeInViewport();
      const drawers = page.locator('.drum-drawer');
      await expect(drawers).toHaveCount(3);
      for (let i = 0; i < 3; i++) await expect(drawers.nth(i)).toHaveAttribute('open');
      await drawers.nth(0).locator('summary').click();
      await expect(drawers.nth(0)).not.toHaveAttribute('open');
      await expect(drawers.nth(1)).toHaveAttribute('open');
      await drawers.nth(0).locator('summary').click();
      const inspector = page.locator('.inspector-section');
      await expect(inspector).toHaveCount(3);
      for (let i = 0; i < 3; i++) await expect(inspector.nth(i)).toHaveAttribute('open');
      await inspector.nth(2).locator('summary').click();
      await expect(inspector.nth(2)).not.toHaveAttribute('open');
      await inspector.nth(2).locator('summary').click();
      await expect(
        page.getByText('Takt, Unterteilung und Swing – was das Raster bedeutet'),
      ).toHaveCount(0);
      await chooseProgression(/II–V–I in Dur/);
      await expect(page.getByRole('button', { name: 'Akkord 2 vorhören' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Offbeats' })).toBeVisible();
      await expect(page.getByRole('slider', { name: 'Kick FM Stärke' })).toBeVisible();
      const fit = await page.evaluate(() => {
        const elements = ['.synth-panel', '.harmony-panel', '.harmony-steps li'];
        return elements.map((selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return { selector, left: rect.left, right: rect.right };
        });
      });
      fit.forEach(({ selector, left, right }) =>
        assert.ok(left >= -1 && right <= 391, `${selector} clips on a phone: ${left}…${right}`),
      );
      assert.equal(
        await page
          .getByRole('slider', { name: 'Kick FM Stärke' })
          .evaluate((el) => getComputedStyle(el).touchAction),
        'none',
      );
      await page.getByRole('button', { name: 'Akkord 2 vorhören' }).click();
      await expect(page.locator('.harmony-board summary')).toContainText('7');
      await page.getByRole('button', { name: 'Mitspielansicht öffnen' }).click();
      const focus = page.getByRole('dialog', { name: 'Mitspielansicht' });
      await expect(focus).toBeVisible();
      const focusWidth = await focus.evaluate((el) => el.scrollWidth);
      assert.ok(focusWidth <= 390, `the player view overflows by ${focusWidth - 390}px`);
      await expect(focus.getByRole('button', { name: 'Groove starten' })).toBeVisible();
      await focus.getByRole('button', { name: 'Stopp' }).click();
      await expect(focus).toHaveCount(0);
      await page.getByRole('button', { name: 'Drum-Maschine starten' }).click();
      await expect(focus).toBeVisible();
      await focus.getByRole('button', { name: 'Stopp' }).click();
      await expect(focus).toHaveCount(0);
      await page.setViewportSize({ width: 1440, height: 900 });
    });
    await check('chords overlap at the bar line instead of dropping to silence', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      await field('Übe-Tempo').fill('150');
      await field('Einzähler in Takten').selectOption('0');
      // With no drum steps every oscillator that sounds belongs to the chord pad.
      await button('Schritte löschen').click();
      await chooseProgression(/II–V–I in Dur/);
      // Only the held pad has to join up; stabs are separate hits by design.
      await button('Fläche').click();
      await reset();
      await button('Groove starten').click();
      await expect
        .poll(async () => new Set((await audioEvents(page)).map((event) => event.at)).size)
        .toBeGreaterThanOrEqual(3);
      await stop();
      const events = (await audioEvents(page)).filter((event) => event.kind === 'oscillator');
      const onsets = [...new Set(events.map((event) => event.at))].sort((a, b) => a - b);
      assert.ok(onsets.length >= 3, 'the progression did not reach a third chord');
      for (let i = 1; i < onsets.length; i++) {
        const previous = events.filter((event) => event.at === onsets[i - 1]);
        const ringing = Math.max(...previous.map((event) => event.stop ?? 0));
        // The release has to run past the next chord's attack; fading out before it
        // left the audible gap at every change.
        assert.ok(
          ringing > onsets[i],
          `chord at ${onsets[i - 1].toFixed(3)} stopped at ${ringing.toFixed(3)}, ` +
            `before the next began at ${onsets[i].toFixed(3)}`,
        );
      }
    });
    await check('the floating chord picker fits a phone screen', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      await chooseProgression(/II–V–I in Dur/);
      await page.getByRole('button', { name: 'Akkordtyp von Akkord 1' }).click();
      const panel = page.locator('.chord-picker-panel');
      await expect(panel).toBeVisible();
      const box = await panel.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 390, 'the picker hangs off the screen');
      assert.ok(box.y >= 0 && box.y + box.height <= 844, 'the picker hangs off the screen');
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      // Escape closes it and returns focus to the control that opened it.
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Akkordtyp von Akkord 1' })).toBeFocused();
      await page.setViewportSize({ width: 1440, height: 900 });
    });
    await check('the tempo trainer raises the tempo and stops at its target', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      await field('Übe-Tempo').fill('100');
      await field('Einzähler in Takten').selectOption('0');
      await field('Pattern-Länge').selectOption('1');
      await page.getByRole('switch', { name: 'Tempo-Trainer' }).check();
      await field('Tempo-Schritt in BPM').selectOption('10');
      await field('Takte je Tempo-Schritt').selectOption('1');
      await field('Ziel-Tempo in BPM').fill('120');
      await field('Übe-Tempo').fill('100');
      await button('Groove starten').click();
      // Three bars is enough to reach the target, and it must not run past it.
      await expect.poll(() => field('Tempo in BPM').inputValue()).toBe('110');
      await expect.poll(() => field('Tempo in BPM').inputValue()).toBe('120');
      await page.waitForTimeout(1500);
      await expect(field('Tempo in BPM')).toHaveValue('120');
      await stop();
      // Switching it off leaves the tempo where it got to.
      await page.getByRole('switch', { name: 'Tempo-Trainer' }).uncheck();
      await expect(field('Tempo in BPM')).toHaveValue('120');
    });
    await check('the progression also reads as a grid of bars', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      await chooseProgression(/II–V–I in Dur/);
      // One cell per bar: Dm7 | G7 | Cmaj7 Cmaj7 is four bars, not three chords.
      const cells = page.locator('.harmony-grid li');
      await expect(cells).toHaveCount(4);
      await expect(cells.nth(0)).toContainText('m7');
      await expect(cells.nth(2)).toContainText('maj7');
      // A held chord repeats rather than being named again.
      await expect(cells.nth(3).locator('strong')).toHaveText('％');
      await expect(cells.nth(3)).not.toHaveClass(/is-start/);
      // Clicking a bar selects that chord for the fretboard and keyboard.
      await cells.nth(0).getByRole('button').click();
      await expect(page.locator('.harmony-board summary')).toContainText('Akkord 1');
      await cells.nth(3).getByRole('button').click();
      await expect(page.locator('.harmony-board summary')).toContainText('Akkord 3');
      await expect(page.locator('.harmony-grid li.is-shown')).toHaveCount(2);
      // The bar that is sounding lights up while the transport runs.
      await button('Groove starten').click();
      await expect(page.locator('.harmony-grid li.is-current')).not.toHaveCount(0);
      await stop();
    });
    await check('opening an exercise sets its own tempo, groove and no trainer', async () => {
      // Client-side navigation throughout: a full page load starts the session over,
      // since the app writes nothing to the browser.
      const toDrums = () =>
        page
          .getByRole('navigation', { name: 'Hauptbereiche' })
          .getByRole('link', { name: 'DRUM-MASCHINE', exact: true })
          .click();
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      await page.getByRole('switch', { name: 'Tempo-Trainer' }).check();
      await field('Übe-Tempo').fill('177');
      await expect(field('Tempo in BPM')).toHaveValue('177');
      await page
        .getByRole('navigation', { name: 'Hauptbereiche' })
        .getByRole('link', { name: 'BASS', exact: true })
        .click();
      await page.getByRole('link', { name: 'Übungsbibliothek' }).first().click();
      await page.locator('a[href="/exercises/basics/5"]').first().click();
      await expect(field('Tempo in BPM')).toHaveValue('55');
      await toDrums();
      // Opening an exercise must not touch the pattern you are building here.
      await expect(field('Pattern-Name')).toHaveValue('Gerader Pocket');
      await expect(page.locator('.drum-edit-banner')).toHaveCount(0);
      // The trainer must never creep the tempo while the notes are still new.
      await expect(page.getByRole('switch', { name: 'Tempo-Trainer' })).not.toBeChecked();
    });
    await check('the example locks onto the click and follows the app tempo', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/exercises/basics/2');
      // Timer, accompaniment, example and tempo sit together in one bar at the top.
      assert.equal(
        await page.evaluate(() => {
          const kids = [...document.querySelector('main').children];
          return kids.findIndex((el) => el.classList.contains('practice-bar'));
        }),
        1,
      );
      assert.deepEqual(
        await page
          .locator('.practice-bar > * > .eyebrow, .practice-bar .eyebrow')
          .first()
          .innerText(),
        '5-MINUTEN-BLOCK',
      );
      // The goal sentence is no longer shown up front; it only lives in the disclosure.
      await expect(page.locator('.exercise-goal')).toHaveCount(0);
      await expect(page.locator('.exercise-task > .konzept')).toHaveCount(1);
      const bpm = Number(await field('Tempo in BPM').inputValue());
      await button('Metronom').click();
      await page.waitForTimeout(1600);
      await reset();
      await page.locator('.playback button').first().click();
      await page.waitForTimeout(2600);
      const heard = (await audioEvents(page)).filter((e) => e.kind === 'oscillator' && e.stop);
      // Clicks decay in about 39 ms; the example's notes hold most of a beat.
      const clicks = heard
        .filter((e) => e.stop - e.at < 0.1)
        .map((e) => e.at)
        .sort((a, b) => a - b);
      const notes = heard
        .filter((e) => e.stop - e.at > 0.3)
        .map((e) => e.at)
        .sort((a, b) => a - b);
      assert.ok(clicks.length >= 2 && notes.length >= 4, `heard ${clicks.length}/${notes.length}`);
      const beat = 60 / bpm;
      const offGrid = (time) => {
        const step = Math.round((time - clicks[0]) / beat);
        return Math.abs(time - (clicks[0] + step * beat));
      };
      // Every note of the example lands on the click's own grid.
      const worst = Math.max(...notes.map(offGrid));
      assert.ok(worst < 0.01, `the example is ${worst.toFixed(3)}s off the click`);
      // And its own spacing is the app's beat, so it follows the tempo.
      notes.slice(1).forEach((time, index) => {
        assert.ok(
          Math.abs(time - notes[index] - beat) < 0.01,
          `note spacing ${(time - notes[index]).toFixed(3)}s should be ${beat.toFixed(3)}s`,
        );
      });
      await button('Ohne').click();
    });
    await check('an exercise groove is edited apart from your own pattern', async () => {
      const nav = (name) =>
        page
          .getByRole('navigation', { name: 'Hauptbereiche' })
          .getByRole('link', { name, exact: true })
          .click();
      const litPads = () => page.locator('.pad[aria-pressed="true"]').count();
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      // Build something of your own in the drum machine.
      await page
        .locator('.library-cards')
        .getByRole('button', { name: /Reggae One Drop/ })
        .click();
      await expect(field('Pattern-Name')).toHaveValue('Reggae One Drop');
      const mine = await litPads();
      await expect(page.locator('.drum-edit-banner')).toHaveCount(0);

      // Reach an exercise and open its groove for editing.
      await nav('BASS');
      await page.getByRole('link', { name: 'Übungsbibliothek' }).first().click();
      await page.locator('a[href="/exercises/basics/5"]').first().click();
      await page.getByRole('button', { name: 'Groove bearbeiten' }).click();
      const banner = page.locator('.drum-edit-banner');
      await expect(banner).toContainText('B5');
      // The sequencer now shows the exercise's groove, not yours.
      await expect(field('Pattern-Name')).toHaveValue('Gerader Pocket');
      const before = await litPads();
      await page.locator('.track-row').first().locator('.pad').nth(1).click();
      await expect.poll(litPads).toBe(before + 1);

      // From a standalone exercise it goes back to that exercise.
      await expect(banner.getByRole('link')).toHaveText(/Zurück zur Übung/);
      await banner.getByRole('link').click();
      await expect(page.locator('h1')).toContainText('B5');
      await nav('DRUM-MASCHINE');
      await expect(field('Pattern-Name')).toHaveValue('Reggae One Drop');
      await expect.poll(litPads).toBe(mine);
      // The back button exists only in that mode.
      await expect(page.locator('.drum-edit-banner')).toHaveCount(0);
      await expect(page.getByRole('link', { name: /Zurück zu/ })).toHaveCount(0);
    });

    await check('editing a groove from a programme returns to that block', async () => {
      await page.goto(
        (process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/programs/erste-toene',
      );
      await button('Weiter').click();
      await button('Weiter').click();
      await expect(page.locator('.program-current-header')).toContainText('BLOCK 3 VON 6');
      const wasOn = await page.locator('.program-current-header h2').innerText();
      await page.getByRole('button', { name: 'Groove bearbeiten' }).click();
      const banner = page.locator('.drum-edit-banner');
      // It knows it came from a programme, not from the exercise on its own.
      await expect(banner.getByRole('link')).toHaveText(/Zurück zum Programm/);
      await banner.getByRole('link').click();
      await expect(page).toHaveURL(/\/programs\/erste-toene\?block=2$/);
      // And it lands on the block you left, not back at the start of the session.
      await expect(page.locator('.program-current-header')).toContainText('BLOCK 3 VON 6');
      await expect(page.locator('.program-current-header h2')).toHaveText(wasOn);
    });
    await check('the inspector no longer traps the page scroll', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/drums');
      const box = await page.locator('.drum-inspector').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + 100);
      for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 300);
      // Once the inspector reaches its end the wheel has to chain to the page.
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
    });
    await check('Web Audio pulse timing survives a blocked UI without late bursts', async () => {
      await page.getByRole('switch', { name: 'Akkorde mitspielen' }).uncheck();
      await pocket();
      await field('Übe-Tempo').fill('120');
      await field('Einzähler in Takten').selectOption('0');
      await reset();
      await button('Groove starten').click();
      await page.waitForTimeout(1150);
      const times = [...new Set((await audioEvents(page)).map((e) => e.at))].sort((a, b) => a - b);
      assert.ok(times.length >= 4);
      for (let i = 1; i < times.length; i++)
        assert.ok(Math.abs(times[i] - times[i - 1] - 0.25) < 0.002, 'Eighth pulse at120BPM');
      await page.evaluate(() => {
        const until = performance.now() + 700;
        while (performance.now() < until) {
          /* Intentional stall. */
        }
      });
      await page.waitForTimeout(250);
      assert.ok(
        (await audioEvents(page)).every((e) => e.at >= e.clock - 0.005),
        'No backdated audio burst',
      );
      await stop();
      const stopped = await page.evaluate(() => ({
        clock: window.__bassAudioContext.currentTime,
        events: window.__bassAudioProbe,
      }));
      assert.ok(stopped.events.every((e) => e.stop !== null && e.stop <= stopped.clock + 0.03));
      await page.waitForTimeout(200);
      assert.equal((await audioEvents(page)).length, stopped.events.length);
    });
    await check('count-in lasts one bar and transport works after navigation', async () => {
      await field('Übe-Tempo').fill('240');
      await field('Einzähler in Takten').selectOption('1');
      await reset();
      await button('Groove starten').click();
      await page.waitForTimeout(1250);
      const events = await audioEvents(page),
        hat = events.find((e) => e.kind === 'buffer');
      assert.ok(hat && Math.abs(hat.at - events[0].at - 1) < 0.003, 'One4/4bar at240BPM');
      await page
        .getByRole('navigation', { name: 'Hauptbereiche' })
        .getByRole('link', { name: 'MUSIKTHEORIE', exact: true })
        .click();
      await page.locator('.utility-bar .metro-toggle').click();
      await expect(page.locator('.utility-bar .metro-toggle')).toHaveAttribute(
        'aria-label',
        'Metronom starten',
      );
    });
    await check('gap-click omits a full bar and returns on time', async () => {
      await page.goto((process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + '/tools/metronome');
      await field('Übe-Tempo').fill('240');
      await field('Einzähler in Takten').selectOption('0');
      await field('Takte mit Klick').selectOption('1');
      await field('Stille Takte').selectOption('1');
      await field('Lücken-Klick aktivieren').check();
      await reset();
      await button('Klick starten').click();
      await page.waitForTimeout(2300);
      await stop();
      const times = (await audioEvents(page)).map((e) => e.at);
      assert.ok(times.length >= 5);
      assert.ok(
        times.slice(1).some((time, i) => Math.abs(time - times[i] - 1.25) < 0.003),
        'Exactly one silent4/4bar',
      );
    });
  } finally {
    await context.close();
  }
}
