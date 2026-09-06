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
  // Readiness for IM Kindergarten: counting collections and naming shapes.
  [
    // "Math in Our World" — count a collection however it is arranged.
    [
      { skill: 'count_objects', from: 1, weight: (s) => 6 - s * 0.3, params: (s) => ({ max: Math.min(10, 4 + Math.floor(s * 0.7)) }) },
      { skill: 'shape_match', from: 1, weight: 3, params: (s) => ({ pool: s < 6 ? 3 : 5 }) },
      { skill: 'numeral_to_group', from: 2, weight: 3, params: (s) => ({ max: Math.min(10, 3 + Math.floor(s * 0.7)) }) },
      { skill: 'count_next', from: 4, weight: 2.5, params: (s) => ({ max: Math.min(10, 4 + s) }) },
      { skill: 'shape_corners', from: 6, weight: 2, params: () => ({}) },
      { skill: 'count_gap', from: 7, weight: 2, params: (s) => ({ max: Math.min(10, 4 + s) }) },
    ],
    // "Numbers 1-10" — compare and order the quantities you can now count.
    [
      { skill: 'compare_groups', from: 1, weight: 4.5, params: (s) => ({ max: Math.min(10, 4 + Math.floor(s * 0.7)), gap: Math.max(1, 4 - Math.floor(s / 3)), bothWays: s >= 7 }) },
      { skill: 'count_objects', from: 1, weight: 3, params: (s) => ({ max: Math.min(10, 5 + Math.floor(s * 0.5)) }) },
      { skill: 'numeral_to_group', from: 2, weight: 2.5, params: () => ({ max: 8 }) },
      { skill: 'biggest_smallest', from: 3, weight: 3, params: (s) => ({ max: Math.min(10, 5 + s), bothWays: s >= 8 }) },
      { skill: 'count_next', from: 5, weight: 2.5, params: (s) => ({ max: Math.min(10, 5 + s) }) },
      { skill: 'shape_match', from: 6, weight: 2, params: () => ({ pool: 6 }) },
    ],
  ],
  // --------------------------------------------------------- Kindergarten
  [
    // IM K units 1-3: Math in Our World, Numbers 1-10, Flat Shapes All Around Us.
    [
      { skill: 'ten_frame_count', from: 1, weight: 4.5, params: (s) => ({ max: Math.min(20, 5 + s * 1.5 | 0) }) },
      { skill: 'count_objects', from: 1, weight: 3, params: (s) => ({ max: Math.min(10, 6 + s) }) },
      { skill: 'numeral_to_group', from: 2, weight: 3, params: () => ({ max: 10 }) },
      { skill: 'shape_match', from: 3, weight: 2.5, params: (s) => ({ pool: s < 7 ? 5 : 8 }) },
      { skill: 'shape_corners', from: 4, weight: 2.5, params: () => ({}) },
      { skill: 'count_next', from: 4, weight: 2.5, params: (s) => ({ max: Math.min(20, 8 + s) }) },
      { skill: 'count_gap', from: 6, weight: 2, params: (s) => ({ max: Math.min(20, 8 + s) }) },
    ],
    // IM K units 4-6: Understanding Addition and Subtraction, Composing and
    // Decomposing Numbers to 10, Numbers 0-20.
    [
      { skill: 'add_objects', from: 1, weight: 4.5, params: (s) => ({ max: s < 5 ? 5 : 8 }) },
      { skill: 'one_more_less', from: 1, weight: 2.5, params: (s) => ({ max: Math.min(20, 8 + s) }) },
      { skill: 'ten_frame_count', from: 1, weight: 2, params: (s) => ({ max: Math.min(20, 10 + s) }) },
      { skill: 'number_bond', from: 2, weight: 3.5, params: (s) => ({ max: s < 6 ? 8 : 10, makeTen: s >= 8 }) },
      { skill: 'sub_objects', from: 3, weight: 3.5, params: (s) => ({ max: s < 6 ? 5 : 8 }) },
      { skill: 'ten_frame_add', from: 4, weight: 3, params: (s) => ({ max: s < 7 ? 10 : 15 }) },
      { skill: 'compare_numerals', from: 5, weight: 2.5, params: (s) => ({ max: Math.min(20, 10 + s) }) },
    ],
  ],
  // -------------------------------------------------------------- 1st grade
  [
    // IM 1 units 1-3: data, story problems, adding and subtracting within 20.
    [
      { skill: 'add_within', from: 1, weight: 4.5, params: (s) => ({ max: s < 4 ? 10 : 20, allowOver10: s >= 4 }) },
      { skill: 'picture_graph', from: 1, weight: 2.5, params: (s) => ({ rows: 3, max: Math.min(9, 4 + s) }) },
      { skill: 'sub_within', from: 2, weight: 3.5, params: (s) => ({ max: s < 5 ? 10 : 20 }) },
      { skill: 'doubles', from: 2, weight: 2.5, params: (s) => ({ max: s < 6 ? 6 : 10, near: s >= 5 }) },
      { skill: 'missing_addend', from: 3, weight: 3, params: (s) => ({ max: s < 6 ? 10 : 20 }) },
      { skill: 'equation_unknown', from: 4, weight: 3, params: (s) => ({ max: s < 7 ? 10 : 20 }) },
      { skill: 'make_ten', from: 5, weight: 3, params: () => ({}) },
    ],
    // IM 1 units 4-6: Numbers to 99, Adding within 100, Length Measurements.
    [
      { skill: 'base_ten_build', from: 1, weight: 4, params: (s) => ({ max: s < 6 ? 59 : 99 }) },
      { skill: 'measure_length', from: 1, weight: 3, params: (s) => ({ max: Math.min(12, 5 + s) }) },
      { skill: 'add_ten', from: 2, weight: 2.5, params: () => ({ max: 90 }) },
      { skill: 'base_ten_read', from: 2, weight: 3, params: (s) => ({ max: s < 6 ? 49 : 69 }) },
      { skill: 'compare_two_digit', from: 3, weight: 3, params: () => ({ max: 99 }) },
      { skill: 'add_within', from: 4, weight: 3, params: (s) => ({ max: s < 8 ? 20 : 100, allowOver10: true }) },
      { skill: 'number_line_jump', from: 5, weight: 3, params: (s) => ({ max: s < 8 ? 30 : 60 }) },
    ],
  ],
  // -------------------------------------------------------------- 2nd grade
  [
    // IM 2 units 1-4: data, adding and subtracting within 100, measuring
    // length, and addition and subtraction on the number line.
    [
      { skill: 'add_within', from: 1, weight: 4.5, params: (s) => ({ max: s < 4 ? 50 : 100, regroup: s >= 5 }) },
      { skill: 'bar_graph', from: 1, weight: 2.5, params: (s) => ({ rows: s < 5 ? 3 : 4, max: 8 }) },
      { skill: 'measure_length', from: 1, weight: 2, params: () => ({ max: 12 }) },
      { skill: 'sub_within', from: 2, weight: 3.5, params: (s) => ({ max: s < 4 ? 50 : 100, regroup: s >= 5 }) },
      { skill: 'number_line_sum', from: 3, weight: 3, params: (s) => ({ max: s < 7 ? 60 : 100 }) },
      { skill: 'skip_count', from: 4, weight: 2.5, params: (s) => ({ steps: s < 7 ? [2, 5, 10] : [2, 3, 5, 10] }) },
    ],
    // IM 2 units 5-9: Numbers to 1,000; geometry, time and money; adding and
    // subtracting within 1,000; equal groups.
    [
      { skill: 'place_value_3digit', from: 1, weight: 4, params: (s) => ({ max: s < 5 ? 499 : 999 }) },
      { skill: 'repeated_addition', from: 1, weight: 2.5, params: (s) => ({ max: s < 5 ? 4 : 6 }) },
      { skill: 'money_total', from: 2, weight: 3, params: (s) => ({ max: s < 6 ? 4 : 6, quarters: s >= 5 }) },
      { skill: 'clock_time', from: 3, weight: 3, params: (s) => ({ fiveMinutes: s >= 6 }) },
      { skill: 'even_odd', from: 4, weight: 2, params: (s) => ({ max: s < 7 ? 20 : 40 }) },
      { skill: 'equal_groups', from: 5, weight: 3, params: (s) => ({ groups: s < 8 ? 4 : 5, each: s < 8 ? 4 : 6 }) },
      { skill: 'mult_array', from: 6, weight: 2.5, params: () => ({ tables: [2, 5, 10], max: 5 }) },
      { skill: 'add_within', from: 5, weight: 2, params: () => ({ max: 1000, regroup: true }) },
    ],
  ],
  // -------------------------------------------------------------- 3rd grade
  [
    // IM 3 units 1-3: Introducing Multiplication, Area and Multiplication,
    // Wrapping Up Addition and Subtraction Within 1,000.
    [
      { skill: 'mult_facts', from: 1, weight: 5, params: (s) => ({ tables: s < 3 ? [2, 5, 10] : s < 6 ? [2, 3, 4, 5, 10] : [3, 4, 6, 7, 8, 9], max: 10 }) },
      { skill: 'equal_groups', from: 1, weight: 2.5, params: (s) => ({ groups: 5, each: s < 5 ? 5 : 6 }) },
      { skill: 'mult_array', from: 2, weight: 3, params: () => ({ tables: [2, 3, 4, 5], max: 6 }) },
      { skill: 'area_rect', from: 3, weight: 3.5, params: (s) => ({ max: s < 6 ? 5 : 8 }) },
      { skill: 'add_within', from: 5, weight: 2, params: () => ({ max: 1000, regroup: true }) },
      { skill: 'sub_within', from: 6, weight: 2, params: () => ({ max: 1000, regroup: true }) },
    ],
    // IM 3 units 4-7: Relating Multiplication to Division, Fractions as
    // Numbers, Measuring, Two-dimensional Shapes and Perimeter.
    [
      { skill: 'div_facts', from: 1, weight: 4.5, params: (s) => ({ tables: s < 5 ? [2, 3, 4, 5, 10] : [3, 4, 6, 7, 8, 9], max: 10 }) },
      { skill: 'mult_facts', from: 1, weight: 2, params: () => ({ tables: [2, 3, 4, 5, 6, 7, 8, 9], max: 10 }) },
      { skill: 'fraction_identify', from: 2, weight: 3, params: (s) => ({ dens: s < 6 ? [2, 3, 4] : [2, 3, 4, 6, 8] }) },
      { skill: 'fraction_number_line', from: 3, weight: 3.5, params: (s) => ({ dens: s < 6 ? [2, 3, 4] : [2, 3, 4, 6, 8], whole: s >= 8 ? 2 : 1 }) },
      { skill: 'perimeter_rect', from: 4, weight: 3, params: (s) => ({ max: s < 7 ? 7 : 12 }) },
      { skill: 'mult_by_ten', from: 6, weight: 2.5, params: () => ({}) },
    ],
  ],
  // -------------------------------------------------------------- 4th grade
  [
    // IM 4 units 1, 4 and 6: Factors and Multiples; From Hundredths to
    // Hundred-thousands; Multiplying and Dividing Multi-digit Numbers.
    [
      { skill: 'mult_multi', from: 1, weight: 4, params: (s) => ({ mode: s < 4 ? '2x1' : s < 7 ? '3x1' : '2x2' }) },
      { skill: 'factor_pair', from: 1, weight: 3, params: (s) => ({ targets: s < 5 ? [12, 16, 18, 20, 24] : [24, 30, 36, 40, 48, 60] }) },
      { skill: 'multiple_of', from: 2, weight: 2.5, params: (s) => ({ bases: s < 5 ? [3, 4, 6] : [6, 7, 8, 9] }) },
      { skill: 'place_value_large', from: 3, weight: 3, params: (s) => ({ digits: s < 6 ? 4 : 6 }) },
      { skill: 'round_number', from: 4, weight: 2.5, params: (s) => ({ places: s < 7 ? [10, 100] : [10, 100, 1000] }) },
      { skill: 'div_remainder', from: 5, weight: 3, params: (s) => ({ max: s < 8 ? 60 : 99 }) },
    ],
    // IM 4 units 2, 3, 5 and 7: Fraction Equivalence and Comparison; Extending
    // Operations to Fractions; Multiplicative Comparison; Angles.
    [
      { skill: 'fraction_compare', from: 1, weight: 4, params: (s) => ({ unlike: s >= 4 }) },
      { skill: 'mult_compare', from: 1, weight: 2.5, params: (s) => ({ max: s < 5 ? 6 : 9 }) },
      { skill: 'fraction_equivalent', from: 2, weight: 3, params: () => ({}) },
      { skill: 'fraction_add', from: 3, weight: 3, params: () => ({ unlike: false }) },
      { skill: 'decimal_identify', from: 4, weight: 3, params: (s) => ({ hundredths: s >= 6 }) },
      { skill: 'angle_measure', from: 5, weight: 2.5, params: (s) => ({ angles: s < 8 ? [30, 45, 60, 90, 120] : [30, 45, 60, 90, 120, 135, 150] }) },
      { skill: 'decimal_compare', from: 6, weight: 2.5, params: () => ({}) },
    ],
  ],
  // -------------------------------------------------------------- 5th grade
  [
    // IM 5 units 1-3: Finding Volume; Fractions as Quotients and Fraction
    // Multiplication; Multiplying and Dividing Fractions.
    [
      { skill: 'volume_prism', from: 1, weight: 3.5, params: (s) => ({ max: s < 5 ? 4 : 5 }) },
      { skill: 'fraction_of_whole', from: 1, weight: 2.5, params: () => ({}) },
      { skill: 'fraction_times_whole', from: 2, weight: 3, params: () => ({}) },
      { skill: 'fraction_add', from: 2, weight: 3, params: (s) => ({ unlike: s >= 5 }) },
      { skill: 'fraction_mult', from: 3, weight: 3.5, params: () => ({}) },
      { skill: 'fraction_sub', from: 4, weight: 3, params: (s) => ({ unlike: s >= 7 }) },
      { skill: 'fraction_div', from: 5, weight: 3, params: () => ({}) },
    ],
    // IM 5 units 4-7: Wrapping Up Multiplication and Division with Multi-digit
    // Numbers; Place Value Patterns and Decimal Operations; More Decimal and
    // Fraction Operations; Shapes on the Coordinate Plane.
    [
      { skill: 'powers_of_ten', from: 1, weight: 3, params: () => ({}) },
      { skill: 'mult_multi', from: 1, weight: 3, params: (s) => ({ mode: s < 5 ? '3x1' : '2x2' }) },
      { skill: 'decimal_add_sub', from: 2, weight: 3.5, params: (s) => ({ hundredths: s >= 4 }) },
      { skill: 'div_remainder', from: 2, weight: 2.5, params: () => ({ max: 99 }) },
      { skill: 'order_of_ops', from: 3, weight: 3, params: (s) => ({ parens: s >= 6 }) },
      { skill: 'decimal_times_ten', from: 3, weight: 2.5, params: () => ({}) },
      { skill: 'decimal_mult', from: 4, weight: 2.5, params: () => ({}) },
      { skill: 'coord_point', from: 5, weight: 2.5, params: (s) => ({ span: s < 8 ? 6 : 8 }) },
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
  // When a generator draws its choices, every option has to have a drawing.
  // Padding a picture question with a bare numeral would put an unanswerable
  // button on screen, so those questions accept only what they supplied.
  const drawn = q.choiceDraw || null;
  const ok = (s) => usableChoice(s) && (!drawn || drawn[s] !== undefined);

  for (const d of q.distractors || []) {
    const s = String(d);
    if (seen.has(s) || !ok(s)) continue;
    seen.add(s);
    picked.push(s);
    if (picked.length >= n - 1) break;
  }

  // Pad with near misses if the generator ran out of usable ideas.
  if (!drawn && picked.length < n - 1 && Number.isFinite(q.answerValue)) {
    const min = Math.max(0, q.min ?? 0);
    for (const v of nearMisses(rng, q.answerValue, { min, max: q.max ?? Infinity, spread: 8 })) {
      const s = q.format ? q.format(v) : String(v);
      if (seen.has(s) || !ok(s)) continue;
      seen.add(s);
      picked.push(s);
      if (picked.length >= n - 1) break;
    }
  }

  // Absolute last resort, so a question can never render with too few options.
  let pad = 1;
  while (!drawn && picked.length < n - 1 && pad <= 12) {
    const base = Number.isFinite(q.answerValue) ? q.answerValue : Number(answer);
    const s = Number.isFinite(base) ? String(Math.abs(base) + 10 * pad) : `${answer} ?`.repeat(1) + pad;
    if (!seen.has(s) && ok(s)) { seen.add(s); picked.push(s); }
    pad++;
  }

  const all = shuffle(rng, [answer, ...picked.slice(0, n - 1)]);
  return {
    choices: all.map((text) => ({ text, draw: drawn ? drawn[text] : undefined })),
    answerIndex: all.indexOf(answer),
  };
}

// ------------------------------------------------------------------ front door

/**
 * How hard a skill is pushed away for having just been asked. Index 0 is the
 * question that came immediately before. Without this a weighted pick happily
 * serves "How many?" five times in a row, which is the single fastest way to
 * make a stage feel like a worksheet.
 */
const REPEAT_PENALTY = [0.08, 0.25, 0.5, 0.75];

/**
 * @param world  world config from data/worlds.js
 * @param stage  1..10
 * @param opts   { easeLevel, warmup, seed, index, recent }
 *               `recent` is the recently asked skills, most recent first.
 */
export function makeQuestion(world, stage, opts = {}) {
  const { easeLevel = 0, warmup = false, seed, index = 0, recent = [] } = opts;
  const rng = opts.rng || mulberry32((seed ?? world.mapSeed) + stage * 7919 + index * 104729);

  // Hidden rubber-banding: after repeated misses the ramp softens a little, and
  // the first questions of every stage are always a gentle warm-up.
  let eff = clamp(stage - easeLevel * 2, 1, 10);
  if (warmup) eff = Math.min(eff, 2);

  const table = RAMP[world.band]?.[world.indexInBand] || RAMP[0][0];
  const available = table.filter((e) => eff >= e.from);
  const usable = available.length ? available : table.slice(0, 1);
  const pool = usable.map((e) => {
    const base = Math.max(0.2, typeof e.weight === 'function' ? e.weight(eff) : e.weight);
    const ago = recent.indexOf(e.skill);
    const penalty = ago >= 0 && ago < REPEAT_PENALTY.length ? REPEAT_PENALTY[ago] : 1;
    return { w: Math.max(0.05, base * penalty), v: e };
  });
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
