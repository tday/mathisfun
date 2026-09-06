// An independent second opinion on every question.
//
// The generators decide both the question and its answer, so a generator with a
// bug produces a question that is internally consistent and completely wrong —
// and no amount of "exactly one correct choice" checking will notice. This
// module re-derives the answer from the *rendered* question alone: the prompt
// string a child reads, and the visual spec they look at. Nothing here imports a
// generator, and nothing here may.
//
// solve(q) -> { value, from } when the question can be re-derived
//          -> null            when it cannot (the audit reports coverage)
//
// `value` is compared against q.answerValue / the answer choice text, so it is
// returned in the same shape the question uses: a number, or a string like
// "3/4", "7 R2" or "(2, 5)".

import { gcd } from '../js/core/utils.js';

const N = String.raw`(\d+(?:\.\d+)?)`;
const FR = String.raw`(\d+)\/(\d+)`;

const near = (a, b) => Math.abs(a - b) < 1e-9;
const dec = (v) => String(Math.round(v * 1e6) / 1e6);

function frac(n, d) {
  const g = gcd(n, d) || 1;
  const sn = n / g, sd = d / g;
  return sd === 1 ? String(sn) : `${sn}/${sd}`;
}

/** Matches the prompt against a table of patterns; first hit wins. */
function fromPrompt(prompt) {
  if (!prompt) return null;
  const p = prompt.trim();

  const rules = [
    // -------------------------------------------------- whole-number arithmetic
    [`^${N} \\+ ${N} = \\?$`, (a, b) => +a + +b],
    [`^${N} − ${N} = \\?$`, (a, b) => +a - +b],
    [`^${N} × ${N} = \\?$`, (a, b) => +a * +b],
    // Division that does not come out whole still has an exact decimal answer
    // (5 ÷ 100 = 0.05); only a genuinely repeating quotient is left unsolved.
    [`^${N} ÷ ${N} = \\?$`, (a, b) => {
      const v = +a / +b;
      if (+a % +b === 0) return v;
      return near(v, Math.round(v * 1e6) / 1e6) ? dec(v) : null;
    }],

    // ------------------------------------- the unknown moved around the equation
    [`^${N} \\+ \\? = ${N}$`, (a, c) => +c - +a],
    [`^\\? \\+ ${N} = ${N}$`, (b, c) => +c - +b],
    [`^${N} = \\? \\+ ${N}$`, (c, b) => +c - +b],
    [`^${N} = ${N} \\+ \\?$`, (c, a) => +c - +a],
    [`^${N} − \\? = ${N}$`, (c, b) => +c - +b],
    [`^\\? − ${N} = ${N}$`, (a, b) => +a + +b],

    // ------------------------------------------------------ order of operations
    [`^\\(${N} \\+ ${N}\\) × ${N} = \\?$`, (a, b, c) => (+a + +b) * +c],
    [`^${N} \\+ ${N} × ${N} = \\?$`, (a, b, c) => +a + +b * +c],
    [`^${N} × ${N} \\+ ${N} = \\?$`, (a, b, c) => +a * +b + +c],

    // -------------------------------------------------- repeated addition (n-ary)
    [`^(\\d+(?: \\+ \\d+)+) = \\?$`, (chain) => chain.split(' + ').reduce((a, b) => a + +b, 0)],

    // ------------------------------------------------------------- skip counting
    [`^${N}, ${N}, ${N}, \\?$`, (a, b, c) => {
      const step = +b - +a;
      return +c - +b === step ? +c + step : null;
    }],

    // ------------------------------------------------------------------ fractions
    [`^${FR} \\+ ${FR} = \\?$`, (n1, d1, n2, d2) => frac(+n1 * +d2 + +n2 * +d1, +d1 * +d2)],
    [`^${FR} − ${FR} = \\?$`, (n1, d1, n2, d2) => {
      const num = +n1 * +d2 - +n2 * +d1;
      return num < 0 ? null : frac(num, +d1 * +d2);
    }],
    [`^${FR} × ${FR} = \\?$`, (n1, d1, n2, d2) => frac(+n1 * +n2, +d1 * +d2)],
    [`^${FR} × (\\d+) = \\?$`, (n, d, w) => (+w % +d === 0 ? (+w / +d) * +n : null)],
    [`^1\\/(\\d+) ÷ (\\d+) = \\?$`, (d, k) => `1/${+d * +k}`],
    [`^(\\d+) ÷ 1\\/(\\d+) = \\?$`, (k, d) => +k * +d],
  ];

  for (const [re, fn] of rules) {
    const m = p.match(new RegExp(re));
    if (m) {
      const v = fn(...m.slice(1));
      if (v != null) return { value: v, from: 'prompt' };
    }
  }

  // Decimals are the same four operations, but the answer has to come back as a
  // decimal string rather than a float with binary rounding fuzz.
  const d = p.match(new RegExp(`^${N} ([+−×÷]) ${N} = \\?$`));
  if (d && (d[1].includes('.') || d[3].includes('.'))) {
    const a = +d[1], b = +d[3];
    const v = d[2] === '+' ? a + b : d[2] === '−' ? a - b : d[2] === '×' ? a * b : a / b;
    return { value: dec(v), from: 'prompt' };
  }
  return null;
}

