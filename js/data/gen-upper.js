// Question generators for 4th and 5th grade: multi-digit multiplication,
// division with remainders, fraction arithmetic, decimals, order of operations.

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
      if (a.n * b.d === b.n * a.d) b.n = Math.max(1, b.n - 1);
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
    const a = num(rng, 11, 989) / 100;
    const by10 = rng() < 0.5;
    const times = rng() < 0.6;
    const factor = by10 ? 10 : 100;
    const answer = times ? Math.round(a * factor * 100) / 100 : Math.round((a / factor) * 10000) / 10000;
    return {
      prompt: `${fmt(a)} ${times ? '×' : '÷'} ${factor} = ?`,
      visual: null,
      answer: fmt(answer),
      answerValue: answer,
      distractors: shuffle(rng, [
        fmt(times ? a * (factor * 10) : a / (factor * 10)),
        fmt(times ? a / factor : a * factor),
        fmt(answer * 10),
        fmt(answer / 10),
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
