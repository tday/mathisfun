// Full e2e suite for Monster Math Defenders.
// Prereq: python3 -m http.server 8080 from repo root; npm install in tools/e2e.
// Run: node tools/e2e/run.mjs

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});

let failures = 0;
const results = [];
function report(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
  console.log(results[results.length - 1]);
}

async function withPage(name, { viewport = { width: 1280, height: 800 }, seed = null } = {}, fn) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 900 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  if (seed !== null) {
    await page.addInitScript((s) => localStorage.setItem('mif.save', s), seed);
  }
  try {
    await fn(page, errors);
    report(name, errors.length === 0, errors.slice(0, 2).join(' | '));
  } catch (err) {
    await page.screenshot({ path: `${SHOTS}/FAIL-${name.replace(/\W+/g, '-')}.png` }).catch(() => {});
    report(name, false, err.message.slice(0, 200));
  }
  await ctx.close();
}

const sceneName = (page) => page.evaluate(() => window.__mif?.engine.sceneName);

// Click the correct (or an incorrect) answer for the current question.
async function answerCurrent(page, { correct = true } = {}) {
  const q = await page.evaluate(() => window.__mif.question());
  if (!q) return false;
  let idx = q.answerIndex;
  if (!correct) {
    // click the first still-enabled wrong button (a prior miss disables its button)
    const enabled = await page.locator('.qbtn').evaluateAll((els) => els.map((e) => !e.disabled));
    idx = enabled.findIndex((en, i) => en && i !== q.answerIndex);
    if (idx === -1) return false;
  }
  const btn = page.locator('.qbtn').nth(idx);
  if (!(await btn.count())) return false;
  await btn.click({ force: true });
  return true;
}

async function autoplayToResults(page, maxMs = 150000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if ((await sceneName(page)) === 'results') return true;
    const hasQ = await page.evaluate(() => !!window.__mif.question());
    if (hasQ) {
      // handle both normal and revealed states: click the true answer
      await answerCurrent(page, { correct: true });
      await page.waitForTimeout(250);
    } else {
      await page.waitForTimeout(300);
    }
  }
  return false;
}

// ---------------- tests ----------------------------------------------------

// 1. every scene boots clean (console watchdog is inside withPage)
for (const [name, url] of [
  ['boot: title', '/?scene=title&debug=1'],
  ['boot: gallery', '/?scene=gallery&debug=1'],
  ['boot: worldSelect', '/?scene=worldSelect&debug=1'],
  ['boot: map', '/?scene=map&world=g6w1&debug=1'],
]) {
  await withPage(name, {}, async (page) => {
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const blank = await page.evaluate(() => {
      const c = document.getElementById('game');
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(0, 0, Math.min(200, c.width), Math.min(200, c.height)).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
      return sum === 0;
    });
    if (blank) throw new Error('canvas is blank');
  });
}

// 2. autoplay a full early stage to the results screen; save must update
await withPage('gameplay: autoplay g0w0 stage 1 → results', {}, async (page) => {
  await page.goto(`${BASE}/?scene=play&world=g0w0&stage=1&debug=1&fast=4`, { waitUntil: 'networkidle' });
  await page.mouse.click(640, 300); // start battle
  const done = await autoplayToResults(page);
  if (!done) throw new Error('never reached results');
  await page.screenshot({ path: `${SHOTS}/results.png` });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('mif.save')));
  if (!(save.coins > 0)) throw new Error(`no coins earned (${save.coins})`);
  if (!(save.stars.g0w0?.[0] >= 1)) throw new Error('no stars recorded');
  if (!(save.stats.attempts > 0)) throw new Error('attempts not recorded');
  const starEls = await page.locator('.result-star').count();
  if (starEls !== 3) throw new Error('results stars row missing');
});

// 3. upper-grade stage plays too (4-choice questions, harder math)
await withPage('gameplay: autoplay g6w1 stage 4 → results', {}, async (page) => {
  await page.goto(`${BASE}/?scene=play&world=g6w1&stage=4&debug=1&fast=5`, { waitUntil: 'networkidle' });
  await page.mouse.click(640, 300);
  const done = await autoplayToResults(page);
  if (!done) throw new Error('never reached results');
});

