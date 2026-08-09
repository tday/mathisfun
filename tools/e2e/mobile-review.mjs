// Captures every screen at phone size for design review.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8099';
const OUT = '/tmp/mmd-mobile';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

const ctx = await b.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3,
});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

const shot = async (name) => { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name); };

// Seed a save so progress-dependent screens have something to show.
await p.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await p.evaluate(() => {
  const s = window.__mmd.game.save;
  s.data.coins = 240; s.data.tokens = 5; s.data.shields = 2;
  s.data.stars.g0w0 = [3, 2, 1, 0, 0, 0, 0, 0, 0, 0];
  s.data.collection = { 'g0w0:blobbie': 2, 'g0w0:shellby': 1 };
  s.data.last = 'g0w0/4';
  s.flush();
});

await p.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await p.waitForTimeout(900); await shot('01-title');

await p.goto(`${BASE}/?debug=1&scene=worldSelect`, { waitUntil: 'networkidle' });
await p.waitForTimeout(700); await shot('02-worlds');

await p.goto(`${BASE}/?debug=1&scene=map&world=g0w0`, { waitUntil: 'networkidle' });
await p.waitForTimeout(700); await shot('03-map');

await p.locator('[aria-label="Shop"]').click(); await p.waitForTimeout(400); await shot('04-shop');
await p.locator('.sheet .btn', { hasText: 'Done' }).click(); await p.waitForTimeout(300);
await p.locator('[aria-label="Capsule machine"]').click(); await p.waitForTimeout(400); await shot('05-gacha');
await p.locator('.sheet .btn').first().click(); await p.waitForTimeout(600); await shot('06-gacha-result');
await p.locator('.sheet .btn', { hasText: 'Done' }).click(); await p.waitForTimeout(300);
await p.locator('[aria-label="My monsters"]').click(); await p.waitForTimeout(400); await shot('07-collection');
await p.locator('.sheet .btn', { hasText: 'Done' }).click(); await p.waitForTimeout(300);

// Gameplay across grade bands.
for (const [w, st, name] of [['g0w0', 2, '08-play-prek'], ['g2w0', 4, '09-play-1st'], ['g6w1', 6, '10-play-5th']]) {
  await p.goto(`${BASE}/?debug=1&scene=play&world=${w}&stage=${st}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1100); await shot(name);
}

// Wrong-answer state.
const q = await p.evaluate(() => window.__mmd.question());
await p.locator('.answers .btn').nth(q.answerIndex === 0 ? 1 : 0).click();
await p.waitForTimeout(500); await shot('11-tryagain');
// Second miss -> answer revealed.
const q2 = await p.evaluate(() => window.__mmd.question());
const others = [0, 1, 2, 3].filter((i) => i !== q2.answerIndex);
await p.locator('.answers .btn').nth(others[1] ?? others[0]).click();
await p.waitForTimeout(500); await shot('12-revealed');

await p.locator('[aria-label="Pause"]').click(); await p.waitForTimeout(400); await shot('13-pause');
await p.locator('.sheet .btn', { hasText: 'Keep playing' }).click(); await p.waitForTimeout(300);

// Boss.
await p.goto(`${BASE}/?debug=1&scene=play&world=g0w0&stage=10`, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
for (let i = 0; i < 120; i++) {
  const st = await p.evaluate(() => window.__mmd.state?.());
  if (!st || st.over) break;
  if (st.boss) { await shot('14-boss'); break; }
  const qq = await p.evaluate(() => window.__mmd.question());
  if (qq) await p.locator('.answers .btn').nth(qq.answerIndex).click({ timeout: 2000 }).catch(() => {});
  await p.waitForTimeout(130);
}

// Results.
await p.goto(`${BASE}/?debug=1&scene=play&world=g0w0&stage=1`, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
for (let i = 0; i < 200; i++) {
  const st = await p.evaluate(() => window.__mmd.state?.());
  if (!st || st.over) break;
  const qq = await p.evaluate(() => window.__mmd.question());
  if (qq) await p.locator('.answers .btn').nth(qq.answerIndex).click({ timeout: 2000 }).catch(() => {});
  await p.waitForTimeout(130);
}
await p.waitForTimeout(2400); await shot('15-results');

await p.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
await p.locator('#panel .btn', { hasText: 'Settings' }).click();
await p.waitForTimeout(400); await shot('16-settings');

await ctx.close();

// Landscape sanity.
const lctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
const lp = await lctx.newPage();
await lp.goto(`${BASE}/?debug=1&scene=play&world=g2w0&stage=3`, { waitUntil: 'networkidle' });
await lp.waitForTimeout(1000);
await lp.screenshot({ path: `${OUT}/17-landscape.png` });
console.log('17-landscape');
await lctx.close();

await b.close();
console.log(errs.length ? `CONSOLE ERRORS: ${errs.slice(0, 4).join(' | ')}` : 'no console errors');
