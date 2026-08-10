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

const PER_STAGE = Number(process.env.N || 120);
const problems = [];
// Bucketed by choice count: a 2-choice question can never land in slot 3, so a
// flat tally would look "biased" when it is simply a different question shape.
const positions = new Map();
const skillCounts = new Map();
let total = 0;

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

      // Pre-K and Kindergarten must never hinge on reading a single word. If a
      // prompt names a direction, a drawn chip has to carry it too.
      if (world.band <= 1 && /\b(MORE|FEWER|BIGGER|SMALLER|BIGGEST|SMALLEST)\b/.test(q.prompt || '')) {
        if (!q.promptIcon) fail(world, stage, q, 'direction word with no icon for a pre-reader');
      }
      if (world.band <= 1 && /\b(before|after)\b/i.test(q.prompt || '')) {
        fail(world, stage, q, 'before/after wording requires reading');
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
          countRow: () => v.count > 0 && !!v.sprite,
          countGroups: () => Array.isArray(v.groups) && v.groups.every((g) => g.count > 0 && g.sprite),
          tenFrame: () => v.count > 0,
          compareGroups: () => v.left?.count > 0 && v.right?.count > 0,
          dotArray: () => v.rows > 0 && v.cols > 0,
          fractionBar: () => (v.bars ? v.bars.every((b) => b.den > 0) : v.den > 0),
          fractionCircle: () => v.den > 0 && v.num >= 0,
          numberLine: () => Number.isFinite(v.min) && Number.isFinite(v.max) && v.max > v.min,
          shape: () => !!v.shape,
          numberTrack: () => Array.isArray(v.cells) && v.cells.length >= 2 && v.cells.filter((c) => c === null).length === 1,
        }[v.kind];
        if (!ok) fail(world, stage, q, `unknown visual kind "${v.kind}"`);
        else if (!ok()) fail(world, stage, q, `invalid ${v.kind} visual: ${JSON.stringify(v)}`);
      }
    }
  }
}

// Answer position must not be predictable — kids notice patterns fast.
console.log(`Generated ${total} questions across ${WORLDS.length} worlds x ${STAGES_PER_WORLD} stages.`);
console.log(`Distinct skills exercised: ${skillCounts.size}`);
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
console.log('\nSkill coverage:');
for (const [skill, n] of bySkill) console.log(`  ${String(n).padStart(5)}  ${skill}`);

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
