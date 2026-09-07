// Map tap targets. Dev-only: never deployed.
//
//   python3 -m http.server 8099          # from the repo root
//   node tools/e2e/map-taps.mjs          # VIEWS=phone WORLDS=g0w0 to narrow it
//
// The stage nodes are painted on the canvas, so nothing in the DOM says where
// they are. The only way to know a child's tap lands on the level they aimed
// at is to aim at one and read back which stage got selected.
//
// What has to hold, on every screen shape and in every world:
//   1. Every point inside a node's drawn art selects that node. A circle a
//      child can see but not press is a broken button.
//   2. No tap ever selects a node that is not the nearest one. Landing on the
//      wrong level is worse than landing on nothing — the child gets a
//      different question than the one they pointed at, and nothing on screen
//      explains why.
//   3. No two hit zones share ground, and each is at least a fingertip across.
//   4. Nothing in the DOM sits on top of a node.
//   5. The canvas is exactly the size the game draws into. When those drift the
//      picture is stretched and every tap lands where the art used to be — the
//      whole bottom row of stages was under the panel and untappable.
//
// The sweep dispatches synthetic pointer events, which run the real path
// (screen -> engine -> scene.onPointer) tens of thousands of times a second.
// Real Playwright taps then spot-check that the browser's own hit testing
// agrees. Probe points are worked out from what render() paints, never from the
// hit test's own idea of its reach, so the test still fails if the two drift.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8099';
const SHOTS = process.env.SHOTS || '/tmp/mmd-maptaps';

const ALL_VIEWS = [
  { name: 'phone', width: 390, height: 844, touch: true, allWorlds: true },
  { name: 'small-phone', width: 320, height: 568, touch: true },
  { name: 'phone-landscape', width: 844, height: 390, touch: true },
  { name: 'tablet', width: 820, height: 1180, touch: true },
  { name: 'desktop', width: 1280, height: 800, touch: false },
];

// VIEWS=phone,desktop WORLDS=g0w0 narrows a run down to something quick.
const only = process.env.VIEWS?.split(',').map((v) => v.trim());
const VIEWS = only ? ALL_VIEWS.filter((v) => only.includes(v.name)) : ALL_VIEWS;
const PICKED = process.env.WORLDS?.split(',').map((w) => w.trim());

let failures = 0;
const fail = (name, detail) => { failures++; console.log(` FAIL  ${name} — ${detail}`); };
const ok = (name, detail = '') => console.log(`  ok   ${name}${detail ? ` — ${detail}` : ''}`);
const check = (name, cond, detail = '') => (cond ? ok(name, detail) : fail(name, detail));