// 4. boss stage: HP bar shows, boss dies, results reached
await withPage('gameplay: boss stage g0w0 s10', {}, async (page) => {
  await page.goto(`${BASE}/?scene=play&world=g0w0&stage=10&debug=1&fast=5`, { waitUntil: 'networkidle' });
  await page.mouse.click(640, 300);
  const done = await autoplayToResults(page, 240000);
  if (!done) throw new Error('boss never defeated');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('mif.save')));
  if (!(save.stars.g0w0?.[9] >= 1)) throw new Error('boss stage stars missing');
});

// 5. growth-mindset flow: wrong answer → hint + no heart loss; 2nd wrong → glow reveal
await withPage('gameplay: wrong-answer flow (hint, then glowing reveal)', {}, async (page) => {
  await page.goto(`${BASE}/?scene=play&world=g0w0&stage=1&debug=1`, { waitUntil: 'networkidle' });
  await page.mouse.click(640, 300);
  await page.waitForFunction(() => !!window.__mif.question(), null, { timeout: 20000 });
  const heartsBefore = (await page.evaluate(() => window.__mif.state())).hearts;
  await answerCurrent(page, { correct: false });
  await page.waitForTimeout(300);
  if (!(await page.locator('.qhint').count())) throw new Error('no hint after wrong answer');
  const st = await page.evaluate(() => window.__mif.state());
  if (st.hearts !== heartsBefore) throw new Error('wrong answer cost a heart!');
  if (!(await page.evaluate(() => window.__mif.save.coins > 0))) throw new Error('attempt earned no coins');
  await answerCurrent(page, { correct: false });
  await page.waitForTimeout(300);
  if (!(await page.locator('.qbtn-glow').count())) throw new Error('no glowing reveal after 2 misses');
  await answerCurrent(page, { correct: true }); // tap the glowing correct one
  await page.waitForTimeout(600);
  const q2 = await page.evaluate(() => !!window.__mif.question());
  const enemies = (await page.evaluate(() => window.__mif.state())).enemies;
  if (!q2 && enemies > 0) throw new Error('no new question after reveal tap');
});

// 6. mobile portrait: big buttons, no page scroll
await withPage('mobile portrait 390x844: touch targets + no scroll', { viewport: { width: 390, height: 844 } }, async (page) => {
  await page.goto(`${BASE}/?scene=play&world=g1w1&stage=2&debug=1`, { waitUntil: 'networkidle' });
  await page.mouse.click(195, 260);
  await page.waitForFunction(() => !!window.__mif.question(), null, { timeout: 20000 });
  await page.screenshot({ path: `${SHOTS}/mobile-portrait.png` });
  const boxes = await page.locator('.qbtn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  for (const b of boxes) {
    if (b.height < 44 || b.width < 80) throw new Error(`tap target too small: ${b.width}x${b.height}`);
  }
  const scroll = await page.evaluate(() => ({
    sh: document.documentElement.scrollHeight, ih: window.innerHeight,
    sw: document.documentElement.scrollWidth, iw: window.innerWidth,
  }));
  if (scroll.sh > scroll.ih + 1 || scroll.sw > scroll.iw + 1) throw new Error(`page scrolls: ${JSON.stringify(scroll)}`);
});

