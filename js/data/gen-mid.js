// Question generators for 2nd and 3rd grade, following Illustrative Mathematics:
// numbers to 1,000 in base ten, money and time, the number line as a model for
// addition and subtraction, equal groups into multiplication, area and
// perimeter, and fractions as numbers on a line.

import { randInt, pick, shuffle } from '../core/utils.js';
import { COUNTABLES } from './gen-early.js';

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


  /**
   * IM grade 2 unit 4 makes the number line the model for addition and
   * subtraction: the question is where the jump lands, not what the digits do.
   */
  number_line_sum(rng, p) {
    const max = p.max ?? 100;
    const start = num(rng, 10, Math.floor(max * 0.6));
    const step = pick(rng, [5, 10, 20, 25]).valueOf();
    const forward = rng() < 0.6;
    const answer = forward ? start + step : Math.max(0, start - step);
    return {
      prompt: `Where does the jump land?`,
      visual: {
        kind: 'numberLine',
        min: Math.max(0, Math.min(start, answer) - 10),
        max: Math.max(start, answer) + 10,
        marks: [{ at: start, label: String(start), color: '#7ec8ff' }],
        hops: [{ from: start, to: answer, label: `${forward ? '+' : '−'}${step}` }],
      },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [start, forward ? start - step : start + step, answer + 10, answer - 10, answer + 1],
      hint: `Start at ${start} and count ${forward ? 'on' : 'back'} ${step}.`,
      explain: `${start} ${forward ? '+' : '−'} ${step} = ${answer}.`,
    };
  },

  /** Three-digit place value, shown as hundreds flats, tens rods and units. */
  place_value_3digit(rng, p) {
    const hundreds = num(rng, 1, Math.min(4, Math.floor((p.max ?? 999) / 100)));
    const tens = num(rng, 0, 9);
    const ones = num(rng, 0, 9);
    const value = hundreds * 100 + tens * 10 + ones;
    const askDigit = rng() < 0.45;
    if (askDigit) {
      const place = pick(rng, ['hundreds', 'tens', 'ones']);
      const answer = place === 'hundreds' ? hundreds * 100 : place === 'tens' ? tens * 10 : ones;
      const digit = place === 'hundreds' ? hundreds : place === 'tens' ? tens : ones;
      return {
        // Naming the place, not just the digit. "In 455, what is the 5 worth?"
        // has two defensible answers, and both are on the buttons.
        prompt: `In ${value}, what is the ${digit} in the ${place} place worth?`,
        visual: null,
        answer,
        answerValue: answer,
        min: 0,
        distractors: [digit, digit * 10, digit * 100, value].filter((v) => v !== answer),
        hint: 'A digit is worth itself times the value of its place.',
        explain: `The ${digit} is in the ${place} place, so it is worth ${answer}.`,
      };
    }
    return {
      prompt: 'How many altogether?',
      visual: { kind: 'baseTen', hundreds, tens, ones },
      answer: value,
      answerValue: value,
      min: 0,
      distractors: [hundreds + tens + ones, hundreds * 100 + ones * 10 + tens, value + 100, value - 100, value + 10],
      hint: 'Count the big squares as hundreds, the stacks as tens, the singles as ones.',
      explain: `${hundreds} hundreds, ${tens} tens and ${ones} ones is ${value}.`,
    };
  },

  /** Money — IM grade 2 unit 6. Values are written on the coins. */
  money_total(rng, p) {
    const kinds = p.quarters ? [1, 5, 10, 25] : [1, 5, 10];
    const coins = [];
    let total = 0;
    const n = num(rng, 3, p.max ?? 5);
    for (let i = 0; i < n; i++) {
      const c = pick(rng, kinds);
      coins.push(c);
      total += c;
    }
    coins.sort((a, b) => b - a);
    return {
      prompt: 'How many cents?',
      visual: { kind: 'money', coins },
      answer: total,
      answerValue: total,
      min: 0,
      distractors: [coins.length, total + 5, total - 5, total + 10, total - 1],
      hint: 'Start with the biggest coin and count on.',
      explain: `${coins.join(' + ')} = ${total}.`,
    };
  },

  /** Telling time to five minutes — IM grade 2 unit 6. */
  clock_time(rng, p) {
    const hour = num(rng, 1, 12);
    const minute = p.fiveMinutes ? num(rng, 0, 11) * 5 : pick(rng, [0, 30]);
    const two = (m) => String(m).padStart(2, '0');
    const answer = `${hour}:${two(minute)}`;
    const wrong = new Set();
    wrong.add(`${hour === 12 ? 1 : hour + 1}:${two(minute)}`);       // read the hour hand past the hour
    wrong.add(`${hour}:${two((minute + 30) % 60)}`);
    wrong.add(`${minute === 0 ? 12 : Math.round(minute / 5) || 12}:${two(hour * 5 % 60)}`); // hands swapped
    wrong.add(`${hour}:${two((minute + 5) % 60)}`);
    return {
      prompt: 'What time is it?',
      visual: { kind: 'clock', hour, minute },
      answer,
      distractors: shuffle(rng, [...wrong]).filter((t) => t !== answer),
      hint: 'The short hand is the hour. The long hand counts five minutes per number.',
      explain: `The hands read ${answer}.`,
    };
  },

  /**
   * Even and odd as "can it be split into two equal groups" — IM grade 2
   * unit 8. No picture: a drawing of the answer split into pairs would give the
   * answer away for the correct option and nothing else.
   */
  even_odd(rng, p) {
    const max = p.max ?? 20;
    const wantEven = rng() < 0.5;
    const evens = [], odds = [];
    while (evens.length < 3 || odds.length < 3) {
      const v = num(rng, 2, max);
      const bucket = v % 2 === 0 ? evens : odds;
      if (!bucket.includes(v)) bucket.push(v);
    }
    const answer = (wantEven ? evens : odds)[0];
    const others = (wantEven ? odds : evens).slice(0, 2);
    return {
      prompt: wantEven ? 'Which number is EVEN?' : 'Which number is ODD?',
      visual: null,
      answer,
      answerValue: answer,
      min: 0,
      distractors: others,
      choiceCount: 3,
      hint: wantEven
        ? 'An even number splits into two equal groups with nothing left over.'
        : 'An odd number always has one left over when you make pairs.',
      explain: `${answer} is ${wantEven ? 'even' : 'odd'}.`,
    };
  },

  /** Equal groups, drawn as groups — the picture behind multiplication. */
  equal_groups(rng, p) {
    const groups = num(rng, 2, Math.max(2, p.groups ?? 5));
    const each = num(rng, 2, Math.max(2, p.each ?? 5));
    const answer = groups * each;
    const askTotal = rng() < 0.7;
    if (askTotal) {
      return {
        prompt: 'How many altogether?',
        visual: { kind: 'equalGroups', groups, each, sprite: pick(rng, COUNTABLES) },
        answer,
        answerValue: answer,
        min: 0,
        distractors: [groups + each, answer - each, answer + each, groups, ...slips(rng, answer, 0)],
        hint: `${groups} groups with ${each} in each. Skip count by ${each}.`,
        explain: `${groups} × ${each} = ${answer}.`,
      };
    }
    return {
      prompt: 'How many in each group?',
      visual: { kind: 'equalGroups', groups, each, sprite: pick(rng, COUNTABLES) },
      answer: each,
      answerValue: each,
      min: 0,
      distractors: [groups, answer, each + 1, each - 1, groups + each],
      hint: 'Count just one group.',
      explain: `Each group has ${each}.`,
    };
  },

  // --------------------------------------------------------------- 3rd grade

  /** Area as covering with unit squares — IM grade 3 unit 2. */
  area_rect(rng, p) {
    const rows = num(rng, 2, Math.max(3, p.max ?? 6));
    const cols = num(rng, 2, Math.max(3, p.max ?? 6));
    const answer = rows * cols;
    return {
      prompt: 'How many squares cover it?',
      visual: { kind: 'areaGrid', rows, cols },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [rows + cols, (rows + cols) * 2, answer + rows, answer - cols, ...slips(rng, answer, 0)],
      hint: `${rows} rows of ${cols}. Skip count by ${cols}.`,
      explain: `${rows} × ${cols} = ${answer} squares.`,
    };
  },

  /** Perimeter as the distance around — IM grade 3 unit 7. */
  perimeter_rect(rng, p) {
    const w = num(rng, 2, Math.max(4, p.max ?? 9));
    const h = num(rng, 2, Math.max(4, p.max ?? 9));
    const answer = 2 * (w + h);
    return {
      prompt: 'How far around the edge?',
      visual: { kind: 'perimeterShape', w, h },
      answer,
      answerValue: answer,
      min: 0,
      // Confusing perimeter with area is *the* mistake this skill exists to catch.
      distractors: [w * h, w + h, answer - 2, answer + 2, 2 * w + h],
      hint: 'Add up all four sides — go right round the edge.',
      explain: `${w} + ${h} + ${w} + ${h} = ${answer}.`,
    };
  },

  /**
   * A fraction as a number with a place on the line, not just shaded parts of a
   * shape. This is the central shift in IM grade 3 unit 5.
   */
  fraction_number_line(rng, p) {
    const den = pick(rng, p.dens || [2, 3, 4, 6, 8]);
    const numer = num(rng, 1, den * (p.whole || 1) - 1);
    const answer = `${numer}/${den}`;
    const wrong = new Set([
      `${numer}/${den + 1}`,      // miscounted the intervals
      `${den}/${numer}`,          // read it upside down
      `${numer + 1}/${den}`,
      `${Math.max(1, numer - 1)}/${den}`,
    ]);
    wrong.delete(answer);
    return {
      prompt: 'Which fraction is the dot on?',
      visual: { kind: 'fractionLine', den, whole: p.whole || 1, at: numer },
      answer,
      distractors: shuffle(rng, [...wrong]),
      hint: `The whole is split into ${den} equal parts. Count the parts up to the dot.`,
      explain: `The dot is ${numer} parts of ${den}, so ${answer}.`,
    };
  },

  /** Reading a picture graph — IM opens grades 1 and 2 with data. */
  bar_graph(rng, p) {
    const rowCount = p.rows ?? 4;
    const sprites = shuffle(rng, COUNTABLES).slice(0, rowCount);
    const counts = [];
    while (counts.length < rowCount) {
      const v = num(rng, 2, p.max ?? 8);
      if (!counts.includes(v)) counts.push(v);
    }
    const mode = pick(rng, ['most', 'total', 'diff']);
    const rows = sprites.map((sprite, i) => ({ sprite, count: counts[i] }));
    if (mode === 'total') {
      const answer = counts.reduce((a, b) => a + b, 0);
      return {
        prompt: 'How many altogether?',
        visual: { kind: 'pictureGraph', rows },
        answer,
        answerValue: answer,
        min: 0,
        distractors: [rowCount, Math.max(...counts), answer - 1, answer + 1, answer - Math.min(...counts)],
        hint: 'Count every picture in every row.',
        explain: `${counts.join(' + ')} = ${answer}.`,
      };
    }
    if (mode === 'diff') {
      const hi = Math.max(...counts), lo = Math.min(...counts);
      const answer = hi - lo;
      return {
        prompt: 'How many more in the longest row than the shortest?',
        visual: { kind: 'pictureGraph', rows },
        answer,
        answerValue: answer,
        min: 0,
        distractors: [hi, lo, hi + lo, answer + 1, answer - 1],
        hint: 'Find the longest row and the shortest row, then take one from the other.',
        explain: `${hi} − ${lo} = ${answer}.`,
      };
    }
    const answer = Math.max(...counts);
    const markIdx = counts.indexOf(answer);
    return {
      prompt: 'How many in the longest row?',
      visual: { kind: 'pictureGraph', rows: rows.map((r, i) => ({ ...r, mark: i === markIdx })) },
      answer,
      answerValue: answer,
      min: 0,
      distractors: [...counts.filter((c) => c !== answer), answer + 1],
      hint: 'The longest row is lit up. Count along it.',
      explain: `The longest row has ${answer}.`,
    };
  },

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
