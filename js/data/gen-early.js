// Question generators: Pre-K (band 0), Kindergarten (band 1), 1st grade (band 2).
// Each returns { prompt, visual|null, answer, distractors[], hint, explain }.
// DOM-free. Distractor candidates are listed best-first; questions.js sanitizes.

import { ri, pick } from '../core/utils.js';

export const SPRITE_PLURALS = {
  apple: 'apples', duck: 'ducks', star: 'stars', shell: 'seashells',
  fish: 'fish', cookie: 'cookies', balloon: 'balloons', bug: 'ladybugs',
};

const SHAPE_HINTS = {
  circle: 'A circle is perfectly round, like a ball.',
  square: 'A square has 4 sides that are all the same.',
  triangle: 'A triangle has 3 sides. Count the corners!',
  rectangle: 'A rectangle has 4 sides — two long, two short.',
  star: 'Count the points — stars have pointy arms!',
  heart: 'A heart has two bumps on top and a point below.',
  hexagon: 'A hexagon has 6 sides, like a honeycomb.',
  oval: 'An oval is round but stretched, like an egg.',
};

// ---------- Pre-K ----------------------------------------------------------

export function count(r, p) {
  const n = ri(r, p.min ?? 1, p.max);
  const sprite = pick(r, p.sprites);
  return {
    prompt: `How many ${SPRITE_PLURALS[sprite]}?`,
    visual: { kind: 'countRow', sprite, count: n },
    answer: n,
    distractors: [n + 1, n - 1, n + 2, n - 2],
    hint: 'Touch each one and count: 1, 2, 3…',
    explain: `There are ${n} ${SPRITE_PLURALS[sprite]}. Great counting!`,
  };
}

export function shapeId(r, p) {
  const pools = [
    ['circle', 'square', 'triangle'],
    ['circle', 'square', 'triangle', 'star', 'heart', 'rectangle'],
    ['circle', 'square', 'triangle', 'star', 'heart', 'rectangle', 'hexagon', 'oval'],
  ];
  const pool = pools[Math.min(p.level ?? 0, 2)];
  const shape = pick(r, pool);
  const others = pool.filter((s) => s !== shape);
  return {
    prompt: 'What shape is this?',
    visual: { kind: 'shape', shape },
    answer: shape,
    distractors: others,
    hint: SHAPE_HINTS[shape],
    explain: `It is a ${shape}! ${SHAPE_HINTS[shape]}`,
  };
}

export function compareGroups(r, p) {
  const sprite = pick(r, p.sprites);
  const same = (p.allowSame ?? true) && r() < 0.18;
  const a = ri(r, 1, p.max);
  let b;
  if (same) b = a;
  else {
    const gap = Math.max(1, p.gap ?? 2);
    b = a + (r() < 0.5 ? gap : -gap);
    if (b < 1) b = a + gap;
    if (b > p.max) b = a - gap;
    if (b === a || b < 1) b = a === 1 ? 2 : a - 1;
  }
  const fewer = p.fewer && r() < 0.5;
  let answer;
  if (a === b) answer = 'Same amount';
  else if ((a > b) !== fewer) answer = 'Group A';
  else answer = 'Group B';
  return {
    prompt: fewer ? 'Which group has fewer?' : 'Which group has more?',
    visual: { kind: 'compareGroups', a: { sprite, count: a }, b: { sprite, count: b } },
    answer,
    distractors: ['Group A', 'Group B', 'Same amount'].filter((c) => c !== answer),
    hint: 'Count group A, then count group B. Compare!',
    explain: a === b
      ? `Both groups have ${a}. They are the same!`
      : `Group A has ${a} and Group B has ${b}. ${answer} has ${fewer ? 'fewer' : 'more'}!`,
  };
}

export function pickExtreme(r, p) {
  const n = p.count ?? 3;
  const set = new Set();
  while (set.size < n) set.add(ri(r, p.min ?? 1, p.max));
  const nums = [...set];
  const smallest = p.smallest && r() < 0.5;
  const answer = smallest ? Math.min(...nums) : Math.max(...nums);
  return {
    prompt: smallest ? 'Which number is the smallest?' : 'Which number is the biggest?',
    visual: null,
    answer,
    distractors: nums.filter((v) => v !== answer),
    hint: p.max > 20 ? 'Look at the tens digit first — more tens means bigger!' : 'Count up! Numbers later in the count are bigger.',
    explain: `${answer} is the ${smallest ? 'smallest' : 'biggest'} number here.`,
  };
}

// ---------- Kindergarten ---------------------------------------------------

export function countTenFrame(r, p) {
  const n = ri(r, p.min ?? 3, p.max);
  return {
    prompt: 'How many dots?',
    visual: { kind: 'tenFrame', count: n },
    answer: n,
    distractors: [n + 1, n - 1, n + 2, n + 10 <= 20 ? n + 10 : n - 3],
    hint: n > 10 ? 'The first frame is 10. Count on: 10, 11, 12…' : 'A full row is 5! Count by the row.',
    explain: `There are ${n} dots.${n > 10 ? ' Ten in the first frame plus ' + (n - 10) + ' more!' : ''}`,
  };
}

