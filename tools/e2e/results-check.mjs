// The results screen at every shape it has to survive.
//
//   python3 -m http.server 8099
//   node tools/e2e/results-check.mjs      # -> /tmp/mmd-results/*.png
//
// It is the one screen the smoke suite only ever sees in one configuration, and
// it is dense: a canvas stack of plate, stars, banner and hero above a DOM card
// whose height depends on how many things the child earned. Three-star, assisted
// and lost each render differently, and landscape lays out differently again.

import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8099';
const OUT = process.env.SHOTS || '/tmp/mmd-results';
const b = await chromium.launch();
const errs = [];

const CASES = [
  ['3star-portrait', { width: 390, height: 844 }, { won: true, stars: 3, assisted: false }],
  ['3star-desktop', { width: 1280, height: 800 }, { won: true, stars: 3, assisted: false }],
  ['3star-landscape', { width: 844, height: 390 }, { won: true, stars: 3, assisted: false }],
  ['assisted-portrait', { width: 390, height: 844 }, { won: true, stars: 2, assisted: true }],
  ['lost-portrait', { width: 390, height: 844 }, { won: false, stars: 0, assisted: true }],
  ['3star-small', { width: 360, height: 640 }, { won: true, stars: 3, assisted: true }],
];

for (const [name, viewport, over] of CASES) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${name}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(`${name}: ${m.text()}`); });
  await p.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await p.evaluate((o) => window.__mmd.go('results', {
    worldId: 'g0w0', stage: 3, attempts: 24, coins: 235, correct: 24, prevBest: 0,
    bestStreak: 24, tokensEarned: 2, ...o,
  }), over);
  await p.waitForTimeout(2600);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
}
await b.close();
console.log(errs.length ? 'ERRORS: ' + [...new Set(errs)].join('; ') : 'no console errors');
