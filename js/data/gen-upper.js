// Question generators: 4th grade (band 5), 5th grade (band 6). DOM-free.

import { ri, pick, round2 } from '../core/utils.js';

// ---------- 4th grade ------------------------------------------------------

export function multiDigit(r, p) {
  let a, b;
  if (p.form === '2x2') { a = ri(r, 12, 29); b = ri(r, 12, 29); }
  else if (p.form === '3x1') { a = ri(r, 112, 489); b = ri(r, 2, 6); }
  else { a = ri(r, 12, 89); b = ri(r, 2, 9); }
  const prod = a * b;
  const dropOnes = (a - (a % 10)) * b; // classic "ignored the ones digit"
  return {
    prompt: `${a} × ${b} = ?`,
    visual: null,
    answer: prod,
    distractors: [dropOnes !== prod ? dropOnes : prod + 10, (a + 1) * b, prod + 10, prod - 10, prod + 100],
    hint: `Break ${a} apart: ${a - (a % 10)} × ${b} = ${dropOnes}, then add ${a % 10} × ${b} = ${(a % 10) * b}.`,
    explain: `${a} × ${b} = ${prod}.`,
  };
}

export function divRemainder(r, p) {
  const b = ri(r, 3, p.maxDiv ?? 9);
  const q = ri(r, 3, p.maxQ ?? 9);
  const rem = ri(r, 1, b - 1);
  const c = q * b + rem;
  const f = (qq, rr) => `${qq} R ${rr}`;
  return {
    prompt: `${c} ÷ ${b} = ?`,
    visual: null,
    answer: f(q, rem),
    distractors: [
      f(q + 1, rem), f(q, rem + 1 < b ? rem + 1 : rem - 1), f(q - 1, rem),
      rem !== q ? f(rem, q) : f(q + 1, rem - 1 >= 0 ? Math.max(1, rem - 1) : 1),
    ],
    hint: `How many ${b}s fit in ${c}? ${b} × ${q} = ${q * b} fits — what is left over?`,
    explain: `${b} × ${q} = ${q * b}, and ${c} − ${q * b} = ${rem} left over: ${f(q, rem)}.`,
  };
}

export function fracCompare(r, p) {
  let n1, d1, n2, d2;
  if (p.likeDenoms) {
    d1 = d2 = pick(r, [4, 5, 6, 8, 10]);
    n1 = ri(r, 1, d1 - 1);
    do { n2 = ri(r, 1, d1 - 1); } while (n2 === n1);
  } else {
    const pairs = [[2, 4], [3, 6], [2, 6], [4, 8], [2, 8], [3, 9], [5, 10], [3, 4], [2, 3], [5, 8]];
    [d1, d2] = pick(r, pairs);
    if (r() < 0.5) [d1, d2] = [d2, d1];
    let guard = 0;
    do {
      n1 = ri(r, 1, d1 - 1);
      n2 = ri(r, 1, d2 - 1);
      guard++;
    } while (n1 * d2 === n2 * d1 && guard < 30);
    if (n1 * d2 === n2 * d1) n2 = Math.max(1, n2 - 1) === n2 ? n2 + 1 : Math.max(1, n2 - 1);
  }
  const fa = `${n1}/${d1}`, fb = `${n2}/${d2}`;
  const answer = n1 * d2 > n2 * d1 ? fa : fb;
  return {
    prompt: `Which fraction is bigger: ${fa} or ${fb}?`,
    visual: { kind: 'fractionPair', a: [n1, d1], b: [n2, d2] },
    answer,
    choicesOverride: [fa, fb],
    hint: p.likeDenoms
      ? 'Same size pieces! More pieces means bigger.'
      : 'Look at the bars — which one fills more? Careful: more pieces means SMALLER pieces!',
    explain: `${answer} covers more of the bar, so it is bigger.`,
  };
}

export function fracEquiv(r, p) {
  const bases = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [1, 5]];
  const [n, d] = pick(r, bases);
  const k = ri(r, 2, 4);
  const answer = n * k;
  return {
    prompt: `${n}/${d} = ?/${d * k}`,
    visual: { kind: 'fractionPair', a: [n, d], b: [answer, d * k] },
    answer,
    distractors: [n, answer + 1, answer - 1 > 0 ? answer - 1 : answer + 2, n + k],
    hint: `The bottom was multiplied by ${k} (${d} → ${d * k}). Do the same to the top!`,
    explain: `${n}/${d} = ${answer}/${d * k}. Multiply top and bottom by ${k}.`,
  };
}

