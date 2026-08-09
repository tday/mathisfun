// Question generators: 2nd grade (band 3), 3rd grade (band 4). DOM-free.

import { ri, pick } from '../core/utils.js';

// ---------- 2nd grade ------------------------------------------------------

export function addBig(r, p) {
  let a, b;
  for (let tries = 0; tries < 30; tries++) {
    a = ri(r, 10, p.max - 10);
    b = ri(r, 5, p.max - a);
    const carry = (a % 10) + (b % 10) >= 10;
    if (p.regroup ? carry : !carry) break;
  }
  const sum = a + b;
  const dropCarry = (Math.floor(a / 10) + Math.floor(b / 10)) * 10 + ((a % 10) + (b % 10)) % 10;
  return {
    prompt: `${a} + ${b} = ?`,
    visual: null,
    answer: sum,
    distractors: [dropCarry !== sum ? dropCarry : sum + 10, sum + 10, sum - 10, sum + 1, sum - 1],
    hint: p.regroup
      ? `Add the ones first: ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}. That makes a new ten — carry it!`
      : `Add the tens, then the ones: ${Math.floor(a / 10)}0 + ${Math.floor(b / 10)}0 first.`,
    explain: `${a} + ${b} = ${sum}.`,
  };
}

export function subBig(r, p) {
  let a, b;
  for (let tries = 0; tries < 30; tries++) {
    a = ri(r, 15, p.max);
    b = ri(r, 5, a - 5);
    const borrow = (a % 10) < (b % 10);
    if (p.regroup ? borrow : !borrow) break;
  }
  const diff = a - b;
  return {
    prompt: `${a} − ${b} = ?`,
    visual: null,
    answer: diff,
    distractors: [diff + 10, diff - 10, diff + 1, diff - 1, a - b + 2],
    hint: p.regroup
      ? `Not enough ones? Borrow a ten! ${a} is the same as ${Math.floor(a / 10) - 1} tens and ${(a % 10) + 10} ones.`
      : `Subtract the tens, then the ones.`,
    explain: `${a} − ${b} = ${diff}.`,
  };
}

export function skipCount(r, p) {
  const step = pick(r, p.steps);
  const start = step * ri(r, 1, 4);
  const shown = 4;
  const seq = Array.from({ length: shown }, (_, i) => start + i * step);
  const answer = start + shown * step;
  return {
    prompt: `${seq.join(', ')}, … What comes next?`,
    visual: null,
    answer,
    distractors: [answer + 1, answer - 1, answer + step, answer - step + 1],
    hint: `The numbers jump by ${step} each time. Add ${step} to ${seq[shown - 1]}!`,
    explain: `Counting by ${step}s: next is ${seq[shown - 1]} + ${step} = ${answer}.`,
  };
}

export function arrayMult(r, p) {
  const rows = ri(r, 2, p.maxFactor);
  const cols = ri(r, 2, p.maxFactor);
  const total = rows * cols;
  const asAdd = p.asAddition && r() < 0.5;
  return {
    prompt: asAdd
      ? `${Array(rows).fill(cols).join(' + ')} = ?`
      : `${rows} rows of ${cols} — how many dots?`,
    visual: { kind: 'dotArray', rows, cols },
    answer: total,
    distractors: [total + cols, total - cols, rows + cols, total + 1],
    hint: `Count one row (${cols}), then skip count: ${cols}, ${cols * 2}${rows > 2 ? ', ' + cols * 3 : ''}…`,
    explain: `${rows} rows of ${cols} makes ${total}. That is ${rows} × ${cols}!`,
  };
}

// ---------- 3rd grade ------------------------------------------------------

export function multFact(r, p) {
  const a = pick(r, p.tables);
  const b = ri(r, p.minB ?? 2, p.maxB ?? 10);
  const prod = a * b;
  return {
    prompt: r() < 0.5 ? `${a} × ${b} = ?` : `${b} × ${a} = ?`,
    visual: p.visual && a <= 6 && b <= 6 ? { kind: 'dotArray', rows: Math.min(a, b), cols: Math.max(a, b) } : null,
    answer: prod,
    distractors: [(a + 1) * b, (a - 1) * b, a * (b + 1), a + b, prod + a],
    hint: b >= 5
      ? `Break it up: ${a} × ${b} is ${a} × 5 plus ${a} × ${b - 5}.`
      : `Skip count by ${a}: ${a}, ${a * 2}${b > 2 ? ', ' + a * 3 : ''}…`,
    explain: `${a} × ${b} = ${prod}.`,
  };
}

export function missingFactor(r, p) {
  const a = pick(r, p.tables);
  const b = ri(r, 2, p.maxB ?? 10);
  return {
    prompt: `${a} × ? = ${a * b}`,
    visual: null,
    answer: b,
    distractors: [b + 1, b - 1, a, a * b - a],
    hint: `How many ${a}s fit inside ${a * b}? Skip count by ${a} and keep track!`,
    explain: `${a} × ${b} = ${a * b}, so the missing number is ${b}.`,
  };
}

export function divFact(r, p) {
  const a = pick(r, p.tables);
  const b = ri(r, 2, p.maxB ?? 10);
  const c = a * b;
  return {
    prompt: `${c} ÷ ${a} = ?`,
    visual: null,
    answer: b,
    distractors: [b + 1, b - 1, c - a, a === b ? b + 2 : a],
    hint: `Division undoes multiplication: ${a} × ? = ${c}?`,
    explain: `${c} ÷ ${a} = ${b}, because ${a} × ${b} = ${c}.`,
  };
}

export function fracIdentify(r, p) {
  const den = pick(r, p.dens ?? [2, 3, 4, 6, 8]);
  const num = ri(r, 1, den - 1);
  const circle = r() < 0.4;
  return {
    prompt: 'What fraction is shaded?',
    visual: circle ? { kind: 'fractionCircle', num, den } : { kind: 'fractionBar', num, den },
    answer: `${num}/${den}`,
    distractors: [
      `${den - num}/${den}`,
      `${num}/${den + (den <= 4 ? 2 : -2)}`,
      `${den}/${num}`,
      `${Math.min(num + 1, den)}/${den}`,
      `${num}/${den * 2}`,
    ],
    hint: `Count ALL the pieces (${den}) — that is the bottom number. Count the shaded ones — that is the top!`,
    explain: `${num} of ${den} equal pieces are shaded: ${num}/${den}.`,
  };
}

export function mult10(r, p) {
  const a = ri(r, 2, 9) * 10;
  const b = ri(r, 2, 9);
  const prod = a * b;
  return {
    prompt: r() < 0.5 ? `${a} × ${b} = ?` : `${b} × ${a} = ?`,
    visual: null,
    answer: prod,
    distractors: [prod / 10, prod * 10, prod + 10, prod - 100],
    hint: `First find ${a / 10} × ${b} = ${(a / 10) * b}. Then make it 10 times bigger!`,
    explain: `${a} × ${b} = ${prod}. It is ${a / 10} × ${b} with a zero on the end.`,
  };
}
