// Curriculum front door. makeQuestion(world, stage, opts, rng) -> Question.
// RAMP maps band x world -> weighted skills; weights/params shift with stage
// so new skills phase in while old ones linger as review. DOM-free.

import { weightedPick, shuffle, clamp } from '../core/utils.js';
import * as E from './gen-early.js';
import * as M from './gen-mid.js';
import * as U from './gen-upper.js';

// Each entry: { skill, gen, w(s) -> weight, p(s, world) -> params }
export const RAMP = {
  0: { // ---- Pre-K ----
    0: [
      { skill: 'count', gen: E.count, w: (s) => 10, p: (s, wd) => ({ min: 1, max: s <= 3 ? 5 : s <= 7 ? 8 : 10, sprites: wd.countables }) },
      { skill: 'shapes', gen: E.shapeId, w: (s) => (s >= 3 ? 6 : 0), p: (s) => ({ level: s <= 7 ? 0 : 1 }) },
    ],
    1: [
      { skill: 'compare', gen: E.compareGroups, w: () => 8, p: (s, wd) => ({ max: 3 + Math.ceil(s / 2), gap: s <= 3 ? 3 : s <= 7 ? 2 : 1, fewer: s >= 5, sprites: wd.countables }) },
      { skill: 'biggest', gen: E.pickExtreme, w: () => 6, p: (s) => ({ min: 1, max: 5 + s, count: 3, smallest: s >= 6 }) },
      { skill: 'count', gen: E.count, w: () => 4, p: (s, wd) => ({ min: 2, max: 10, sprites: wd.countables }) },
      { skill: 'shapes', gen: E.shapeId, w: (s) => (s >= 4 ? 3 : 0), p: () => ({ level: 1 }) },
    ],
  },
  1: { // ---- Kindergarten ----
    0: [
      { skill: 'count20', gen: E.countTenFrame, w: () => 9, p: (s) => ({ min: 3, max: s <= 3 ? 10 : s <= 6 ? 15 : 20 }) },
      { skill: 'beforeAfter', gen: E.beforeAfter, w: (s) => (s >= 2 ? 6 : 2), p: (s) => ({ min: 1, max: s <= 5 ? 10 : 19, visual: s <= 6 }) },
      { skill: 'count', gen: E.count, w: () => 3, p: (s, wd) => ({ min: 3, max: 10, sprites: wd.countables }) },
    ],
    1: [
      { skill: 'addTo5', gen: E.addSmall, w: () => 8, p: (s, wd) => ({ max: s <= 6 ? 5 : 7, sprites: wd.countables }) },
      { skill: 'subTo5', gen: E.subSmall, w: (s) => (s >= 2 ? 7 : 3), p: (s, wd) => ({ max: s <= 6 ? 5 : 7, sprites: wd.countables }) },
      { skill: 'beforeAfter', gen: E.beforeAfter, w: () => 3, p: (s) => ({ min: 1, max: 20, visual: s <= 5 }) },
      { skill: 'biggest', gen: E.pickExtreme, w: () => 3, p: (s) => ({ min: 1, max: 10 + s, count: 3, smallest: s >= 5 }) },
    ],
  },
  2: { // ---- 1st grade ----
    0: [
      { skill: 'addTo20', gen: E.addWithin, w: () => 9, p: (s) => ({ max: s <= 3 ? 10 : 20, minSum: s >= 7 ? 11 : 2, visual: s <= 6, plusTen: s >= 3 }) },
      { skill: 'subTo20', gen: E.subWithin, w: (s) => (s >= 2 ? 8 : 4), p: (s) => ({ max: s <= 3 ? 10 : 20, visual: s <= 5 }) },
      { skill: 'count20', gen: E.countTenFrame, w: () => 2, p: () => ({ min: 8, max: 20 }) },
    ],
    1: [
      { skill: 'missingAdd', gen: E.missingAddend, w: () => 8, p: (s) => ({ max: s <= 4 ? 10 : 20, visual: s <= 6 }) },
      { skill: 'placeValue', gen: E.placeValue, w: (s) => (s >= 2 ? 7 : 3), p: (s) => ({ maxTens: s <= 5 ? 5 : 9 }) },
      { skill: 'compare2digit', gen: E.pickExtreme, w: () => 4, p: (s) => ({ min: 10, max: Math.min(99, 20 + s * 8), count: 3, smallest: s >= 5 }) },
      { skill: 'subTo20', gen: E.subWithin, w: () => 3, p: () => ({ max: 20, visual: false }) },
    ],
  },
  3: { // ---- 2nd grade ----
    0: [
      { skill: 'add100', gen: M.addBig, w: () => 8, p: (s) => ({ max: s <= 4 ? 50 : 100, regroup: s >= 5 }) },
      { skill: 'sub100', gen: M.subBig, w: (s) => (s >= 2 ? 7 : 3), p: (s) => ({ max: s <= 4 ? 50 : 100, regroup: s >= 6 }) },
      { skill: 'skipCount', gen: M.skipCount, w: () => 5, p: (s) => ({ steps: s <= 3 ? [10, 5] : [2, 5, 10] }) },
    ],
    1: [
      { skill: 'groupsOf', gen: M.arrayMult, w: () => 8, p: (s) => ({ maxFactor: s <= 4 ? 4 : 5, asAddition: s <= 4 }) },
      { skill: 'skipCount', gen: M.skipCount, w: () => 4, p: () => ({ steps: [2, 3, 5, 10] }) },
      { skill: 'add100', gen: M.addBig, w: () => 4, p: (s) => ({ max: 100, regroup: s >= 3 }) },
      { skill: 'sub100', gen: M.subBig, w: () => 3, p: (s) => ({ max: 100, regroup: s >= 4 }) },
    ],
  },
  4: { // ---- 3rd grade ----
    0: [
      { skill: 'multFacts', gen: M.multFact, w: () => 9, p: (s) => ({ tables: s <= 3 ? [2, 5, 10] : s <= 5 ? [2, 3, 4, 5, 10] : [3, 4, 6, 7, 8, 9], maxB: 10, visual: s <= 4 }) },
      { skill: 'missingFactor', gen: M.missingFactor, w: (s) => (s >= 4 ? 5 : 0), p: (s) => ({ tables: s <= 6 ? [2, 3, 4, 5] : [4, 6, 7, 8], maxB: 9 }) },
      { skill: 'groupsOf', gen: M.arrayMult, w: () => 2, p: () => ({ maxFactor: 6, asAddition: false }) },
    ],
    1: [
      { skill: 'divFacts', gen: M.divFact, w: () => 8, p: (s) => ({ tables: s <= 4 ? [2, 5, 10] : [3, 4, 6, 7, 8], maxB: 9 }) },
      { skill: 'fractions', gen: M.fracIdentify, w: (s) => (s >= 2 ? 7 : 3), p: (s) => ({ dens: s <= 5 ? [2, 3, 4] : [2, 3, 4, 6, 8] }) },
      { skill: 'mult10s', gen: M.mult10, w: (s) => (s >= 5 ? 5 : 2), p: () => ({}) },
      { skill: 'multFacts', gen: M.multFact, w: () => 3, p: () => ({ tables: [4, 6, 7, 8, 9], maxB: 9 }) },
    ],
  },
  5: { // ---- 4th grade ----
    0: [
      { skill: 'bigMult', gen: U.multiDigit, w: () => 8, p: (s) => ({ form: s <= 3 ? '2x1' : s <= 6 ? '3x1' : '2x2' }) },
      { skill: 'divRemainder', gen: U.divRemainder, w: (s) => (s >= 3 ? 7 : 3), p: (s) => ({ maxDiv: s <= 5 ? 6 : 9, maxQ: s <= 5 ? 6 : 9 }) },
      { skill: 'multFacts', gen: M.multFact, w: () => 2, p: () => ({ tables: [6, 7, 8, 9], maxB: 9 }) },
    ],
    1: [
      { skill: 'fracCompare', gen: U.fracCompare, w: () => 8, p: (s) => ({ likeDenoms: s <= 4 }) },
      { skill: 'fracEquiv', gen: U.fracEquiv, w: (s) => (s >= 3 ? 6 : 2), p: () => ({}) },
      { skill: 'decCompare', gen: U.decCompare, w: (s) => (s >= 5 ? 6 : 2), p: () => ({}) },
      { skill: 'decPlace', gen: U.decPlace, w: (s) => (s >= 6 ? 4 : 0), p: () => ({}) },
      { skill: 'fractions', gen: M.fracIdentify, w: () => 2, p: () => ({ dens: [3, 4, 6, 8] }) },
    ],
  },
  6: { // ---- 5th grade ----
    0: [
      { skill: 'fracAddSub', gen: U.fracAddSubLike, w: () => 8, p: () => ({}) },
      { skill: 'fracUnlike', gen: U.fracAddUnlike, w: (s) => (s >= 5 ? 7 : 0), p: () => ({}) },
      { skill: 'fracOf', gen: U.fracOfWhole, w: (s) => (s >= 3 ? 5 : 2), p: () => ({}) },
      { skill: 'fracEquiv', gen: U.fracEquiv, w: () => 2, p: () => ({}) },
    ],
    1: [
      { skill: 'decAddSub', gen: U.decAddSub, w: () => 8, p: () => ({}) },
      { skill: 'decShift', gen: U.decShift, w: (s) => (s >= 3 ? 6 : 2), p: (s) => ({ hundreds: s >= 6 }) },
      { skill: 'decMul', gen: U.decMulSmall, w: (s) => (s >= 5 ? 5 : 0), p: () => ({}) },
      { skill: 'orderOps', gen: U.orderOps, w: (s) => (s >= 4 ? 7 : 0), p: (s) => ({ parens: s >= 6 }) },
      { skill: 'decCompare', gen: U.decCompare, w: () => 2, p: () => ({}) },
    ],
  },
};