const val = (t) => {
  const f = String(t).match(/^(\d+)\/(\d+)$/);
  if (f) return +f[1] / +f[2];
  return Number(t);
};

/**
 * Questions whose prompt is a sentence rather than an expression. There is no
 * single value to compute — the check is a property the winning button must have
 * and the others must not, which catches a mis-selected answer just as well.
 */
function fromWording(q) {
  const p = (q.prompt || '').trim();
  const texts = q.choices.map((c) => c.text);
  const rule = (describe, ok) => ({ check: ok, describe, from: 'wording' });

  let m;
  if ((m = p.match(/^Which number is a factor of (\d+)\?$/))) {
    const t = +m[1];
    return rule(`a factor of ${t}`, (x) => Number.isInteger(+x) && +x > 0 && t % +x === 0);
  }
  if ((m = p.match(/^Which number is a multiple of (\d+)\?$/))) {
    const b = +m[1];
    return rule(`a multiple of ${b}`, (x) => Number.isInteger(+x) && +x > 0 && +x % b === 0);
  }
  if (/^Which number is EVEN\?$/.test(p)) return rule('even', (x) => +x % 2 === 0);
  if (/^Which number is ODD\?$/.test(p)) return rule('odd', (x) => +x % 2 === 1);

  if (/^Which (fraction|decimal) is GREATER\?$/.test(p)) {
    const best = Math.max(...texts.map(val));
    return rule('the greater value', (x) => near(val(x), best));
  }
  if (/^Which (fraction|decimal) is SMALLER\?$/.test(p)) {
    const best = Math.min(...texts.map(val));
    return rule('the smaller value', (x) => near(val(x), best));
  }
  if ((m = p.match(/^Which fraction is the same as (\d+)\/(\d+)\?$/))) {
    const target = +m[1] / +m[2];
    return rule(`equal to ${m[1]}/${m[2]}`, (x) => near(val(x), target));
  }
  if ((m = p.match(/^What is (\d+)\/(\d+) of (\d+)\?$/))) {
    const [n, d, whole] = [+m[1], +m[2], +m[3]];
    return whole % d === 0 ? { value: (whole / d) * n, from: 'wording' } : null;
  }
  if ((m = p.match(/^Write (\d+)\/(\d+) as a decimal$/))) {
    return { value: dec(+m[1] / +m[2]), from: 'wording' };
  }
  if ((m = p.match(/^Round (\d+) to the nearest (ten|hundred|thousand)$/))) {
    const place = { ten: 10, hundred: 100, thousand: 1000 }[m[2]];
    return { value: Math.round(+m[1] / place) * place, from: 'wording' };
  }
  if ((m = p.match(/^(\d+) is how many times as many as (\d+)\?$/))) {
    return { value: +m[1] / +m[2], from: 'wording' };
  }
  if ((m = p.match(/^What is (\d+) times as many as (\d+)\?$/))) {
    return { value: +m[1] * +m[2], from: 'wording' };
  }
  if ((m = p.match(/^In (\d+), what is the (\d+) worth\?$/))) {
    // The answer must be that digit sitting in one of the number's own places.
    const whole = m[1], digit = +m[2];
    const places = [...whole].map((c, i) => (+c === digit ? digit * 10 ** (whole.length - 1 - i) : null))
      .filter((x) => x !== null);
    return rule(`the ${digit} in one of ${whole}'s places`, (x) => places.includes(+x));
  }
  if ((m = p.match(/^In (\d+), what is the (\d+) in the ([a-z ]+) place worth\?$/))) {
    const power = { ones: 1, tens: 10, hundreds: 100, thousands: 1000, 'ten thousands': 10000, 'hundred thousands': 100000 }[m[3]];
    return { value: +m[2] * power, from: 'wording' };
  }
  if (q.skill === 'div_remainder' && (m = p.match(/^(\d+) ÷ (\d+) = \?$/))) {
    const a = +m[1], b = +m[2];
    return { value: `${Math.floor(a / b)} R${a % b}`, from: 'wording' };
  }
  if (q.skill === 'equal_groups' && /in each group/.test(p) && q.visual) {
    return { value: q.visual.each, from: 'wording' };
  }
  if (q.skill === 'bar_graph' && q.visual?.rows) {
    const counts = q.visual.rows.map((r) => r.count);
    if (/altogether/.test(p)) return { value: counts.reduce((a, b) => a + b, 0), from: 'wording' };
    if (/how many more/i.test(p)) return { value: Math.max(...counts) - Math.min(...counts), from: 'wording' };
    if (/longest row/.test(p)) return { value: Math.max(...counts), from: 'wording' };
  }
  return null;
}

