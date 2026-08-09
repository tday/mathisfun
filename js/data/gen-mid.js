// Question generators for 2nd and 3rd grade: bigger sums, skip counting,
// arrays into multiplication, division facts and first fractions.

import { randInt, pick, shuffle } from '../core/utils.js';

const num = (rng, a, b) => randInt(rng, a, b);
const slips = (rng, answer, min = 0) =>
  shuffle(rng, [answer + 1, answer - 1, answer + 2, answer - 2]).filter((v) => v >= min && v !== answer);

export const MID = {
  // --------------------------------------------------------------- 2nd grade

  skip_count(rng, p) {
    const step = pick(rng, p.steps || [2, 5, 10]);
    const start = step * num(rng, 1, 6);
    const seq = [start, start + step, start + step * 2];
    const answer = start + step * 3;
    return {
      prompt: `${seq.join(', ')}, ?`,
      visual: {
        kind: 'numberLine',
        min: Math.max(0, start - step),
        max: answer + step,
        marks: seq.map((v) => ({ at: v, label: String(v), color: '#7ec8ff' })).concat([{ at: answer, label: '?', color: '#ff7ab8' }]),
      },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [answer + step, answer - step, answer + 1, seq[2] + 1],
      hint: `You are counting up by ${step} each time.`,
      explain: `Adding ${step} to ${seq[2]} gives ${answer}.`,
    };
  },

  repeated_addition(rng, p) {
    const groups = num(rng, 2, Math.max(2, p.max ?? 4));
    const each = num(rng, 2, 5);
    const answer = groups * each;
    return {
      prompt: `${Array(groups).fill(each).join(' + ')} = ?`,
      visual: { kind: 'dotArray', rows: groups, cols: each },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [groups + each, answer + each, answer - each, ...slips(rng, answer, 0)],
      hint: `${groups} groups of ${each}. Count the rows of dots!`,
      explain: `${groups} × ${each} = ${answer}.`,
    };
  },

  mult_array(rng, p) {
    const tables = p.tables || [2, 5, 10];
    const a = pick(rng, tables);
    const b = num(rng, 2, Math.max(2, p.max ?? 5));
    const answer = a * b;
    return {
      prompt: `${a} × ${b} = ?`,
      visual: { kind: 'dotArray', rows: a, cols: b },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [a + b, a * b + a, a * b - a, a * (b + 1), ...slips(rng, answer, 0)],
      hint: `${a} rows with ${b} in each. Skip count by ${b}!`,
      explain: `${a} × ${b} = ${answer}.`,
    };
  },

  // --------------------------------------------------------------- 3rd grade

  mult_facts(rng, p) {
    const tables = p.tables || [2, 5, 10];
    const a = pick(rng, tables);
    const b = num(rng, 2, p.max ?? 10);
    const answer = a * b;
    return {
      prompt: `${a} × ${b} = ?`,
      visual: b <= 6 && a <= 6 ? { kind: 'dotArray', rows: a, cols: b } : null,
      answer,
      answerValue: answer,
      min: 0,
      // Neighbour facts are the classic times-table tangle: 6x7 -> 48 (6x8), 35 (5x7).
      distractors: [a * (b + 1), a * (b - 1), (a + 1) * b, a + b, ...slips(rng, answer, 0)],
      hint: b === 9 ? 'For ×9, do ×10 then take one group away.'
        : `Skip count by ${a}, ${b} times.`,
      explain: `${a} × ${b} = ${answer}.`,
    };
  },

  div_facts(rng, p) {
    const tables = p.tables || [2, 5, 10];
    const divisor = pick(rng, tables);
    const quotient = num(rng, 2, p.max ?? 10);
    const dividend = divisor * quotient;
    return {
      prompt: `${dividend} ÷ ${divisor} = ?`,
      visual: quotient <= 6 && divisor <= 6 ? { kind: 'dotArray', rows: divisor, cols: quotient } : null,
      answer: quotient,
      answerValue: quotient,
      min: 0,
      distractors: [divisor, dividend - divisor, quotient + 1, quotient - 1, dividend / 2],
      hint: `Ask yourself: ${divisor} times what makes ${dividend}?`,
      explain: `${divisor} × ${quotient} = ${dividend}, so ${dividend} ÷ ${divisor} = ${quotient}.`,
    };
  },

  fraction_identify(rng, p) {
    const den = pick(rng, p.dens || [2, 3, 4]);
    const numer = num(rng, 1, den - 1);
    const answer = `${numer}/${den}`;
    const round = rng() < 0.5;
    const wrong = new Set();
    wrong.add(`${den - numer}/${den}`);          // shaded vs unshaded mix-up
    wrong.add(`${numer}/${den + 1}`);            // miscounted the parts
    wrong.add(`${den}/${numer}`);                // flipped
    wrong.add(`${numer + 1}/${den}`);
    return {
      prompt: 'What fraction is shaded?',
      visual: round ? { kind: 'fractionCircle', num: numer, den } : { kind: 'fractionBar', num: numer, den },
      answer,
      distractors: shuffle(rng, [...wrong]).filter((w) => w !== answer),
      hint: 'The bottom number is how many equal parts there are. The top is how many are shaded.',
      explain: `${numer} of ${den} equal parts are shaded, so ${answer}.`,
    };
  },

  mult_by_ten(rng) {
    const a = num(rng, 2, 9);
    const tens = pick(rng, [10, 20, 30, 40, 50, 100]);
    const answer = a * tens;
    return {
      prompt: `${a} × ${tens} = ?`,
      visual: null,
      answer,
      answerValue: answer,
      min: 0,
      distractors: [a * tens * 10, a * (tens / 10), answer + tens, answer - tens],
      hint: `Work out ${a} × ${tens / 10}, then add the zero${tens === 100 ? 's' : ''}.`,
      explain: `${a} × ${tens} = ${answer}.`,
    };
  },
};
