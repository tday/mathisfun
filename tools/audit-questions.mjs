// Curriculum audit — runs in plain Node, no browser needed, because everything
// under js/data/ is DOM-free by design.
//
//   node tools/audit-questions.mjs
//
// Samples every world x stage and asserts the questions are actually valid:
// exactly one correct choice, no duplicate or nonsensical distractors, a hint
// and an explanation on every question, and no positional bias in the answer.

import { WORLDS, STAGES_PER_WORLD } from '../js/data/worlds.js';
import { makeQuestion } from '../js/data/questions.js';
import { mulberry32 } from '../js/core/utils.js';
import { solve, agrees } from './answer-solver.mjs';
import { PROPS } from '../js/gfx/sprites-world.js';
import { COUNTABLES } from '../js/data/gen-early.js';

const PER_STAGE = Number(process.env.N || 120);
const problems = [];
// Bucketed by choice count: a 2-choice question can never land in slot 3, so a
// flat tally would look "biased" when it is simply a different question shape.
const positions = new Map();
const skillCounts = new Map();
const solvedBySkill = new Map();
let total = 0;
let solved = 0;

function fail(world, stage, q, msg) {
  problems.push(`${world.id} s${stage} [${q?.skill}] ${msg} :: ${JSON.stringify({
    prompt: q?.prompt, choices: q?.choices?.map((c) => c.text), answer: q?.answerValue,
  })}`);
}

