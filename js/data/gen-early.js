// Question generators for Pre-K, Kindergarten and 1st grade.
// Pure functions: (rng, params) -> raw question. No DOM, no globals.

import { randInt, pick, shuffle } from '../core/utils.js';

const COUNTABLES = ['apple', 'star', 'duck', 'shell', 'block'];
const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'oval', 'hexagon'];
const SHAPE_NAMES = {
  circle: 'Circle', square: 'Square', triangle: 'Triangle', star: 'Star',
  heart: 'Heart', diamond: 'Diamond', oval: 'Oval', hexagon: 'Hexagon',
};

const num = (rng, a, b) => randInt(rng, a, b);

/** Distractors that model a counting slip rather than a random guess. */
const countSlips = (rng, answer, min = 0) =>
  shuffle(rng, [answer + 1, answer - 1, answer + 2, answer - 2]).filter((v) => v >= min && v !== answer);

export const EARLY = {
  // ------------------------------------------------------------------- Pre-K

  count_objects(rng, p) {
    const max = Math.max(2, Math.min(10, p.max ?? 5));
    const n = num(rng, 1, max);
    const sprite = pick(rng, COUNTABLES);
    return {
      prompt: 'How many?',
      visual: { kind: 'countRow', sprite, count: n },
      answer: n,
      answerValue: n,
      min: 0,
      distractors: countSlips(rng, n, 0),
      hint: 'Touch each one as you count: 1, 2, 3…',
      explain: `There are ${n}.`,
    };
  },

  shape_match(rng, p) {
    const poolSize = Math.min(SHAPES.length, p.pool ?? 3);
    const pool = SHAPES.slice(0, poolSize);
    const target = pick(rng, pool);
    const others = shuffle(rng, pool.filter((s) => s !== target)).slice(0, 2);
    const choiceDraw = {};
    for (const s of [target, ...others]) choiceDraw[SHAPE_NAMES[s]] = { kind: 'shape', shape: s };
    return {
      prompt: 'Find the shape that matches!',
      visual: { kind: 'shape', shape: target, color: '#ffd34e' },
      answer: SHAPE_NAMES[target],
      distractors: others.map((s) => SHAPE_NAMES[s]),
      choiceDraw,
      hint: 'Look at the picture. Which one has the same shape?',
      explain: `That shape is a ${SHAPE_NAMES[target].toLowerCase()}.`,
    };
  },

  count_next(rng, p) {
    const max = Math.max(3, Math.min(20, p.max ?? 6));
    const n = num(rng, 1, max - 1);
    const back = rng() < 0.3 && n > 1;
    const answer = back ? n - 1 : n + 1;
    return {
      prompt: back ? `What comes just before ${n}?` : `What comes just after ${n}?`,
      visual: { kind: 'numberLine', min: Math.max(0, n - 4), max: n + 4, marks: [{ at: n, label: '?', color: '#ff7ab8' }] },
      answer,
      answerValue: answer,
      min: 0,
      distractors: countSlips(rng, answer, 0),
      hint: back ? 'Count backwards one step.' : 'Count on one more.',
      explain: `${back ? 'Before' : 'After'} ${n} comes ${answer}.`,
    };
  },

  compare_groups(rng, p) {
    const max = Math.max(3, Math.min(10, p.max ?? 6));
    const gap = Math.max(1, p.gap ?? 2);
    const a = num(rng, 1, max - gap);
    const b = a + gap;
    const flip = rng() < 0.5;
    const sprite = pick(rng, COUNTABLES);
    const more = rng() < 0.65;
    const answer = more ? b : a;
    return {
      prompt: more ? 'Which group has MORE?' : 'Which group has FEWER?',
      visual: {
        kind: 'compareGroups',
        left: { sprite, count: flip ? b : a },
        right: { sprite, count: flip ? a : b },
      },
      answer,
      answerValue: answer,
      distractors: [more ? a : b],
      choiceCount: 2,
      hint: 'Count each group, then compare the numbers.',
      explain: `${a} and ${b}: ${answer} is ${more ? 'more' : 'fewer'}.`,
    };
  },

  biggest_smallest(rng, p) {
    const max = Math.max(5, Math.min(20, p.max ?? 9));
    const set = [];
    while (set.length < 3) {
      const v = num(rng, 1, max);
      if (!set.includes(v)) set.push(v);
    }
    const biggest = rng() < 0.6;
    const answer = biggest ? Math.max(...set) : Math.min(...set);
    return {
      prompt: biggest ? 'Tap the BIGGEST number' : 'Tap the SMALLEST number',
      visual: null,
      answer,
      answerValue: answer,
      distractors: set.filter((v) => v !== answer),
      choiceCount: 3,
      hint: biggest ? 'The biggest number is the one furthest along when you count.' : 'The smallest number comes first when you count.',
      explain: `${set.join(', ')} — ${answer} is the ${biggest ? 'biggest' : 'smallest'}.`,
    };
  },

  // ------------------------------------------------------------ Kindergarten

  ten_frame_count(rng, p) {
    const max = Math.max(3, Math.min(20, p.max ?? 10));
    const n = num(rng, 1, max);
    return {
      prompt: 'How many dots?',
      visual: { kind: 'tenFrame', count: n },
      answer: n,
      answerValue: n,
      min: 0,
      distractors: countSlips(rng, n, 0),
      hint: n > 5 ? 'The top row is 5. Count on from there!' : 'Count the dots one by one.',
      explain: `That is ${n} dots.`,
    };
  },

  numeral_id(rng, p) {
    const max = Math.max(5, Math.min(20, p.max ?? 10));
    const n = num(rng, 1, max);
    return {
      prompt: `Tap the number ${numberWord(n)}`,
      visual: { kind: 'tenFrame', count: n },
      answer: n,
      answerValue: n,
      min: 0,
      distractors: countSlips(rng, n, 0),
      hint: 'Count the dots to check.',
      explain: `${numberWord(n)} is written ${n}.`,
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
      visual: { kind: 'countRow', sprite, count: a },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [a + b, a, ...countSlips(rng, answer, 0)],
      hint: `Count ${a}, then take ${b} away.`,
      explain: `${a} − ${b} = ${answer}.`,
    };
  },

  one_more_less(rng, p) {
    const max = Math.max(5, Math.min(20, p.max ?? 10));
    const n = num(rng, 2, max);
    const more = rng() < 0.5;
    const answer = more ? n + 1 : n - 1;
    return {
      prompt: more ? `One MORE than ${n}` : `One LESS than ${n}`,
      visual: { kind: 'tenFrame', count: n },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [n, more ? n - 1 : n + 1, ...countSlips(rng, answer, 0)],
      hint: more ? 'Count on one from the picture.' : 'Take one away from the picture.',
      explain: `One ${more ? 'more' : 'less'} than ${n} is ${answer}.`,
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
      prompt: bigger ? 'Which number is BIGGER?' : 'Which number is SMALLER?',
      visual: { kind: 'numberLine', min: 0, max: Math.max(a, b) + 2, marks: [
        { at: a, label: String(a), color: '#7ec8ff' },
        { at: b, label: String(b), color: '#ff7ab8' },
      ] },
      answer,
      answerValue: answer,
      distractors: [a === answer ? b : a],
      choiceCount: 2,
      hint: 'On a number line, bigger numbers are further to the right.',
      explain: `${answer} is ${bigger ? 'bigger' : 'smaller'}.`,
    };
  },

  // --------------------------------------------------------------- 1st grade

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
      visual: max <= 20 && a + b <= 20 ? { kind: 'numberLine', min: 0, max: Math.max(20, answer), hop: { from: a, to: answer }, marks: [{ at: a, label: String(a), color: '#7ec8ff' }] } : null,
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
      visual: max <= 20 ? { kind: 'numberLine', min: 0, max: Math.max(20, a), hop: { from: a, to: answer }, marks: [{ at: a, label: String(a), color: '#7ec8ff' }] } : null,
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
      visual: { kind: 'tenFrame', count: a },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [total, total + a, a, ...countSlips(rng, answer, 0)],
      hint: `How many more to get from ${a} up to ${total}? Count on.`,
      explain: `${a} + ${answer} = ${total}.`,
    };
  },

  place_value(rng, p) {
    const max = p.max ?? 99;
    const tens = num(rng, 1, Math.floor(max / 10));
    const ones = num(rng, 0, 9);
    const value = tens * 10 + ones;
    const askBuild = rng() < 0.55;
    if (askBuild) {
      return {
        prompt: `${tens} ten${tens > 1 ? 's' : ''} and ${ones} one${ones === 1 ? '' : 's'} = ?`,
        visual: null,
        answer: value,
        answerValue: value,
        min: 0,
        distractors: [ones * 10 + tens, tens + ones, value + 10, value - 10],
        hint: 'The tens digit goes first, then the ones digit.',
        explain: `${tens} tens and ${ones} ones is ${value}.`,
      };
    }
    return {
      prompt: `How many TENS are in ${value}?`,
      visual: null,
      answer: tens,
      answerValue: tens,
      min: 0,
      distractors: [ones, value, tens + 1, Math.max(0, tens - 1)],
      hint: 'The tens digit is the first digit of a two-digit number.',
      explain: `${value} has ${tens} tens and ${ones} ones.`,
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
      prompt: bigger ? 'Which is GREATER?' : 'Which is LESS?',
      visual: null,
      answer,
      answerValue: answer,
      distractors: [answer === a ? b : a],
      choiceCount: 2,
      hint: 'Compare the tens digit first. If they match, compare the ones.',
      explain: `${answer} is ${bigger ? 'greater' : 'less'}.`,
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
