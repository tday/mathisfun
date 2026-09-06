// Question generators for Pre-K, Kindergarten and 1st grade, following the
// Illustrative Mathematics K-1 progression: counting collections, composing and
// decomposing numbers, unknowns in every position of an equation, base-ten
// blocks, length in units, and data.
//
// THE RULE FOR THIS FILE: nothing here may produce a prompt containing a letter.
// Everyone in these three bands is a pre- or early reader, so the question is
// asked entirely by the picture, a drawn icon chip, and mathematical symbols.
// `tools/audit-questions.mjs` fails the build if a letter slips in.
//
// AND: where the picture already asks the question, there is no prompt at all.
// Five apples above three numbered buttons does not need a "?" hovering over it,
// and a lone "?" is one more thing on screen for a four-year-old to work out.
// A prompt earns its place only when it *is* the question — "3 + 2 = ?" — or
// when a drawn icon chip carries a direction the picture cannot.
//
// Every question still names itself for a screen reader through `srPrompt`,
// which is never rendered. Quiet on screen is not the same as unlabelled.
//
// Pure functions: (rng, params) -> raw question. No DOM, no globals.

import { randInt, pick, shuffle } from '../core/utils.js';

/**
 * The countable sprites a question may ask for. Kept here rather than imported
 * from `gfx/` because `js/data/` must stay DOM-free and one-way below the
 * graphics layer; the audit checks this list against `PROPS` so the two cannot
 * drift into a question that renders nothing.
 */
export const COUNTABLES = ['apple', 'star', 'duck', 'shell', 'block', 'leaf', 'flower', 'fish', 'balloon', 'cookie'];
const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'oval', 'hexagon'];
const SHAPE_NAMES = {
  circle: 'Circle', square: 'Square', triangle: 'Triangle', star: 'Star',
  heart: 'Heart', diamond: 'Diamond', oval: 'Oval', hexagon: 'Hexagon',
};
/** Shapes whose corners can actually be counted, with how many they have. */
const CORNERS = { triangle: 3, square: 4, diamond: 4, hexagon: 6, star: 5 };

const ARRANGEMENTS = ['grid', 'row', 'scatter', 'dice'];

const num = (rng, a, b) => randInt(rng, a, b);

/** Distractors that model a counting slip rather than a random guess. */
const countSlips = (rng, answer, min = 0) =>
  shuffle(rng, [answer + 1, answer - 1, answer + 2, answer - 2]).filter((v) => v >= min && v !== answer);

/**
 * Picks how a collection is laid out. IM asks children to count the same
 * quantity arranged several ways on purpose: a child who can only count a neat
 * row has not yet understood that the arrangement does not change the number.
 */
function arrangement(rng, n) {
  // A "dice face" of one or two is not a dice face, and the card frame around
  // it reads as a numeral card instead of a collection.
  const usable = ARRANGEMENTS.filter((a) => a !== 'dice' || (n >= 3 && n <= 6));
  return pick(rng, usable);
}

/** Builds n drawn dot-groups as answer choices, keyed by their own numeral. */
function dotChoices(values) {
  const draw = {};
  for (const v of values) draw[String(v)] = { kind: 'dots', n: v };
  return draw;
}

