// Backdrops, particles, floating text and the visual supports that sit beside
// early-grade questions (countables, ten-frames, fraction bars, number lines).

import { INK, roundRectPath, ink, fiveStar, sparkle } from './toybox.js';
import { withAlpha, clamp, lerp, mulberry32 } from '../core/utils.js';

export const FONT = 'ui-rounded, "SF Pro Rounded", "Varela Round", "Trebuchet MS", system-ui, sans-serif';

export function outlinedText(ctx, text, x, y, font, fill, lw = 6, stroke = INK) {
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ------------------------------------------------------------------ backdrops

export function drawSkyDecor(ctx, view, pal, t = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, pal.sky[0]);
  g.addColorStop(1, pal.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w, view.h);

  if (pal.stars) {
    const rng = mulberry32(7);
    ctx.save();
    for (let i = 0; i < 46; i++) {
      const x = rng() * view.w, y = rng() * view.h * 0.72;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
      ctx.globalAlpha = 0.35 + tw * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 1 + rng() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    // Fat rounded clouds, drifting slowly.
    ctx.save();
    ctx.fillStyle = withAlpha('#ffffff', 0.72);
    const rng = mulberry32(31);
    for (let i = 0; i < 4; i++) {
      const baseX = rng() * view.w;
      const y = 40 + rng() * view.h * 0.3;
      const s = 26 + rng() * 26;
      const x = (baseX + t * (6 + i * 3)) % (view.w + 240) - 120;
      for (const [dx, dy, r] of [[-s, 6, s * 0.7], [0, 0, s], [s, 8, s * 0.62]]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  if (pal.dusk) {
    ctx.fillStyle = withAlpha('#2b1b38', pal.dusk);
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

export function drawGround(ctx, view, pal, groundY) {
  ctx.fillStyle = pal.groundDark;
  ctx.fillRect(0, groundY - 8, view.w, view.h - groundY + 8);
  ctx.fillStyle = pal.ground;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= view.w; x += 40) {
    ctx.quadraticCurveTo(x + 20, groundY - 7, x + 40, groundY);
  }
  ctx.lineTo(view.w, view.h);
  ctx.lineTo(0, view.h);
  ctx.closePath();
  ctx.fill();
}

// ------------------------------------------------------------------ particles

export class Particles {
  constructor() { this.list = []; this.shake = 0; }

  poof(x, y, color = '#fff3a8', n = 14) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const sp = 60 + Math.random() * 150;
      this.list.push({
        kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: 0.5 + Math.random() * 0.35, age: 0, size: 4 + Math.random() * 7, color,
      });
    }
  }

  confetti(x, y, n = 26) {
    const cols = ['#ffd34e', '#ff7ab8', '#7ee0ff', '#7ee0b8', '#ffb347'];
    for (let i = 0; i < n; i++) {
      this.list.push({
        kind: 'confetti', x, y,
        vx: (Math.random() - 0.5) * 320, vy: -160 - Math.random() * 260,
        life: 1.4 + Math.random(), age: 0, size: 5 + Math.random() * 7,
        color: cols[i % cols.length], rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 12,
      });
    }
  }

  coinFly(x, y, tx, ty) {
    this.list.push({ kind: 'coin', x, y, sx: x, sy: y, tx, ty, life: 0.6, age: 0 });
  }

  text(x, y, msg, color = '#fff8ec', size = 22) {
    this.list.push({ kind: 'text', x, y, msg, color, size, life: 1.0, age: 0 });
  }

  ring(x, y, color = '#9ef2ff') {
    this.list.push({ kind: 'ring', x, y, life: 0.45, age: 0, color });
  }

  kick(amount = 6) { this.shake = Math.max(this.shake, amount); }

  update(dt) {
    this.shake *= Math.pow(0.001, dt);
    if (this.shake < 0.2) this.shake = 0;
    for (const p of this.list) {
      p.age += dt;
      if (p.kind === 'spark' || p.kind === 'confetti') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.kind === 'confetti' ? 620 : 340) * dt;
        p.vx *= 0.98;
        if (p.rot != null) p.rot += p.vr * dt;
      } else if (p.kind === 'text') {
        p.y -= 44 * dt;
      }
    }
    this.list = this.list.filter((p) => p.age < p.life);
  }

  render(ctx) {
    for (const p of this.list) {
      const k = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = clamp(k * 1.4, 0, 1);
      if (p.kind === 'spark') {
        sparkle(ctx, p.x, p.y, p.size * k, p.color);
      } else if (p.kind === 'confetti') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.kind === 'coin') {
        const t = 1 - k;
        const e = t * t * (3 - 2 * t);
        const x = lerp(p.sx, p.tx, e);
        const y = lerp(p.sy, p.ty, e) - Math.sin(e * Math.PI) * 50;
        ctx.fillStyle = '#ffd34e';
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ink(ctx, 2.4);
      } else if (p.kind === 'text') {
        ctx.textAlign = 'center';
        outlinedText(ctx, p.msg, p.x, p.y, `900 ${p.size}px ${FONT}`, p.color, 5);
      } else if (p.kind === 'ring') {
        const r = lerp(6, 60, 1 - k);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5 * k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  applyShake(ctx, t) {
    if (this.shake <= 0) return;
    ctx.translate(Math.sin(t * 90) * this.shake, Math.cos(t * 74) * this.shake * 0.6);
  }
}

// ----------------------------------------------------- question visual support

/**
 * Renders a declarative visual spec from the question generators.
 * Kept here (not in data/) so the generators stay DOM-free and testable in Node.
 */
export function drawQuestionVisual(ctx, spec, bank, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (!spec) return;
  const fn = VISUALS[spec.kind];
  if (fn) fn(ctx, spec, bank, w, h);
}

function fitCount(count, w, h, max = 10) {
  const cols = Math.min(max, Math.ceil(Math.sqrt(count * (w / Math.max(h, 1)))) || 1);
  const rows = Math.ceil(count / cols);
  const size = Math.min(w / (cols + 0.5), h / (rows + 0.35));
  return { cols, rows, size };
}

function drawCountable(ctx, bank, name, x, y, size) {
  const sp = bank.prop(name, size, {});
  if (sp) ctx.drawImage(sp, x - size / 2, y - size / 2, size, size);
}

/**
 * Dice-face offsets in a unit square, so a small count can be shown in the
 * arrangement children already subitise from board games.
 */
const DICE = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.24, 0.24], [0.5, 0.5], [0.76, 0.76]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.5], [0.72, 0.5], [0.28, 0.78], [0.72, 0.78]],
};

