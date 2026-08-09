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

const VISUALS = {
  /** A single row/grid of objects to count. */
  countRow(ctx, spec, bank, w, h) {
    const { cols, rows, size } = fitCount(spec.count, w, h);
    const gw = cols * size, gh = rows * size;
    for (let i = 0; i < spec.count; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const rowCount = Math.min(cols, spec.count - r * cols);
      const rowW = rowCount * size;
      drawCountable(ctx, bank, spec.sprite, (w - rowW) / 2 + c * size + size / 2,
        (h - gh) / 2 + r * size + size / 2, size * 0.92);
    }
    void gw;
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
        ctx.fillStyle = r === 0 ? '#ff7ab8' : '#7ec8ff';
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

  /** Rows x cols array — how repeated addition becomes multiplication. */
  dotArray(ctx, spec, bank, w, h) {
    const { rows, cols } = spec;
    const size = Math.min((w - 20) / (cols + 0.4), (h - 12) / (rows + 0.4));
    const gw = cols * size, gh = rows * size;
    const x0 = (w - gw) / 2, y0 = (h - gh) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
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
    const step = span > 20 ? Math.ceil(span / 10) : 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = min; v <= max; v += step) {
      const x = x0 + ((v - min) / span) * (x1 - x0);
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x, y + 7);
      ink(ctx, 3);
      outlinedText(ctx, String(v), x, y + 18, `800 ${Math.min(h * 0.22, 15)}px ${FONT}`, '#fff8ec', 4);
    }
    for (const m of spec.marks || []) {
      const x = x0 + ((m.at - min) / span) * (x1 - x0);
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = m.color || '#ffd34e';
      ctx.fill();
      ink(ctx, 2.6);
      if (m.label) outlinedText(ctx, m.label, x, y - 26, `900 ${Math.min(h * 0.24, 17)}px ${FONT}`, '#fff8ec', 4);
    }
    if (spec.hop) {
      const ax = x0 + ((spec.hop.from - min) / span) * (x1 - x0);
      const bx = x0 + ((spec.hop.to - min) / span) * (x1 - x0);
      ctx.beginPath();
      ctx.moveTo(ax, y - 6);
      ctx.quadraticCurveTo((ax + bx) / 2, y - 46, bx, y - 6);
      ctx.strokeStyle = '#ffd34e';
      ctx.lineWidth = 4;
      ctx.stroke();
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
    ctx.restore();
  },
};

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