/**
 * Re-derives the answer from the picture. For a question whose prompt is just
 * "?" this is the only independent check there is, which makes it the important
 * half for every band below 2nd grade.
 */
function fromVisual(q) {
  const v = q.visual;
  if (!v) return null;
  const skill = q.skill;

  switch (v.kind) {
    case 'countRow':
      return skill === 'count_objects' ? { value: v.count, from: 'visual' } : null;

    case 'tenFrame':
      return skill === 'ten_frame_count' ? { value: v.count, from: 'visual' }
        : skill === 'ten_frame_add' ? { value: v.count, from: 'visual' } : null;

    case 'compareGroups': {
      const [a, b] = [v.left.count, v.right.count];
      const up = q.promptIcon === 'iconMore';
      return { value: up ? Math.max(a, b) : Math.min(a, b), from: 'visual' };
    }

    case 'numberTrack': {
      // The run must be an arithmetic sequence; the gap is whatever fits.
      const cells = v.cells;
      const at = cells.indexOf(null);
      const known = cells.map((c, i) => [i, c]).filter(([, c]) => c !== null);
      if (known.length < 2) return null;
      const step = (known[1][1] - known[0][1]) / (known[1][0] - known[0][0]);
      return { value: known[0][1] + (at - known[0][0]) * step, from: 'visual' };
    }

    case 'numberBond': {
      const slots = [v.whole, ...v.parts];
      if (slots.filter((x) => x == null).length !== 1) return null;
      if (v.whole == null) return { value: v.parts[0] + v.parts[1], from: 'visual' };
      return { value: v.whole - (v.parts[0] ?? v.parts[1]), from: 'visual' };
    }

    case 'baseTen':
      return skill === 'base_ten_build' || skill === 'place_value_3digit'
        ? { value: (v.hundreds || 0) * 100 + (v.tens || 0) * 10 + (v.ones || 0), from: 'visual' }
        : null;


    case 'lengthUnits':
      return { value: v.units, from: 'visual' };

    case 'pictureGraph': {
      const marked = v.rows.filter((r) => r.mark);
      if (marked.length === 1) return { value: marked[0].count, from: 'visual' };
      return null;
    }

    case 'equalGroups':
      return skill === 'equal_groups' && /altogether/.test(q.prompt || '')
        ? { value: v.groups * v.each, from: 'visual' } : null;

    case 'money':
      return { value: v.coins.reduce((a, b) => a + b, 0), from: 'visual' };

    case 'areaGrid':
      return { value: v.rows * v.cols, from: 'visual' };

    case 'perimeterShape':
      return { value: 2 * (v.w + v.h), from: 'visual' };

    case 'prism':
      return { value: v.l * v.wd * v.ht, from: 'visual' };

    case 'fractionLine':
      return v.at != null ? { value: `${v.at}/${v.den}`, from: 'visual' } : null;

    case 'fractionCircle':
      return skill === 'fraction_identify' ? { value: `${v.num}/${v.den}`, from: 'visual' } : null;

    case 'fractionBar':
      return skill === 'fraction_identify' && v.den
        ? { value: `${v.num}/${v.den}`, from: 'visual' } : null;

    case 'angle':
      return { value: v.degrees, from: 'visual' };

    case 'coordGrid':
      return v.point ? { value: `(${v.point[0]}, ${v.point[1]})`, from: 'visual' } : null;

    case 'clock':
      return { value: `${v.hour}:${String(v.minute).padStart(2, '0')}`, from: 'visual' };

    case 'dotArray':
      return skill === 'doubles' && v.counts
        ? { value: v.counts.reduce((a, b) => a + b, 0), from: 'visual' } : null;

    case 'shape': {
      // The corner-dotted shapes are the ones the corner count is asked about.
      const corners = { triangle: 3, square: 4, diamond: 4, hexagon: 6, star: 5 };
      return v.corners && corners[v.shape] ? { value: corners[v.shape], from: 'visual' } : null;
    }

    case 'matchCard':
      return v.left.shape
        ? { value: v.left.shape.charAt(0).toUpperCase() + v.left.shape.slice(1), from: 'visual' }
        : { value: v.left.value, from: 'visual' };

    case 'numberLine': {
      // Hops chain: the answer is where the last one lands.
      const hops = v.hops || (v.hop ? [v.hop] : []);
      if (skill === 'number_line_jump' || skill === 'number_line_sum' || skill === 'make_ten') {
        if (hops.length) return { value: hops[hops.length - 1].to, from: 'visual' };
      }
      if (skill === 'compare_numerals' || skill === 'compare_two_digit' || skill === 'biggest_smallest') {
        const vals = (v.marks || []).map((m) => m.at);
        if (!vals.length) return null;
        const up = q.promptIcon === 'iconMore';
        return { value: up ? Math.max(...vals) : Math.min(...vals), from: 'visual' };
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Prefers the prompt (it is what a reader actually answers), falls back to the
 * picture (which is the whole question for a pre-reader).
 */
export function solve(q) {
  return fromWording(q) || fromPrompt(q.prompt) || fromVisual(q);
}

/**
 * True when the solver's answer and the question's own answer agree.
 *
 * Numbers are compared with a 1e-9 tolerance, because 6.8 + 8.1 is
 * 14.899999999999999 in binary floating point and 14.9 on the button — a
 * difference no child will ever see. The tolerance is deliberately that tight:
 * loosening it to "however many decimals the button shows" would wave through a
 * question that displays 0.02 as the answer to 1.97 ÷ 100, which is not a
 * rounding artefact but a wrong answer. Anything not numeric on both sides is
 * compared as the text on the winning button, which is what a player taps.
 */
export function agrees(solved, q) {
  // A predicate answer: the winning button must satisfy it and every other
  // button must not, so "one correct choice" is checked against real maths
  // rather than against the generator's own bookkeeping.
  if (solved.check) {
    return q.choices.every((c, i) => solved.check(c.text) === (i === q.answerIndex));
  }
  const mine = solved.value;
  const shown = q.choices[q.answerIndex].text;
  const theirs = q.answerValue !== undefined ? q.answerValue : shown;

  const asNum = (x) => (typeof x === 'number' ? x
    : /^\d+(\.\d+)?$/.test(String(x)) ? Number(x) : null);
  const a = asNum(mine), b = asNum(theirs), c = asNum(shown);
  if (a !== null && (b !== null || c !== null)) {
    return (b !== null && near(a, b)) || (c !== null && near(a, c));
  }
  return String(mine) === String(shown) || String(mine) === String(theirs);
}
