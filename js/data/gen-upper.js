// Question generators for 4th and 5th grade, following Illustrative Mathematics:
// factors and multiples, place value to the hundred-thousands, multi-digit
// multiplication and division, fraction equivalence and arithmetic,
// multiplicative comparison, angles, volume, decimal operations and the
// coordinate plane.

import { randInt, pick, shuffle, gcd } from '../core/utils.js';

const num = (rng, a, b) => randInt(rng, a, b);
const slips = (rng, answer, min = 0) =>
  shuffle(rng, [answer + 1, answer - 1, answer + 10, answer - 10]).filter((v) => v >= min && v !== answer);

const fmt = (v) => {
  const r = Math.round(v * 1000) / 1000;
  return String(r);
};

function simplify(n, d) {
  const g = gcd(n, d);
  return [n / g, d / g];
}

export const UPPER = {
  // --------------------------------------------------------------- 4th grade

  mult_multi(rng, p) {
    const mode = p.mode || '2x1';
    let a, b;
    if (mode === '2x1') { a = num(rng, 12, 89); b = num(rng, 3, 9); }
    else if (mode === '3x1') { a = num(rng, 112, 899); b = num(rng, 3, 9); }
    else { a = num(rng, 12, 49); b = num(rng, 11, 29); }
    const answer = a * b;
    // A dropped carry is the signature multi-digit slip.
    const noCarry = mode === '2x1'
      ? Math.floor(a / 10) * 10 * b + ((a % 10) * b) % 10
      : answer - 100;
    return {
      prompt: `${a} × ${b} = ?`,
      visual: null,
      answer,
      answerValue: answer,
      min: 0,
      distractors: [noCarry, answer + b, answer - b, answer + 10 * b, a + b],
      hint: mode === '2x2'
        ? `Split it up: ${a} × ${Math.floor(b / 10) * 10} plus ${a} × ${b % 10}.`
        : `Multiply the ones first (${a % 10} × ${b}), then the tens. Carry anything over 9.`,
      explain: `${a} × ${b} = ${answer}.`,
    };
  },

  div_remainder(rng, p) {
    const divisor = num(rng, 3, 9);
    const quotient = num(rng, 3, Math.max(4, Math.floor((p.max ?? 60) / divisor)));
    const rem = num(rng, 1, divisor - 1);
    const dividend = divisor * quotient + rem;
    const answer = `${quotient} R${rem}`;
    return {
      prompt: `${dividend} ÷ ${divisor} = ?`,
      visual: null,
      answer,
      distractors: shuffle(rng, [
        `${quotient + 1} R${rem}`,
        `${quotient} R${(rem % (divisor - 1)) + 1 === rem ? rem + 1 : (rem % (divisor - 1)) + 1}`,
        `${quotient - 1} R${rem}`,
        `${quotient + 1} R${Math.max(1, rem - 1)}`,
        `${quotient}`,
      ]).filter((s) => s !== answer),
      hint: `How many whole ${divisor}s fit into ${dividend}? Whatever is left over is the remainder.`,
      explain: `${divisor} × ${quotient} = ${divisor * quotient}, with ${rem} left over.`,
    };
  },

  fraction_compare(rng, p) {
    let a, b;
    if (p.unlike) {
      const d1 = pick(rng, [2, 3, 4, 5, 6, 8]);
      let d2 = pick(rng, [2, 3, 4, 5, 6, 8]);
      while (d2 === d1) d2 = pick(rng, [2, 3, 4, 5, 6, 8]);
      a = { n: num(rng, 1, d1 - 1), d: d1 };
      b = { n: num(rng, 1, d2 - 1), d: d2 };
      // Unlike denominators can land on the same value (1/2 and 3/6), which
      // makes "which is greater" unanswerable. Step b to the nearest numerator
      // that is genuinely different — in either direction, because nudging down
      // from 1/2 has nowhere to go.
      if (a.n * b.d === b.n * a.d) {
        const alt = [b.n + 1, b.n - 1, b.n + 2].find((n) => n >= 1 && n <= d2 - 1 && a.n * d2 !== n * d1);
        if (alt == null) return UPPER.fraction_compare(rng, { ...p, unlike: false });
        b.n = alt;
      }
    } else {
      const d = pick(rng, [3, 4, 5, 6, 8]);
      const n1 = num(rng, 1, d - 1);
      let n2 = num(rng, 1, d - 1);
      while (n2 === n1) n2 = num(rng, 1, d - 1);
      a = { n: n1, d };
      b = { n: n2, d };
    }
    const bigger = rng() < 0.65;
    const aVal = a.n / a.d, bVal = b.n / b.d;
    const winner = bigger ? (aVal > bVal ? a : b) : (aVal < bVal ? a : b);
    const loser = winner === a ? b : a;
    return {
      prompt: bigger ? 'Which fraction is GREATER?' : 'Which fraction is SMALLER?',
      visual: { kind: 'fractionBar', bars: [{ num: a.n, den: a.d }, { num: b.n, den: b.d }] },
      answer: `${winner.n}/${winner.d}`,
      distractors: [`${loser.n}/${loser.d}`],
      choiceCount: 2,
      hint: p.unlike
        ? 'Look at the bars — which shaded part covers more?'
        : 'Same bottom number, so just compare the top numbers.',
      explain: `${a.n}/${a.d} = ${fmt(aVal)} and ${b.n}/${b.d} = ${fmt(bVal)}.`,
    };
  },

  fraction_equivalent(rng) {
    const d = pick(rng, [2, 3, 4, 5]);
    const n = num(rng, 1, d - 1);
    const k = num(rng, 2, 4);
    const answer = `${n * k}/${d * k}`;
    return {
      prompt: `Which fraction is the same as ${n}/${d}?`,
      visual: { kind: 'fractionBar', num: n, den: d },
      answer,
      distractors: shuffle(rng, [
        `${n + k}/${d + k}`,            // added instead of multiplied
        `${n * k}/${d}`,                // only scaled the top
        `${n}/${d * k}`,                // only scaled the bottom
        `${n * (k + 1)}/${d * k}`,
      ]).filter((s) => s !== answer),
      hint: 'Multiply the top AND the bottom by the same number.',
      explain: `${n}/${d} × ${k}/${k} = ${answer}.`,
    };
  },

  decimal_identify(rng, p) {
    const den = p.hundredths ? 100 : 10;
    const n = num(rng, 1, den - 1);
    const value = n / den;
    const answer = fmt(value);
    return {
      prompt: `Write ${n}/${den} as a decimal`,
      visual: den === 10 ? { kind: 'fractionBar', num: n, den: 10 } : null,
      answer,
      distractors: shuffle(rng, [
        fmt(n / (den / 10)),     // wrong place value
        fmt(n * 10 / den),
        `0.${n}`,
        fmt(value + 0.1),
      ]).filter((s) => s !== answer),
      hint: den === 10 ? 'Tenths go one place after the point.' : 'Hundredths go two places after the point.',
      explain: `${n}/${den} = ${answer}.`,
    };
  },

  decimal_compare(rng) {
    const a = Math.round(num(rng, 1, 99)) / 100;
    let b = Math.round(num(rng, 1, 9)) / 10;
    if (a === b) b += 0.1;
    const bigger = rng() < 0.65;
    const winner = bigger ? Math.max(a, b) : Math.min(a, b);
    const loser = winner === a ? b : a;
    return {
      prompt: bigger ? 'Which decimal is GREATER?' : 'Which decimal is SMALLER?',
      visual: null,
      answer: fmt(winner),
      distractors: [fmt(loser)],
      choiceCount: 2,
      hint: 'Line up the decimal points and compare place by place — a longer number is not always bigger.',
      explain: `${fmt(winner)} is ${bigger ? 'greater' : 'smaller'} than ${fmt(loser)}.`,
    };
  },

  // --------------------------------------------------------------- 5th grade

  fraction_add(rng, p) {
    let n1, d1, n2, d2;
    if (p.unlike) {
      d1 = pick(rng, [2, 3, 4, 6]);
      d2 = pick(rng, [2, 3, 4, 6, 8].filter((d) => d !== d1));
      n1 = num(rng, 1, d1 - 1);
      n2 = num(rng, 1, d2 - 1);
    } else {
      d1 = d2 = pick(rng, [4, 5, 6, 8, 10]);
      n1 = num(rng, 1, d1 - 2);
      n2 = num(rng, 1, d1 - n1 - 1 || 1);
    }
    const rawN = n1 * d2 + n2 * d1;
    const rawD = d1 * d2;
    const [sn, sd] = simplify(rawN, rawD);
    const answer = sd === 1 ? String(sn) : `${sn}/${sd}`;
    return {
      prompt: `${n1}/${d1} + ${n2}/${d2} = ?`,
      visual: { kind: 'fractionBar', bars: [{ num: n1, den: d1 }, { num: n2, den: d2 }] },
      answer,
      distractors: shuffle(rng, [
        `${n1 + n2}/${d1 + d2}`,                        // the classic straight-across error
        `${n1 + n2}/${d1}`,
        `${rawN}/${rawD}`.replace(answer, `${rawN + 1}/${rawD}`),
        `${sn + 1}/${sd}`,
        `${sn}/${sd + 1}`,
      ]).filter((s) => s !== answer),
      hint: p.unlike
        ? `Make the bottoms match first — both can become ${d1 * d2 / gcd(d1, d2)}.`
        : 'Bottoms already match, so just add the tops.',
      explain: `${n1}/${d1} + ${n2}/${d2} = ${answer}.`,
    };
  },

  fraction_sub(rng, p) {
    let n1, d1, n2, d2;
    if (p.unlike) {
      d1 = pick(rng, [2, 3, 4, 6]);
      d2 = pick(rng, [2, 3, 4, 6, 8].filter((d) => d !== d1));
      n1 = num(rng, 1, d1 - 1);
      n2 = num(rng, 1, d2 - 1);
      if (n1 / d1 < n2 / d2) { [n1, d1, n2, d2] = [n2, d2, n1, d1]; }
      if (n1 / d1 === n2 / d2) n2 = Math.max(1, n2 - 1);
    } else {
      d1 = d2 = pick(rng, [4, 5, 6, 8, 10]);
      n1 = num(rng, 2, d1 - 1);
      n2 = num(rng, 1, n1 - 1);
    }
    const rawN = n1 * d2 - n2 * d1;
    const rawD = d1 * d2;
    const [sn, sd] = simplify(Math.max(0, rawN), rawD);
    const answer = sd === 1 ? String(sn) : `${sn}/${sd}`;
    return {
      prompt: `${n1}/${d1} − ${n2}/${d2} = ?`,
      visual: { kind: 'fractionBar', bars: [{ num: n1, den: d1 }, { num: n2, den: d2 }] },
      answer,
      distractors: shuffle(rng, [
        `${Math.abs(n1 - n2)}/${Math.abs(d1 - d2) || d1}`,
        `${n1 - n2}/${d1}`,
        `${sn + 1}/${sd}`,
        `${sn}/${sd + 1}`,
      ]).filter((s) => s !== answer && !s.includes('-') && !s.includes('/0')),
      hint: p.unlike ? 'Give both fractions the same bottom number first.' : 'Same bottoms — subtract the tops.',
      explain: `${n1}/${d1} − ${n2}/${d2} = ${answer}.`,
    };
  },

  fraction_of_whole(rng) {
    const d = pick(rng, [2, 3, 4, 5, 6]);
    const k = num(rng, 2, 8);
    const whole = d * k;
    const n = num(rng, 1, d - 1);
    const answer = (whole / d) * n;
    return {
      prompt: `What is ${n}/${d} of ${whole}?`,
      visual: { kind: 'fractionBar', num: n, den: d },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [whole / d, whole - answer, answer + d, whole * n, ...slips(rng, answer, 0)],
      hint: `Divide ${whole} by ${d} first, then multiply by ${n}.`,
      explain: `${whole} ÷ ${d} = ${whole / d}, and ${whole / d} × ${n} = ${answer}.`,
    };
  },

  decimal_add_sub(rng, p) {
    const places = p.hundredths ? 100 : 10;
    const a = num(rng, 11, 99) / places * (places === 10 ? 1 : 1);
    const b = num(rng, 11, 99) / places;
    const add = rng() < 0.6;
    const x = Math.max(a, b), y = Math.min(a, b);
    const answer = add ? Math.round((a + b) * places) / places : Math.round((x - y) * places) / places;
    const A = add ? a : x, B = add ? b : y;
    return {
      prompt: `${fmt(A)} ${add ? '+' : '−'} ${fmt(B)} = ?`,
      visual: null,
      answer: fmt(answer),
      answerValue: answer,
      distractors: shuffle(rng, [
        fmt(answer * 10),
        fmt(answer / 10),
        fmt(add ? Math.round((A + B) * places) / places + 0.1 : answer + 0.1),
        fmt(answer - 0.1),
      ]).filter((s) => s !== fmt(answer)),
      hint: 'Line up the decimal points, then add or subtract as usual.',
      explain: `${fmt(A)} ${add ? '+' : '−'} ${fmt(B)} = ${fmt(answer)}.`,
    };
  },

  decimal_times_ten(rng) {
    const times = rng() < 0.6;
    const by10 = rng() < 0.5;
    const factor = by10 ? 10 : 100;
    // Choose how precise the operand is from what the operation will do to it.
    // Dividing 1.97 by 100 gives 0.0197, which the three-place formatter would
    // print as "0.02" — a wrong answer, not a rounded one. Multiplying only ever
    // removes decimal places, so it has no such constraint.
    const places = times ? 100 : (by10 ? 100 : 10);
    const a = num(rng, places / 10 + 1, places * 10 - 1) / places;
    const answer = times
      ? Math.round(a * factor * 1000) / 1000
      : Math.round((a / factor) * 1000) / 1000;
    return {
      prompt: `${fmt(a)} ${times ? '×' : '÷'} ${factor} = ?`,
      visual: null,
      answer: fmt(answer),
      answerValue: answer,
      distractors: shuffle(rng, [
        fmt(times ? a * (factor * 10) : a / 10),
        fmt(times ? a / factor : a * factor),
        fmt(Math.round(answer * 10000) / 1000),
        fmt(Math.round(answer * 100) / 1000),
      ]).filter((s) => s !== fmt(answer)),
      hint: times
        ? `Multiplying by ${factor} moves the point ${by10 ? 'one place' : 'two places'} to the right.`
        : `Dividing by ${factor} moves the point ${by10 ? 'one place' : 'two places'} to the left.`,
      explain: `${fmt(a)} ${times ? '×' : '÷'} ${factor} = ${fmt(answer)}.`,
    };
  },

  decimal_mult(rng) {
    const a = num(rng, 11, 89) / 10;
    const b = num(rng, 2, 9);
    const answer = Math.round(a * b * 10) / 10;
    return {
      prompt: `${fmt(a)} × ${b} = ?`,
      visual: null,
      answer: fmt(answer),
      answerValue: answer,
      distractors: shuffle(rng, [
        fmt(answer * 10),
        fmt(answer / 10),
        fmt(Math.round(a * 10) * b),
        fmt(answer + 1),
      ]).filter((s) => s !== fmt(answer)),
      hint: `Ignore the point: work out ${Math.round(a * 10)} × ${b}, then put the point back one place.`,
      explain: `${fmt(a)} × ${b} = ${fmt(answer)}.`,
    };
  },

  /** Factors and multiples — IM grade 4 unit 1. */
  factor_pair(rng, p) {
    const target = pick(rng, p.targets || [12, 16, 18, 20, 24, 30, 36, 40, 48]);
    const factors = [];
    for (let i = 2; i < target; i++) if (target % i === 0) factors.push(i);
    const answer = pick(rng, factors);
    const nonFactors = [];
    for (let i = 2; i < target && nonFactors.length < 8; i++) if (target % i !== 0) nonFactors.push(i);
    return {
      prompt: `Which number is a factor of ${target}?`,
      visual: null,
      answer,
      answerValue: answer,
      min: 1,
      distractors: shuffle(rng, nonFactors).slice(0, 4),
      hint: `A factor divides ${target} with nothing left over.`,
      explain: `${answer} × ${target / answer} = ${target}.`,
    };
  },

  multiple_of(rng, p) {
    const base = pick(rng, p.bases || [3, 4, 6, 7, 8, 9]);
    const k = num(rng, 3, 9);
    const answer = base * k;
    const wrong = shuffle(rng, [answer + 1, answer - 1, answer + 2, base * k + base - 1, base * (k + 1) + 1])
      .filter((v) => v > 0 && v % base !== 0);
    return {
      prompt: `Which number is a multiple of ${base}?`,
      visual: null,
      answer,
      answerValue: answer,
      min: 1,
      distractors: wrong,
      hint: `Skip count by ${base} and see which one you land on.`,
      explain: `${base} × ${k} = ${answer}.`,
    };
  },

  /** Place value out to the hundred-thousands — IM grade 4 unit 4. */
  place_value_large(rng, p) {
    const digits = p.digits ?? 5;
    let value = 0;
    const ds = [];
    for (let i = 0; i < digits; i++) {
      const d = i === 0 ? num(rng, 1, 9) : num(rng, 0, 9);
      ds.push(d);
      value = value * 10 + d;
    }
    // Never ask what a 0 is worth: the answer is 0 whichever place it sits in,
    // so the question teaches nothing and reads like a trick.
    const nonZero = ds.map((d, i) => (d === 0 ? null : i)).filter((i) => i !== null);
    const at = pick(rng, nonZero);
    const digit = ds[at];
    const place = Math.pow(10, digits - 1 - at);
    const answer = digit * place;
    const names = { 1: 'ones', 10: 'tens', 100: 'hundreds', 1000: 'thousands', 10000: 'ten thousands', 100000: 'hundred thousands' };
    return {
      prompt: `In ${value}, what is the ${digit} in the ${names[place]} place worth?`,
      visual: null,
      answer,
      answerValue: answer,
      min: 0,
      distractors: [digit, digit * place * 10, digit * place / 10, value].filter((v) => Number.isInteger(v) && v > 0 && v !== answer),
      hint: 'Multiply the digit by the value of its place.',
      explain: `${digit} × ${place} = ${answer}.`,
    };
  },

  round_number(rng, p) {
    const place = pick(rng, p.places || [10, 100, 1000]);
    const value = num(rng, place * 2, place * 40);
    const answer = Math.round(value / place) * place;
    const names = { 10: 'ten', 100: 'hundred', 1000: 'thousand' };
    return {
      prompt: `Round ${value} to the nearest ${names[place]}`,
      visual: {
        kind: 'numberLine',
        min: Math.floor(value / place) * place,
        max: Math.ceil(value / place) * place + (value % place === 0 ? place : 0),
        marks: [{ at: value, label: String(value), color: '#ff7ab8' }],
      },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [answer + place, Math.max(0, answer - place), Math.floor(value / place) * place, Math.ceil(value / place) * place]
        .filter((v) => v !== answer),
      hint: `Look at the digit after the ${names[place]}s. 5 or more rounds up.`,
      explain: `${value} is closest to ${answer}.`,
    };
  },

  /** Multiplicative comparison — IM grade 4 unit 5, "how many times as many". */
  mult_compare(rng, p) {
    const small = num(rng, 2, p.max ?? 9);
    const times = num(rng, 2, 9);
    const big = small * times;
    const askTimes = rng() < 0.6;
    if (askTimes) {
      return {
        prompt: `${big} is how many times as many as ${small}?`,
        visual: { kind: 'dotArray', counts: [small, big > 12 ? Math.min(big, 12) : big] },
        answer: times,
        answerValue: times,
        min: 1,
        distractors: [big - small, big + small, times + 1, times - 1, small],
        hint: `How many ${small}s fit into ${big}?`,
        explain: `${small} × ${times} = ${big}.`,
      };
    }
    return {
      prompt: `What is ${times} times as many as ${small}?`,
      visual: null,
      answer: big,
      answerValue: big,
      min: 0,
      distractors: [small + times, big + small, big - small, big + times],
      hint: `${times} groups of ${small}.`,
      explain: `${times} × ${small} = ${big}.`,
    };
  },

  /** Angle measure — IM grade 4 unit 7. */
  angle_measure(rng, p) {
    const degrees = pick(rng, p.angles || [30, 45, 60, 90, 120, 135, 150]);
    return {
      prompt: 'How many degrees?',
      visual: { kind: 'angle', degrees, right: true },
      answer: degrees,
      answerValue: degrees,
      min: 0,
      distractors: shuffle(rng, [180 - degrees, degrees + 30, Math.max(10, degrees - 30), 90, degrees + 15])
        .filter((v) => v !== degrees && v > 0),
      hint: 'The faint line is a right angle: 90°. Is this angle bigger or smaller?',
      explain: `That angle measures ${degrees}°.`,
    };
  },

  // --------------------------------------------------------------- 5th grade

  /** Volume by counting unit cubes — IM grade 5 unit 1. */
  volume_prism(rng, p) {
    const l = num(rng, 2, p.max ?? 5);
    const wd = num(rng, 2, p.max ?? 4);
    const ht = num(rng, 2, p.max ?? 4);
    const answer = l * wd * ht;
    return {
      prompt: 'How many cubes fill it?',
      visual: { kind: 'prism', l, wd, ht },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [l + wd + ht, l * wd, (l * wd + wd * ht + l * ht) * 2, answer + l, answer - wd],
      hint: `One layer is ${l} × ${wd} = ${l * wd} cubes, and there are ${ht} layers.`,
      explain: `${l} × ${wd} × ${ht} = ${answer}.`,
    };
  },

  /** A fraction of a whole number — IM grade 5 unit 2. */
  fraction_times_whole(rng) {
    const d = pick(rng, [2, 3, 4, 5, 6]);
    const k = num(rng, 2, 8);
    const whole = d * k;
    const n = num(rng, 1, d - 1);
    const answer = (whole / d) * n;
    return {
      prompt: `${n}/${d} × ${whole} = ?`,
      visual: { kind: 'fractionBar', num: n, den: d },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [whole / d, whole - answer, answer + d, whole * n, answer + 1, answer - 1],
      hint: `Divide ${whole} by ${d} first, then multiply by ${n}.`,
      explain: `${whole} ÷ ${d} = ${whole / d}, and ${whole / d} × ${n} = ${answer}.`,
    };
  },

  /** Fraction times fraction — IM grade 5 unit 3. */
  fraction_mult(rng) {
    const d1 = pick(rng, [2, 3, 4, 5]);
    const d2 = pick(rng, [2, 3, 4, 5]);
    const n1 = num(rng, 1, d1 - 1);
    const n2 = num(rng, 1, d2 - 1);
    const [sn, sd] = simplify(n1 * n2, d1 * d2);
    const answer = sd === 1 ? String(sn) : `${sn}/${sd}`;
    return {
      prompt: `${n1}/${d1} × ${n2}/${d2} = ?`,
      visual: { kind: 'fractionBar', bars: [{ num: n1, den: d1 }, { num: n2, den: d2 }] },
      answer,
      distractors: shuffle(rng, [
        `${n1 + n2}/${d1 + d2}`,                 // added instead of multiplied
        `${n1 * n2}/${d1 + d2}`,
        `${n1 + n2}/${d1 * d2}`,
        `${sn + 1}/${sd}`,
        `${sd}/${sn}`,
      ]).filter((t) => t !== answer && !t.includes('/0')),
      hint: 'Multiply the tops together, then the bottoms together.',
      explain: `${n1} × ${n2} = ${n1 * n2} and ${d1} × ${d2} = ${d1 * d2}, which simplifies to ${answer}.`,
    };
  },

  /** Dividing a unit fraction by a whole number, and the reverse — IM 5 unit 3. */
  fraction_div(rng) {
    const d = pick(rng, [2, 3, 4, 5]);
    const k = num(rng, 2, 5);
    if (rng() < 0.5) {
      const answer = `1/${d * k}`;
      return {
        prompt: `1/${d} ÷ ${k} = ?`,
        visual: { kind: 'fractionBar', num: 1, den: d },
        answer,
        distractors: shuffle(rng, [`1/${d + k}`, `${k}/${d}`, `1/${Math.max(2, d * k - 1)}`, `${k}/${d * k}`])
          .filter((t) => t !== answer),
        hint: `Each of the ${d} parts is split into ${k} smaller pieces.`,
        explain: `1/${d} ÷ ${k} = 1/${d * k}.`,
      };
    }
    const answer = d * k;
    return {
      prompt: `${k} ÷ 1/${d} = ?`,
      visual: { kind: 'fractionBar', num: 1, den: d },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [k / d === Math.floor(k / d) ? k / d : k + d, d, k, answer + d, answer - d].filter((v) => v > 0),
      hint: `How many ${'1/' + d}s fit inside 1? Now do that ${k} times.`,
      explain: `Each whole holds ${d} of them, so ${k} wholes hold ${answer}.`,
    };
  },

  /** Powers of ten — IM grade 5 unit 5's place-value patterns. */
  powers_of_ten(rng) {
    const a = num(rng, 2, 9);
    const zeros = num(rng, 1, 3);
    const power = Math.pow(10, zeros);
    const times = rng() < 0.6;
    const answer = times ? a * power * 10 : a * power;
    const left = times ? `${a * power}` : `${a * power * 10}`;
    return {
      prompt: `${left} ${times ? '×' : '÷'} 10 = ?`,
      visual: null,
      answer,
      answerValue: answer,
      min: 0,
      distractors: [answer * 10, answer / 10, answer + power, a].filter((v) => Number.isInteger(v) && v > 0 && v !== answer),
      hint: times ? 'Multiplying by 10 shifts every digit one place left.' : 'Dividing by 10 shifts every digit one place right.',
      explain: `${left} ${times ? '×' : '÷'} 10 = ${answer}.`,
    };
  },

  /** Reading a point off the coordinate plane — IM grade 5 unit 7. */
  coord_point(rng, p) {
    const span = p.span ?? 6;
    const x = num(rng, 1, span - 1);
    let y = num(rng, 1, span - 1);
    if (y === x) y = y === span - 1 ? y - 1 : y + 1;
    const answer = `(${x}, ${y})`;
    return {
      prompt: 'Where is the dot?',
      visual: { kind: 'coordGrid', span, point: [x, y] },
      answer,
      // Swapping the coordinates is the mistake this question exists to catch.
      distractors: shuffle(rng, [`(${y}, ${x})`, `(${x + 1}, ${y})`, `(${x}, ${y + 1})`, `(${Math.max(0, x - 1)}, ${y})`])
        .filter((t) => t !== answer),
      hint: 'Along the bottom first, then up.',
      explain: `The dot is ${x} across and ${y} up, so ${answer}.`,
    };
  },

  order_of_ops(rng, p) {
    const a = num(rng, 2, 9), b = num(rng, 2, 9), c = num(rng, 2, 9);
    if (p.parens && rng() < 0.6) {
      const answer = (a + b) * c;
      return {
        prompt: `(${a} + ${b}) × ${c} = ?`,
        visual: null,
        answer,
        answerValue: answer,
        min: 0,
        distractors: [a + b * c, a * c + b, answer + c, a + b + c],
        hint: 'Do the part inside the brackets first.',
        explain: `${a} + ${b} = ${a + b}, and ${a + b} × ${c} = ${answer}.`,
      };
    }
    const plusFirst = rng() < 0.5;
    const answer = plusFirst ? a + b * c : a * b + c;
    return {
      prompt: plusFirst ? `${a} + ${b} × ${c} = ?` : `${a} × ${b} + ${c} = ?`,
      visual: null,
      answer,
      answerValue: answer,
      min: 0,
      // The left-to-right error is exactly what this skill is meant to catch.
      distractors: [plusFirst ? (a + b) * c : a * (b + c), answer + c, answer - c, a + b + c],
      hint: 'Multiply before you add — always.',
      explain: plusFirst
        ? `${b} × ${c} = ${b * c} first, then ${a} + ${b * c} = ${answer}.`
        : `${a} × ${b} = ${a * b} first, then ${a * b} + ${c} = ${answer}.`,
    };
  },
};
