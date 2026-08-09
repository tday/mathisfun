// One-time icon generator: renders the game's OWN hero art into PWA PNGs
// using the game's draw functions in a headless browser (so icons always
// match the in-game style). Commit the outputs in icons/.
//
// Usage: python3 -m http.server 8080 &  then  node tools/gen-icons.mjs
// Needs tools/e2e/node_modules (npm install inside tools/e2e once).

import { chromium } from './e2e/node_modules/playwright-core/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'icons'), { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage();
await page.goto('http://localhost:8080/?scene=gallery', { waitUntil: 'networkidle' });

const icons = await page.evaluate(async () => {
  const { drawHero } = await import('./js/gfx/sprites-units.js');
  const { starPath } = await import('./js/gfx/toybox.js');

  function render(size, { maskable = false } = {}) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    // background: candy-purple sky with a soft hill
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#8fd0ff'); g.addColorStop(0.62, '#dceeff'); g.addColorStop(0.63, '#7ec95f'); g.addColorStop(1, '#5aab60');
    ctx.fillStyle = g;
    if (maskable) { ctx.fillRect(0, 0, size, size); }
    else {
      ctx.beginPath(); ctx.roundRect(0, 0, size, size, size * 0.22); ctx.fill();
    }
    // little stars
    ctx.fillStyle = 'rgba(255,215,80,0.9)';
    for (const [x, y, r] of [[0.2, 0.2, 0.05], [0.82, 0.14, 0.04], [0.14, 0.5, 0.03], [0.85, 0.42, 0.035]]) {
      starPath(ctx, x * size, y * size, r * size);
      ctx.fill();
    }
    // hero, big and centered (safe-zone friendly for maskable)
    const heroScale = (maskable ? 0.62 : 0.78) * size / 100;
    ctx.save();
    ctx.translate(size / 2 - 50 * heroScale, size * (maskable ? 0.86 : 0.94) - 96 * heroScale);
    ctx.scale(heroScale, heroScale);
    drawHero(ctx, 2, {});
    ctx.restore();
    return c.toDataURL('image/png').split(',')[1];
  }

  return {
    'icon-512.png': render(512),
    'icon-192.png': render(192),
    'icon-maskable-512.png': render(512, { maskable: true }),
    'apple-touch-icon.png': render(180, { maskable: true }),
  };
});

for (const [name, b64] of Object.entries(icons)) {
  writeFileSync(join(root, 'icons', name), Buffer.from(b64, 'base64'));
  console.log(`wrote icons/${name}`);
}
await browser.close();
console.log('ICONS DONE');