export function decCompare(r, p) {
  // Deliberately build "longer looks bigger" traps: 0.5 vs 0.45
  const t = ri(r, 2, 9);
  const trap = r() < 0.6;
  let a, b;
  if (trap) { a = t / 10; b = round2((t - 1) / 10 + ri(r, 1, 9) / 100); }
  else { a = round2(ri(r, 10, 89) / (r() < 0.5 ? 10 : 100)); b = round2(a + pick(r, [-0.2, -0.05, 0.1, 0.3])); }
  if (a === b) b = round2(b + 0.1);
  const fa = String(a), fb = String(b);
  const answer = a > b ? fa : fb;
  return {
    prompt: `Which is bigger: ${fa} or ${fb}?`,
    visual: null,
    answer,
    choicesOverride: [fa, fb],
    hint: 'Line up the decimal points! Compare tenths first — longer does NOT mean bigger.',
    explain: `${answer} is bigger. Compare place by place: tenths first, then hundredths.`,
  };
}

export function decPlace(r, p) {
  const whole = ri(r, 1, 9);
  const tenths = ri(r, 1, 9);
  let hundredths = ri(r, 1, 9);
  if (hundredths === tenths) hundredths = (hundredths % 9) + 1;
  const num = `${whole}.${tenths}${hundredths}`;
  const which = pick(r, ['tenths', 'hundredths']);
  const answer = which === 'tenths' ? tenths : hundredths;
  return {
    prompt: `In ${num}, which digit is in the ${which} place?`,
    visual: null,
    answer,
    distractors: [which === 'tenths' ? hundredths : tenths, whole, (answer + 5) % 10],
    hint: `The first spot after the decimal point is tenths, the second is hundredths.`,
    explain: `In ${num}: ${tenths} is in the tenths place, ${hundredths} is in the hundredths place.`,
  };
}

// ---------- 5th grade ------------------------------------------------------

export function fracAddSubLike(r, p) {
  const d = pick(r, [4, 5, 6, 8, 10, 12]);
  const sub = r() < 0.45;
  let n1, n2;
  if (sub) { n1 = ri(r, 2, d - 1); n2 = ri(r, 1, n1 - 1); }
  else { n1 = ri(r, 1, d - 2); n2 = ri(r, 1, d - 1 - n1); }
  const res = sub ? n1 - n2 : n1 + n2;
  const f = (n) => `${n}/${d}`;
  return {
    prompt: `${f(n1)} ${sub ? '−' : '+'} ${f(n2)} = ?`,
    visual: d <= 8 ? { kind: 'fractionPair', a: [n1, d], b: [n2, d] } : null,
    answer: f(res),
    distractors: [
      f(res + 1 <= d ? res + 1 : res - 2),
      f(Math.max(1, res - 1)),
      `${res}/${d * 2}`,
      sub ? f(n1 + n2 <= d ? n1 + n2 : Math.max(1, res + 2)) : `${n1 + n2}/${d + d}`,
    ],
    hint: `The pieces are the same size (${d}ths)! Just ${sub ? 'subtract' : 'add'} the top numbers.`,
    explain: `${n1} ${sub ? '−' : '+'} ${n2} = ${res}, so the answer is ${res}/${d}. The bottom stays ${d}.`,
  };
}

export function fracAddUnlike(r, p) {
  const pairs = [[2, 4], [3, 6], [2, 6], [4, 8], [2, 8], [3, 9], [5, 10], [2, 10]];
  const [dA, dB] = pick(r, pairs);
  const k = dB / dA;
  const n1 = ri(r, 1, dA - 1);
  const conv = n1 * k;
  const n2 = ri(r, 1, Math.max(1, dB - conv - 1));
  const res = conv + n2;
  return {
    prompt: `${n1}/${dA} + ${n2}/${dB} = ?`,
    visual: { kind: 'fractionPair', a: [n1, dA], b: [n2, dB] },
    answer: `${res}/${dB}`,
    distractors: [
      `${n1 + n2}/${dA + dB}`,   // the classic straight-across trap
      `${n1 + n2}/${dB}`,        // forgot to convert
      `${res + 1}/${dB}`,
      `${res}/${dA}`,
    ],
    hint: `Make the pieces match! ${n1}/${dA} is the same as ${conv}/${dB}. Now add.`,
    explain: `${n1}/${dA} = ${conv}/${dB}. Then ${conv}/${dB} + ${n2}/${dB} = ${res}/${dB}.`,
  };
}

