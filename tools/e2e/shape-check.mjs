// Every answer-button shape, rendered at the size a button actually gives it,
// with its edge bleed measured.
//
//   python3 -m http.server 8099
//   node tools/e2e/shape-check.mjs        # -> /tmp/mmd-qa/shapes.png
//
// A shape larger than the box it is centred in fails no other check — it just
// arrives with its top sliced off, which is how a heart answer button shipped
// looking like a diamond. The sheet includes the pre-fix heart so the check
// itself is visibly doing something.

import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8099';
const OUT = process.env.SHOTS || '/tmp/mmd-qa';

const page = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; background:#6a5c78; font:700 12px system-ui; color:#fff8ec; }
  .grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; padding:12px; }
  figure { margin:0; background:#d9f2ff; border:3px solid #4a3a46; border-radius:12px; overflow:hidden; }
  figcaption { background:#4a3a46; padding:4px 6px; font-size:11px; }
  canvas { display:block; margin:0 auto; }
</style>
<div class="grid" id="g"></div>
<script type="module">
  import { drawShapePath } from '/js/gfx/fx.js';
  const SHAPES = ['circle','square','rectangle','triangle','star','heart','diamond','oval','hexagon'];
  const g = document.getElementById('g');
  const S = 96, dpr = 2;
  window.__bleed = {};

  // The heart as it was before the fix, to prove the clipping check fires.
  const oldHeart = (ctx, r) => {
    const s = r * 2;
    ctx.beginPath();
    ctx.moveTo(0, s*0.35);
    ctx.bezierCurveTo(0, s*0.05, -s*0.5, -s*0.12, -s*0.5, -s*0.42);
    ctx.bezierCurveTo(-s*0.5, -s*0.78, -s*0.08, -s*0.8, 0, -s*0.52);
    ctx.bezierCurveTo(s*0.08, -s*0.8, s*0.5, -s*0.78, s*0.5, -s*0.42);
    ctx.bezierCurveTo(s*0.5, -s*0.12, 0, s*0.05, 0, s*0.35);
    ctx.closePath();
  };

  for (const name of [...SHAPES, 'heart (before fix)']) {
    const fig = document.createElement('figure');
    const cap = document.createElement('figcaption');
    cap.textContent = name;
    const c = document.createElement('canvas');
    c.width = S*dpr; c.height = S*dpr; c.style.width = S+'px'; c.style.height = S+'px';
    fig.append(c, cap); g.append(fig);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.translate(S/2, S/2);
    // Same call the answer button makes: radius = 0.4 of the box.
    if (name.startsWith('heart (')) oldHeart(ctx, S*0.4); else drawShapePath(ctx, name, S*0.4);
    ctx.fillStyle = '#ffd34e'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#4a3a46'; ctx.stroke();

    const d = ctx.getImageData(0,0,c.width,c.height);
    const px = (x,y) => d.data[(y*c.width+x)*4+3] > 24;
    let top=0, bottom=0, left=0, right=0;
    for (let x=0;x<c.width;x++){ if(px(x,0)) top++; if(px(x,c.height-1)) bottom++; }
    for (let y=0;y<c.height;y++){ if(px(0,y)) left++; if(px(c.width-1,y)) right++; }
    window.__bleed[name] = {
      top:+(top/c.width).toFixed(3), bottom:+(bottom/c.width).toFixed(3),
      left:+(left/c.height).toFixed(3), right:+(right/c.height).toFixed(3),
    };
  }
  window.__ready = true;
</script>`;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 620, height: 320 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.route(`${BASE}/__shape-check`, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: page }));
await p.goto(`${BASE}/__shape-check`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__ready, null, { timeout: 10000 });
await p.screenshot({ path: `${OUT}/shapes.png`, fullPage: true });
const bleed = await p.evaluate(() => window.__bleed);
await b.close();

let bad = 0;
for (const [name, e] of Object.entries(bleed)) {
  const worst = Object.entries(e).sort((a, c) => c[1] - a[1])[0];
  const clipped = worst[1] > 0.06;
  if (clipped && !name.includes('before fix')) bad++;
  console.log(`${clipped ? 'CLIPPED' : '   ok  '} ${name.padEnd(22)} worst edge: ${worst[0]} ${(worst[1]*100).toFixed(0)}%`);
}
console.log(bad ? `\n${bad} shape(s) still clipped` : '\nevery current shape fits its box');
process.exit(bad ? 1 : 0);
