// Contact sheet of every question visual, for a human to look at.
//
//   python3 -m http.server 8099
//   node tools/e2e/visual-check.mjs        # -> /tmp/mmd-qa/visuals.png
//
// The audit can prove a visual spec is well formed and the QA suite can prove
// the canvas is not blank. Neither can tell you a base-ten block picture is
// unreadable at question-card size. This renders one of each at the real size
// the question card gives it, so that judgement can actually be made.

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8099';
const OUT = process.env.SHOTS || '/tmp/mmd-qa';

// One representative spec per kind, sized like a real question would be.
const SPECS = [
  ['countRow · row', { kind: 'countRow', sprite: 'apple', count: 6, arrange: 'row' }],
  ['countRow · scatter', { kind: 'countRow', sprite: 'duck', count: 7, arrange: 'scatter', seed: 3 }],
  ['countRow · dice', { kind: 'countRow', sprite: 'star', count: 5, arrange: 'dice' }],
  ['countRow · grid', { kind: 'countRow', sprite: 'cookie', count: 9, arrange: 'grid' }],
  ['countGroups', { kind: 'countGroups', op: '+', groups: [{ sprite: 'leaf', count: 3 }, { sprite: 'leaf', count: 4 }] }],
  ['compareGroups', { kind: 'compareGroups', left: { sprite: 'fish', count: 3 }, right: { sprite: 'fish', count: 6 } }],
  ['tenFrame', { kind: 'tenFrame', count: 7 }],
  ['tenFrame · two parts', { kind: 'tenFrame', count: 13, first: 8 }],
  ['numeralCard', { kind: 'numeralCard', value: 7 }],
  ['shapeMatch', { kind: 'shapeMatch', shape: 'hexagon', color: '#ffd34e' }],
  ['shape · corners', { kind: 'shape', shape: 'hexagon', corners: true }],
  ['numberTrack', { kind: 'numberTrack', cells: [4, 5, null, 7], dir: 'fwd' }],
  ['numberBond', { kind: 'numberBond', whole: 10, parts: [6, null] }],
  ['numberLine · hop', { kind: 'numberLine', min: 2, max: 14, marks: [{ at: 7, label: '7', color: '#7ec8ff' }], hop: { from: 7, to: 12, label: '+5' } }],
  ['numberLine · make ten', { kind: 'numberLine', min: 6, max: 17, marks: [{ at: 8, label: '8', color: '#7ec8ff' }], hops: [{ from: 8, to: 10, label: '+2', color: '#7ee0b8' }, { from: 10, to: 15, label: '+5' }] }],
  ['baseTen · tens+ones', { kind: 'baseTen', tens: 4, ones: 7 }],
  ['baseTen · hundreds', { kind: 'baseTen', hundreds: 2, tens: 3, ones: 5 }],
  ['lengthUnits', { kind: 'lengthUnits', units: 5, span: 9, color: '#c9a4f0' }],
  ['pictureGraph', { kind: 'pictureGraph', rows: [{ sprite: 'apple', count: 4 }, { sprite: 'duck', count: 7, mark: true }, { sprite: 'shell', count: 2 }] }],
  ['equalGroups', { kind: 'equalGroups', groups: 4, each: 3, sprite: 'balloon' }],
  ['money', { kind: 'money', coins: [25, 10, 10, 5, 1] }],
  ['dotArray', { kind: 'dotArray', rows: 3, cols: 5 }],
  ['dotArray · doubles', { kind: 'dotArray', counts: [6, 7] }],
  ['areaGrid', { kind: 'areaGrid', rows: 4, cols: 6 }],
  ['perimeterShape', { kind: 'perimeterShape', w: 8, h: 5 }],
  ['fractionBar', { kind: 'fractionBar', bars: [{ num: 3, den: 4 }, { num: 2, den: 6 }] }],
  ['fractionCircle', { kind: 'fractionCircle', num: 3, den: 8 }],
  ['fractionLine', { kind: 'fractionLine', den: 4, whole: 2, at: 5 }],
  ['angle', { kind: 'angle', degrees: 135, right: true }],
  ['prism', { kind: 'prism', l: 4, wd: 3, ht: 3 }],
  ['coordGrid', { kind: 'coordGrid', span: 6, point: [4, 2] }],
  ['clock', { kind: 'clock', hour: 3, minute: 40 }],
];

const page = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; background:#6a5c78; font:600 13px ui-rounded, system-ui, sans-serif; color:#fff8ec; }
  .grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:14px; padding:16px; }
  figure { margin:0; background:#fff8ec; border:3px solid #4a3a46; border-radius:14px; overflow:hidden; }
  figcaption { background:#4a3a46; padding:5px 8px; font-size:12px; }
  canvas { display:block; width:100%; height:120px; }
</style>
<div class="grid" id="g"></div>
<script type="module">
  import { drawQuestionVisual } from '/js/gfx/fx.js';
  import { SpriteBank } from '/js/gfx/sprite.js';
  const bank = new SpriteBank();
  const specs = SPECS_JSON;
  const g = document.getElementById('g');
  for (const [label, spec] of specs) {
    const fig = document.createElement('figure');
    const cap = document.createElement('figcaption');
    cap.textContent = label;
    const c = document.createElement('canvas');
    fig.append(c, cap);
    g.append(fig);
    const r = { w: g.clientWidth / 4 - 14, h: 120 };
    const dpr = 2;
    c.width = r.w * dpr; c.height = r.h * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawQuestionVisual(ctx, spec, bank, r.w, r.h);
  }
  window.__ready = true;
</script>`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

// Served from the game's own origin rather than set as page content, so the
// module imports below resolve against the real files instead of about:blank.
await p.route(`${BASE}/__visual-check`, (route) => route.fulfill({
  status: 200,
  contentType: 'text/html; charset=utf-8',
  body: page.replace('SPECS_JSON', JSON.stringify(SPECS)),
}));
await p.goto(`${BASE}/__visual-check`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__ready, null, { timeout: 10000 });
await p.waitForTimeout(400);
mkdirSync(OUT, { recursive: true });
await p.screenshot({ path: `${OUT}/visuals.png`, fullPage: true });

// Report any that came out blank, so an unreadable visual cannot hide in a grid.
const blank = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('figure').forEach((f) => {
    const c = f.querySelector('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let opaque = 0;
    for (let i = 3; i < d.length; i += 4 * 41) if (d[i] > 8) opaque++;
    if (opaque < 6) out.push(f.querySelector('figcaption').textContent);
  });
  return out;
});
await browser.close();

writeFileSync(`${OUT}/visuals.txt`, SPECS.map(([l]) => l).join('\n'));
console.log(`${SPECS.length} visuals rendered -> ${OUT}/visuals.png`);
if (errs.length) { console.log('console errors:', [...new Set(errs)].join('; ')); process.exit(1); }
if (blank.length) { console.log('BLANK:', blank.join(', ')); process.exit(1); }
console.log('none blank.');