/** Walks the whole map of whichever world is loaded and reports bad taps. */
const sweepMap = (page, step) => page.evaluate((gridStep) => {
  const canvas = document.getElementById('game');
  const state = () => window.__mmd.state();
  const { nodes, radius } = state();

  const tap = (x, y) => {
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: rect.left + x, clientY: rect.top + y,
      bubbles: true, pointerType: 'touch', isPrimary: true,
    }));
    return state().selected;
  };

  const dist = (n, x, y) => Math.hypot(n.x - x, n.y - y);
  const byDistance = (x, y) => [...nodes].sort((a, b) => dist(a, x, y) - dist(b, x, y));

  /**
   * Which stage a tap at (x, y) selects, or null for none.
   *
   * Reading `selected` after a tap cannot tell "selected stage 4" from "did
   * nothing while stage 4 was already chosen", so the selection is first parked
   * on a stage the tap is not expected to pick. If the answer comes back equal
   * to the parked stage it is still ambiguous, so it is asked again from a
   * second park — one point cannot select two different stages, so the second
   * answer settles it.
   */
  const resolve = (x, y) => {
    const far = byDistance(x, y).slice(-2);
    for (const p of far) {
      tap(p.x, p.y);
      const got = tap(x, y);
      if (got !== p.stage) return got;
    }
    return null;
  };

  const dead = [];    // points inside a node's circle that did not select it
  const wrong = [];   // points that selected a stage that was not the nearest
  let probes = 0;

  const last = nodes[nodes.length - 1].stage;
  for (const n of nodes) {
    // The drawn art is the button. These points are worked out from what
    // render() paints — the disc, and for the boss the stage number up on the
    // gatehouse — not from the hit test's own idea of its reach, so the test
    // still fails if the two drift apart.
    const pts = [{ x: n.x, y: n.y, why: 'centre' }];
    for (let a = 0; a < 12; a++) {
      const th = (a / 12) * Math.PI * 2;
      pts.push({ x: n.x + Math.cos(th) * radius * 0.92, y: n.y + Math.sin(th) * radius * 0.92, why: 'edge' });
      if (n.stage === last) {
        // The boss's numeral is drawn at -1.15r with a 0.95r font.
        pts.push({
          x: n.x + Math.cos(th) * radius * 0.4,
          y: n.y - radius * 1.15 + Math.sin(th) * radius * 0.4,
          why: 'boss numeral',
        });
      }
    }
    for (const m of nodes) {
      if (m === n) continue;
      const d = dist(m, n.x, n.y) || 1;
      const k = (radius * 0.92) / d;
      pts.push({ x: n.x + (m.x - n.x) * k, y: n.y + (m.y - n.y) * k, why: `toward ${m.stage}` });
    }
    for (const p of pts) {
      probes++;
      const got = resolve(p.x, p.y);
      if (got !== n.stage) dead.push({ stage: n.stage, why: p.why, got, x: +p.x.toFixed(1), y: +p.y.toFixed(1) });
    }
  }

  const rect = canvas.getBoundingClientRect();
  for (let x = 3; x < rect.width; x += gridStep) {
    for (let y = 3; y < rect.height; y += gridStep) {
      probes++;
      const got = resolve(x, y);
      if (got === null) continue;
      const near = byDistance(x, y)[0];
      const hitNode = nodes.find((n) => n.stage === got);
      // Whatever a tap selects has to be the node it is closest to. Half a pixel
      // of slack for a point that sits exactly between two of them.
      if (dist(hitNode, x, y) > dist(near, x, y) + 0.5) {
        wrong.push({
          got, nearest: near.stage, x, y,
          dNearest: +dist(near, x, y).toFixed(1), dGot: +dist(hitNode, x, y).toFixed(1),
        });
      }
    }
  }

  // Nothing in the DOM may sit on top of a node — the HUD and the world plate
  // both live in that band, and a covered node cannot be tapped at all.
  const covered = [];
  for (const n of nodes) {
    const hit = document.elementFromPoint(rect.left + n.x, rect.top + n.y);
    if (hit !== canvas) covered.push({ stage: n.stage, by: hit ? `${hit.tagName}.${hit.className}` : 'nothing' });
  }

  let minGap = Infinity;
  for (const a of nodes) for (const b of nodes) if (a !== b) minGap = Math.min(minGap, dist(a, b.x, b.y));

  // How far apart the hit zones stay: negative means two stages share ground.
  let minSlack = Infinity;
  for (const a of nodes) for (const b of nodes) {
    if (a === b) continue;
    const gap = Math.hypot(a.target.x - b.target.x, a.target.y - b.target.y) - a.target.r - b.target.r;
    minSlack = Math.min(minSlack, gap);
  }

  return {
    dead, wrong, covered, probes,
    radius: +radius.toFixed(1), minGap: +minGap.toFixed(1), minSlack: +minSlack.toFixed(1),
    reach: +nodes[0].target.r.toFixed(1),
  };
}, step);

/**
 * The game draws into `screen.w/h` and reads taps in the canvas element's own
 * pixels, so if those two ever disagree the picture is stretched and every tap
 * lands where the art used to be. Scenes swap the controls in #panel, which
 * resizes the canvas under them with no window event at all, so this is checked
 * per scene rather than once at boot.
 */
