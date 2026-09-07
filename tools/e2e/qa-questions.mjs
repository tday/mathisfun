// Plays the game and QAs the questions as a child actually meets them.
//
//   python3 -m http.server 8099          # from the repo root
//   node tools/e2e/qa-questions.mjs      # WORLDS=g0w0,g2w1 STAGES=1,5,10 to narrow
//
// The curriculum audit already proves the maths is right (it re-derives every
// answer from scratch — see tools/answer-solver.mjs). This suite proves the
// *presentation* is right, which the audit cannot see:
//
//   - every question renders: a prompt, an icon, or a non-blank visual canvas
//   - every answer button is tappable and has something on it
//   - answering correctly is accepted; answering wrongly is handled gently
//   - below 2nd grade, no letter appears anywhere a child has to read
//   - nothing logs a console error along the way
//
// Answers come from the debug hook rather than from re-solving on the page, so
// a failure here is a UI failure; a wrong answer would have failed the audit.

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8099';
const SHOTS = process.env.SHOTS || '/tmp/mmd-qa';
const STAGES = (process.env.STAGES || '1,4,7,10').split(',').map(Number);
const PER_STAGE = Number(process.env.PER_STAGE || 12);

const failures = [];
const seenSkills = new Map();
const seenVisuals = new Map();
let questionsChecked = 0;

function bad(where, msg, detail) {
  failures.push(`${where}: ${msg}${detail ? ` — ${detail}` : ''}`);
}

/** True if the canvas has actually been drawn on, not just sized. */
const canvasPainted = (handle) => handle.evaluate((c) => {
  if (!c.width || !c.height) return false;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let opaque = 0;
  for (let i = 3; i < d.length; i += 4 * 37) if (d[i] > 8) opaque++;
  return opaque > 4;
});

/**
 * How much of each edge the drawing runs into. A shape that is bigger than the
 * box it is centred in does not fail any other check — it just quietly arrives
 * with its top sliced off, which is how a heart answer button shipped looking
 * like a diamond. Returns the share of each border row/column that is inked.
 */
const edgeBleed = (handle) => handle.evaluate((c) => {
  const ctx = c.getContext('2d');
  const { width: w, height: h } = c;
  if (!w || !h) return { top: 0, bottom: 0, left: 0, right: 0 };
  const inked = (x, y, dx, dy, n) => {
    const d = ctx.getImageData(x, y, dx === 0 ? 1 : n, dy === 0 ? 1 : n).data;
    let hit = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 24) hit++;
    return hit / n;
  };
  return {
    top: inked(0, 0, 1, 0, w),
    bottom: inked(0, h - 1, 1, 0, w),
    left: inked(0, 0, 0, 1, h),
    right: inked(w - 1, 0, 0, 1, h),
  };
});