// 7. mobile landscape
await withPage('mobile landscape 844x390: layout + touch targets', { viewport: { width: 844, height: 390 } }, async (page) => {
  await page.goto(`${BASE}/?scene=play&world=g4w0&stage=5&debug=1`, { waitUntil: 'networkidle' });
  await page.mouse.click(422, 160);
  await page.waitForFunction(() => !!window.__mif.question(), null, { timeout: 20000 });
  await page.screenshot({ path: `${SHOTS}/mobile-landscape.png` });
  const boxes = await page.locator('.qbtn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  for (const b of boxes) if (b.height < 40) throw new Error(`tap target too small: ${b.height}`);
});

// 8. navigation: title → worlds → map → stage intro
await withPage('navigation: title → worlds → map → play', {}, async (page) => {
  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await page.locator('.title-menu .btn', { hasText: 'Choose World' }).click();
  await page.waitForTimeout(700);
  await page.locator('.world-card').first().click();
  await page.waitForTimeout(700);
  if ((await sceneName(page)) !== 'map') throw new Error('did not reach map');
  await page.locator('.map-node.open').first().click();
  await page.waitForTimeout(700);
  if ((await sceneName(page)) !== 'play') throw new Error('did not reach play');
});

// 9. shop + gacha with seeded coins
const richSave = JSON.stringify({
  v: 1, coins: 500, maxHearts: 3, shields: 0,
  stars: { g0w0: [3, 2, 1, 0, 0, 0, 0, 0, 0, 0] }, best: {}, collection: {},
  stats: { attempts: 50, correct: 30, bestStreak: 4, perSkill: {} },
  settings: { muted: true, music: 0.6, sfx: 0.9 }, last: 'g0w0/3',
});
await withPage('economy: shop buys shield, gacha pull adds figure', { seed: richSave }, async (page) => {
  await page.goto(`${BASE}/?scene=map&world=g0w0&debug=1`, { waitUntil: 'networkidle' });
  await page.locator('.btn-fab[aria-label="Shop"]').click();
  await page.waitForTimeout(300);
  await page.locator('.btn-buy').first().click(); // shield, 20 coins
  await page.waitForTimeout(300);
  let save = await page.evaluate(() => JSON.parse(localStorage.getItem('mif.save')));
  if (save.shields !== 1) throw new Error('shield not bought');
  if (save.coins !== 480) throw new Error(`coins wrong after shield: ${save.coins}`);
  await page.locator('.modal-close').click();
  await page.locator('.btn-fab[aria-label="Capsule machine"]').click();
  await page.waitForTimeout(300);
  await page.locator('.btn-primary', { hasText: 'Open one' }).click();
  await page.waitForTimeout(1400);
  if (!(await page.locator('.gacha-reveal').count())) throw new Error('no gacha reveal');
  save = await page.evaluate(() => JSON.parse(localStorage.getItem('mif.save')));
  if (Object.keys(save.collection).length !== 1) throw new Error('figure not collected');
  await page.screenshot({ path: `${SHOTS}/gacha.png` });
});

// 10. save robustness: corrupt JSON boots clean and recovers
await withPage('save: corrupt localStorage recovers', { seed: '{definitely not json' }, async (page) => {
  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('mif.save')));
  if (save.v !== 1) throw new Error('save not rebuilt');
});

// 11. old-version save migrates
await withPage('save: v0 save migrates forward', { seed: '{"v":0,"coins":77}' }, async (page) => {
  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('mif.save')));
  if (save.v !== 1 || save.coins !== 77) throw new Error(`migration lost data: ${JSON.stringify({ v: save.v, coins: save.coins })}`);
});

// 12. perf: frame time during busy play
await withPage('perf: avg frame < 25ms during battle', {}, async (page) => {
  await page.goto(`${BASE}/?scene=play&world=g6w0&stage=9&debug=1&fast=3`, { waitUntil: 'networkidle' });
  await page.mouse.click(640, 300);
  await page.waitForTimeout(6000); // let enemies fill the path
  const avg = await page.evaluate(() => new Promise((res) => {
    const deltas = [];
    let last = performance.now();
    const tick = (t) => {
      deltas.push(t - last); last = t;
      if (deltas.length < 120) requestAnimationFrame(tick);
      else res(deltas.reduce((a, b) => a + b, 0) / deltas.length);
    };
    requestAnimationFrame(tick);
  }));
  if (avg > 25) throw new Error(`avg frame ${avg.toFixed(1)}ms`);
  console.log(`    (avg frame ${avg.toFixed(1)}ms)`);
});

// 13. offline: service worker caches, page reloads without network
await withPage('pwa: offline reload after first visit (?sw=1)', {}, async (page) => {
  await page.goto(`${BASE}/?sw=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 15000 });
  await page.waitForTimeout(2500); // let runtime caching pick up modules
  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const title = await page.title();
  if (!title.includes('Monster Math')) throw new Error('offline reload failed');
  const blank = await page.evaluate(() => {
    const c = document.getElementById('game');
    if (!c) return true;
    const d = c.getContext('2d').getImageData(0, 0, 100, 100).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += d[i];
    return sum === 0;
  });
  if (blank) throw new Error('offline canvas blank');
  await page.context().setOffline(false);
});

await browser.close();
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
if (failures) { console.error(`${failures} FAILURES`); process.exit(1); }
console.log('E2E SUITE PASSED');
