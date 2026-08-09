// Curriculum front door.
//
// makeQuestion() picks a skill from the world's ramp, calls its generator, then
// builds plausible wrong answers and shuffles the choices.
//
// This module and the gen-*.js files are deliberately DOM-free: the entire
// curriculum can be audited from plain Node (see tools/audit-questions.mjs).

import { mulberry32, clamp, shuffle, weightedPick } from '../core/utils.js';
import { EARLY } from './gen-early.js';
import { MID } from './gen-mid.js';
import { UPPER } from './gen-upper.js';

const GENERATORS = { ...EARLY, ...MID, ...UPPER };

/**
 * RAMP[band][indexInBand] = [{ skill, from, weight, params }]
 *  - `from`   : first stage where the skill appears
 *  - `weight` : relative frequency once available (number or fn(stage))
 *  - `params` : fn(stage) -> generator parameters; this is where difficulty lives
 */
export const RAMP = [
  // ---------------------------------------------------------------- Pre-K
  [
    [
      { skill: 'count_objects', from: 1, weight: (s) => 6 - s * 0.2, params: (s) => ({ max: Math.min(10, 3 + Math.floor(s * 0.8)) }) },
      { skill: 'shape_match', from: 3, weight: 3, params: (s) => ({ pool: s < 6 ? 3 : 5 }) },
      { skill: 'count_next', from: 5, weight: 2.5, params: (s) => ({ max: Math.min(10, 4 + s) }) },
    ],
    [
      { skill: 'compare_groups', from: 1, weight: 5, params: (s) => ({ max: Math.min(10, 4 + Math.floor(s * 0.7)), gap: Math.max(1, 4 - Math.floor(s / 3)), bothWays: s >= 7 }) },
      { skill: 'count_objects', from: 1, weight: 3, params: (s) => ({ max: Math.min(10, 5 + Math.floor(s * 0.5)) }) },
      { skill: 'biggest_smallest', from: 4, weight: 3, params: (s) => ({ max: Math.min(10, 5 + s), bothWays: s >= 8 }) },
      { skill: 'shape_match', from: 6, weight: 2, params: () => ({ pool: 6 }) },
    ],
  ],
  // --------------------------------------------------------- Kindergarten
  [
    [
      { skill: 'ten_frame_count', from: 1, weight: 5, params: (s) => ({ max: Math.min(20, 5 + s * 1.5 | 0) }) },
      { skill: 'numeral_id', from: 1, weight: 3, params: (s) => ({ max: Math.min(20, 6 + s) }) },
      { skill: 'count_next', from: 4, weight: 3, params: (s) => ({ max: Math.min(20, 8 + s) }) },
    ],
    [
      { skill: 'add_objects', from: 1, weight: 5, params: (s) => ({ max: s < 5 ? 5 : 8 }) },
      { skill: 'sub_objects', from: 3, weight: 4, params: (s) => ({ max: s < 6 ? 5 : 8 }) },
      { skill: 'one_more_less', from: 1, weight: 3, params: (s) => ({ max: Math.min(20, 8 + s) }) },
      { skill: 'compare_numerals', from: 5, weight: 2.5, params: (s) => ({ max: Math.min(20, 10 + s) }) },
    ],
  ],
  // -------------------------------------------------------------- 1st grade
  [
    [
      { skill: 'add_within', from: 1, weight: 5, params: (s) => ({ max: s < 4 ? 10 : 20, allowOver10: s >= 4 }) },
      { skill: 'sub_within', from: 2, weight: 4, params: (s) => ({ max: s < 5 ? 10 : 20 }) },
      { skill: 'add_ten', from: 6, weight: 2.5, params: () => ({ max: 90 }) },
    ],
    [
      { skill: 'missing_addend', from: 1, weight: 4.5, params: (s) => ({ max: s < 5 ? 10 : 20 }) },
      { skill: 'place_value', from: 2, weight: 3.5, params: (s) => ({ max: s < 6 ? 59 : 99 }) },
      { skill: 'compare_two_digit', from: 4, weight: 3, params: () => ({ max: 99 }) },
      { skill: 'add_within', from: 1, weight: 3, params: () => ({ max: 20, allowOver10: true }) },
    ],
  ],
  // -------------------------------------------------------------- 2nd grade
  [
    [
      { skill: 'add_within', from: 1, weight: 5, params: (s) => ({ max: s < 4 ? 50 : 100, regroup: s >= 5 }) },
      { skill: 'sub_within', from: 2, weight: 4, params: (s) => ({ max: s < 4 ? 50 : 100, regroup: s >= 5 }) },
      { skill: 'skip_count', from: 3, weight: 3, params: (s) => ({ steps: s < 6 ? [2, 5, 10] : [2, 3, 5, 10] }) },
    ],
    [
      { skill: 'repeated_addition', from: 1, weight: 4, params: (s) => ({ max: s < 5 ? 4 : 6 }) },
      { skill: 'mult_array', from: 2, weight: 4, params: (s) => ({ tables: s < 5 ? [2, 5, 10] : [2, 3, 4, 5, 10], max: s < 5 ? 5 : 8 }) },
      { skill: 'skip_count', from: 1, weight: 2.5, params: () => ({ steps: [3, 4, 5, 10] }) },
      { skill: 'add_within', from: 1, weight: 2.5, params: () => ({ max: 100, regroup: true }) },
    ],
  ],
  // -------------------------------------------------------------- 3rd grade
  [
    [
      { skill: 'mult_facts', from: 1, weight: 6, params: (s) => ({ tables: s < 3 ? [2, 5, 10] : s < 6 ? [2, 3, 4, 5, 10] : [3, 4, 6, 7, 8, 9], max: 10 }) },
      { skill: 'mult_array', from: 1, weight: 2, params: () => ({ tables: [2, 3, 4, 5], max: 6 }) },
      { skill: 'add_within', from: 4, weight: 1.5, params: () => ({ max: 1000, regroup: true }) },
    ],
    [
      { skill: 'div_facts', from: 1, weight: 5, params: (s) => ({ tables: s < 5 ? [2, 3, 4, 5, 10] : [3, 4, 6, 7, 8, 9], max: 10 }) },
      { skill: 'fraction_identify', from: 2, weight: 4, params: (s) => ({ dens: s < 6 ? [2, 3, 4] : [2, 3, 4, 6, 8] }) },
      { skill: 'mult_by_ten', from: 5, weight: 2.5, params: () => ({}) },
      { skill: 'mult_facts', from: 1, weight: 2.5, params: () => ({ tables: [2, 3, 4, 5, 6, 7, 8, 9], max: 10 }) },
    ],
  ],
  // -------------------------------------------------------------- 4th grade
  [
    [
      { skill: 'mult_multi', from: 1, weight: 5, params: (s) => ({ mode: s < 4 ? '2x1' : s < 7 ? '3x1' : '2x2' }) },
      { skill: 'div_remainder', from: 3, weight: 4, params: (s) => ({ max: s < 6 ? 60 : 99 }) },
      { skill: 'mult_facts', from: 1, weight: 2, params: () => ({ tables: [6, 7, 8, 9, 11, 12], max: 12 }) },
    ],
    [
      { skill: 'fraction_compare', from: 1, weight: 4.5, params: (s) => ({ unlike: s >= 4 }) },
      { skill: 'fraction_equivalent', from: 3, weight: 3.5, params: () => ({}) },
      { skill: 'decimal_identify', from: 2, weight: 3, params: (s) => ({ hundredths: s >= 5 }) },
      { skill: 'decimal_compare', from: 5, weight: 3, params: () => ({}) },
    ],
  ],
  // -------------------------------------------------------------- 5th grade
  [
    [
      { skill: 'fraction_add', from: 1, weight: 5, params: (s) => ({ unlike: s >= 5 }) },
      { skill: 'fraction_sub', from: 3, weight: 4, params: (s) => ({ unlike: s >= 6 }) },
      { skill: 'fraction_of_whole', from: 2, weight: 3, params: () => ({}) },
    ],
    [
      { skill: 'decimal_add_sub', from: 1, weight: 4.5, params: (s) => ({ hundredths: s >= 4 }) },
      { skill: 'decimal_times_ten', from: 2, weight: 3, params: () => ({}) },
      { skill: 'decimal_mult', from: 5, weight: 3, params: () => ({}) },
      { skill: 'order_of_ops', from: 1, weight: 4, params: (s) => ({ parens: s >= 6 }) },
    ],
  ],
];

