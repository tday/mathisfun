// Browser smoke tests. Dev-only: never deployed.
//
//   python3 -m http.server 8099          # from the repo root
//   node tools/e2e/run.mjs               # optionally BASE=http://... node ...
//
// Uses whatever Playwright is available (`npx playwright install chromium` once).

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8099';
const SHOTS = process.env.SHOTS || '/tmp/mmd-shots';
const results = [];
let failures = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Fails the run if the page ever logs an error — catches broken module paths. */
function watch(page, label) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${label}: console ${m.text()}`);
  });
  return errors;
}

const canvasNotBlank = (page) => page.evaluate(() => {
  const c = document.getElementById('game');
  const ctx = c.getContext('2d');
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const seen = new Set();
  for (let i = 0; i < data.length; i += 4 * 997) {
    seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    if (seen.size > 8) return true;
  }
  return seen.size > 8;
});

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

  // ---------------------------------------------------------------- desktop
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = watch(page, 'desktop');

  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  check('title boots', await page.locator('#panel .btn').first().isVisible());
  check('title canvas renders', await canvasNotBlank(page));
  await page.screenshot({ path: `${SHOTS}/01-title.png` });

  // Sprite gallery — the art check.
  await page.goto(`${BASE}/?debug=1&scene=gallery`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('gallery renders', await canvasNotBlank(page));
  await page.screenshot({ path: `${SHOTS}/02-gallery.png` });

  // World select.
  await page.goto(`${BASE}/?debug=1&scene=worldSelect`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const cards = await page.locator('.world-card').count();
  check('14 world cards', cards === 14, `found ${cards}`);
  const unlocked = await page.locator('.world-card:not(.locked)').count();
  check('one world open per band', unlocked === 7, `found ${unlocked}`);
  await page.screenshot({ path: `${SHOTS}/03-worlds.png` });

  // Map.
  await page.goto(`${BASE}/?debug=1&scene=map&world=g0w0`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('map renders', await canvasNotBlank(page));
  await page.screenshot({ path: `${SHOTS}/04-map.png` });

  // ------------------------------------------------------- play a whole stage
  await page.goto(`${BASE}/?debug=1&scene=play&world=g2w0&stage=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('play scene shows a question', (await page.locator('.answers .btn').count()) >= 3);
  await page.screenshot({ path: `${SHOTS}/05-play.png` });

  // Deliberately answer wrong once and confirm the gentle path.
  const q0 = await page.evaluate(() => window.__mmd.question());
  const wrongIdx = q0.answerIndex === 0 ? 1 : 0;
  await page.locator('.answers .btn').nth(wrongIdx).click();
  await page.waitForTimeout(300);
  check('wrong answer shows a hint', (await page.locator('.feedback .hint').count()) === 1);
  check('wrong answer keeps hearts', (await page.evaluate(() => window.__mmd.state().hearts)) === 3);
  check('wrong answer still pays coins', (await page.evaluate(() => window.__mmd.state().coinsEarned)) > 0);
  await page.screenshot({ path: `${SHOTS}/06-tryagain.png` });

  // Now play the stage out by always answering correctly.
  let guard = 0;
  while (guard++ < 400) {
    const st = await page.evaluate(() => window.__mmd.state?.());
    if (!st || st.over) break;
    if (await page.locator('#modal:not([hidden])').count()) break;
    const q = await page.evaluate(() => window.__mmd.question());
    if (q) {
      const btn = page.locator('.answers .btn').nth(q.answerIndex);
      if (await btn.count()) await btn.click({ timeout: 2000 }).catch(() => {});
    }
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(2200);
  check('stage reaches results', (await page.evaluate(() => window.__mmd.scene())) === 'results');
  const saved = await page.evaluate(() => window.__mmd.save());
  check('stars recorded', (saved.stars.g2w0?.[0] || 0) >= 1, `stars=${saved.stars.g2w0?.[0]}`);
  check('coins earned and kept', saved.coins > 0, `coins=${saved.coins}`);
  await page.screenshot({ path: `${SHOTS}/07-results.png` });

  // ------------------------------------------------------- boss stage + shops
  await page.goto(`${BASE}/?debug=1&scene=play&world=g4w0&stage=10`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // Fast-forward to the boss by answering everything correctly.
  let bossSeen = false;
  let bossDamaged = false;
  let hpAtSight = null;
  for (let i = 0; i < 300; i++) {
    const st = await page.evaluate(() => window.__mmd.state?.());
    if (!st || st.over) break;
    if (st.boss) {
      if (!bossSeen) { bossSeen = true; hpAtSight = st.bossHp; }
      else if (st.bossHp < hpAtSight) bossDamaged = true;
    }
    const q = await page.evaluate(() => window.__mmd.question());
    if (q) await page.locator('.answers .btn').nth(q.answerIndex).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(140);
    if (bossDamaged) break;
  }
  check('boss stage spawns a boss', bossSeen);
  check('boss takes damage from correct answers', bossDamaged);
  await page.screenshot({ path: `${SHOTS}/09-boss.png` });

  // Give the player coins, then exercise the shop and the capsule machine.
  await page.goto(`${BASE}/?debug=1&scene=map&world=g2w0`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__mmd.game.save.data.coins = 500; window.__mmd.game.save.flush(); });

  await page.locator('[aria-label="Shop"]').click();
  await page.waitForTimeout(300);
  check('shop opens', await page.locator('.shop-item').first().isVisible());
  const coinsBefore = await page.evaluate(() => window.__mmd.save().coins);
  await page.locator('.shop-item .btn').first().click();
  await page.waitForTimeout(250);
  const coinsAfter = await page.evaluate(() => window.__mmd.save().coins);
  check('buying a shield spends coins', coinsAfter < coinsBefore, `${coinsBefore} -> ${coinsAfter}`);
  await page.screenshot({ path: `${SHOTS}/10-shop.png` });
  await page.locator('.sheet .btn', { hasText: 'Done' }).click();
  await page.waitForTimeout(250);

  await page.locator('[aria-label="Capsule machine"]').click();
  await page.waitForTimeout(300);
  await page.locator('.sheet .btn').first().click();
  await page.waitForTimeout(400);
  const collected = await page.evaluate(() => Object.keys(window.__mmd.save().collection).length);
  check('capsule pull yields a figure', collected >= 1, `${collected} figures`);
  await page.screenshot({ path: `${SHOTS}/11-gacha.png` });
  await page.locator('.sheet .btn', { hasText: 'Done' }).click();
  await page.waitForTimeout(250);

  // In-stage shop must un-pause the game when it closes.
  await page.goto(`${BASE}/?debug=1&scene=play&world=g0w0&stage=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.locator('[aria-label="Shop"]').click();
  await page.waitForTimeout(300);
  const pausedNow = await page.evaluate(() => window.__mmd.game.engine.paused);
  await page.locator('.sheet .btn', { hasText: 'Done' }).click();
  await page.waitForTimeout(400);
  const resumed = await page.evaluate(() => !window.__mmd.game.engine.paused);
  check('in-stage shop pauses and resumes', pausedNow && resumed, `paused=${pausedNow} resumed=${resumed}`);

  // Pause dialog must also resume cleanly.
  await page.locator('[aria-label="Pause"]').click();
  await page.waitForTimeout(300);
  await page.locator('.sheet .btn', { hasText: 'Keep playing' }).click();
  await page.waitForTimeout(400);
  check('pause dialog resumes', await page.evaluate(() => !window.__mmd.game.engine.paused));

  await page.goto(`${BASE}/?debug=1&scene=map&world=g2w0`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.locator('[aria-label="Collection"]').click();
  await page.waitForTimeout(350);
  check('collection album lists figures', (await page.locator('.collection figure').count()) > 0);
  await page.screenshot({ path: `${SHOTS}/12-collection.png` });

  check('no desktop console errors', errs.length === 0, errs.slice(0, 3).join(' | '));

  // ----------------------------------------------------------------- mobile
  for (const [label, w, h] of [['portrait', 390, 844], ['landscape', 844, 390]]) {
    const mctx = await browser.newContext({
      viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 3,
    });
    const mp = await mctx.newPage();
    const merrs = watch(mp, label);
    await mp.goto(`${BASE}/?debug=1&scene=play&world=g0w0&stage=1`, { waitUntil: 'networkidle' });
    await mp.waitForTimeout(900);

    const boxes = await mp.locator('.answers .btn').evaluateAll((els) =>
      els.map((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }));
    check(`${label}: answer buttons >= 48px`,
      boxes.length > 0 && boxes.every(([bw, bh]) => bw >= 48 && bh >= 44),
      JSON.stringify(boxes));

    const noScroll = await mp.evaluate(() =>
      document.documentElement.scrollHeight <= window.innerHeight + 2 &&
      document.documentElement.scrollWidth <= window.innerWidth + 2);
    check(`${label}: page does not scroll`, noScroll);
    await mp.screenshot({ path: `${SHOTS}/08-${label}.png` });
    check(`${label}: no console errors`, merrs.length === 0, merrs.slice(0, 2).join(' | '));
    await mctx.close();
  }

  // ------------------------------------------------------- save robustness
  const sctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const sp = await sctx.newPage();
  const serrs = watch(sp, 'save');
  await sp.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await sp.evaluate(() => localStorage.setItem('mmd.save', '{not json at all'));
  await sp.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await sp.waitForTimeout(600);
  check('recovers from corrupt save', (await sp.locator('#panel .btn').count()) > 0);
  await sp.evaluate(() => localStorage.setItem('mmd.save', JSON.stringify({ v: 0, coins: 42 })));
  await sp.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await sp.waitForTimeout(600);
  const migrated = await sp.evaluate(() => window.__mmd.save());
  check('migrates an old save', migrated.v === 1 && migrated.coins === 42, JSON.stringify(migrated).slice(0, 80));
  check('save path: no console errors', serrs.length === 0, serrs.slice(0, 2).join(' | '));
  await sctx.close();

  // ---------------------------------------------------------------- offline
  // Service workers are allowed on localhost, so real offline can be tested.
  const octx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const op = await octx.newPage();
  await op.goto(`${BASE}/?sw=1`, { waitUntil: 'networkidle' });
  await op.waitForTimeout(300);
  const swReady = await op.evaluate(() =>
    navigator.serviceWorker.ready.then(() => true).catch(() => false));
  check('service worker registers', swReady);
  await op.waitForTimeout(2500); // let the precache finish
  await octx.setOffline(true);
  await op.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await op.waitForTimeout(1500);
  check('game still loads offline', (await op.locator('#panel .btn').count()) > 0);
  await op.screenshot({ path: `${SHOTS}/13-offline.png` });
  await octx.setOffline(false);
  await octx.close();

  await browser.close();

  console.log(`\n${results.length - failures}/${results.length} checks passed`);
  console.log(`screenshots: ${SHOTS}`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