const VISUALS = {
  /**
   * Objects to count. IM asks children to count the same quantity arranged
   * several ways — a line, a pile, a dice face — because a child who can only
   * count neat rows has not yet understood that the arrangement is irrelevant.
   */
  countRow(ctx, spec, bank, w, h) {
    const n = spec.count;
    const how = spec.arrange || 'grid';

    if (how === 'dice' && DICE[n]) {
      const box = Math.min(w - 12, h - 8);
      const x0 = (w - box) / 2, y0 = (h - box) / 2;
      roundRectPath(ctx, x0, y0, box, box, box * 0.16);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fill();
      ink(ctx, 3);
      for (const [fx, fy] of DICE[n]) {
        drawCountable(ctx, bank, spec.sprite, x0 + fx * box, y0 + fy * box, box * 0.26);
      }
      return;
    }

    if (how === 'scatter') {
      // Seeded off the count so the same question always scatters the same way.
      const rnd = mulberry32(1013 + n * 7919 + (spec.seed || 0) * 31);
      const size = clamp(Math.min(w, h) * (n > 8 ? 0.2 : 0.28), 16, 54);
      const placed = [];
      for (let i = 0; i < n; i++) {
        let best = null, bestGap = -1;
        for (let tries = 0; tries < 24; tries++) {
          const x = size * 0.6 + rnd() * (w - size * 1.2);
          const y = size * 0.6 + rnd() * (h - size * 1.2);
          let gap = Infinity;
          for (const q of placed) gap = Math.min(gap, Math.hypot(q.x - x, q.y - y));
          if (gap > bestGap) { bestGap = gap; best = { x, y }; }
          if (gap > size * 0.95) break;
        }
        placed.push(best);
        drawCountable(ctx, bank, spec.sprite, best.x, best.y, size);
      }
      return;
    }

    const maxCols = how === 'row' ? Math.max(1, n) : 10;
    const { cols, rows, size } = fitCount(n, w, h, maxCols);
    const gh = rows * size;
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const rowCount = Math.min(cols, n - r * cols);
      const rowW = rowCount * size;
      drawCountable(ctx, bank, spec.sprite, (w - rowW) / 2 + c * size + size / 2,
        (h - gh) / 2 + r * size + size / 2, size * 0.92);
    }
  },

  /** Two (or more) groups with an operator between them. */
  countGroups(ctx, spec, bank, w, h) {
    const groups = spec.groups;
    const op = spec.op || '+';
    const opW = Math.min(w * 0.1, 40);
    const avail = w - opW * (groups.length - 1) - 8;
    const each = avail / groups.length;
    let x = 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    groups.forEach((grp, gi) => {
      const per = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(grp.count))));
      const rows = Math.ceil(grp.count / per);
      const size = Math.min(each / (per + 0.3), h / (rows + 0.3));
      const gh = rows * size;
      for (let i = 0; i < grp.count; i++) {
        const c = i % per, r = Math.floor(i / per);
        const rowCount = Math.min(per, grp.count - r * per);
        const rowW = rowCount * size;
        drawCountable(ctx, bank, grp.sprite, x + (each - rowW) / 2 + c * size + size / 2,
          (h - gh) / 2 + r * size + size / 2, size * 0.9);
      }
      x += each;
      if (gi < groups.length - 1) {
        outlinedText(ctx, op, x + opW / 2, h / 2, `900 ${Math.min(h * 0.4, 34)}px ${FONT}`, '#fff8ec', 5);
        x += opW;
      }
    });
  },

  /** Ten-frame — the standard kindergarten subitising tool. */
  tenFrame(ctx, spec, bank, w, h) {
    const count = spec.count;
    const frames = Math.max(1, Math.ceil(count / 10));
    const cell = Math.min((w - 16) / (5 * frames + (frames - 1) * 0.4), (h - 10) / 2);
    const totalW = frames * cell * 5 + (frames - 1) * cell * 0.4;
    let left = (w - totalW) / 2;
    const top = (h - cell * 2) / 2;
    let placed = 0;
    for (let f = 0; f < frames; f++) {
      roundRectPath(ctx, left, top, cell * 5, cell * 2, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
      ink(ctx, 3);
      ctx.strokeStyle = withAlpha(INK, 0.45);
      ctx.lineWidth = 1.6;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(left + i * cell, top);
        ctx.lineTo(left + i * cell, top + cell * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(left, top + cell);
      ctx.lineTo(left + cell * 5, top + cell);
      ctx.stroke();
      for (let i = 0; i < 10 && placed < count; i++, placed++) {
        const c = i % 5, r = Math.floor(i / 5);
        ctx.beginPath();
        ctx.arc(left + c * cell + cell / 2, top + r * cell + cell / 2, cell * 0.32, 0, Math.PI * 2);
        // `first` colours the opening run differently, so composing a number
        // out of two parts ("5 and 3 more") is visible rather than implied.
        ctx.fillStyle = spec.first != null
          ? (placed < spec.first ? '#ff7ab8' : '#7ec8ff')
          : (r === 0 ? '#ff7ab8' : '#7ec8ff');
        ctx.fill();
        ink(ctx, 2.4);
      }
      left += cell * 5 + cell * 0.4;
    }
  },

  /** Two groups side by side for more/fewer comparisons. */
  compareGroups(ctx, spec, bank, w, h) {
    const half = w / 2;
    [spec.left, spec.right].forEach((grp, i) => {
      const x0 = i * half;
      roundRectPath(ctx, x0 + 6, 4, half - 12, h - 8, 12);
      ctx.fillStyle = i === 0 ? 'rgba(214,242,255,0.92)' : 'rgba(255,230,242,0.92)';
      ctx.fill();
      ink(ctx, 3);
      const per = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(grp.count))));
      const rows = Math.ceil(grp.count / per);
      const size = Math.min((half - 24) / (per + 0.2), (h - 20) / (rows + 0.2));
      const gh = rows * size;
      for (let n = 0; n < grp.count; n++) {
        const c = n % per, r = Math.floor(n / per);
        const rowCount = Math.min(per, grp.count - r * per);
        const rowW = rowCount * size;
        drawCountable(ctx, bank, grp.sprite, x0 + (half - rowW) / 2 + c * size + size / 2,
          (h - gh) / 2 + r * size + size / 2, size * 0.88);
      }
    });
  },

  /**
   * Rows of dots — how repeated addition becomes multiplication. Either a full
   * rows x cols array, or `counts`, one length per row, for a pair of unequal
   * rows (doubles and near-doubles).
   */
  dotArray(ctx, spec, bank, w, h) {
    const counts = spec.counts || new Array(spec.rows).fill(spec.cols);
    const rows = counts.length;
    const cols = Math.max(...counts);
    const size = Math.min((w - 20) / (cols + 0.4), (h - 12) / (rows + 0.4));
    const gh = rows * size;
    const y0 = (h - gh) / 2;
    for (let r = 0; r < rows; r++) {
      const rowW = counts[r] * size;
      const x0 = spec.counts ? (w - rowW) / 2 : (w - cols * size) / 2;
      for (let c = 0; c < counts[r]; c++) {
        ctx.beginPath();
        ctx.arc(x0 + c * size + size / 2, y0 + r * size + size / 2, size * 0.33, 0, Math.PI * 2);
        ctx.fillStyle = ['#ff7ab8', '#7ec8ff', '#7ee0b8', '#ffd34e'][r % 4];
        ctx.fill();
        ink(ctx, 2.2);
      }
    }
  },

  /** One or two fraction bars. */
  fractionBar(ctx, spec, bank, w, h) {
    const bars = spec.bars || [{ num: spec.num, den: spec.den }];
    const gap = 8;
    const bh = Math.min((h - gap * (bars.length - 1)) / bars.length, h * 0.44);
    const bw = w - 24;
    bars.forEach((b, i) => {
      const y = (h - (bh * bars.length + gap * (bars.length - 1))) / 2 + i * (bh + gap);
      const cw = bw / b.den;
      for (let k = 0; k < b.den; k++) {
        roundRectPath(ctx, 12 + k * cw + 1, y, cw - 2, bh, 5);
        ctx.fillStyle = k < b.num ? (i === 0 ? '#ff7ab8' : '#7ec8ff') : 'rgba(255,255,255,0.88)';
        ctx.fill();
        ink(ctx, 2.4);
      }
      if (b.label) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        outlinedText(ctx, b.label, 14, y + bh / 2, `900 ${bh * 0.6}px ${FONT}`, '#fff8ec', 4);
      }
    });
  },

  fractionCircle(ctx, spec, bank, w, h) {
    const r = Math.min(w, h) * 0.42;
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < spec.den; i++) {
      const a0 = (i / spec.den) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / spec.den) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = i < spec.num ? '#ff9ec4' : 'rgba(255,255,255,0.9)';
      ctx.fill();
      ink(ctx, 2.6);
    }
  },

  numberLine(ctx, spec, bank, w, h) {
    const { min, max } = spec;
    const y = h * 0.62;
    const x0 = 22, x1 = w - 22;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ink(ctx, 4);
    const span = Math.max(1, max - min);
    // Tick every unit, but only label as many as actually fit. A line from 2 to
    // 17 labelled at every tick renders as one illegible smear of digits.
    const widest = String(max).length * 9 + 10;
    const labelStep = Math.max(1, Math.ceil(span / Math.max(1, Math.floor((x1 - x0) / widest))));
    const tickStep = span > 40 ? labelStep : 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = min; v <= max; v += tickStep) {
      const x = x0 + ((v - min) / span) * (x1 - x0);
      const labelled = (v - min) % labelStep === 0;
      ctx.beginPath();
      ctx.moveTo(x, y - (labelled ? 7 : 4));
      ctx.lineTo(x, y + (labelled ? 7 : 4));
      ink(ctx, labelled ? 3 : 1.8);
      if (labelled) {
        outlinedText(ctx, String(v), x, y + 18, `800 ${Math.min(h * 0.22, 15)}px ${FONT}`, '#fff8ec', 4);
      }
    }
    for (const m of spec.marks || []) {
      const x = x0 + ((m.at - min) / span) * (x1 - x0);
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = m.color || '#ffd34e';
      ctx.fill();
      ink(ctx, 2.6);
      if (m.label) {
        outlinedText(ctx, m.label, x, Math.max(10, y - 26),
          `900 ${Math.min(h * 0.24, 17)}px ${FONT}`, '#fff8ec', 4);
      }
    }
    for (const hop of spec.hops || (spec.hop ? [spec.hop] : [])) {
      const ax = x0 + ((hop.from - min) / span) * (x1 - x0);
      const bx = x0 + ((hop.to - min) / span) * (x1 - x0);
      // Tall enough that a short hop's label clears the mark label above the
      // number it starts from, but never taller than the room above the line —
      // on a landscape phone the card is short, and an arc sized for a tall one
      // pushes its label clean off the canvas.
      const arc = Math.max(14, Math.min(52, 30 + Math.abs(bx - ax) * 0.35, y - 16));
      ctx.beginPath();
      ctx.moveTo(ax, y - 6);
      ctx.quadraticCurveTo((ax + bx) / 2, y - arc, bx, y - 6);
      ctx.strokeStyle = hop.color || '#ffd34e';
      ctx.lineWidth = 4;
      ctx.stroke();
      // An arrowhead states which way the jump goes; a bare arc does not.
      const dir = bx >= ax ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(bx, y - 4);
      ctx.lineTo(bx - 7 * dir, y - 15);
      ctx.moveTo(bx, y - 4);
      ctx.lineTo(bx + 5 * dir, y - 16);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      if (hop.label) {
        outlinedText(ctx, hop.label, (ax + bx) / 2, Math.max(8, y - arc - 4),
          `900 ${Math.min(h * 0.22, 16)}px ${FONT}`, '#fff8ec', 4);
      }
    }
  },

  /**
   * A row of number cards with one gap — "2 3 4 ?" or "? 5 6 7".
   * The sequence itself says which way to count, so before/after questions
   * stop depending on a child being able to read the words "before" and "after".
   */
  numberTrack(ctx, spec, bank, w, h) {
    const cells = spec.cells;
    const n = cells.length;
    const gap = 8;
    const size = Math.min((w - gap * (n - 1) - 8) / n, h - 6);
    const totalW = n * size + gap * (n - 1);
    const x0 = (w - totalW) / 2;
    const y0 = (h - size) / 2;

    cells.forEach((cell, i) => {
      const x = x0 + i * (size + gap);
      const isGap = cell === null;
      roundRectPath(ctx, x, y0, size, size, size * 0.24);
      ctx.fillStyle = isGap ? '#ffe9a8' : '#ffffff';
      ctx.fill();
      ink(ctx, isGap ? 4 : 3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      outlinedText(ctx, isGap ? '?' : String(cell), x + size / 2, y0 + size / 2,
        `900 ${size * 0.56}px ${FONT}`, isGap ? '#b45f09' : '#3d2447', 0, null);
    });

    // An arrow under the track reinforces the direction of travel.
    const ay = y0 + size + 6;
    if (ay < h - 2) {
      const dir = spec.dir === 'back' ? -1 : 1;
      const cx = w / 2;
      ctx.beginPath();
      ctx.moveTo(cx - 26 * dir, ay);
      ctx.lineTo(cx + 22 * dir, ay);
      ctx.moveTo(cx + 22 * dir, ay);
      ctx.lineTo(cx + 12 * dir, ay - 6);
      ctx.moveTo(cx + 22 * dir, ay);
      ctx.lineTo(cx + 12 * dir, ay + 6);
      ink(ctx, 3.5, withAlpha(INK, 0.75));
    }
  },

  /** Basic shape recognition for Pre-K. */
  shape(ctx, spec, bank, w, h) {
    const r = Math.min(w, h) * 0.36;
    const cx = w / 2, cy = h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    drawShapePath(ctx, spec.shape, r);
    ctx.fillStyle = spec.color || '#7ec8ff';
    ctx.fill();
    ink(ctx, 4);
    if (spec.corners) for (const [px, py] of shapeCorners(spec.shape, r)) {
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd34e';
      ctx.fill();
      ink(ctx, 2.4);
    }
    ctx.restore();
  },

  /**
   * "This shape = which one?" stated as a picture. An equals sign and an empty
   * slot ask the matching question without the words "which one matches".
   */
  shapeMatch(ctx, spec, bank, w, h) {
    const box = Math.min(h - 6, (w - 44) / 2);
    const total = box * 2 + 44;
    const x0 = (w - total) / 2;
    const cy = h / 2;

    card(ctx, x0, cy - box / 2, box, box, '#ffffff');
    ctx.save();
    ctx.translate(x0 + box / 2, cy);
    drawShapePath(ctx, spec.shape, box * 0.32);
    ctx.fillStyle = spec.color || '#ffd34e';
    ctx.fill();
    ink(ctx, 3.4);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    outlinedText(ctx, '=', x0 + box + 22, cy, `900 ${box * 0.5}px ${FONT}`, '#fff8ec', 5);

    card(ctx, x0 + box + 44, cy - box / 2, box, box, '#ffe9a8');
    outlinedText(ctx, '?', x0 + box + 44 + box / 2, cy,
      `900 ${box * 0.52}px ${FONT}`, '#b45f09', 0, null);
  },

  /**
   * A numeral on a card, for questions that go the other way round: read the
   * symbol, then pick the group that has that many.
   */
  numeralCard(ctx, spec, bank, w, h) {
    const box = Math.min(h - 6, w * 0.5);
    card(ctx, (w - box) / 2, (h - box) / 2, box, box, spec.color || '#ffffff');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    outlinedText(ctx, String(spec.value), w / 2, h / 2,
      `900 ${box * 0.56}px ${FONT}`, '#3d2447', 0, null);
  },

  /**
   * Part-part-whole. IM's central model for composing and decomposing numbers:
   * the whole sits above two parts, and any one of the three can be the gap.
   */
  numberBond(ctx, spec, bank, w, h) {
    const r = clamp(Math.min(w / 5.2, h / 3.4), 16, 40);
    const cx = w / 2, topY = r + 3, botY = h - r - 3;
    const lx = cx - r * 1.7, rx = cx + r * 1.7;
    const nodes = [
      { x: cx, y: topY, v: spec.whole, tone: '#ffd34e' },
      { x: lx, y: botY, v: spec.parts[0], tone: '#7ec8ff' },
      { x: rx, y: botY, v: spec.parts[1], tone: '#ff9ec4' },
    ];
    ctx.beginPath();
    ctx.moveTo(cx, topY + r); ctx.lineTo(lx, botY - r);
    ctx.moveTo(cx, topY + r); ctx.lineTo(rx, botY - r);
    ink(ctx, 3.4, withAlpha(INK, 0.7));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const nd of nodes) {
      const gap = nd.v == null;
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);
      ctx.fillStyle = gap ? '#ffe9a8' : nd.tone;
      ctx.fill();
      ink(ctx, gap ? 4 : 3);
      outlinedText(ctx, gap ? '?' : String(nd.v), nd.x, nd.y,
        `900 ${r * 0.92}px ${FONT}`, gap ? '#b45f09' : '#3d2447', 0, null);
    }
  },

  /**
   * Base-ten blocks: flats, rods and units. The whole point of place value is
   * that ten ones *are* one ten, so the picture has to show the grouping.
   */
  baseTen(ctx, spec, bank, w, h) {
    const hundreds = spec.hundreds || 0, tens = spec.tens || 0, ones = spec.ones || 0;
    const onesCols = Math.min(5, Math.max(1, ones));
    // Solve the unit size from everything that has to fit, not just the ones:
    // sizing off the ones alone pushed the hundreds flats straight off canvas.
    const gap = 10;
    const cols = hundreds * 10.4 + tens * 1.3 + (ones ? onesCols * 1.2 : 0);
    const groups = (hundreds ? 1 : 0) + (tens ? 1 : 0) + (ones ? 1 : 0);
    const u = clamp(Math.min((w - gap * (groups + 1)) / Math.max(cols, 1), (h - 8) / 10), 2.5, 13);
    const top = (h - u * 10) / 2;
    let x = (w - (cols * u + gap * (groups - 1))) / 2;

    const unitAt = (ux, uy, tone, lw) => {
      roundRectPath(ctx, ux, uy, u, u, u * 0.22);
      ctx.fillStyle = tone;
      ctx.fill();
      ink(ctx, lw);
    };

    if (hundreds) {
      for (let k = 0; k < hundreds; k++) {
        const bx = x + k * u * 10.4;
        for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) unitAt(bx + c * u, top + r * u, '#a9dfae', 0.9);
        // A heavier outline round the flat says "this is one hundred", which is
        // the whole point of the picture.
        roundRectPath(ctx, bx, top, u * 10, u * 10, 3);
        ink(ctx, 3);
      }
      x += hundreds * u * 10.4 + gap;
    }
    if (tens) {
      for (let k = 0; k < tens; k++) {
        const bx = x + k * u * 1.3;
        for (let r = 0; r < 10; r++) unitAt(bx, top + r * u, '#7ec8ff', 1.4);
        roundRectPath(ctx, bx, top, u, u * 10, 3);
        ink(ctx, 2.6);
      }
      x += tens * u * 1.3 + gap;
    }
    if (ones) {
      // Ones sit on the same baseline as the rods, so the picture reads as one
      // collection rather than two floating groups.
      const rows = Math.ceil(ones / onesCols);
      for (let k = 0; k < ones; k++) {
        const c = k % onesCols, r = Math.floor(k / onesCols);
        unitAt(x + c * u * 1.2, top + u * 10 - (rows - r) * u * 1.2, '#ff9ec4', 1.6);
      }
    }
  },

  /**
   * Length measured in identical units, laid end to end from a common start —
   * IM's approach to measurement before any ruler appears.
   */
  lengthUnits(ctx, spec, bank, w, h) {
    const total = Math.max(spec.units, spec.span || spec.units);
    const u = Math.min((w - 30) / total, (h - 14) / 2.4);
    const x0 = (w - u * total) / 2;
    const rowY = (h - u * 2.1) / 2 + u * 1.05;

    // The bar sits directly on the units, both starting at the same left edge:
    // measuring from a common start is the idea, so the picture has to show it.
    roundRectPath(ctx, x0, rowY - u, u * spec.units, u, u * 0.18);
    ctx.fillStyle = spec.color || '#ff9ec4';
    ctx.fill();
    ink(ctx, 3);

    for (let i = 0; i < total; i++) {
      roundRectPath(ctx, x0 + i * u, rowY, u, u, u * 0.16);
      ctx.fillStyle = i < spec.units ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.5)';
      ctx.fill();
      ink(ctx, 2);
    }

    // A start line, so "count from here" is unambiguous.
    ctx.beginPath();
    ctx.moveTo(x0, rowY - u * 1.2);
    ctx.lineTo(x0, rowY + u * 1.2);
    ink(ctx, 3, withAlpha(INK, 0.6));
  },

  /**
   * A picture graph. One row can be ringed, so "how many in this category" can
   * be asked without naming the category in words.
   */
  pictureGraph(ctx, spec, bank, w, h) {
    const rows = spec.rows;
    const maxN = Math.max(...rows.map((r) => r.count), 1);
    const axis = 6;
    // Size the cell from both directions so the graph fills the card instead of
    // sitting as a stamp in the top-left of it.
    const cell = Math.min((h - 4) / rows.length, (w - axis - 12) / maxN);
    const rowH = cell;
    const gw = axis + maxN * cell;
    const x0 = (w - gw) / 2;
    const y0 = (h - rowH * rows.length) / 2;

    rows.forEach((row, i) => {
      const y = y0 + i * rowH;
      if (row.mark) {
        roundRectPath(ctx, x0, y + 1, axis + row.count * cell, rowH - 2, Math.min(10, rowH * 0.3));
        ctx.fillStyle = 'rgba(255,233,168,0.95)';
        ctx.fill();
        ink(ctx, 3);
      }
      for (let k = 0; k < row.count; k++) {
        drawCountable(ctx, bank, row.sprite, x0 + axis + k * cell + cell / 2, y + rowH / 2, cell * 0.9);
      }
    });

    // A baseline down the left, so the rows read as a graph with a common start.
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0, y0 + rowH * rows.length);
    ink(ctx, 3, withAlpha(INK, 0.6));
  },

  /** Equal groups drawn as rings — the picture behind "3 groups of 4". */
  equalGroups(ctx, spec, bank, w, h) {
    const g = spec.groups, per = spec.each;
    const cols = Math.min(g, 4);
    const rows = Math.ceil(g / cols);
    const cw = w / cols, ch = h / rows;
    const rr = Math.min(cw, ch) * 0.44;
    for (let i = 0; i < g; i++) {
      const cx = (i % cols) * cw + cw / 2;
      const cy = Math.floor(i / cols) * ch + ch / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rr, rr * 0.86, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fill();
      ink(ctx, 2.6, withAlpha(INK, 0.7));
      const pc = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(per))));
      const pr = Math.ceil(per / pc);
      const size = Math.min((rr * 1.5) / pc, (rr * 1.4) / pr);
      for (let k = 0; k < per; k++) {
        const c = k % pc, r = Math.floor(k / pc);
        const rowN = Math.min(pc, per - r * pc);
        drawCountable(ctx, bank, spec.sprite, cx - (rowN * size) / 2 + c * size + size / 2,
          cy - (pr * size) / 2 + r * size + size / 2, size * 0.94);
      }
    }
  },

  /** Coins, for 2nd grade money. Value is written on each coin. */
  money(ctx, spec, bank, w, h) {
    const coins = spec.coins;
    const cols = Math.min(coins.length, 5);
    const rows = Math.ceil(coins.length / cols);
    const r = clamp(Math.min((w - 12) / (cols * 2.2), (h - 6) / (rows * 2.2)), 12, 30);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    coins.forEach((v, i) => {
      const c = i % cols, rw = Math.floor(i / cols);
      const rowN = Math.min(cols, coins.length - rw * cols);
      const cx = w / 2 - (rowN * r * 2.2) / 2 + c * r * 2.2 + r * 1.1;
      const cy = (h - rows * r * 2.2) / 2 + rw * r * 2.2 + r * 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, r * (v >= 25 ? 1 : v >= 5 ? 0.92 : 0.82), 0, Math.PI * 2);
      ctx.fillStyle = v === 1 ? '#e0a06a' : '#d8dde6';
      ctx.fill();
      ink(ctx, 2.6);
      outlinedText(ctx, `${v}`, cx, cy, `900 ${r * 0.8}px ${FONT}`, '#3d2447', 0, null);
    });
  },

  /** A rectangle tiled with unit squares: area as covering, not as a formula. */
  areaGrid(ctx, spec, bank, w, h) {
    const { rows, cols } = spec;
    // The side labels live outside the rectangle, so reserve their room before
    // sizing the squares — otherwise the top label is cropped off the canvas.
    const pad = 22;
    const u = Math.min((w - pad * 2) / cols, (h - pad * 2) / rows);
    const x0 = (w - u * cols) / 2 + pad / 2, y0 = (h - u * rows) / 2 + pad / 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        roundRectPath(ctx, x0 + c * u, y0 + r * u, u, u, u * 0.14);
        ctx.fillStyle = spec.hollow ? 'rgba(255,255,255,0.5)' : '#a9dfae';
        ctx.fill();
        ink(ctx, 1.8);
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fs = clamp(u * 0.8, 11, 17);
    outlinedText(ctx, String(cols), x0 + (u * cols) / 2, y0 - 11, `900 ${fs}px ${FONT}`, '#fff8ec', 4);
    outlinedText(ctx, String(rows), x0 - 13, y0 + (u * rows) / 2, `900 ${fs}px ${FONT}`, '#fff8ec', 4);
  },

  /** A rectangle with all four sides labelled — the perimeter walk. */
  perimeterShape(ctx, spec, bank, w, h) {
    const ar = spec.w / spec.h;
    let bw = w - 60, bh = bw / ar;
    if (bh > h - 40) { bh = h - 40; bw = bh * ar; }
    const x0 = (w - bw) / 2, y0 = (h - bh) / 2;
    roundRectPath(ctx, x0, y0, bw, bh, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ink(ctx, 3.4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const f = `900 ${clamp(Math.min(bw, bh) * 0.26, 11, 16)}px ${FONT}`;
    outlinedText(ctx, String(spec.w), x0 + bw / 2, y0 - 10, f, '#fff8ec', 4);
    outlinedText(ctx, String(spec.w), x0 + bw / 2, y0 + bh + 10, f, '#fff8ec', 4);
    outlinedText(ctx, String(spec.h), x0 - 14, y0 + bh / 2, f, '#fff8ec', 4);
    outlinedText(ctx, String(spec.h), x0 + bw + 14, y0 + bh / 2, f, '#fff8ec', 4);
  },

  /**
   * A fraction on a number line — IM grade 3's central move, from "shaded
   * parts of a shape" to "a number with a place of its own".
   */
  fractionLine(ctx, spec, bank, w, h) {
    const den = spec.den, whole = spec.whole || 1;
    const y = h * 0.6;
    const x0 = 24, x1 = w - 24;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ink(ctx, 4);
    const ticks = den * whole;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= ticks; i++) {
      const x = x0 + (i / ticks) * (x1 - x0);
      const major = i % den === 0;
      ctx.beginPath();
      ctx.moveTo(x, y - (major ? 12 : 6));
      ctx.lineTo(x, y + (major ? 12 : 6));
      ink(ctx, major ? 4 : 2.4);
      if (major) {
        outlinedText(ctx, String(i / den), x, y + 16, `800 ${Math.min(h * 0.2, 14)}px ${FONT}`, '#fff8ec', 4);
      }
    }
    if (spec.at != null) {
      const x = x0 + (spec.at / ticks) * (x1 - x0);
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7ab8';
      ctx.fill();
      ink(ctx, 2.6);
      outlinedText(ctx, spec.label || '?', x, y - 24, `900 ${Math.min(h * 0.24, 17)}px ${FONT}`, '#fff8ec', 4);
    }
  },

  /** Two rays and an arc: an angle to read off, or to compare against a right angle. */
  angle(ctx, spec, bank, w, h) {
    const cx = w * 0.32, cy = h * 0.74;
    const len = Math.min(w * 0.55, h * 0.8);
    const a = (spec.degrees * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + len, cy);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(-a) * len, cy + Math.sin(-a) * len);
    ink(ctx, 5);
    ctx.beginPath();
    ctx.arc(cx, cy, len * 0.3, -a, 0);
    ctx.strokeStyle = '#ff7ab8';
    ctx.lineWidth = 4;
    ctx.stroke();
    if (spec.right) {
      // A faint right angle for reference, so "bigger or smaller than 90" is visible.
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - len);
      ink(ctx, 3, '#6fa8e8');
      ctx.restore();
    }
  },

  /**
   * A rectangular prism built from unit cubes. Drawn as `wd` slabs stacked back
   * to front rather than as three faces, because the question is "how many
   * cubes fill it" — the layers have to be countable, not merely implied.
   */
  prism(ctx, spec, bank, w, h) {
    const { l, wd, ht } = spec;
    const skew = 0.42;
    const u = clamp(Math.min((w - 24) / (l + wd * skew), (h - 16) / (ht + wd * skew)), 6, 24);
    const dx = u * skew, dy = -u * skew;
    const x0 = (w - (l * u + (wd - 1) * dx)) / 2;
    const y0 = (h - (ht * u + (wd - 1) * -dy)) / 2 + (wd - 1) * -dy;

    for (let d = wd - 1; d >= 0; d--) {
      const ox = x0 + d * dx, oy = y0 + d * dy;
      // Back slabs are cooler and flatter so the front one reads as nearest.
      const tone = d === 0 ? '#7ec8ff' : d === 1 ? '#9ed6ff' : '#bfe4ff';
      for (let r = 0; r < ht; r++) {
        for (let c = 0; c < l; c++) {
          ctx.beginPath();
          ctx.rect(ox + c * u, oy + r * u, u, u);
          ctx.fillStyle = tone;
          ctx.fill();
          ink(ctx, 1.3, withAlpha(INK, 0.55));
        }
      }
      ctx.beginPath();
      ctx.rect(ox, oy, l * u, ht * u);
      ink(ctx, 2.4);
    }
  },

  /** First-quadrant grid with one plotted point, and numbered axes to read it off. */
  coordGrid(ctx, spec, bank, w, h) {
    const span = spec.span || 6;
    const pad = 18;
    const size = Math.min(w - pad * 2, h - pad * 2);
    const x0 = (w - size) / 2 + pad / 2, y0 = (h - size) / 2 - pad / 4;
    const u = size / span;
    ctx.strokeStyle = withAlpha(INK, 0.28);
    ctx.lineWidth = 1.4;
    for (let i = 0; i <= span; i++) {
      ctx.beginPath();
      ctx.moveTo(x0 + i * u, y0); ctx.lineTo(x0 + i * u, y0 + size);
      ctx.moveTo(x0, y0 + i * u); ctx.lineTo(x0 + size, y0 + i * u);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0 + size); ctx.lineTo(x0 + size, y0 + size);
    ctx.moveTo(x0, y0 + size); ctx.lineTo(x0, y0);
    ink(ctx, 3.4);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const f = `800 ${clamp(u * 0.55, 9, 13)}px ${FONT}`;
    const every = u < 16 ? 2 : 1;
    for (let i = 0; i <= span; i += every) {
      outlinedText(ctx, String(i), x0 + i * u, y0 + size + 9, f, '#fff8ec', 3.5);
      if (i > 0) outlinedText(ctx, String(i), x0 - 9, y0 + size - i * u, f, '#fff8ec', 3.5);
    }

    if (spec.point) {
      const [px, py] = spec.point;
      ctx.beginPath();
      ctx.arc(x0 + px * u, y0 + size - py * u, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7ab8';
      ctx.fill();
      ink(ctx, 2.4);
    }
  },

  /** An analog clock face. */
  clock(ctx, spec, bank, w, h) {
    const r = Math.min(w, h) * 0.44;
    const cx = w / 2, cy = h / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf6';
    ctx.fill();
    ink(ctx, 3.6);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
      ctx.lineTo(cx + Math.cos(a) * r * 0.96, cy + Math.sin(a) * r * 0.96);
      ink(ctx, i % 3 === 0 ? 3.2 : 1.8);
    }
    const hourA = ((spec.hour % 12) / 12 + spec.minute / 720) * Math.PI * 2 - Math.PI / 2;
    const minA = (spec.minute / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hourA) * r * 0.5, cy + Math.sin(hourA) * r * 0.5);
    ink(ctx, 6);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(minA) * r * 0.78, cy + Math.sin(minA) * r * 0.78);
    ink(ctx, 4, '#ff7ab8');
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  },
};