export function fracOfWhole(r, p) {
  const d = pick(r, [2, 3, 4, 5, 6]);
  const unit = ri(r, 2, 6);
  const w = d * unit;
  const n = ri(r, 1, d - 1);
  const answer = unit * n;
  return {
    prompt: `What is ${n}/${d} of ${w}?`,
    visual: null,
    answer,
    distractors: [unit, w - d, answer + unit, w - answer],
    hint: `First find 1/${d} of ${w}: that is ${w} ÷ ${d} = ${unit}. Then take ${n} of those.`,
    explain: `${w} ÷ ${d} = ${unit}, and ${unit} × ${n} = ${answer}.`,
  };
}

export function decAddSub(r, p) {
  const sub = r() < 0.45;
  let a = round2(ri(r, 11, 89) / 10);
  let b = round2(ri(r, 11, 89) / (r() < 0.4 ? 100 : 10));
  if (sub && b > a) [a, b] = [b, a];
  const res = round2(sub ? a - b : a + b);
  const shifted = round2(sub ? a - b / 10 : a + b / 10);
  return {
    prompt: `${a} ${sub ? '−' : '+'} ${b} = ?`,
    visual: null,
    answer: res,
    distractors: [shifted !== res ? shifted : round2(res + 0.2), round2(res + 0.1), round2(res - 0.1), round2(res + 1)],
    hint: 'Line up the decimal points before you add the columns — tenths with tenths!',
    explain: `${a} ${sub ? '−' : '+'} ${b} = ${res}.`,
  };
}

export function decShift(r, p) {
  const a = round2(ri(r, 12, 89) / (r() < 0.5 ? 10 : 100));
  const mul = r() < 0.6;
  const by = p.hundreds && r() < 0.4 ? 100 : 10;
  const res = round2(mul ? a * by : a / by);
  return {
    prompt: `${a} ${mul ? '×' : '÷'} ${by} = ?`,
    visual: null,
    answer: res,
    distractors: [a, round2(mul ? a / by : a * by), round2(res * 10), round2(res / 10)],
    hint: `${mul ? 'Multiplying' : 'Dividing'} by ${by} slides the decimal point ${by === 100 ? 'two spots' : 'one spot'} to the ${mul ? 'right' : 'left'}.`,
    explain: `${a} ${mul ? '×' : '÷'} ${by} = ${res}. The digits stay — the point moves!`,
  };
}

export function decMulSmall(r, p) {
  const a = ri(r, 2, 9) / 10;
  const b = ri(r, 2, 9);
  const res = round2(a * b);
  return {
    prompt: `${a} × ${b} = ?`,
    visual: null,
    answer: res,
    distractors: [round2(res * 10), round2(res / 10), round2(res + 0.1), a * 10 * b],
    hint: `Think ${a * 10} × ${b} = ${a * 10 * b}, then make it 10 times smaller.`,
    explain: `${a} × ${b} = ${res}.`,
  };
}

export function orderOps(r, p) {
  const a = ri(r, 2, 9), b = ri(r, 2, 9), c = ri(r, 2, 5);
  const withParens = p.parens && r() < 0.5;
  if (withParens) {
    const res = (a + b) * c;
    const trap = a + b * c;
    return {
      prompt: `(${a} + ${b}) × ${c} = ?`,
      visual: null,
      answer: res,
      distractors: [trap !== res ? trap : res + c, res + c, res - c, res + 1],
      hint: 'Parentheses first! Add inside the ( ) before multiplying.',
      explain: `First ${a} + ${b} = ${a + b}, then ${a + b} × ${c} = ${res}.`,
    };
  }
  const sub = r() < 0.35 && a * b > c;
  if (sub) {
    const res = a * b - c;
    return {
      prompt: `${a} × ${b} − ${c} = ?`,
      visual: null,
      answer: res,
      distractors: [a * (b - c) > 0 ? a * (b - c) : res + 2, res + 1, res - 1, res + c],
      hint: 'Multiply FIRST, then subtract. × comes before −!',
      explain: `First ${a} × ${b} = ${a * b}, then ${a * b} − ${c} = ${res}.`,
    };
  }
  const res = a + b * c;
  const trap = (a + b) * c;
  return {
    prompt: `${a} + ${b} × ${c} = ?`,
    visual: null,
    answer: res,
    distractors: [trap !== res ? trap : res + 1, res + 1, res - 1, res + b],
    hint: 'Multiply FIRST, then add. × comes before +!',
    explain: `First ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${res}.`,
  };
}