const drift = (page) => page.evaluate(() => {
  const c = document.getElementById('game');
  const r = c.getBoundingClientRect();
  const s = window.__mmd.game.screen;
  return {
    dx: s.w - Math.round(r.width), dy: s.h - Math.round(r.height),
    screen: [s.w, s.h], elem: [Math.round(r.width), Math.round(r.height)],
  };
});

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];

  // Every world lays its nodes out from its own seed, so the pair that ends up
  // closest together differs world to world. The tightest viewport sees them
  // all; the rest sample two.
  const all = PICKED || Array.from({ length: 14 }, (_, i) => `g${Math.floor(i / 2)}w${i % 2}`);
  const some = PICKED || ['g0w0', 'g3w1'];

  for (const view of VIEWS) {
    const ctx = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      hasTouch: view.touch,
      deviceScaleFactor: view.touch ? 2 : 1,
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${view.name}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${view.name}: ${m.text()}`); });

    // Drawn size must equal measured size in every scene, not just the map.
    for (const scene of ['title', 'worldSelect', 'map', 'play', 'gallery']) {
      await page.goto(`${BASE}/?debug=1&scene=${scene}&world=g0w0&stage=1`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const d = await drift(page);
      check(`${view.name}/${scene} · canvas is the size the game draws into`, d.dx === 0 && d.dy === 0,
        d.dx || d.dy ? `game thinks ${d.screen}, canvas is ${d.elem}` : '');
    }

    for (const world of (view.allWorlds ? all : some)) {
      await page.goto(`${BASE}/?debug=1&scene=map&world=${world}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(650);

      const scene = await page.evaluate(() => window.__mmd.scene());
      if (scene !== 'map') { fail(`${view.name}/${world} loads the map`, `scene is ${scene}`); continue; }

      const r = await sweepMap(page, 7);
      const tag = `${view.name}/${world}`;

      check(`${tag} · the whole drawn circle is tappable`, r.dead.length === 0,
        r.dead.length
          ? `${r.dead.length} dead points, e.g. ${JSON.stringify(r.dead[0])}`
          : `r=${r.radius}px, reach ${r.reach}px, closest pair ${r.minGap}px`);

      check(`${tag} · two stages never share ground`, r.minSlack > 0,
        `${r.minSlack}px between the closest pair of hit zones`);

      // A finger is about 9mm across; below this a child is aiming, not pressing.
      check(`${tag} · the target is big enough for a child's finger`, r.reach * 2 >= 44,
        `${(r.reach * 2).toFixed(0)}px across`);

      check(`${tag} · no tap selects a non-nearest stage`, r.wrong.length === 0,
        r.wrong.length ? `${r.wrong.length} wrong-level taps, e.g. ${JSON.stringify(r.wrong[0])}` : `${r.probes} probes`);

      check(`${tag} · no node is covered by the HUD or plate`, r.covered.length === 0,
        r.covered.length ? JSON.stringify(r.covered) : '');

      // The browser's own hit testing has to agree, and a real touch has to
      // reach the canvas at all.
      const { nodes } = await page.evaluate(() => window.__mmd.state());
      const box = await page.locator('#game').boundingBox();
      const misses = [];
      for (const n of nodes) {
        const park = nodes.find((m) => m.stage !== n.stage);
        await page.mouse.click(box.x + park.x, box.y + park.y);
        await page.mouse.click(box.x + n.x, box.y + n.y);
        const got = await page.evaluate(() => window.__mmd.state().selected);
        if (got !== n.stage) misses.push({ stage: n.stage, got });
      }
      check(`${tag} · real taps select the stage under the finger`, misses.length === 0,
        misses.length ? JSON.stringify(misses) : `${nodes.length} nodes`);

      await page.screenshot({ path: `${SHOTS}/${view.name}-${world}.png` });
    }
    await ctx.close();
  }

  await browser.close();
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(failures ? `\n${failures} failing check(s)` : '\nall map tap targets good');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