/** Corner positions for the shapes whose corners are worth counting. */
function shapeCorners(kind, r) {
  const poly = (n, rad, rot = -Math.PI / 2) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + rot;
      return [Math.cos(a) * rad, Math.sin(a) * rad];
    });
  switch (kind) {
    case 'triangle': return [[0, -r], [r * 0.92, r * 0.72], [-r * 0.92, r * 0.72]];
    case 'square': return [[-r * 0.88, -r * 0.88], [r * 0.88, -r * 0.88], [r * 0.88, r * 0.88], [-r * 0.88, r * 0.88]];
    case 'diamond': return [[0, -r], [r * 0.8, 0], [0, r], [-r * 0.8, 0]];
    case 'hexagon': return poly(6, r);
    case 'star': return poly(5, r);
    default: return [];
  }
}

/** Shared card chrome for the picture-only prompts. */
function card(ctx, x, y, w, h, tone) {
  roundRectPath(ctx, x, y, w, h, Math.min(w, h) * 0.18);
  ctx.fillStyle = tone;
  ctx.fill();
  ink(ctx, 3.4);
}

export function drawShapePath(ctx, kind, r) {
  ctx.beginPath();
  switch (kind) {
    case 'circle':
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    case 'square':
      roundRectPath(ctx, -r * 0.88, -r * 0.88, r * 1.76, r * 1.76, r * 0.16);
      break;
    case 'rectangle':
      roundRectPath(ctx, -r * 1.15, -r * 0.68, r * 2.3, r * 1.36, r * 0.14);
      break;
    case 'triangle':
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.92, r * 0.72);
      ctx.lineTo(-r * 0.92, r * 0.72);
      ctx.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      break;
    case 'heart': {
      const s = r * 2;
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(0, s * 0.05, -s * 0.5, -s * 0.12, -s * 0.5, -s * 0.42);
      ctx.bezierCurveTo(-s * 0.5, -s * 0.78, -s * 0.08, -s * 0.8, 0, -s * 0.52);
      ctx.bezierCurveTo(s * 0.08, -s * 0.8, s * 0.5, -s * 0.78, s * 0.5, -s * 0.42);
      ctx.bezierCurveTo(s * 0.5, -s * 0.12, 0, s * 0.05, 0, s * 0.35);
      ctx.closePath();
      break;
    }
    case 'diamond':
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.8, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.8, 0);
      ctx.closePath();
      break;
    case 'oval':
      ctx.ellipse(0, 0, r * 1.15, r * 0.75, 0, 0, Math.PI * 2);
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      break;
    default:
      ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
}

/** Star rating row drawn straight onto the canvas (map nodes, results). */
export function drawStars(ctx, x, y, size, count, max = 3) {
  const gap = size * 1.15;
  const start = x - ((max - 1) * gap) / 2;
  for (let i = 0; i < max; i++) {
    fiveStar(ctx, start + i * gap, y, size, i < count ? '#ffd34e' : 'rgba(255,255,255,0.35)');
  }
}