export function choiceCount(band) {
  return band <= 2 ? 3 : 4;
}

// ------------------------------------------------------------ distractor tools

/** Near-miss numbers: the most common slip at every age. */
export function nearMisses(rng, answer, { min = 0, max = Infinity, spread = 3 } = {}) {
  const out = [];
  for (let d = 1; d <= spread; d++) {
    out.push(answer + d, answer - d);
  }
  return shuffle(rng, out).filter((v) => v >= min && v <= max && v !== answer);
}

/**
 * A candidate answer is only usable if it is well formed and plausible for the
 * age group. Negative numbers are rejected outright: a Pre-K child asked
 * "6 − 5" must never be shown "-9" as an option.
 */
function usableChoice(s) {
  if (s == null) return false;
  const t = String(s);
  if (t === '' || /NaN|undefined|Infinity/.test(t)) return false;
  if (t.startsWith('-')) return false;
  if (/\/0(\D|$)/.test(t)) return false; // zero denominator
  return true;
}

/**
 * Assembles the final choice list: the answer plus the best available
 * distractors, padded with near misses if a generator did not supply enough.
 */
function buildChoices(rng, q, n) {
  const answer = String(q.answer);
  const seen = new Set([answer]);
  const picked = [];

  for (const d of q.distractors || []) {
    const s = String(d);
    if (seen.has(s) || !usableChoice(s)) continue;
    seen.add(s);
    picked.push(s);
    if (picked.length >= n - 1) break;
  }

  // Pad with near misses if the generator ran out of usable ideas.
  if (picked.length < n - 1 && Number.isFinite(q.answerValue)) {
    const min = Math.max(0, q.min ?? 0);
    for (const v of nearMisses(rng, q.answerValue, { min, max: q.max ?? Infinity, spread: 8 })) {
      const s = q.format ? q.format(v) : String(v);
      if (seen.has(s) || !usableChoice(s)) continue;
      seen.add(s);
      picked.push(s);
      if (picked.length >= n - 1) break;
    }
  }

  // Absolute last resort, so a question can never render with too few options.
  let pad = 1;
  while (picked.length < n - 1 && pad <= 12) {
    const base = Number.isFinite(q.answerValue) ? q.answerValue : Number(answer);
    const s = Number.isFinite(base) ? String(Math.abs(base) + 10 * pad) : `${answer} ?`.repeat(1) + pad;
    if (!seen.has(s) && usableChoice(s)) { seen.add(s); picked.push(s); }
    pad++;
  }

  const all = shuffle(rng, [answer, ...picked.slice(0, n - 1)]);
  const draws = q.choiceDraw || null;
  return {
    choices: all.map((text) => ({ text, draw: draws ? draws[text] : undefined })),
    answerIndex: all.indexOf(answer),
  };
}

