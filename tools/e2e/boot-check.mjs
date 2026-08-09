// Quick boot check: load key scenes, fail on console errors, screenshot.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});

const errors = [];
async function shoot(name, url, viewport, actions) {
  const ctx = await browser.newContext({ viewport, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (actions) await actions(page);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  await ctx.close();
  console.log(`ok: ${name}`);
}

const base = 'http://localhost:8080';
await shoot('title-desktop', `${base}/?scene=title`, { width: 1280, height: 800 });
await shoot('gallery', `${base}/?scene=gallery`, { width: 1280, height: 800 });
await shoot('worlds', `${base}/?scene=worldSelect`, { width: 1280, height: 800 });
await shoot('map', `${base}/?scene=map&world=g0w0`, { width: 1280, height: 800 });
await shoot('play-intro', `${base}/?scene=play&world=g2w0&stage=3&debug=1`, { width: 1280, height: 800 });
await shoot('play-question', `${base}/?scene=play&world=g0w0&stage=1&debug=1`, { width: 390, height: 844 }, async (page) => {
  await page.mouse.click(195, 300); // start battle
  await page.waitForTimeout(2500);
});

await browser.close();
if (errors.length) {
  console.error('ERRORS:');
  for (const e of [...new Set(errors)]) console.error('  ' + e);
  process.exit(1);
}
console.log('BOOT CHECK PASSED');