async function qaOneQuestion(page, world, stage, n) {
  const q = await page.evaluate(() => window.__mmd.question());
  if (!q) return 'no-question';
  const where = `${world.id} s${stage} q${n} [${q.skill}]`;
  questionsChecked++;
  seenSkills.set(q.skill, (seenSkills.get(q.skill) || 0) + 1);
  if (q.visual) seenVisuals.set(q.visual.kind, (seenVisuals.get(q.visual.kind) || 0) + 1);

  // --- the question itself is on screen -------------------------------------
  const promptEl = page.locator('.qprompt');
  const promptText = (await promptEl.textContent()) || '';
  // Icon chips are baked sprites drawn into a <canvas>, not <img> tags.
  const hasIcon = (await promptEl.locator('canvas').count()) > 0;
  const visual = page.locator('.qvisual');
  const visualShown = await visual.isVisible();

  if (q.visual && !visualShown) bad(where, 'question declares a visual but the canvas is hidden');
  if (q.visual && visualShown) {
    const cv = await visual.elementHandle();
    if (!(await canvasPainted(cv))) {
      bad(where, `visual "${q.visual.kind}" renders blank`, JSON.stringify(q.visual));
    } else {
      // Question visuals are allowed to run the full width (number lines,
      // rulers) but never off the top or bottom of their box.
      const e = await edgeBleed(cv);
      const worst = e.top > e.bottom ? ['top', e.top] : ['bottom', e.bottom];
      if (worst[1] > 0.12) {
        bad(where, `visual "${q.visual.kind}" is clipped at the ${worst[0]}`,
          `${(worst[1] * 100).toFixed(0)}% inked — ${JSON.stringify(q.visual)}`);
      }
    }
  }
  if (!q.visual && !promptText.trim() && !hasIcon) bad(where, 'nothing on screen to answer');
  if (q.promptIcon && !hasIcon) bad(where, 'promptIcon declared but no chip rendered');

  // Most early questions are asked by the picture alone and show no prompt at
  // all. That is the design — but the picture is aria-hidden, so the answer
  // group has to carry a name of its own or the question is silent.
  const groupName = await page.locator('.answers').evaluate((el) => {
    const by = el.getAttribute('aria-labelledby');
    if (by) return (document.getElementById(by)?.textContent || '').trim();
    return (el.getAttribute('aria-label') || '').trim();
  });
  if (!groupName) bad(where, 'the answer group reaches a screen reader unnamed');

  // --- the answers are tappable ---------------------------------------------
  const btns = page.locator('.answers .btn');
  const count = await btns.count();
  if (count !== q.choices.length) bad(where, `${count} buttons for ${q.choices.length} choices`);
  if (count < 2) bad(where, 'fewer than two answers');

  const labels = [];
  for (let i = 0; i < count; i++) {
    const b = btns.nth(i);
    const box = await b.boundingBox();
    if (!box || box.width < 48 || box.height < 44) {
      bad(where, `answer ${i} is too small to tap`, JSON.stringify(box));
    }
    const text = ((await b.textContent()) || '').trim();
    const drawn = await b.locator('canvas').count();
    if (!text && !drawn) bad(where, `answer ${i} is blank`);
    if (drawn) {
      const cv = await b.locator('canvas').elementHandle();
      if (!(await canvasPainted(cv))) bad(where, `drawn answer ${i} renders blank`);
      // A drawn choice is a centred glyph with margin on every side. Ink on a
      // border means it is bigger than its box and has been cut off.
      const e = await edgeBleed(cv);
      const worst = Object.entries(e).sort((a, c) => c[1] - a[1])[0];
      if (worst[1] > 0.06) {
        bad(where, `drawn answer ${i} is clipped at the ${worst[0]}`,
          `${(worst[1] * 100).toFixed(0)}% of that edge is inked`);
      }
    }
    labels.push(drawn ? `[drawn]` : text);
  }
  if (new Set(labels.filter((l) => l !== '[drawn]')).size !== labels.filter((l) => l !== '[drawn]').length) {
    bad(where, 'two answer buttons read the same', labels.join(' / '));
  }

  // --- nothing below 2nd grade may require reading ---------------------------
  if (world.band <= 2) {
    if (/[A-Za-z]/.test(promptText)) bad(where, 'prompt shows words to a pre-reader', promptText);
    for (let i = 0; i < count; i++) {
      // .sr-only carries a screen-reader label on drawn buttons; a sighted
      // child never sees it, so only visible text counts here.
      const visible = await btns.nth(i).evaluate((el) => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('.sr-only').forEach((s) => s.remove());
        return clone.textContent.trim();
      });
      if (/[A-Za-z]/.test(visible)) bad(where, `answer ${i} shows words to a pre-reader`, visible);
    }
  }

  // --- answering works -------------------------------------------------------
  // Every third question is answered wrongly first, to exercise the gentle path
  // as often as the happy one.
  if (n % 3 === 2 && count > 1) {
    const wrong = q.answerIndex === 0 ? 1 : 0;
    const heartsBefore = (await page.evaluate(() => window.__mmd.state())).hearts;
    await btns.nth(wrong).click();
    await page.waitForTimeout(240);
    const st = await page.evaluate(() => window.__mmd.state());
    if (st.hearts !== heartsBefore) bad(where, 'a wrong answer cost a heart');
    if (!(await page.locator('.feedback .hint').count())) bad(where, 'a wrong answer gave no hint');
    if (!(await page.locator('.answers .btn.wrong').count())) bad(where, 'a wrong answer was not marked');
  }

  const before = await page.evaluate(() => window.__mmd.state());
  await btns.nth(q.answerIndex).click();
  await page.waitForTimeout(200);

  // "Correct" is signalled by the good-feedback line, not by correctCount:
  // correctCount deliberately only counts first-try answers, so a question that
  // was retried would look rejected.
  if (!(await page.locator('.feedback.good').count())) {
    bad(where, 'the correct answer was not accepted', await page.locator('.feedback').textContent());
    return 'over';
  }
  const after = await page.evaluate(() => window.__mmd.state());
  if (after.attempts <= before.attempts) bad(where, 'the answer was not registered as an attempt');

  // The panel is locked until the next question loads ~780ms later; clicking
  // during that window is swallowed, so wait for the question to actually turn
  // over rather than guessing at a delay.
  // The visual has to be part of the signature. Two wordless questions can
  // share a prompt ("") and a choice list ("5,1") and still be different
  // questions — which read as "the game froze" without it.
  const stamp = (x) => `${x.skill}|${x.prompt}|${(x.choices || []).join(',')}|${JSON.stringify(x.visual)}`;
  const advanced = await page.waitForFunction(
    (was) => {
      const st = window.__mmd.state();
      if (!st || st.over) return true;
      const now = window.__mmd.question();
      if (!now) return false;
      const s = `${now.skill}|${now.prompt}|${(now.choices || []).join(',')}|${JSON.stringify(now.visual)}`;
      return s !== was;
    },
    stamp({ ...q, choices: q.choices }),
    { timeout: 4000 },
  ).catch(() => null);
  if (!advanced) {
    bad(where, 'the game never moved on to the next question');
    return 'over';
  }
  return (await page.evaluate(() => window.__mmd.state()))?.over ? 'over' : 'ok';
}

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  const worlds = await page.evaluate(() => window.__mmd.worlds());
  const only = process.env.WORLDS ? process.env.WORLDS.split(',') : null;

  for (const world of worlds) {
    if (only && !only.includes(world.id)) continue;
    for (const stage of STAGES) {
      await page.goto(`${BASE}/?debug=1&scene=play&world=${world.id}&stage=${stage}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      for (let n = 0; n < PER_STAGE; n++) {
        if (await page.locator('#modal:not([hidden])').count()) break;
        const r = await qaOneQuestion(page, world, stage, n).catch((e) => {
          bad(`${world.id} s${stage} q${n}`, 'threw', e.message);
          return 'over';
        });
        if (r !== 'ok') break;
      }
    }
    process.stdout.write(`  ${world.id} ${world.name} — ${questionsChecked} questions so far\n`);
  }

  // A screenshot per band, for a human to glance at.
  for (const world of worlds.filter((w) => w.indexInBand === 0)) {
    await page.goto(`${BASE}/?debug=1&scene=play&world=${world.id}&stage=5`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/q-${world.id}.png` });
  }

  await browser.close();

  console.log(`\nChecked ${questionsChecked} questions in the real UI.`);
  console.log(`Skills seen: ${seenSkills.size}. Visual kinds seen: ${[...seenVisuals.keys()].sort().join(', ')}`);
  if (errors.length) {
    for (const e of [...new Set(errors)].slice(0, 20)) failures.push(`console error: ${e}`);
  }
  if (failures.length) {
    console.log(`\n${failures.length} PROBLEM(S):`);
    for (const f of failures.slice(0, 50)) console.log(`  - ${f}`);
    if (failures.length > 50) console.log(`  ...and ${failures.length - 50} more`);
    process.exit(1);
  }
  console.log('\nAll questions render and answer correctly.');
}

main().catch((e) => { console.error(e); process.exit(1); });
