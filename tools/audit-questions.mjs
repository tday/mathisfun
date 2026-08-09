// Headless curriculum audit: generates thousands of questions across every
// band x world x stage x ease combination and validates structure + math.
// Run: node tools/audit-questions.mjs

import { WORLDS } from '../js/data/worlds.js';
import { makeQuestion } from '../js/data/questions.js';
import { rng, hash } from '../js/core/utils.js';

const PER_COMBO = 40;
const fails = [];
const posCount = new Map(); // nChoices -> [countAtIndex...]
const skillSeen = new Set();
let total = 0;

function fail(ctx, msg, q) {
  if (fails.length < 40) fails.push(`[${ctx}] ${msg} :: ${q ? JSON.stringify({ p: q.prompt, c: q.choices, a: q.answerText, s: q.skill }) : ''}`);
  else if (fails.length === 40) fails.push('...more failures suppressed');
}

const near = (a, b) => Math.abs(a - b) < 1e-9;

// Independently re-evaluate arithmetic prompts where possible
function checkMath(ctx, q) {
  const p = q.prompt.replace(/−|−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
  const a = q.answerText;
  let m;
  if ((m = p.match(/^(\d+(?:\.\d+)?) ([-+*/]) (\d+(?:\.\d+)?) = \?$/))) {
    const [x, op, y] = [parseFloat(m[1]), m[2], parseFloat(m[3])];
    const val = op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : x / y;
    if (/^\d+ R \d+$/.test(a)) {
      const [, qq, rr] = a.match(/^(\d+) R (\d+)$/).map(Number) ?? [];
      const [q2, r2] = a.split(' R ').map(Number);
      if (q2 * y + r2 !== x || r2 >= y || r2 < 1) fail(ctx, `bad remainder: ${x}/${y} != ${a}`, q);
    } else if (!a.includes('/')) {
      if (!near(Math.round(val * 100) / 100, parseFloat(a))) fail(ctx, `math: ${p} -> ${val} but answer ${a}`, q);
    }
  } else if ((m = p.match(/^(\d+) \+ \? = (\d+)$/))) {
    if (parseInt(m[2]) - parseInt(m[1]) !== parseInt(a)) fail(ctx, `missing addend wrong`, q);
  } else if ((m = p.match(/^(\d+) \* \? = (\d+)$/))) {
    if (parseInt(m[1]) * parseInt(a) !== parseInt(m[2])) fail(ctx, `missing factor wrong`, q);
  } else if ((m = p.match(/^\((\d+) \+ (\d+)\) \* (\d+) = \?$/))) {
    if ((+m[1] + +m[2]) * +m[3] !== +a) fail(ctx, `parens wrong`, q);
  } else if ((m = p.match(/^(\d+) \+ (\d+) \* (\d+) = \?$/))) {
    if (+m[1] + +m[2] * +m[3] !== +a) fail(ctx, `precedence wrong`, q);
  } else if ((m = p.match(/^(\d+) \* (\d+) - (\d+) = \?$/))) {
    if (+m[1] * +m[2] - +m[3] !== +a) fail(ctx, `mul-sub wrong`, q);
  } else if ((m = p.match(/^(\d+)\/(\d+) (\+|-) (\d+)\/(\d+) = \?$/))) {
    const [n1, d1, op, n2, d2] = [+m[1], +m[2], m[3], +m[4], +m[5]];
    const am = a.match(/^(\d+)\/(\d+)$/);
    if (!am) fail(ctx, `fraction answer malformed: ${a}`, q);
    else {
      const [na, da] = [+am[1], +am[2]];
      const lhs = op === '+' ? n1 / d1 + n2 / d2 : n1 / d1 - n2 / d2;
      if (!near(lhs, na / da)) fail(ctx, `fraction math: ${q.prompt} != ${a}`, q);
    }
  } else if ((m = p.match(/^What is (\d+)\/(\d+) of (\d+)\?$/))) {
    if ((+m[3] / +m[2]) * +m[1] !== +a) fail(ctx, `fracOf wrong`, q);
  } else if ((m = p.match(/^(\d+)\/(\d+) = \?\/(\d+)$/))) {
    if (!near(+m[1] / +m[2], +a / +m[3])) fail(ctx, `equiv wrong`, q);
  } else if ((m = p.match(/^Which is bigger: (\d+(?:\.\d+)?) or (\d+(?:\.\d+)?)\?$/))) {
    const win = Math.max(parseFloat(m[1]), parseFloat(m[2]));
    if (!near(win, parseFloat(a))) fail(ctx, `dec compare wrong`, q);
  } else if ((m = p.match(/^Which fraction is bigger: (\d+)\/(\d+) or (\d+)\/(\d+)\?$/))) {
    const va = +m[1] / +m[2], vb = +m[3] / +m[4];
    const winner = va > vb ? `${m[1]}/${m[2]}` : `${m[3]}/${m[4]}`;
    if (winner !== a) fail(ctx, `frac compare wrong`, q);
    if (near(va, vb)) fail(ctx, `frac compare produced equal fractions`, q);
  }
}

for (const world of WORLDS) {
  for (let stage = 1; stage <= 10; stage++) {
    for (let ease = 0; ease <= 2; ease++) {
      const ctx = `${world.id} s${stage} e${ease}`;
      const r = rng(hash('audit', world.id, stage, ease));
      for (let i = 0; i < PER_COMBO; i++) {
        total++;
        let q;
        try {
          q = makeQuestion(world, stage, { ease, warmup: i % 9 === 0 }, r);
        } catch (err) {
          fail(ctx, `THREW: ${err.message}`);
          continue;
        }
        skillSeen.add(q.skill);
        if (!q.prompt || typeof q.prompt !== 'string') fail(ctx, 'empty prompt', q);
        if (!q.hint) fail(ctx, 'empty hint', q);
        if (!q.explain) fail(ctx, 'empty explain', q);
        const expected = q.choices.length;
        if (world.band <= 2 && expected !== 3 && expected > 3) fail(ctx, `band<=2 got ${expected} choices`, q);
        if (new Set(q.choices).size !== q.choices.length) fail(ctx, 'duplicate choices', q);
        if (q.answerIndex < 0 || q.choices[q.answerIndex] !== q.answerText) fail(ctx, 'answerIndex broken', q);
        if (q.choices.filter((c) => c === q.answerText).length !== 1) fail(ctx, 'answer not exactly once', q);
        if (q.choices.length < 2) fail(ctx, 'fewer than 2 choices', q);
        if (q.visual) {
          const kinds = ['countRow', 'countGroups', 'tenFrame', 'compareGroups', 'dotArray', 'fractionBar', 'fractionPair', 'fractionCircle', 'numberLine', 'shape', 'placeValue'];
          if (!kinds.includes(q.visual.kind)) fail(ctx, `unknown visual ${q.visual.kind}`, q);
        }
        checkMath(ctx, q);
        const key = q.choices.length;
        if (!posCount.has(key)) posCount.set(key, Array(key).fill(0));
        posCount.get(key)[q.answerIndex]++;
      }
    }
  }
}

console.log(`Generated ${total} questions across ${WORLDS.length} worlds x 10 stages x 3 ease levels.`);
console.log(`Skills covered (${skillSeen.size}):`, [...skillSeen].sort().join(', '));
for (const [n, counts] of [...posCount.entries()].sort()) {
  const sum = counts.reduce((a, b) => a + b, 0);
  const ratio = Math.max(...counts) / Math.max(1, Math.min(...counts));
  console.log(`answer position (${n} choices): [${counts.join(', ')}] max/min=${ratio.toFixed(2)}`);
  if (sum > 500 && ratio > 1.6) fails.push(`answer position bias with ${n} choices: ${counts.join(',')}`);
}
if (fails.length) {
  console.error(`\nFAILURES (${fails.length}):`);
  for (const f of fails) console.error('  ' + f);
  process.exit(1);
}
console.log('\nAUDIT PASSED');
