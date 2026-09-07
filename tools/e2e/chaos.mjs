// Chaos testing: what a real child does to this game.
//
//   python3 -m http.server 8099
//   node tools/e2e/chaos.mjs                 # SEED=7 ROUNDS=3 to vary or narrow
//
// The other suites drive the game the way it is meant to be driven: read the
// question, tap the right answer, move on. No four-year-old does that. They mash
// the screen with three fingers, tap during the fade between scenes, open the
// shop and close it forty times, quit mid-stage, and rotate the tablet while a
// monster is walking.
//
// So this suite plays badly on purpose, as a set of personas, and after every
// single action asserts the things that must be true no matter what was tapped:
//
//   - nothing logged an error
//   - hearts, coins and stars stayed inside their legal range
//   - the save is still parseable
//   - no "NaN" or "undefined" reached the screen
//   - there is always something tappable — the game never dead-ends
//
// Everything random is seeded, so a failure reproduces with the same SEED.

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8099';
const SHOTS = process.env.SHOTS || '/tmp/mmd-chaos';
const SEED = Number(process.env.SEED || 1);
const ROUNDS = Number(process.env.ROUNDS || 1);
const ONLY = process.env.PERSONA || null;

const problems = [];
const seen = { actions: 0, invariants: 0 };

function bad(where, msg, detail) {
  const line = `${where}: ${msg}${detail ? ` — ${detail}` : ''}`;
  if (!problems.includes(line)) problems.push(line);
}

/** Seeded RNG, so a chaotic failure is a reproducible one. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

// --------------------------------------------------------------- invariants

/**
 * Everything that has to hold after any action whatsoever. Read in one page
 * evaluate so it is cheap enough to run after every single tap.
 */
const PROBE = () => {
  const out = { ok: true, notes: [] };
  const say = (m) => { out.ok = false; out.notes.push(m); };

  const mmd = window.__mmd;
  if (!mmd) { say('window.__mmd is gone — the module graph broke'); return out; }

  const scene = mmd.scene();
  out.scene = scene;
  if (!['title', 'worldSelect', 'map', 'play', 'results', 'gallery'].includes(scene)) {
    say(`unknown scene "${scene}"`);
  }

  const save = mmd.save();
  out.coins = save.coins;
  if (!(save.coins >= 0) || !Number.isFinite(save.coins)) say(`coins is ${save.coins}`);
  if (!(save.tokens >= 0) || !Number.isFinite(save.tokens)) say(`tokens is ${save.tokens}`);
  if (!(save.maxHearts >= 3 && save.maxHearts <= 5)) say(`maxHearts is ${save.maxHearts}`);
  if (!(save.shields >= 0)) say(`shields is ${save.shields}`);
  for (const [id, arr] of Object.entries(save.stars || {})) {
    if (!Array.isArray(arr)) { say(`stars[${id}] is not an array`); continue; }
    for (const s of arr) if (s != null && !(s >= 0 && s <= 3)) say(`stars[${id}] has ${s}`);
  }
  try {
    const raw = localStorage.getItem('mmd.save');
    if (raw) { JSON.parse(raw); if (raw.length > 10240) say(`save blob is ${raw.length} bytes`); }
  } catch (e) { say(`save blob will not parse: ${e.message}`); }

  const st = mmd.state?.();
  if (scene === 'play' && st) {
    out.hearts = st.hearts;
    if (!(st.hearts >= 0 && st.hearts <= st.maxHearts)) say(`hearts ${st.hearts}/${st.maxHearts}`);
    if (!(st.coinsEarned >= 0)) say(`coinsEarned is ${st.coinsEarned}`);
    if (!(st.attempts >= 0) || !(st.correctCount >= 0)) say('negative attempt/correct counter');
    if (st.correctCount > st.attempts) say(`correct ${st.correctCount} > attempts ${st.attempts}`);
  }

  // Nothing broken should ever reach a child's eyes.
  const text = document.getElementById('ui')?.innerText || '';
  const leak = text.match(/NaN|undefined|\[object Object\]|Infinity/);
  if (leak) say(`"${leak[0]}" is on screen`);

  // There must always be something to tap. A screen with no live control is a
  // dead end a child cannot get out of without an adult reloading the page.
  const live = [...document.querySelectorAll('button')].filter((b) => {
    if (b.disabled || b.getAttribute('aria-disabled') === 'true') return false;
    // A modal makes everything behind it inert; those controls are switched
    // off, not merely covered, so they are not part of "what is reachable".
    if (b.closest('[inert]')) return false;
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && b.offsetParent !== null;
  });
  out.live = live.length;
  if (live.length === 0) say('no tappable control anywhere on screen');

  // Every control a child can reach has to be reachable *by a child*: big
  // enough to hit, and named for a screen reader.
  for (const b of live) {
    const r = b.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) {
      say(`control ${r.width.toFixed(0)}x${r.height.toFixed(0)} is too small to tap`);
      break;
    }
    const name = (b.getAttribute('aria-label') || b.innerText || '').trim();
    if (!name) { say('a control has no accessible name'); break; }
  }

  // Two controls on top of each other means one of them cannot be tapped, and
  // the child has no way to know which. Shadows overlap by a pixel or two, so
  // only a real intersection counts.
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i].getBoundingClientRect();
      const b = live[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 6 && oy > 6) {
        say(`two controls overlap by ${ox.toFixed(0)}x${oy.toFixed(0)}px`
          + ` ("${(live[i].innerText || live[i].getAttribute('aria-label') || '?').trim().slice(0, 18)}"`
          + ` / "${(live[j].innerText || live[j].getAttribute('aria-label') || '?').trim().slice(0, 18)}")`);
        i = live.length;
        break;
      }
    }
  }

  // Text that does not fit its box. This is the class of bug that produced a
  // clipped heart and a title running off the screen: nothing throws, it just
  // silently arrives cut in half.
  const leaves = [...document.querySelectorAll('#ui *')].filter(
    (e) => e.children.length === 0 && (e.innerText || '').trim().length > 0,
  );
  for (const e of leaves) {
    if (e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0) {
      say(`text is cut off: "${e.innerText.trim().slice(0, 28)}" needs`
        + ` ${e.scrollWidth}px in ${e.clientWidth}px`);
      break;
    }
  }

  // Nothing may stick out of the viewport: the game locks scrolling, so
  // anything past the edge is simply unreachable.
  for (const e of [...document.querySelectorAll('#ui *')]) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.left < -2 || r.right > window.innerWidth + 2) {
      say(`"${(e.className || e.tagName)}" runs off the side`
        + ` (${r.left.toFixed(0)}..${r.right.toFixed(0)} of ${window.innerWidth})`);
      break;
    }
  }
  return out;
};