export const EARLY = {
  // ------------------------------------------------- Pre-K / IM K "Numbers 1-10"

  /** How many objects? The collection is arranged differently every time. */
  count_objects(rng, p) {
    const max = Math.max(3, Math.min(10, p.max ?? 5));
    // At least two: "how many?" over a single object is not a counting question,
    // and the answer list would have to include 0 to fill up.
    const n = num(rng, 2, max);
    const sprite = pick(rng, COUNTABLES);
    return {
      prompt: '',
      srPrompt: 'How many?',
      visual: { kind: 'countRow', sprite, count: n, arrange: arrangement(rng, n), seed: n * 7 + max },
      answer: n,
      answerValue: n,
      min: 1,
      // Never offer 0 against a picture of objects that are plainly there.
      distractors: countSlips(rng, n, 1),
      hint: 'Point to each one. Count 1, 2, 3…',
      explain: `There are ${n}.`,
    };
  },

  /**
   * The converse of counting: read the numeral, then pick the group that has
   * that many. Connecting symbol to quantity in both directions is IM K's whole
   * "Numbers 1-10" unit, and it stops "how many?" being the only question a
   * Pre-K child ever sees.
   */
  numeral_to_group(rng, p) {
    const max = Math.max(4, Math.min(10, p.max ?? 6));
    const n = num(rng, 2, max);
    const wrong = shuffle(rng, countSlips(rng, n, 1)).slice(0, 2);
    return {
      // "3 = ?" is drawn inside the picture, so nothing sits above it.
      prompt: '',
      srPrompt: `Which group has ${n}?`,
      visual: { kind: 'matchCard', left: { value: n } },
      answer: n,
      distractors: wrong,
      choiceDraw: dotChoices([n, ...wrong]),
      choiceCount: 3,
      hint: 'Count the dots in each answer until you find that many.',
      explain: `${n} dots is ${n}.`,
    };
  },

  /** Match the shape. The equals sign and the empty card ask the question. */
  shape_match(rng, p) {
    const poolSize = Math.min(SHAPES.length, p.pool ?? 3);
    const pool = SHAPES.slice(0, poolSize);
    const target = pick(rng, pool);
    const others = shuffle(rng, pool.filter((s) => s !== target)).slice(0, 2);
    const choiceDraw = {};
    for (const s of [target, ...others]) choiceDraw[SHAPE_NAMES[s]] = { kind: 'shape', shape: s };
    return {
      prompt: '',
      srPrompt: 'Which shape is the same?',
      visual: { kind: 'matchCard', left: { shape: target }, color: '#ffd34e' },
      answer: SHAPE_NAMES[target],
      distractors: others.map((s) => SHAPE_NAMES[s]),
      choiceDraw,
      choiceCount: 3,
      hint: 'Look at the picture. Find the same shape.',
      explain: `That shape is a ${SHAPE_NAMES[target].toLowerCase()}.`,
    };
  },

  /**
   * Count the corners of a flat shape (IM K "Flat Shapes All Around Us").
   * Corners are dotted in the picture, and for these shapes the corner count and
   * the side count agree, so either way a child reads it they are right.
   */
  shape_corners(rng) {
    const shape = pick(rng, Object.keys(CORNERS));
    const answer = CORNERS[shape];
    return {
      prompt: '',
      srPrompt: 'How many corners?',
      visual: { kind: 'shape', shape, color: '#7ec8ff', corners: true },
      answer,
      answerValue: answer,
      min: 1,
      distractors: countSlips(rng, answer, 1),
      hint: 'Touch each corner as you count it.',
      explain: `A ${shape} has ${answer} corners.`,
    };
  },

  /** Number track with a gap: the sequence says which way to count. */
  count_next(rng, p) {
    const max = Math.max(3, Math.min(20, p.max ?? 6));
    const n = num(rng, 2, max - 1);
    const back = rng() < 0.35 && n > 2;
    const answer = back ? n - 1 : n + 1;
    const cells = back
      ? [null, n, n + 1, n + 2]
      : [n - 2, n - 1, n, null];
    return {
      prompt: '',
      srPrompt: 'Which number is missing?',
      visual: { kind: 'numberTrack', cells, dir: back ? 'back' : 'fwd' },
      answer,
      answerValue: answer,
      min: 0,
      distractors: countSlips(rng, answer, 0),
      hint: back ? 'Count backwards one step.' : 'Count on one more.',
      explain: `${cells.map((c) => (c === null ? answer : c)).join(', ')}`,
    };
  },

  /** A gap anywhere in the run, not only at an end. */
  count_gap(rng, p) {
    const max = Math.max(5, Math.min(20, p.max ?? 10));
    const start = num(rng, 1, Math.max(1, max - 3));
    const run = [start, start + 1, start + 2, start + 3];
    const gapAt = num(rng, 1, 2);
    const answer = run[gapAt];
    const cells = run.map((v, i) => (i === gapAt ? null : v));
    return {
      prompt: '',
      srPrompt: 'Which number is missing?',
      visual: { kind: 'numberTrack', cells, dir: 'fwd' },
      answer,
      answerValue: answer,
      min: 0,
      distractors: countSlips(rng, answer, 0),
      hint: 'Say the numbers out loud. Which one is missing?',
      explain: `${run.join(', ')}`,
    };
  },

  /** More / fewer, with the direction carried by a drawn arrow chip. */
  compare_groups(rng, p) {
    const max = Math.max(3, Math.min(10, p.max ?? 6));
    const gap = Math.max(1, p.gap ?? 2);
    const a = num(rng, 1, max - gap);
    const b = a + gap;
    const flip = rng() < 0.5;
    const sprite = pick(rng, COUNTABLES);
    const more = p.bothWays ? rng() < 0.6 : true;
    const answer = more ? b : a;
    return {
      prompt: '',
      srPrompt: more ? 'Which side has more?' : 'Which side has fewer?',
      promptIcon: more ? 'iconMore' : 'iconFewer',
      visual: {
        kind: 'compareGroups',
        left: { sprite, count: flip ? b : a },
        right: { sprite, count: flip ? a : b },
      },
      answer,
      answerValue: answer,
      distractors: [more ? a : b],
      choiceCount: 2,
      hint: 'Count each side, then look at the arrow.',
      explain: `${a} and ${b}: ${answer} is ${more ? 'more' : 'fewer'}.`,
    };
  },

  /** Biggest / smallest of three numerals — same arrow convention. */
  biggest_smallest(rng, p) {
    const max = Math.max(5, Math.min(20, p.max ?? 9));
    const set = [];
    while (set.length < 3) {
      const v = num(rng, 1, max);
      if (!set.includes(v)) set.push(v);
    }
    const biggest = p.bothWays ? rng() < 0.6 : true;
    const answer = biggest ? Math.max(...set) : Math.min(...set);
    return {
      prompt: '',
      srPrompt: biggest ? 'Which is biggest?' : 'Which is smallest?',
      promptIcon: biggest ? 'iconMore' : 'iconFewer',
      visual: {
        kind: 'numberLine',
        min: Math.max(0, Math.min(...set) - 1),
        max: Math.max(...set) + 1,
        marks: set.map((v, i) => ({ at: v, label: String(v), color: ['#7ec8ff', '#ff7ab8', '#7ee0b8'][i] })),
      },
      answer,
      answerValue: answer,
      distractors: set.filter((v) => v !== answer),
      choiceCount: 3,
      hint: 'Numbers further along the line are bigger.',
      explain: `${set.join(', ')} — ${answer} is the ${biggest ? 'biggest' : 'smallest'}.`,
    };
  },

  // ---------------------------------------- Kindergarten / IM K "Numbers 0-20"

  ten_frame_count(rng, p) {
    const max = Math.max(4, Math.min(20, p.max ?? 10));
    const n = num(rng, 2, max);
    return {
      prompt: '',
      srPrompt: 'How many dots?',
      visual: { kind: 'tenFrame', count: n },
      answer: n,
      answerValue: n,
      min: 1,
      distractors: countSlips(rng, n, 1),
      hint: n > 5 ? 'The top row is 5. Count on from there.' : 'Count the dots one by one.',
      explain: `That is ${n} dots.`,
    };
  },

  /**
   * Part-part-whole with any one of the three unknown. IM's core model for
   * composing and decomposing, and the thing that makes a missing addend make
   * sense later on.
   */
  number_bond(rng, p) {
    const max = Math.max(5, Math.min(20, p.max ?? 10));
    const whole = p.makeTen ? 10 : num(rng, 3, max);
    const a = num(rng, 1, whole - 1);
    const b = whole - a;
    const slot = p.makeTen ? 2 : num(rng, 0, 2); // 0 = whole unknown
    const answer = slot === 0 ? whole : slot === 1 ? a : b;
    return {
      prompt: '',
      srPrompt: 'What is the missing number?',
      visual: {
        kind: 'numberBond',
        whole: slot === 0 ? null : whole,
        parts: [slot === 1 ? null : a, slot === 2 ? null : b],
      },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [slot === 0 ? Math.abs(a - b) : whole, slot === 0 ? a : whole + 1, ...countSlips(rng, answer, 0)],
      hint: slot === 0 ? 'Put the two parts together.' : 'Take the part you can see away from the whole.',
      explain: `${a} and ${b} make ${whole}.`,
    };
  },

  add_objects(rng, p) {
    const max = Math.max(3, p.max ?? 5);
    const a = num(rng, 1, Math.max(1, max - 1));
    const b = num(rng, 1, Math.max(1, max - a));
    const sprite = pick(rng, COUNTABLES);
    const answer = a + b;
    return {
      prompt: `${a} + ${b} = ?`,
      visual: { kind: 'countGroups', op: '+', groups: [{ sprite, count: a }, { sprite, count: b }] },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [a, b, ...countSlips(rng, answer, 0)],
      hint: `Start at ${a} and count on ${b} more.`,
      explain: `${a} + ${b} = ${answer}.`,
    };
  },

  sub_objects(rng, p) {
    const max = Math.max(3, p.max ?? 5);
    const a = num(rng, 2, max);
    const b = num(rng, 1, a - 1);
    const sprite = pick(rng, COUNTABLES);
    const answer = a - b;
    return {
      prompt: `${a} − ${b} = ?`,
      visual: { kind: 'countRow', sprite, count: a, arrange: 'row' },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [a + b, a, ...countSlips(rng, answer, 0)],
      hint: `Count ${a}, then take ${b} away.`,
      explain: `${a} − ${b} = ${answer}.`,
    };
  },

  /** Addition shown inside a ten-frame, so five-and-some-more stays visible. */
  ten_frame_add(rng, p) {
    const max = Math.min(20, Math.max(6, p.max ?? 10));
    const a = num(rng, 1, Math.min(9, max - 2));
    const b = num(rng, 1, Math.min(9, max - a));
    const answer = a + b;
    return {
      prompt: `${a} + ${b} = ?`,
      visual: { kind: 'tenFrame', count: answer, first: a },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [a, b, Math.abs(a - b), ...countSlips(rng, answer, 0)],
      hint: `Fill ${a} squares, then ${b} more.`,
      explain: `${a} + ${b} = ${answer}.`,
    };
  },

  one_more_less(rng, p) {
    const max = Math.max(5, Math.min(20, p.max ?? 10));
    const n = num(rng, 2, max);
    const more = rng() < 0.5;
    const answer = more ? n + 1 : n - 1;
    return {
      prompt: '',
      srPrompt: 'Which number is missing?',
      visual: {
        kind: 'numberTrack',
        cells: more ? [n - 1, n, null] : [null, n, n + 1],
        dir: more ? 'fwd' : 'back',
      },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [n, more ? n - 1 : n + 1, ...countSlips(rng, answer, 0)],
      hint: more ? 'Count on one more.' : 'Count back one.',
      explain: `${more ? n : answer}, then ${more ? answer : n}.`,
    };
  },

  compare_numerals(rng, p) {
    const max = Math.max(6, Math.min(20, p.max ?? 12));
    const a = num(rng, 1, max);
    let b = num(rng, 1, max);
    while (b === a) b = num(rng, 1, max);
    const bigger = rng() < 0.65;
    const answer = bigger ? Math.max(a, b) : Math.min(a, b);
    return {
      prompt: '',
      srPrompt: bigger ? 'Which is bigger?' : 'Which is smaller?',
      promptIcon: bigger ? 'iconMore' : 'iconFewer',
      visual: {
        kind: 'numberLine',
        min: Math.max(0, Math.min(a, b) - 2),
        max: Math.max(a, b) + 2,
        marks: [
          { at: a, label: String(a), color: '#7ec8ff' },
          { at: b, label: String(b), color: '#ff7ab8' },
        ],
      },
      answer,
      answerValue: answer,
      distractors: [a === answer ? b : a],
      choiceCount: 2,
      hint: 'Bigger numbers are further right.',
      explain: `${answer} is ${bigger ? 'bigger' : 'smaller'}.`,
    };
  },

  // -------------------------- 1st grade / IM 1 "Adding and Subtracting within 20"

  add_within(rng, p) {
    const max = p.max ?? 20;
    let a, b;
    if (max <= 20) {
      const total = p.allowOver10 ? num(rng, 5, max) : num(rng, 2, Math.min(10, max));
      a = num(rng, 1, total - 1);
      b = total - a;
    } else if (p.regroup) {
      // Force a carry so the "regrouping" stages actually practise regrouping.
      const aOnes = num(rng, 5, 9), bOnes = num(rng, 10 - aOnes, 9);
      const aTens = num(rng, 1, Math.floor(max / 20)), bTens = num(rng, 1, Math.floor(max / 20));
      a = aTens * 10 + aOnes;
      b = bTens * 10 + bOnes;
    } else {
      a = num(rng, 10, Math.floor(max / 2));
      b = num(rng, 2, Math.floor(max / 2));
    }
    const answer = a + b;
    const noCarry = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10 + ((a % 10) + (b % 10)) % 10;
    return {
      prompt: `${a} + ${b} = ?`,
      // A 0-20 line for "2 + 1" is twenty tiny labels of noise. Frame the
      // line tightly around the numbers actually in play.
      visual: max <= 20 && a + b <= 20
        ? {
          kind: 'numberLine',
          min: Math.max(0, Math.max(a, b) - 3),
          max: answer + 2,
          hop: { from: a, to: answer, label: `+${b}` },
          marks: [{ at: a, label: String(a), color: '#7ec8ff' }],
        }
        : null,
      answer,
      answerValue: answer,
      min: 0,
      distractors: [Math.abs(a - b), noCarry !== answer ? noCarry : answer + 10, answer + 10, answer - 10, ...countSlips(rng, answer, 0)],
      hint: max <= 20
        ? `Start at the bigger number (${Math.max(a, b)}) and count on ${Math.min(a, b)}.`
        : 'Add the ones first, then the tens. Remember to carry!',
      explain: `${a} + ${b} = ${answer}.`,
    };
  },

  sub_within(rng, p) {
    const max = p.max ?? 20;
    let a, b;
    if (max <= 20) {
      a = num(rng, 3, max);
      b = num(rng, 1, a - 1);
    } else if (p.regroup) {
      const aOnes = num(rng, 0, 4), bOnes = num(rng, aOnes + 1, 9);
      const aTens = num(rng, 3, Math.floor(max / 10) - 1);
      const bTens = num(rng, 1, aTens - 1);
      a = aTens * 10 + aOnes;
      b = bTens * 10 + bOnes;
    } else {
      a = num(rng, Math.floor(max / 2), max);
      b = num(rng, 2, Math.floor(a / 2));
    }
    const answer = a - b;
    return {
      prompt: `${a} − ${b} = ?`,
      visual: max <= 20
        ? {
          kind: 'numberLine',
          min: Math.max(0, answer - 2),
          max: a + 2,
          hop: { from: a, to: answer, label: `−${b}` },
          marks: [{ at: a, label: String(a), color: '#7ec8ff' }],
        }
        : null,
      answer,
      answerValue: answer,
      min: 0,
      distractors: [a + b, b - a > 0 ? b - a : answer + 10, answer + 10, answer - 10, ...countSlips(rng, answer, 0)],
      hint: max <= 20
        ? `Start at ${a} and count back ${b}.`
        : 'Subtract the ones first. If you cannot, borrow a ten!',
      explain: `${a} − ${b} = ${answer}.`,
    };
  },

  /** Doubles and near-doubles — the facts IM leans on hardest in grade 1. */
  doubles(rng, p) {
    const max = Math.min(10, Math.max(3, p.max ?? 10));
    const a = num(rng, 2, max);
    const near = p.near ? num(rng, -1, 1) : 0;
    const b = Math.max(1, a + near);
    const answer = a + b;
    return {
      prompt: `${a} + ${b} = ?`,
      visual: { kind: 'dotArray', counts: [a, b] },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [a * 2 + 1, a * 2 - 1, a + b + 2, Math.abs(a - b) || a, ...countSlips(rng, answer, 1)],
      hint: near === 0 ? `Double ${a}.` : `${Math.min(a, b)} + ${Math.min(a, b)} first, then one more.`,
      explain: `${a} + ${b} = ${answer}.`,
    };
  },

  /**
   * Crossing ten by making a ten first — shown as two hops on the number line,
   * which is the strategy itself rather than a picture of the answer.
   */
  make_ten(rng) {
    const a = num(rng, 6, 9);
    const b = num(rng, 11 - a, 9);
    const answer = a + b;
    const toTen = 10 - a;
    return {
      prompt: `${a} + ${b} = ?`,
      visual: {
        kind: 'numberLine',
        min: Math.max(0, a - 2),
        max: answer + 2,
        marks: [{ at: a, label: String(a), color: '#7ec8ff' }],
        hops: [
          { from: a, to: 10, label: `+${toTen}`, color: '#7ee0b8' },
          { from: 10, to: answer, label: `+${b - toTen}`, color: '#ffd34e' },
        ],
      },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [10, answer - 10, answer + 10, Math.abs(a - b), ...countSlips(rng, answer, 0)],
      hint: `${a} needs ${toTen} to reach 10. Then add the rest of the ${b}.`,
      explain: `${a} + ${toTen} = 10, and 10 + ${b - toTen} = ${answer}.`,
    };
  },

  add_ten(rng, p) {
    const max = p.max ?? 90;
    const a = num(rng, 5, max);
    const plus = rng() < 0.6;
    const answer = plus ? a + 10 : a - 10;
    if (answer < 0) return EARLY.add_ten(rng, { max: 60 });
    return {
      prompt: `${a} ${plus ? '+' : '−'} 10 = ?`,
      visual: null,
      answer,
      answerValue: answer,
      min: 0,
      distractors: [plus ? a + 1 : a - 1, plus ? a - 10 : a + 10, a, ...countSlips(rng, answer, 0)],
      hint: 'Adding or taking away 10 only changes the tens digit.',
      explain: `${a} ${plus ? '+' : '−'} 10 = ${answer}.`,
    };
  },

  missing_addend(rng, p) {
    const max = p.max ?? 10;
    const total = num(rng, 4, max);
    const a = num(rng, 1, total - 1);
    const answer = total - a;
    return {
      prompt: `${a} + ? = ${total}`,
      visual: {
        kind: 'numberLine',
        min: Math.max(0, a - 2),
        max: total + 2,
        hop: { from: a, to: total, label: '?' },
        marks: [{ at: a, label: String(a), color: '#7ec8ff' }],
      },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [total, total + a, a, ...countSlips(rng, answer, 0)],
      hint: `How many more to get from ${a} up to ${total}? Count on.`,
      explain: `${a} + ${answer} = ${total}.`,
    };
  },

  /**
   * The unknown moved around the equation, including onto the left of the equals
   * sign. IM makes a point of this: a child who only ever sees "a + b = ?" comes
   * to read "=" as "write the answer here" rather than "the same amount as".
   */
  equation_unknown(rng, p) {
    const max = p.max ?? 10;
    const total = num(rng, 4, max);
    const a = num(rng, 1, total - 1);
    const b = total - a;
    // `slot` says which of whole/part/part is unknown, rather than inferring it
    // from the answer — with a == b those are indistinguishable.
    const forms = [
      { prompt: `? + ${b} = ${total}`, answer: a, slot: 1 },
      { prompt: `${a} + ? = ${total}`, answer: b, slot: 2 },
      { prompt: `${total} = ? + ${b}`, answer: a, slot: 1 },
      { prompt: `${total} = ${a} + ?`, answer: b, slot: 2 },
      { prompt: `${total} − ? = ${b}`, answer: a, slot: 1 },
      { prompt: `${total} − ${a} = ?`, answer: b, slot: 2 },
      { prompt: `? − ${a} = ${b}`, answer: total, slot: 0 },
    ];
    const form = pick(rng, forms);
    return {
      prompt: form.prompt,
      // The bond carries the same unknown as the equation. Filling all three in
      // would print the answer next to the question.
      visual: {
        kind: 'numberBond',
        whole: form.slot === 0 ? null : total,
        parts: [form.slot === 1 ? null : a, form.slot === 2 ? null : b],
      },
      answer: form.answer,
      answerValue: form.answer,
      min: 0,
      distractors: [total, a, b, total + a, ...countSlips(rng, form.answer, 0)]
        .filter((v) => v !== form.answer),
      hint: form.slot === 0
        ? 'The two parts go together to make the whole.'
        : 'Take the part you can see away from the whole.',
      explain: `${a} + ${b} = ${total}.`,
    };
  },

  /**
   * Data. IM opens both grade 1 and grade 2 with sorting and representing data,
   * and a picture graph asks "how many" without a single word: the row in
   * question is ringed.
   */
  picture_graph(rng, p) {
    const rowCount = p.rows ?? 3;
    const max = Math.max(3, Math.min(9, p.max ?? 6));
    const sprites = shuffle(rng, COUNTABLES).slice(0, rowCount);
    const counts = [];
    // From two: a row of one is not something a child has to count.
    while (counts.length < rowCount) {
      const v = num(rng, 2, Math.max(3, max));
      if (!counts.includes(v)) counts.push(v);
    }
    const markIdx = num(rng, 0, rowCount - 1);
    const answer = counts[markIdx];
    return {
      prompt: '',
      srPrompt: 'How many in the highlighted row?',
      visual: {
        kind: 'pictureGraph',
        rows: sprites.map((sprite, i) => ({ sprite, count: counts[i], mark: i === markIdx })),
      },
      answer,
      answerValue: answer,
      min: 1,
      distractors: [...counts.filter((c) => c !== answer), ...countSlips(rng, answer, 1)],
      hint: 'Count along the row that is lit up.',
      explain: `That row has ${answer}.`,
    };
  },

  // ------------------------------- 1st grade / IM 1 "Numbers to 99", "Length"

  /** Base-ten blocks in, numeral out. */
  base_ten_build(rng, p) {
    const maxTens = Math.max(1, Math.min(9, Math.floor((p.max ?? 99) / 10)));
    const tens = num(rng, 1, maxTens);
    const ones = num(rng, 0, 9);
    const answer = tens * 10 + ones;
    return {
      prompt: '',
      srPrompt: 'How many altogether?',
      visual: { kind: 'baseTen', tens, ones },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [ones * 10 + tens, tens + ones, answer + 10, answer - 10, answer + 1],
      hint: 'Each tall stack is ten. Count the stacks, then the singles.',
      explain: `${tens} tens and ${ones} ones is ${answer}.`,
    };
  },

  /** Numeral in, blocks out — the same idea read the other way. */
  base_ten_read(rng, p) {
    const maxTens = Math.max(1, Math.min(6, Math.floor((p.max ?? 69) / 10)));
    const tens = num(rng, 1, maxTens);
    const ones = num(rng, 1, 9);
    const value = tens * 10 + ones;
    // Distractors are the two classic misreadings: digits swapped, and the
    // tens digit taken as a count of single blocks.
    const wrong = [ones * 10 + tens, value + 10 <= 99 ? value + 10 : value - 10, value - 1]
      .filter((v) => v !== value && v >= 10 && v <= 99)
      .filter((v, i, all) => all.indexOf(v) === i)
      .slice(0, 2);
    const all = [value, ...wrong];
    const choiceDraw = {};
    for (const v of all) choiceDraw[String(v)] = { kind: 'baseTen', tens: Math.floor(v / 10), ones: v % 10 };
    return {
      prompt: '',
      srPrompt: `Which blocks show ${value}?`,
      visual: { kind: 'matchCard', left: { value } },
      answer: value,
      distractors: wrong,
      choiceDraw,
      choiceCount: all.length,
      hint: 'Count the tall stacks of ten first.',
      explain: `${value} is ${tens} tens and ${ones} ones.`,
    };
  },

  compare_two_digit(rng, p) {
    const max = p.max ?? 99;
    const a = num(rng, 10, max);
    let b = rng() < 0.5 ? swapDigits(a) : num(rng, 10, max);
    if (b === a) b = a + 1;
    const bigger = rng() < 0.6;
    const answer = bigger ? Math.max(a, b) : Math.min(a, b);
    return {
      prompt: '',
      srPrompt: bigger ? 'Which is bigger?' : 'Which is smaller?',
      promptIcon: bigger ? 'iconMore' : 'iconFewer',
      visual: {
        kind: 'numberLine',
        min: Math.max(0, Math.min(a, b) - 8),
        max: Math.max(a, b) + 8,
        marks: [
          { at: a, label: String(a), color: '#7ec8ff' },
          { at: b, label: String(b), color: '#ff7ab8' },
        ],
      },
      answer,
      answerValue: answer,
      distractors: [answer === a ? b : a],
      choiceCount: 2,
      hint: 'Compare the tens first, then the ones.',
      explain: `${answer} is ${bigger ? 'greater' : 'less'}.`,
    };
  },

  /**
   * Length as a count of same-sized units laid end to end from a common start.
   * IM teaches measurement this way long before a ruler appears, because the
   * unit is the idea and the ruler is only a shortcut for it.
   */
  measure_length(rng, p) {
    const max = Math.max(4, Math.min(12, p.max ?? 8));
    const units = num(rng, 2, max);
    // A couple of spare units past the end of the bar: enough that the child has
    // to stop counting at the right place, not so many that the units shrink to
    // nothing next to what is being measured.
    const span = Math.min(12, units + num(rng, 1, 3));
    return {
      prompt: '',
      srPrompt: 'How many units long?',
      visual: { kind: 'lengthUnits', units, span, color: pick(rng, ['#ff9ec4', '#7ee0b8', '#c9a4f0', '#ffd34e']) },
      answer: units,
      answerValue: units,
      min: 1,
      distractors: countSlips(rng, units, 1),
      hint: 'Count the squares underneath, from the very start of the bar.',
      explain: `The bar is ${units} units long.`,
    };
  },

  /**
   * Where does the jump land? IM grade 2 builds addition and subtraction on the
   * number line; introducing it here keeps the model continuous across grades.
   */
  number_line_jump(rng, p) {
    const max = p.max ?? 30;
    const forward = rng() < 0.6;
    const start = num(rng, forward ? 2 : 10, Math.max(12, max - 10));
    const step = pick(rng, [2, 3, 5, 10].filter((s) => s <= max / 3));
    const answer = forward ? start + step : Math.max(0, start - step);
    return {
      prompt: '',
      srPrompt: 'Where does the jump land?',
      visual: {
        kind: 'numberLine',
        min: Math.max(0, Math.min(start, answer) - 3),
        max: Math.max(start, answer) + 3,
        marks: [
          { at: start, label: String(start), color: '#7ec8ff' },
          { at: answer, label: '?', color: '#ffe9a8' },
        ],
        hops: [{ from: start, to: answer, label: `${forward ? '+' : '−'}${step}` }],
      },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [start, forward ? start - step : start + step, answer + 1, answer - 1, answer + 10],
      hint: `Start at ${start} and jump ${step}${forward ? ' forwards' : ' backwards'}.`,
      explain: `${start} ${forward ? '+' : '−'} ${step} = ${answer}.`,
    };
  },
};

function swapDigits(n) {
  const t = Math.floor(n / 10), o = n % 10;
  return o * 10 + t;
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

export function numberWord(n) {
  return WORDS[n] || String(n);
}