export function beforeAfter(r, p) {
  const after = r() < 0.55;
  const n = ri(r, p.min ?? 1, p.max - 1);
  const base = after ? n : n + 1;
  const answer = after ? base + 1 : base - 1;
  return {
    prompt: after ? `What comes right after ${base}?` : `What comes right before ${base}?`,
    visual: p.visual ? { kind: 'numberLine', from: Math.max(0, base - 4), to: base + 4, mark: base } : null,
    answer,
    distractors: [after ? base - 1 : base + 1, base, answer + (after ? 1 : -1)],
    hint: after ? `Count up: ${base}, then one more!` : `Count back: ${base}, then one less!`,
    explain: `${answer} comes right ${after ? 'after' : 'before'} ${base}.`,
  };
}

export function addSmall(r, p) {
  const a = ri(r, 1, p.max - 1);
  const b = ri(r, 1, p.max - a);
  const sprite = pick(r, p.sprites);
  return {
    prompt: `${a} + ${b} = ?`,
    visual: { kind: 'countGroups', op: '+', groups: [{ sprite, count: a }, { sprite, count: b }] },
    answer: a + b,
    distractors: [a + b + 1, a + b - 1, Math.abs(a - b), a + b + 2],
    hint: 'Count ALL of them together, one by one!',
    explain: `${a} + ${b} = ${a + b}. Count them all!`,
  };
}

export function subSmall(r, p) {
  const a = ri(r, 2, p.max);
  const b = ri(r, 1, a - 1);
  const sprite = pick(r, p.sprites);
  return {
    prompt: `${a} − ${b} = ?`,
    visual: { kind: 'countRow', sprite, count: a, crossed: b },
    answer: a - b,
    distractors: [a - b + 1, a - b - 1, a + b, a - b + 2],
    hint: 'Count the ones that are NOT crossed out!',
    explain: `${a} − ${b} = ${a - b}. Take away ${b}, and ${a - b} are left.`,
  };
}

// ---------- 1st grade ------------------------------------------------------

export function addWithin(r, p) {
  const max = p.max;
  const minSum = p.minSum ?? 2;
  let a, b;
  if (p.plusTen && r() < 0.25) { a = 10; b = ri(r, 1, Math.min(9, max - 10)); }
  else {
    a = ri(r, 1, max - 1);
    b = ri(r, Math.max(1, minSum - a), max - a);
  }
  const sum = a + b;
  return {
    prompt: `${a} + ${b} = ?`,
    visual: p.visual && sum <= 20 ? { kind: 'tenFrame', count: sum } : null,
    answer: sum,
    distractors: [sum + 1, sum - 1, Math.abs(a - b), sum + 2],
    hint: a === 10 || b === 10
      ? 'Adding 10 makes the tens go up by one!'
      : `Start at ${Math.max(a, b)} and count up ${Math.min(a, b)} more: ${Math.max(a, b) + 1}, ${Math.max(a, b) + 2}…`,
    explain: `${a} + ${b} = ${sum}.`,
  };
}

export function subWithin(r, p) {
  const a = ri(r, 3, p.max);
  const b = ri(r, 1, p.maxTake ? Math.min(p.maxTake, a - 1) : a - 1);
  return {
    prompt: `${a} − ${b} = ?`,
    visual: p.visual && a <= 10 ? { kind: 'countRow', sprite: 'star', count: a, crossed: b } : null,
    answer: a - b,
    distractors: [a - b + 1, a - b - 1, a + b, a - b - 2],
    hint: `Start at ${a} and count back ${b}: ${a - 1}${b > 1 ? ', ' + (a - 2) : ''}…`,
    explain: `${a} − ${b} = ${a - b}.`,
  };
}

export function missingAddend(r, p) {
  const c = ri(r, 4, p.max);
  const a = ri(r, 1, c - 1);
  const answer = c - a;
  return {
    prompt: `${a} + ? = ${c}`,
    visual: p.visual ? { kind: 'numberLine', from: 0, to: Math.min(p.max, c + 2), mark: a } : null,
    answer,
    distractors: [c + a, answer + 1, answer - 1, c],
    hint: `Start at ${a}. How many hops to reach ${c}?`,
    explain: `${a} + ${answer} = ${c}. You need ${answer} more.`,
  };
}

export function placeValue(r, p) {
  const t = ri(r, 1, p.maxTens ?? 9);
  const o = ri(r, 0, 9);
  const answer = t * 10 + o;
  return {
    prompt: `${t} tens and ${o} ones make what number?`,
    visual: { kind: 'placeValue', tens: t, ones: o },
    answer,
    distractors: [t + o, o * 10 + t, answer + 10, answer - 10],
    hint: 'Each rod is worth 10! Count 10, 20, 30… then add the ones.',
    explain: `${t} tens = ${t * 10}, plus ${o} ones = ${answer}.`,
  };
}
