// Renders a contact sheet of every character for eyeballing art changes.
//   node tools/e2e/art-check.mjs   ->  /tmp/mmd-shots/art-big.png
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8099';
const OUT = process.env.OUT || '/tmp/mmd-shots/art-big.png';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1120 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);

await p.evaluate(async () => {
  const { SpriteBank, drawUnit } = await import('/js/gfx/sprite.js');
  const { MONSTERS } = await import('/js/gfx/sprites-units.js');
  const bank = new SpriteBank(2);
  const W = 1500, H = 1120;

  document.body.innerHTML = '';
  const c = document.createElement('canvas');
  c.width = W * 2; c.height = H * 2;
  c.style.cssText = `width:${W}px;height:${H}px;position:fixed;inset:0`;
  document.body.append(c);
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#d4eeff'); g.addColorStop(1, '#f4fdf6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a3a46';

  const label = (t, x, y, size = 15) => {
    ctx.font = `700 ${size}px system-ui`;
    ctx.fillText(t, x, y);
  };

  // Row 1-2: all nine characters, plain, on a 5-wide grid.
  const keys = Object.keys(MONSTERS);
  const S = 220, COLS = 5, CW = W / COLS;
  keys.forEach((k, i) => {
    const cx = (i % COLS) * CW + CW / 2;
    const cy = Math.floor(i / COLS) * 300 + 265;
    drawUnit(ctx, bank.monster(k, 'meadow', S), cx, cy, S);
    label(MONSTERS[k].name, cx, cy + 26);
  });

  // Row 3: hero tiers, showing the whole progression at a glance.
  for (let t = 0; t < 7; t++) {
    const cx = (t + 0.5) * (W / 7);
    drawUnit(ctx, bank.hero(t, 170), cx, 900, 170);
    label(`Hero tier ${t}`, cx, 922, 13);
  }

  // Row 4: variants that must stay readable.
  const variants = [
    ['blobbie', 'meadow', { armored: true }, 'armored'],
    ['hornlet', 'keep', { elite: true }, 'elite (dusk)'],
    ['flitter', 'snow', { blink: 1 }, 'blinking'],
    ['dragon', 'volcano', { elite: true }, 'boss (volcano)'],
    ['webble', 'cave', {}, 'cave palette'],
    ['shellby', 'beach', { armored: true }, 'armored snail'],
  ];
  variants.forEach(([k, pal, opt, name], i) => {
    const cx = (i + 0.5) * (W / variants.length);
    drawUnit(ctx, bank.monster(k, pal, 160, opt), cx, 1085, 160);
    label(name, cx, 1105, 13);
  });
});

await p.waitForTimeout(400);
await p.screenshot({ path: OUT });
await b.close();
console.log(`wrote ${OUT}`);