for (const world of WORLDS) {
  for (let stage = 1; stage <= STAGES_PER_WORLD; stage++) {
    for (let i = 0; i < PER_STAGE; i++) {
      const rng = mulberry32(world.mapSeed * 31 + stage * 7919 + i * 104729);
      let q;
      try {
        q = makeQuestion(world, stage, { rng, index: i, easeLevel: i % 3 === 0 ? 1 : 0, warmup: i < 2 });
      } catch (e) {
        problems.push(`${world.id} s${stage} threw: ${e.message}`);
        continue;
      }
      total++;
      skillCounts.set(q.skill, (skillCounts.get(q.skill) || 0) + 1);

      const texts = q.choices.map((c) => c.text);
      if (texts.length < 2) fail(world, stage, q, 'fewer than 2 choices');
      if (new Set(texts).size !== texts.length) fail(world, stage, q, 'duplicate choices');
      if (q.answerIndex < 0 || q.answerIndex >= texts.length) fail(world, stage, q, 'answerIndex out of range');
      if (String(q.answerValue) !== texts[q.answerIndex]) fail(world, stage, q, 'answerIndex does not point at the answer');
      if (texts.some((t) => t == null || t === '' || t === 'NaN' || t === 'undefined' || /NaN|undefined|Infinity/.test(t))) {
        fail(world, stage, q, 'malformed choice text');
      }
      if (texts.some((t) => /^-/.test(t))) fail(world, stage, q, 'negative choice offered to an elementary student');
      if (texts.some((t) => /\/0(\D|$)/.test(t))) fail(world, stage, q, 'zero denominator');
      if (!q.hint || q.hint.length < 8) fail(world, stage, q, 'missing hint');
      if (!q.explain || q.explain.length < 4) fail(world, stage, q, 'missing explanation');
      if (q.prompt == null) fail(world, stage, q, 'null prompt');
      if (!q.prompt && !q.visual) fail(world, stage, q, 'neither prompt nor visual — nothing to answer');

      // Choice counts should match the band's design (3 for young, 4 for older),
      // except where a generator deliberately asks a two-way comparison.
      const expected = world.band <= 2 ? 3 : 4;
      if (texts.length !== expected && texts.length !== 2 && texts.length !== 3) {
        fail(world, stage, q, `unexpected choice count ${texts.length}`);
      }

      const bucket = positions.get(texts.length) || new Array(texts.length).fill(0);
      bucket[q.answerIndex]++;
      positions.set(texts.length, bucket);

      // Independent second opinion: re-derive the answer from the prompt and
      // the picture alone (tools/answer-solver.mjs) and check it agrees. This is
      // the check that catches a generator that is confidently wrong.
      const check = solve(q);
      if (check) {
        solved++;
        solvedBySkill.set(q.skill, (solvedBySkill.get(q.skill) || 0) + 1);
        if (!agrees(check, q)) {
          fail(world, stage, q, check.check
            ? `solver disagrees: exactly one choice should be ${check.describe}`
            : `solver disagrees (${check.from} says ${check.value})`);
        }
      }

      // Everyone below 2nd grade is a pre- or early reader, so nothing they are
      // asked may hinge on decoding a word. Not "keep the words simple" —
      // no letters at all, in the prompt or in any answer button. The question
      // is carried by the picture, a drawn icon chip and maths symbols.
      if (world.band <= 2) {
        if (/[A-Za-z]/.test(q.prompt || '')) {
          fail(world, stage, q, 'prompt contains words a pre-reader cannot decode');
        }
        for (const c of q.choices) {
          // A drawn choice may carry text as its screen-reader label only.
          if (!c.draw && /[A-Za-z]/.test(c.text)) {
            fail(world, stage, q, `answer choice "${c.text}" needs reading`);
          }
        }
        if (!q.visual && !q.promptIcon && !/[0-9]/.test(q.prompt || '')) {
          fail(world, stage, q, 'nothing to go on: no visual, no icon, no numerals');
        }
      }

      // A question asked entirely by its picture shows nothing on screen for a
      // screen reader to read, and the picture itself is aria-hidden. Quiet is
      // fine; unlabelled is not.
      if (!q.prompt && (!q.srPrompt || q.srPrompt.length < 4)) {
        fail(world, stage, q, 'no visible prompt and no screen-reader label');
      }

      // The ten-frame is a Kindergarten counting tool. Past that it is visual
      // clutter that gets in the way of the strategy being taught.
      if (q.visual?.kind === 'tenFrame' && world.band > 1) {
        fail(world, stage, q, 'ten-frame used above Kindergarten');
      }

      // Visual specs must be complete enough for fx.js to draw them.
      if (q.visual) {
        const v = q.visual;
        const ok = {
          countRow: () => v.count > 0 && !!v.sprite
            && (v.arrange == null || ['grid', 'row', 'scatter', 'dice'].includes(v.arrange)),
          countGroups: () => Array.isArray(v.groups) && v.groups.every((g) => g.count > 0 && g.sprite),
          tenFrame: () => v.count > 0,
          compareGroups: () => v.left?.count > 0 && v.right?.count > 0,
          dotArray: () => (v.counts ? v.counts.length > 0 && v.counts.every((c) => c > 0) : v.rows > 0 && v.cols > 0),
          fractionBar: () => (v.bars ? v.bars.every((b) => b.den > 0) : v.den > 0),
          fractionCircle: () => v.den > 0 && v.num >= 0,
          numberLine: () => Number.isFinite(v.min) && Number.isFinite(v.max) && v.max > v.min,
          shape: () => !!v.shape,
          numberTrack: () => Array.isArray(v.cells) && v.cells.length >= 2 && v.cells.filter((c) => c === null).length === 1,
          matchCard: () => !!v.left && (!!v.left.shape || Number.isFinite(v.left.value)),
          numberBond: () => Array.isArray(v.parts) && v.parts.length === 2
            && [v.whole, ...v.parts].filter((x) => x == null).length <= 1
            && [v.whole, ...v.parts].every((x) => x == null || Number.isFinite(x)),
          baseTen: () => (v.hundreds || 0) + (v.tens || 0) + (v.ones || 0) > 0
            && [v.hundreds, v.tens, v.ones].every((x) => x == null || (Number.isInteger(x) && x >= 0 && x <= 10)),
          lengthUnits: () => v.units > 0 && (v.span == null || v.span >= v.units),
          pictureGraph: () => Array.isArray(v.rows) && v.rows.length > 0
            && v.rows.every((r) => r.count > 0 && r.sprite),
          equalGroups: () => v.groups > 0 && v.each > 0 && !!v.sprite,
          money: () => Array.isArray(v.coins) && v.coins.length > 0 && v.coins.every((c) => c > 0),
          areaGrid: () => v.rows > 0 && v.cols > 0,
          perimeterShape: () => v.w > 0 && v.h > 0,
          fractionLine: () => v.den > 0 && (v.at == null || (v.at >= 0 && v.at <= v.den * (v.whole || 1))),
          angle: () => v.degrees > 0 && v.degrees < 360,
          prism: () => v.l > 0 && v.wd > 0 && v.ht > 0,
          coordGrid: () => v.span > 0 && (!v.point || (v.point[0] >= 0 && v.point[1] >= 0
            && v.point[0] <= v.span && v.point[1] <= v.span)),
          clock: () => v.hour >= 1 && v.hour <= 12 && v.minute >= 0 && v.minute < 60,
        }[v.kind];
        if (!ok) fail(world, stage, q, `unknown visual kind "${v.kind}"`);
        else if (!ok()) fail(world, stage, q, `invalid ${v.kind} visual: ${JSON.stringify(v)}`);
      }
    }
  }
}

// A question that asks for a sprite the art does not have renders as an empty
// box, which is unanswerable and silent. The two lists live in different layers
// on purpose (data/ stays DOM-free), so check them against each other here.
for (const name of COUNTABLES) {
  if (!PROPS[name]) problems.push(`countable "${name}" has no sprite in gfx/sprites-world.js`);
}

