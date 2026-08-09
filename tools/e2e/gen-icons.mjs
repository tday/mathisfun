// One-time icon generator. Renders the real hero sprite through the game's own
// drawing code in a headless browser, then writes the PNGs that the manifest
// and iOS home screen point at. Run it, commit the output, forget about it.
//
//   python3 -m http.server 8099      # from the repo root
//   node tools/e2e/gen-icons.mjs
//
// Regenerate only if the hero art or brand colours change.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.BASE || 'http://localhost:8099';

const SIZES = [
  { file: 'icons/icon-192.png', size: 192, pad: 0.06 },
  { file: 'icons/icon-512.png', size: 512, pad: 0.06 },
  // Maskable icons get cropped to a circle by Android, so keep art inside ~80%.
  { file: 'icons/icon-512-maskable.png', size: 512, pad: 0.2 },
  { file: 'icons/apple-touch-icon.png', size: 180, pad: 0.08 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
page.on('pageerror', (e) => { throw e; });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

mkdirSync(resolve(ROOT, 'icons'), { recursive: true });

for (const { file, size, pad } of SIZES) {
  const dataUrl = await page.evaluate(async ({ size, pad }) => {
    const { SpriteBank } = await import('/js/gfx/sprite.js');
    const { roundRectPath } = await import('/js/gfx/toybox.js');
    const bank = new SpriteBank(1);

    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');

    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#7b5ce0');
    g.addColorStop(1, '#3d2447');
    ctx.fillStyle = g;
    roundRectPath(ctx, 0, 0, size, size, size * 0.22);
    ctx.fill();

    // Soft glow behind the hero so it reads on dark home screens too.
    const glow = ctx.createRadialGradient(size / 2, size * 0.56, 0, size / 2, size * 0.56, size * 0.5);
    glow.addColorStop(0, 'rgba(255, 214, 90, 0.55)');
    glow.addColorStop(1, 'rgba(255, 214, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    const inner = size * (1 - pad * 2);
    const sprite = bank.hero(6, inner, { cheer: 1 });
    ctx.drawImage(sprite, (size - inner) / 2, size * pad * 0.9, inner, inner);
    return cv.toDataURL('image/png');
  }, { size, pad });

  writeFileSync(resolve(ROOT, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`wrote ${file} (${size}px)`);
}

await browser.close();