async function check(page, where) {
  seen.invariants++;
  const r = await page.evaluate(PROBE).catch((e) => ({ ok: false, notes: [`probe threw: ${e.message}`] }));
  if (!r.ok) for (const n of r.notes) bad(where, n);
  return r;
}

// ------------------------------------------------------------------ personas

/**
 * Each persona is a policy for "what do I tap next". They are deliberately
 * unreasonable; the point is that none of them can break anything.
 */
const PERSONAS = {
  /** A toddler with the tablet, mashing wherever. Does not look at the screen. */
  async masher(page, r, view) {
    for (let i = 0; i < 40; i++) {
      const x = int(r, 2, view.width - 2);
      const y = int(r, 2, view.height - 2);
      await page.mouse.click(x, y, { delay: int(r, 0, 12) }).catch(() => {});
      // Sometimes a second finger lands at the same moment.
      if (r() < 0.25) {
        await page.touchscreen.tap(int(r, 2, view.width - 2), int(r, 2, view.height - 2)).catch(() => {});
      }
      seen.actions++;
      if (i % 5 === 4) await check(page, 'masher');
    }
  },

  /** Taps the first answer every time, right or wrong. Never thinks. */
  async guesser(page, r, view) {
    for (let i = 0; i < 25; i++) {
      const btn = page.locator('.answers .btn:not(.wrong)').first();
      if (await btn.count()) await btn.click({ timeout: 1500 }).catch(() => {});
      else await page.locator('button:visible').first().click({ timeout: 1500 }).catch(() => {});
      seen.actions++;
      await page.waitForTimeout(int(r, 60, 260));
      if (i % 4 === 3) await check(page, 'guesser');
    }
  },

  /** Gets it wrong twice on purpose, then takes the revealed answer. */
  async struggler(page, r, view) {
    for (let i = 0; i < 18; i++) {
      const q = await page.evaluate(() => window.__mmd.question?.()).catch(() => null);
      const btns = page.locator('.answers .btn');
      const n = await btns.count();
      if (!q || n < 2) {
        await page.locator('button:visible').first().click({ timeout: 1500 }).catch(() => {});
      } else {
        for (let k = 0; k < n; k++) {
          if (k !== q.answerIndex) await btns.nth(k).click({ timeout: 1500 }).catch(() => {});
          await page.waitForTimeout(140);
        }
        await btns.nth(q.answerIndex).click({ timeout: 1500 }).catch(() => {});
      }
      seen.actions++;
      await page.waitForTimeout(int(r, 200, 500));
      if (i % 3 === 2) await check(page, 'struggler');
    }
  },

  /** Opens and closes every dialog, over and over, mid-stage. */
  async wanderer(page, r, view) {
    const opens = ['Shop', 'Pause', 'Capsule machine', 'My monsters', 'Settings'];
    for (let i = 0; i < 22; i++) {
      const label = pick(r, opens);
      const opener = page.locator(`[aria-label="${label}"]`).first();
      if (await opener.count()) {
        await opener.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(int(r, 80, 260));
        // Close it however comes to hand — or just tap elsewhere and leave it.
        const close = page.locator('.sheet button, #modal button').last();
        if (r() < 0.75 && await close.count()) await close.click({ timeout: 1500 }).catch(() => {});
        else await page.mouse.click(int(r, 4, view.width - 4), int(r, 4, view.height - 4)).catch(() => {});
      } else {
        await page.locator('button:visible').first().click({ timeout: 1500 }).catch(() => {});
      }
      seen.actions++;
      await page.waitForTimeout(int(r, 60, 200));
      if (i % 3 === 2) await check(page, 'wanderer');
    }
  },

  /** Bails out of a stage and restarts it, again and again. */
  async quitter(page, r, view) {
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.__mmd.go('play', { worldId: 'g1w1', stage: 3 })).catch(() => {});
      await page.waitForTimeout(int(r, 120, 700));
      // Sometimes quit mid-transition, which is the interesting case.
      const pause = page.locator('[aria-label="Pause"]').first();
      if (await pause.count()) {
        await pause.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(120);
        const quit = page.locator('.sheet button, #modal button').filter({ hasText: /map|quit|leave/i }).first();
        if (await quit.count()) await quit.click({ timeout: 1500 }).catch(() => {});
      }
      seen.actions++;
      await page.waitForTimeout(int(r, 100, 400));
      await check(page, 'quitter');
    }
  },

  /** Answers correctly but very slowly, letting monsters reach the gate. */
  async dawdler(page, r, view) {
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(int(r, 1200, 2600));
      const q = await page.evaluate(() => window.__mmd.question?.()).catch(() => null);
      if (q) {
        await page.locator('.answers .btn').nth(q.answerIndex).click({ timeout: 1500 }).catch(() => {});
      } else {
        await page.locator('button:visible').first().click({ timeout: 1500 }).catch(() => {});
      }
      seen.actions++;
      await check(page, 'dawdler');
    }
  },
};