// ---------------------------------------------------------------- repetition
//
// A stage of individually-good questions can still feel like a worksheet if it
// asks the same skill five times running. Replays the ramp exactly as play.js
// drives it (recent-skill steering plus an exact-repeat re-roll) and holds the
// result to a budget, so the variety cannot quietly regress.
const PER_SESSION = 24;
let runOn = 0, exactRepeat = 0, asked = 0;
const worldSkills = [];

for (const world of WORLDS) {
  const skills = new Set();
  for (let stage = 1; stage <= STAGES_PER_WORLD; stage++) {
    const recentSkills = [], recentPrompts = [];
    const seen = new Set();
    let prev = null;
    for (let i = 0; i < PER_SESSION; i++) {
      // Same signature play.js uses, sprite-blind: which countable got drawn is
      // not what makes two questions feel different to a child.
      const sig = (q) => `${q.skill}|${q.prompt}|${q.choices.map((c) => c.text).join(',')}|`
        + JSON.stringify(q.visual, (k, v) => (k === 'sprite' ? undefined : v));
      let q = null;
      for (let a = 0; a < 6; a++) {
        q = makeQuestion(world, stage, {
          warmup: i < 2, index: i + a * 1000, seed: world.mapSeed, recent: recentSkills,
        });
        if (!recentPrompts.includes(sig(q))) break;
      }
      recentSkills.unshift(q.skill);
      recentSkills.length = Math.min(recentSkills.length, 4);
      recentPrompts.unshift(sig(q));
      recentPrompts.length = Math.min(recentPrompts.length, 12);

      if (prev === q.skill) runOn++;
      if (seen.has(sig(q))) exactRepeat++;
      seen.add(sig(q));
      skills.add(q.skill);
      prev = q.skill;
      asked++;
    }
  }
  worldSkills.push([world.id, skills.size]);
  if (skills.size < 5) problems.push(`${world.id} only ever asks ${skills.size} distinct skills`);
}

const runPct = (runOn / asked) * 100;
const repeatPct = (exactRepeat / asked) * 100;
if (runPct > 15) problems.push(`same skill twice in a row ${runPct.toFixed(1)}% of the time (budget 15%)`);
if (repeatPct > 12) problems.push(`identical question repeats within a stage ${repeatPct.toFixed(1)}% of the time (budget 12%)`);

// Answer position must not be predictable — kids notice patterns fast.
console.log(`Generated ${total} questions across ${WORLDS.length} worlds x ${STAGES_PER_WORLD} stages.`);
console.log(`Variety: same skill back-to-back ${runPct.toFixed(1)}%, identical question repeated ${repeatPct.toFixed(1)}%, `
  + `${Math.min(...worldSkills.map((w) => w[1]))}-${Math.max(...worldSkills.map((w) => w[1]))} skills per world.`);
console.log(`Distinct skills exercised: ${skillCounts.size}`);
console.log(`Independently re-solved: ${solved} (${(solved / total * 100).toFixed(1)}%)`);
for (const [n, bucket] of [...positions.entries()].sort((a, b) => a[0] - b[0])) {
  const sum = bucket.reduce((a, b) => a + b, 0);
  const share = bucket.map((p) => p / sum);
  console.log(`Answer position, ${n}-choice (${sum}):`, share.map((s) => `${(s * 100).toFixed(1)}%`).join(' / '));
  const ideal = 1 / n;
  if (Math.max(...share) > ideal * 1.35 || Math.min(...share) < ideal * 0.65) {
    problems.push(`answer position biased for ${n}-choice questions: ${share.map((s) => s.toFixed(2)).join(', ')}`);
  }
}

const bySkill = [...skillCounts.entries()].sort((a, b) => b[1] - a[1]);
console.log('\nSkill coverage (· = share the solver could re-derive):');
for (const [skill, n] of bySkill) {
  const v = solvedBySkill.get(skill) || 0;
  console.log(`  ${String(n).padStart(5)}  ${skill.padEnd(22)} ${v === n ? 'verified' : v ? `${(v / n * 100).toFixed(0)}% verified` : '—'}`);
}

// Every skill declared in the ramp should actually be reachable.
const declared = new Set();
for (const w of WORLDS) {
  const { RAMP } = await import('../js/data/questions.js');
  for (const e of RAMP[w.band][w.indexInBand]) declared.add(e.skill);
}
for (const skill of declared) {
  if (!skillCounts.has(skill)) problems.push(`skill "${skill}" is declared in a ramp but never generated`);
}

if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`);
  for (const p of problems.slice(0, 40)) console.log('  - ' + p);
  if (problems.length > 40) console.log(`  ...and ${problems.length - 40} more`);
  process.exit(1);
}
console.log('\nAll questions valid.');
