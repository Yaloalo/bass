import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { audioEvents, installAudioProbe } from './qa-audio-probe.mjs';

export async function checkCircle(browser, check, errors) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await installAudioProbe(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const url = (path) => (process.env.BASS_QA_URL || 'http://127.0.0.1:4175') + path;
  const key = (name) => page.getByRole('button', { name: new RegExp(`^${name},`) });
  const hub = () => page.locator('.circle-hub-name').textContent();
  try {
    await check('the circle shows every key with its own signature', async () => {
      await page.goto(url('/quintenzirkel'));
      await expect(page.locator('h1')).toHaveText('Quintenzirkel');
      await expect(page.locator('.nav-chapter.active')).toContainText('MUSIKTHEORIE');
      // Twelve major segments outside, twelve relative minors inside.
      await expect(page.locator('.circle-segment.is-major')).toHaveCount(12);
      await expect(page.locator('.circle-segment.is-minor')).toHaveCount(12);
      // Clockwise really does add a sharp, so the labels must say so.
      for (const [name, signature] of [
        ['C-Dur', 'keine Vorzeichen'],
        ['G-Dur', '1 Kreuz'],
        ['D-Dur', '2 Kreuze'],
        ['F-Dur', '1 Be'],
        ['B-Dur', '2 Be'],
      ]) {
        await expect(key(name)).toHaveAttribute('aria-label', `${name}, ${signature}`);
      }
      // German naming: H is international B, B is international B flat.
      await expect(key('H-Dur')).toHaveAttribute('aria-label', 'H-Dur, 5 Kreuze');
      await expect(key('H-Moll')).toHaveAttribute('aria-label', 'H-Moll, 2 Kreuze');
    });

    await check('choosing a key names its signature, parallel and neighbours', async () => {
      await key('A-Dur').click();
      assert.equal(await hub(), 'A-Dur');
      const facts = page.locator('.circle-facts');
      await expect(facts).toContainText('Fis · Cis · Gis');
      await expect(facts).toContainText('A · H · Cis · D · E · Fis · Gis');
      await expect(facts).toContainText('Fis-Moll – dieselben Vorzeichen');
      await expect(facts).toContainText('D (IV) und E (V)');
      // The neighbours are marked on the figure itself, not only in prose.
      await expect(page.locator('.circle-segment.is-major.subdominant')).toHaveAttribute(
        'aria-label',
        'D-Dur, 2 Kreuze',
      );
      await expect(page.locator('.circle-segment.is-major.dominant')).toHaveAttribute(
        'aria-label',
        'E-Dur, 4 Kreuze',
      );
      await expect(page.locator('.circle-chords')).toContainText('Akkorde in A-Dur');
      await expect(page.locator('.circle-chord').first()).toHaveText('Amaj7');
      await expect(page.locator('.circle-chord').last()).toHaveText('Gism7b5');
    });

    await check('the relative minor and the enharmonic spelling both work', async () => {
      await key('Fis-Moll').click();
      assert.equal(await hub(), 'Fis-Moll');
      // Same signature as its major parallel, stated the other way round.
      await expect(page.locator('.circle-facts')).toContainText('A-Dur – dieselben Vorzeichen');
      await key('Fis-Dur').click();
      assert.equal(await hub(), 'Fis-Dur');
      await expect(page.locator('.circle-facts')).toContainText(
        'Fis · Cis · Gis · Dis · Ais · Eis',
      );
      await page.getByRole('button', { name: /Ges schreiben/ }).click();
      assert.equal(await hub(), 'Ges-Dur');
      await expect(page.locator('.circle-facts')).toContainText('B · Es · As · Des · Ges · Ces');
      // Moving on drops the alternative spelling rather than carrying it along.
      await key('C-Dur').click();
      assert.equal(await hub(), 'C-Dur');
      await expect(page.getByRole('button', { name: /schreiben/ })).toHaveCount(0);
    });

    await check('the circle hands its key to the rest of the app', async () => {
      await key('Es-Dur').click();
      await page.getByRole('button', { name: /Grundton Es übernehmen/ }).click();
      await expect(page.getByLabel('Globaler Grundton')).toHaveValue('Eb');
      await page.getByRole('link', { name: 'Tonleiter ansehen' }).click();
      await expect(page).toHaveURL(/\/scales\/major$/);
      await expect(page.locator('h1')).toContainText('Es');
    });

    await check('the theory article reads as one piece with a tracking chapter list', async () => {
      await page.goto(url('/grundlagen'));
      await expect(page.locator('h1')).toContainText('Woher unsere Töne kommen');
      await expect(page.locator('.nav-chapter.active')).toContainText('MUSIKTHEORIE');
      // Seven chapters plus the sources, each with its own anchor and list entry.
      const links = page.locator('.fundamentals-toc a');
      await expect(links).toHaveCount(8);
      await expect(page.locator('.fundamentals-body > section[id]')).toHaveCount(8);
      const words = (await page.locator('.fundamentals-body').innerText()).split(/\s+/).length;
      assert.ok(words > 1500, `the article is only ${words} words`);
      const heads = await page.locator('.fundamentals-body > section[id] > h2').allInnerTexts();
      assert.deepEqual(
        heads.slice(0, 7).map((head) => head.split(' ')[0]),
        Array.from({ length: 7 }, (_, index) => String(index + 1)),
      );
      assert.ok(heads[7].startsWith('Quellen'));

      const prose = await page.locator('.fundamentals-body').innerText();
      // The overtone material is gone and must stay gone.
      for (const banned of ['Oberton', 'Obertöne', 'Teilton', 'Teiltöne', 'Klangfarbe der']) {
        assert.ok(!prose.includes(banned), `the overtone material came back: ${banned}`);
      }
      // It is prose with experiments in it, not a theorem list.
      for (const banned of ['Satz 1', 'Definition 1', 'Beweis', 'Axiom', 'Kettenbruch'])
        assert.ok(!prose.includes(banned), `the theorem apparatus is back: ${banned}`);
      // The spine: two ratios, a stack, three landmarks, the gap, the fix.
      for (const kept of [
        'Pentatonik',
        'Dur-Tonleiter',
        'Quinte dazu',
        'pythagoreisches Komma',
        'Wolfsquinte',
        'Warum daraus ein fester Faktor wird',
        'q¹² = 2',
        'ganz – ganz – halb – ganz – ganz – ganz – halb',
      ])
        assert.ok(prose.includes(kept), `the article lost: ${kept}`);
      // German note names, and the elementary argument with its real numbers.
      assert.ok(prose.includes('His'));
      assert.ok(prose.includes('C D E F G A H'), 'the seven notes are never spelled out');
      assert.ok(prose.includes('531.441') && prose.includes('524.288'), 'the odd/even numbers');
      // The qualifications that keep the claims honest.
      for (const kept of [
        'nicht überall gleich stark',
        'keine von der Natur vorgeschriebene Zahl',
        'nicht einfach als ungenauere Versionen',
      ])
        assert.ok(prose.includes(kept), `a qualification was dropped: ${kept}`);

      // Seven sources, every one an outward link that opens in its own tab.
      await expect(page.locator('.source-list li')).toHaveCount(7);
      const externals = await page
        .locator('.source-list a')
        .evaluateAll((all) => all.map((link) => [link.getAttribute('href'), link.target]));
      assert.equal(externals.length, 7);
      for (const [href, target] of externals) {
        assert.ok(/^https:\/\//.test(href), `source link is not absolute: ${href}`);
        assert.equal(target, '_blank');
      }
      // The two videos the structure follows are credited.
      assert.ok(externals.some(([href]) => href.includes('nK2jYk37Rlg')));
      assert.ok(externals.some(([href]) => href.includes('EdYzqLgMmgk')));

      // It sends you on to the tools it describes.
      const targets = new Set(
        await page
          .locator('.fundamentals-body a')
          .evaluateAll((all) => all.map((link) => link.getAttribute('href'))),
      );
      for (const path of ['/quintenzirkel', '/scales', '/chords', '/piano'])
        assert.ok(targets.has(path), `the article never links to ${path}`);

      // The chapter list follows the reading position, and clicking jumps.
      await expect(links.first()).toHaveClass(/active/);
      await page.evaluate(() =>
        document.getElementById('kompromiss').scrollIntoView({ block: 'start' }),
      );
      await expect(page.locator('.fundamentals-toc a.active')).toContainText('Lücke verteilen');
      await links.nth(2).click();
      await expect(page).toHaveURL(/#bauen$/);
    });

    await check('every experiment plays what its figure claims', async () => {
      await page.goto(url('/grundlagen'));
      await expect(page.locator('.lab')).toHaveCount(9);
      await expect(page.locator('.lab-transport input[type=range]')).toHaveCount(1);
      await expect(page.getByRole('button', { name: 'Alles stoppen' })).toHaveCount(1);
      for (const id of [
        'schwingung',
        'verhaeltnisse',
        'intervalle',
        'tonleiterbau',
        'quintenluecke',
        'wolfsquinte',
        'schwebung',
        'stimmungen',
        'tonvorrat',
      ])
        await expect(page.locator(`#lab-${id}`)).toHaveCount(1);

      // 1 — the wave redraws, and the time axis stays fixed at 20 ms.
      const wave = page.locator('#lab-schwingung polyline');
      const at220 = await wave.getAttribute('points');
      await page.locator('#lab-schwingung .lab-chips button', { hasText: '880 Hz' }).click();
      const at880 = await wave.getAttribute('points');
      assert.notEqual(at220, at880, 'the waveform ignored the frequency');
      const crossings = (points) => {
        const ys = points.split(' ').map((pair) => Number(pair.split(',')[1]));
        let count = 0;
        for (let i = 1; i < ys.length; i++)
          if (ys[i - 1] - 75 !== 0 && Math.sign(ys[i] - 75) !== Math.sign(ys[i - 1] - 75)) count++;
        return count;
      };
      assert.ok(
        crossings(at880) >= crossings(at220) * 3.5,
        `880 Hz drew ${crossings(at880)} crossings against ${crossings(at220)} at 220 Hz`,
      );
      const amplitude = page.locator('#lab-schwingung input[type=range]').nth(1);
      await amplitude.fill('20');
      const spread = (points) => {
        const ys = points.split(' ').map((pair) => Number(pair.split(',')[1]));
        return Math.max(...ys) - Math.min(...ys);
      };
      assert.ok(
        spread(await wave.getAttribute('points')) < spread(at880) * 0.5,
        'the amplitude was rescaled away',
      );
      await page.locator('#lab-schwingung .lab-reset').click();

      // 2 — both ladders quote the ratio and the hertz difference of each step.
      assert.deepEqual(await page.locator('#lab-verhaeltnisse .lab-stair-mark').allInnerTexts(), [
        '×2 / +110 Hz',
        '×2 / +220 Hz',
        '×2 / +110 Hz',
        '×1,5 / +110 Hz',
      ]);

      // 3 — the repeat length of the combined wave follows the ratio, not the label.
      const ivFacts = page.locator('#lab-intervalle .lab-facts');
      await expect(ivFacts).toContainText('330,0 Hz');
      await expect(ivFacts).toContainText('2 Schwingungen');
      await page.locator('#lab-intervalle select').first().selectOption('octave');
      await expect(ivFacts).toContainText('1 Schwingung');
      await page.locator('#lab-intervalle select').first().selectOption('minor-third');
      await expect(ivFacts).toContainText('5 Schwingungen');
      await expect(ivFacts).toContainText('264,0 Hz');

      // 4 — the scale builder is the spine: 5 notes, 7 notes, 12 notes.
      const octave = page.locator('#lab-tonleiterbau .lab-octave span:not(.lab-octave-end)');
      const facts = page.locator('#lab-tonleiterbau .lab-facts');
      await expect(octave).toHaveCount(2);
      for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Quinte dazu' }).click();
      await expect(octave).toHaveCount(5);
      assert.deepEqual(await octave.allInnerTexts(), ['C', 'D', 'F', 'G', 'A']);
      await expect(facts).toContainText('Pentatonik');
      await expect(facts).toContainText('204 / 294 Cent');
      // Six notes is the lumpy in-between the chapter talks about.
      await page.getByRole('button', { name: 'Quinte dazu' }).click();
      await expect(facts).toContainText('90 / 204 / 294 Cent');
      await expect(page.locator('#lab-tonleiterbau .lab-caption').last()).toContainText(
        'drei verschiedene Schrittgrößen',
      );
      await page.getByRole('button', { name: 'Quinte dazu' }).click();
      await expect(octave).toHaveCount(7);
      assert.deepEqual(await octave.allInnerTexts(), ['C', 'D', 'E', 'F', 'G', 'A', 'H']);
      await expect(facts).toContainText('Dur-Tonleiter');
      await expect(facts).toContainText('90 / 204 Cent');
      await page.locator('#lab-tonleiterbau .lab-chips button', { hasText: '12' }).click();
      await expect(octave).toHaveCount(12);
      await expect(facts).toContainText('90 / 114 Cent');
      // The step bars are drawn to scale and fill exactly one octave.
      const widths = await page
        .locator('#lab-tonleiterbau .lab-gaps span')
        .evaluateAll((all) => all.map((bar) => parseFloat(bar.style.width)));
      assert.equal(widths.length, 12);
      assert.ok(Math.abs(widths.reduce((sum, width) => sum + width, 0) - 100) < 0.01);
      await page.locator('#lab-tonleiterbau .lab-reset').click();
      await expect(octave).toHaveCount(2);

      // 5 — the pure walk misses by the comma; the equal walk closes exactly.
      const walk = page.locator('#lab-quintenluecke .lab-facts');
      await expect(walk).toContainText('261,626 Hz');
      await expect(walk).toContainText('265,195 Hz');
      await expect(walk).toContainText('+23,46 Cent');
      await expect(page.locator('#lab-quintenluecke .lab-caption')).toContainText('His');
      await page.getByRole('button', { name: 'Gleichstufige Quinten' }).click();
      await expect(walk).toContainText('0 Cent');
      await page.getByRole('button', { name: 'Reine Quinten' }).click();
      await page.locator('#lab-quintenluecke input[type=range]').fill('4');
      await expect(
        page.locator('#lab-quintenluecke .lab-circle circle.lab-circle-dot'),
      ).toHaveCount(5);
      await page.locator('#lab-quintenluecke .lab-reset').click();

      // 6 — eleven pure fifths and one wolf, a comma flat.
      const wolfFacts = page.locator('#lab-wolfsquinte .lab-facts');
      await expect(wolfFacts).toContainText('701,96 Cent');
      await expect(wolfFacts).toContainText('678,49 Cent');
      await expect(wolfFacts).toContainText('700,00 Cent');
      await expect(wolfFacts).toContainText('23,46 Cent');
      const circleFifths = page.locator('#lab-wolfsquinte .lab-wolf button');
      await expect(circleFifths).toHaveCount(12);
      await expect(page.locator('#lab-wolfsquinte .lab-wolf button.is-wolf')).toHaveCount(1);
      assert.deepEqual(
        (await circleFifths.allInnerTexts()).map((text) => text.split('\n')[0]),
        [
          'Es → B',
          'B → F',
          'F → C',
          'C → G',
          'G → D',
          'D → A',
          'A → E',
          'E → H',
          'H → Fis',
          'Fis → Cis',
          'Cis → Gis',
          'Gis → Es',
        ],
      );

      // 7 — the beat rate follows the frequency difference.
      const beat = page.locator('#lab-schwebung .lab-facts');
      await expect(beat).toContainText('2,0 pro Sekunde');
      await page.locator('#lab-schwebung .lab-chips button', { hasText: '6 Hz' }).click();
      await expect(beat).toContainText('6,0 pro Sekunde');
      await page.locator('#lab-schwebung .lab-chips button', { hasText: '0 Hz' }).first().click();
      await expect(beat).toContainText('kein Pulsieren');

      // 8 — the near-miss table explains the twelve, and pure differs from equal.
      const nearMiss = page.locator('#kompromiss .table-scroll').first();
      await expect(nearMiss).toContainText('700,00 Cent');
      await expect(nearMiss).toContainText('1,955 Cent');
      await expect(page.locator('#kompromiss tr.highlight td').first()).toHaveText('12');
      const table = page.locator('#lab-stimmungen tbody');
      await expect(table).toContainText('275,00 Hz');
      await expect(table).toContainText('277,18 Hz');
      await expect(table).toContainText('+13,69 Cent');
      await page.getByRole('button', { name: 'Quinte', exact: true }).click();
      await expect(table).toContainText('-1,96 Cent');

      // 9 — the chain builds, sorts and stacks, and the keyboard follows.
      const keys = () => page.locator('#lab-tonvorrat .piano-key.is-selected');
      await expect(keys()).toHaveCount(1);
      for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Quinte weiter' }).click();
      await expect(keys()).toHaveCount(7);
      await page.getByRole('button', { name: 'Zur Tonleiter sortieren' }).click();
      assert.deepEqual(
        (await page.locator('#lab-tonvorrat .lab-scale li small').allInnerTexts()).map((text) =>
          text.toLowerCase(),
        ),
        ['ganz', 'ganz', 'halb', 'ganz', 'ganz', 'ganz', 'halb', ''],
      );
      await page.getByRole('button', { name: 'Dreiklänge' }).click();
      const degrees = page.locator('#lab-tonvorrat .lab-degrees button');
      assert.deepEqual(
        (await degrees.allInnerTexts()).map((text) => text.split('\n')[0]),
        ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Hdim'],
      );
      await degrees.nth(1).click();
      await expect(page.locator('#lab-tonvorrat .lab-caption').last()).toContainText('D – F – A');
      await expect(keys()).toHaveCount(3);
      await page.getByRole('button', { name: 'Zwei Zentren' }).click();
      await expect(page.getByRole('button', { name: /C als Zentrum/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /A als Zentrum/ })).toBeVisible();
    });

    await check('the experiments synthesise the frequencies they print', async () => {
      await page.goto(url('/grundlagen'));
      const tones = async () =>
        (await audioEvents(page))
          .filter((event) => event.kind === 'oscillator')
          .map((event) => Number(event.frequency.toFixed(4)));
      const reset = () =>
        page.evaluate(() => {
          window.__bassAudioProbe.length = 0;
        });
      // Nothing makes a sound before it is asked to.
      assert.equal((await tones()).length, 0);

      // A held tone is retuned, not restarted — otherwise every slider move would click.
      await page.getByRole('button', { name: 'Ton anhören' }).click();
      await expect(page.locator('#lab-schwingung .lab-play')).toContainText('Stopp');
      assert.deepEqual(await tones(), [220]);
      await page.locator('#lab-schwingung .lab-chips button', { hasText: '440 Hz' }).click();
      assert.deepEqual(await tones(), [220], 'the slider restarted the oscillator');

      // "Alles stoppen" has to reset the buttons too, not only silence the output.
      await page.getByRole('button', { name: 'Alles stoppen' }).click();
      await expect(page.locator('#lab-schwingung .lab-play')).toContainText('Ton anhören');

      // The fifth really plays 220 and 330 as two plain sines.
      await reset();
      await page.getByRole('button', { name: 'Zusammen', exact: true }).click();
      assert.deepEqual(
        (await tones()).sort((a, b) => a - b),
        [220, 330],
      );

      // The scale builder sounds the scale it draws: seven fifths folded into one octave
      // above middle C really are the major scale, to the cent.
      await reset();
      await page.locator('#lab-tonleiterbau .lab-chips button', { hasText: '7' }).click();
      await page.getByRole('button', { name: 'Töne der Reihe nach' }).click();
      const played = [...new Set(await tones())].sort((a, b) => a - b);
      const roots = played.filter((frequency) => frequency < 530);
      assert.equal(roots.length, 8, `the scale sounded ${roots.length} notes`);
      assert.ok(Math.abs(roots[0] - 261.6256) < 0.01, `it started on ${roots[0]} Hz`);
      assert.deepEqual(
        roots.map((frequency) => Math.round(1200 * Math.log2(frequency / roots[0]))),
        [0, 204, 408, 498, 702, 906, 1110, 1200],
      );
      await page.getByRole('button', { name: 'Alles stoppen' }).click();

      // Beating is two tones mixed together, not one per channel.
      await reset();
      await page.getByRole('button', { name: 'Beide anhören' }).click();
      assert.deepEqual(await tones(), [220, 222]);
      await page.getByRole('button', { name: 'Alles stoppen' }).click();

      // The fifth walk is folded into one octave; nothing climbs into ultrasound.
      await reset();
      await page.getByRole('button', { name: 'Schrittweise hören' }).click();
      const walk = await tones();
      assert.ok(walk.length > 0);
      assert.ok(Math.max(...walk) < 11000, 'a partial of the walk ran off the top');
      await page.getByRole('button', { name: 'Alles stoppen' }).click();

      // Eleven fifths are exactly 3:2 and the twelfth is a comma flat — measured from
      // the oscillators, not read off the label.
      await reset();
      await page.locator('#lab-wolfsquinte .lab-wolf button').first().click();
      const pureFifth = (await tones()).sort((a, b) => a - b);
      await reset();
      await page.locator('#lab-wolfsquinte .lab-wolf button').last().click();
      const wolf = (await tones()).sort((a, b) => a - b);
      assert.ok(Math.abs(pureFifth[1] / pureFifth[0] - 1.5) < 1e-6);
      const gap =
        1200 * Math.log2(pureFifth[1] / pureFifth[0]) - 1200 * Math.log2(wolf[1] / wolf[0]);
      assert.ok(Math.abs(gap - 23.46) < 0.01, `the wolf is ${gap} cents flat, not a comma`);
      await page.getByRole('button', { name: 'Alles stoppen' }).click();

      // Pure and equal are genuinely different synthesis, not different labels.
      await reset();
      await page.getByRole('button', { name: 'Rein hören' }).click();
      const pure = (await tones()).sort((a, b) => a - b);
      await reset();
      await page.getByRole('button', { name: 'Gleichstufig hören' }).click();
      const equal = (await tones()).sort((a, b) => a - b);
      assert.ok(Math.abs(pure[1] - 275) < 1e-6, `pure third played ${pure[1]}`);
      assert.ok(Math.abs(equal[1] - 277.1826) < 1e-3, `equal third played ${equal[1]}`);

      // The A/B comparison leaves a gap instead of cross-fading two tunings.
      await reset();
      await page.getByRole('button', { name: 'A/B-Vergleich' }).click();
      const blocks = (await audioEvents(page)).filter((event) => event.kind === 'oscillator');
      const starts = [...new Set(blocks.map((event) => Number(event.at.toFixed(3))))].sort(
        (a, b) => a - b,
      );
      assert.equal(starts.length, 2, 'the A/B comparison is not two blocks');
      const firstEnds = Math.max(
        ...blocks
          .filter((event) => Number(event.at.toFixed(3)) === starts[0])
          .map((event) => event.stop),
      );
      assert.ok(starts[1] >= firstEnds, 'the two tunings overlapped');
      await page.getByRole('button', { name: 'Alles stoppen' }).click();

      // Starting one experiment releases the previous one, and leaving the page
      // releases everything.
      await reset();
      await page.getByRole('button', { name: 'Ton anhören' }).click();
      await page.getByRole('button', { name: 'Beide anhören' }).click();
      const open = (await audioEvents(page)).filter(
        (event) => event.kind === 'oscillator' && event.stop === null,
      );
      assert.equal(open.length, 2, 'the first experiment kept sounding');
      await page.goto(url('/quintenzirkel'));
      const leftover = (await audioEvents(page)).filter(
        (event) => event.kind === 'oscillator' && event.stop === null,
      );
      assert.equal(leftover.length, 0, 'sound survived the page change');
    });

    await check('the article and the circle both fit a phone', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        'the article overflows at 390',
      );
      await page.screenshot({ path: '/tmp/bass-qa/article-390.png', fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
    });

    await check('the circle stays usable on a phone in both themes', async () => {
      await page.goto(url('/quintenzirkel'));
      await page.setViewportSize({ width: 390, height: 844 });
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark')
          await page.getByRole('button', { name: 'Dunkelmodus aktivieren' }).click();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        // The whole figure has to fit, not just most of it.
        const box = await page.locator('.circle-svg').boundingBox();
        assert.ok(
          box.width > 280 && Math.abs(box.width - box.height) < 2,
          'the circle is squashed',
        );
        await key('G-Dur').click();
        assert.equal(await hub(), 'G-Dur');
        await page.screenshot({ path: `/tmp/bass-qa/circle-${theme}-390.png`, fullPage: true });
      }
    });
  } finally {
    await context.close();
  }
}