// -------------------------------------------------------------------- chaos

/** Things that happen to a tablet, rather than things a child taps. */
const EVENTS = {
  async reload(page) {
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  },
  async rotate(page, r, view) {
    const flipped = { width: view.height, height: view.width };
    await page.setViewportSize(flipped);
    await page.waitForTimeout(320);
    await page.setViewportSize(view);
    await page.waitForTimeout(320);
  },
  async background(page) {
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(320);
  },
  async sceneStorm(page, r) {
    // Jump between scenes faster than the cross-fade can finish.
    const hops = [
      ['title', {}], ['worldSelect', {}], ['map', { worldId: 'g0w0' }],
      ['play', { worldId: 'g0w0', stage: 1 }], ['gallery', {}],
    ];
    for (let i = 0; i < 6; i++) {
      const [name, params] = pick(r, hops);
      await page.evaluate(([n, p]) => window.__mmd.go(n, p), [name, params]).catch(() => {});
      await page.waitForTimeout(int(r, 20, 180));
    }
    await page.waitForTimeout(600);
  },
  async doubleTap(page, r) {
    const b = page.locator('button:visible').first();
    if (await b.count()) {
      for (let i = 0; i < 4; i++) await b.click({ timeout: 1200, delay: 5 }).catch(() => {});
    }
    await page.waitForTimeout(300);
  },
};

// --------------------------------------------------------------------- main

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const view = { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: view, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const names = ONLY ? [ONLY] : Object.keys(PERSONAS);
  const eventNames = Object.keys(EVENTS);

  for (let round = 0; round < ROUNDS; round++) {
    for (const name of names) {
      const r = rng(SEED * 1000 + round * 97 + name.length);
      // Start each persona somewhere a child plausibly is.
      const start = pick(r, [
        ['title', {}],
        ['map', { worldId: 'g0w0' }],
        ['play', { worldId: 'g0w0', stage: 2 }],
        ['play', { worldId: 'g2w0', stage: 5 }],
        ['play', { worldId: 'g5w1', stage: 8 }],
      ]);
      await page.evaluate(([n, p]) => window.__mmd.go(n, p), start).catch(() => {});
      await page.waitForTimeout(500);

      await PERSONAS[name](page, r, view).catch((e) => bad(name, 'persona threw', e.message));
      await check(page, `${name}/after`);

      const ev = pick(r, eventNames);
      await EVENTS[ev](page, r, view).catch((e) => bad(ev, 'event threw', e.message));
      await check(page, `${name}/after-${ev}`);

      // Whatever happened, a child must be able to get back to playing.
      const recovered = await page.evaluate(() => {
        try { window.__mmd.go('title'); return true; } catch { return false; }
      }).catch(() => false);
      if (!recovered) bad(name, 'could not get back to the title screen');
      await page.waitForTimeout(450);
      await check(page, `${name}/recovered`);
      process.stdout.write(`  ${name} + ${ev} — ${seen.actions} actions, ${problems.length} problem(s)\n`);
    }
  }

  await page.screenshot({ path: `${SHOTS}/chaos-end.png` }).catch(() => {});
  await browser.close();

  for (const e of [...new Set(errors)].slice(0, 25)) bad('runtime', e);

  console.log(`\n${seen.actions} chaotic actions, ${seen.invariants} invariant checks.`);
  if (problems.length) {
    console.log(`\n${problems.length} PROBLEM(S):`);
    for (const p of problems.slice(0, 40)) console.log(`  - ${p}`);
    if (problems.length > 40) console.log(`  ...and ${problems.length - 40} more`);
    process.exit(1);
  }
  console.log('\nNothing a child did broke anything.');
}

main().catch((e) => { console.error(e); process.exit(1); });