const fmtVal = (v) => String(v);

function buildChoices(raw, nChoices, rnd) {
  if (raw.choicesOverride) {
    const arr = raw.choicesOverride.map(fmtVal);
    const ansText = fmtVal(raw.answer);
    if (!arr.includes(ansText)) arr[0] = ansText;
    return shuffle(rnd, arr);
  }
  const ansText = fmtVal(raw.answer);
  const isNum = typeof raw.answer === 'number';
  const seen = new Set([ansText]);
  const out = [ansText];
  for (const cand of raw.distractors || []) {
    if (out.length >= nChoices) break;
    if (cand === null || cand === undefined) continue;
    if (isNum && typeof cand === 'number' && (cand < 0 || !isFinite(cand))) continue;
    const txt = fmtVal(typeof cand === 'number' ? Math.round(cand * 100) / 100 : cand);
    if (seen.has(txt)) continue;
    seen.add(txt);
    out.push(txt);
  }
  // numeric padding fallback so we always reach nChoices
  let delta = 1;
  const base = isNum ? raw.answer : 0;
  while (out.length < nChoices && delta < 60) {
    for (const cand of [base + delta, base - delta]) {
      if (out.length >= nChoices) break;
      if (cand < 0) continue;
      const txt = fmtVal(Math.round(cand * 100) / 100);
      if (!seen.has(txt)) { seen.add(txt); out.push(txt); }
    }
    delta++;
  }
  return shuffle(rnd, out);
}

// world: config from worlds.js; stage: 1..10; opts: { ease, warmup }
export function makeQuestion(world, stage, opts, rnd) {
  const ease = opts?.ease ?? 0;
  const sEff = opts?.warmup ? 1 : clamp(stage - ease * 2, 1, 10);
  const entries = RAMP[world.band][world.indexInBand];
  const entry = weightedPick(rnd, entries, (e) => e.w(sEff));
  const raw = entry.gen(rnd, entry.p(sEff, world));
  const nChoices = world.band <= 2 ? 3 : 4;
  const choices = buildChoices(raw, raw.choicesOverride ? raw.choicesOverride.length : nChoices, rnd);
  const answerText = fmtVal(raw.answer);
  return {
    skill: entry.skill,
    prompt: raw.prompt,
    visual: raw.visual || null,
    choices,
    answerIndex: choices.indexOf(answerText),
    answerText,
    hint: raw.hint,
    explain: raw.explain,
  };
}