// ------------------------------------------------------------------ front door

/**
 * @param world  world config from data/worlds.js
 * @param stage  1..10
 * @param opts   { easeLevel, warmup, seed, index }
 */
export function makeQuestion(world, stage, opts = {}) {
  const { easeLevel = 0, warmup = false, seed, index = 0 } = opts;
  const rng = opts.rng || mulberry32((seed ?? world.mapSeed) + stage * 7919 + index * 104729);

  // Hidden rubber-banding: after repeated misses the ramp softens a little, and
  // the first questions of every stage are always a gentle warm-up.
  let eff = clamp(stage - easeLevel * 2, 1, 10);
  if (warmup) eff = Math.min(eff, 2);

  const table = RAMP[world.band]?.[world.indexInBand] || RAMP[0][0];
  const available = table.filter((e) => eff >= e.from);
  const pool = (available.length ? available : table.slice(0, 1)).map((e) => ({
    w: Math.max(0.2, typeof e.weight === 'function' ? e.weight(eff) : e.weight),
    v: e,
  }));
  const entry = weightedPick(rng, pool);

  const gen = GENERATORS[entry.skill];
  const raw = gen
    ? gen(rng, { ...entry.params(eff), stage: eff, band: world.band })
    : GENERATORS.count_objects(rng, { max: 5, stage: eff, band: world.band });

  const n = raw.choiceCount || choiceCount(world.band);
  const { choices, answerIndex } = buildChoices(rng, raw, n);

  return {
    skill: entry.skill,
    prompt: raw.prompt,
    promptIcon: raw.promptIcon || null,
    visual: raw.visual || null,
    choices,
    answerIndex,
    answerValue: raw.answer,
    hint: raw.hint || 'Take your time — look at the picture and count carefully.',
    explain: raw.explain || `The answer is ${raw.answer}.`,
    stage: eff,
  };
}

/** Handy for the audit script and for tests. */
export function skillsForWorld(world) {
  const table = RAMP[world.band]?.[world.indexInBand] || [];
  return table.map((e) => e.skill);
}
