// Juice (particles, floating text, shake, confetti) + question visual aids.

import { INK, withAlpha, shade } from './palettes.js';
import * as T from './toybox.js';
import { COUNTABLES } from './sprites-world.js';

// ---------- particle system ----------------------------------------------
export class FX {
  constructor() { this.parts = []; this.texts = []; this.shake = 0; }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 22);
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.g || 0) * dt;
      p.rot += (p.vr || 0) * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= 34 * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  draw(ctx) {
    for (const p of this.parts) {
      const a = Math.min(1, p.life / (p.maxLife * 0.4));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      if (p.kind === 'rect') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      } else if (p.kind === 'star') {
        T.starPath(ctx, 0, 0, p.size);
        ctx.fillStyle = p.color; ctx.fill();
      } else if (p.kind === 'ring') {
        ctx.beginPath(); ctx.arc(0, 0, p.size * (1.6 - a * 0.6), 0, Math.PI * 2);
        ctx.lineWidth = 3; ctx.strokeStyle = p.color; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.fill();
      }
      ctx.restore();
    }
    for (const t of this.texts) {
      const a = Math.min(1, t.life / 0.4);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `800 ${t.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = t.size / 5.5; ctx.strokeStyle = '#fff';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
      ctx.restore();
    }
  }

  spawn(n, fn) { for (let i = 0; i < n; i++) this.parts.push(fn(i)); }

  poof(x, y, color) {
    this.spawn(8, () => {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
      return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, g: 60, drag: 2.2,
        life: 0.5 + Math.random() * 0.3, maxLife: 0.8, size: 5 + Math.random() * 7, color: withAlpha(color, 0.9), rot: 0 };
    });
    this.parts.push({ x, y, vx: 0, vy: 0, life: 0.35, maxLife: 0.35, size: 18, kind: 'ring', color: withAlpha(color, 0.8), rot: 0 });
  }

  sparkle(x, y, color, n = 6) {
    this.spawn(n, () => {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 70;
      return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -20, kind: 'star',
        life: 0.4 + Math.random() * 0.35, maxLife: 0.7, size: 3 + Math.random() * 5, color, rot: Math.random() * 3, vr: 4 };
    });
  }

  coinBurst(x, y, n = 5) {
    this.spawn(n, () => ({
      x, y, vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 90, g: 420, kind: 'circle',
      life: 0.7, maxLife: 0.7, size: 4.5 + Math.random() * 3, color: '#ffcf4d', rot: 0,
    }));
  }

  confetti(w, h, colors) {
    this.spawn(80, () => ({
      x: Math.random() * w, y: -20 - Math.random() * h * 0.3,
      vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120, g: 60, kind: 'rect',
      life: 2.2 + Math.random() * 1.4, maxLife: 3, size: 6 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 3, vr: (Math.random() - 0.5) * 8, drag: 0.25,
    }));
  }

  floatText(x, y, str, color = '#54c26e', size = 22) {
    this.texts.push({ x, y, str, color, size, life: 1.0 });
  }

  shakeIt(amt = 6) { this.shake = Math.max(this.shake, amt); }
  get shakeOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    return { x: (Math.random() - 0.5) * this.shake, y: (Math.random() - 0.5) * this.shake };
  }
}

// ---------- question visual aids ------------------------------------------
// Declarative spec from generators -> drawn into the question panel's canvas.
// All layouts fit width w, height h, centered.

function drawCountable(ctx, sprite, x, y, s) {
  ctx.save();
  ctx.translate(x - 20 * s, y - 20 * s);
  ctx.scale(s, s);
  (COUNTABLES[sprite] || COUNTABLES.star)(ctx);
  ctx.restore();
}

// Rows of up to 5 for subitizing
function layoutRows(count, maxPerRow = 5) {
  const rows = [];
  let left = count;
  while (left > 0) { const n = Math.min(maxPerRow, left); rows.push(n); left -= n; }
  return rows;
}

export function drawQuestionVisual(ctx, w, h, spec, pal) {
  ctx.clearRect(0, 0, w, h);
  const ink = INK;
  const fit = (units, avail, ideal, min) => Math.max(min, Math.min(ideal, avail / units));

  if (spec.kind === 'countRow') {
    const rows = layoutRows(spec.count);
    const cell = fit(Math.max(...rows), w - 20, 46, 26);
    const totalH = rows.length * cell;
    let idx = 0;
    rows.forEach((n, ri) => {
      const y = h / 2 - totalH / 2 + ri * cell + cell / 2;
      for (let i = 0; i < n; i++) {
        const x = w / 2 - (n * cell) / 2 + i * cell + cell / 2;
        drawCountable(ctx, spec.sprite, x, y, cell / 44);
        if (spec.crossed && idx >= spec.count - spec.crossed) {
          ctx.lineWidth = 3.4; ctx.strokeStyle = '#e05c6e'; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - cell * 0.32, y - cell * 0.32); ctx.lineTo(x + cell * 0.32, y + cell * 0.32);
          ctx.moveTo(x + cell * 0.32, y - cell * 0.32); ctx.lineTo(x - cell * 0.32, y + cell * 0.32);
          ctx.stroke();
        }
        idx++;
      }
    });
  } else if (spec.kind === 'countGroups') {
    const groups = spec.groups;
    const widths = groups.map((g) => Math.min(g.count, 3));
    const unitCols = widths.reduce((a, b) => a + b, 0) + (groups.length - 1) * 0.8;
    const cell = fit(unitCols, w - 24, 42, 22);
    let x = w / 2 - (unitCols * cell) / 2;
    groups.forEach((gr, gi) => {
      const rows = layoutRows(gr.count, 3);
      const gw = Math.min(gr.count, 3) * cell;
      const totalH = rows.length * cell;
      let idx = 0;
      rows.forEach((n, ri) => {
        for (let i = 0; i < n; i++) {
          drawCountable(ctx, gr.sprite, x + i * cell + cell / 2, h / 2 - totalH / 2 + ri * cell + cell / 2, cell / 44);
          idx++;
        }
      });
      x += gw;
      if (gi < groups.length - 1) {
        ctx.font = `800 ${cell * 0.8}px system-ui, sans-serif`;
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(spec.op || '+', x + cell * 0.4, h / 2);
        x += cell * 0.8;
      }
    });
  } else if (spec.kind === 'tenFrame') {
    const frames = spec.count > 10 ? 2 : 1;
    const cols = 5, rows = 2;
    const cell = fit(cols * frames + (frames - 1) * 0.4, w - 24, 40, 22);
    const fw = cols * cell, fh = rows * cell;
    for (let f = 0; f < frames; f++) {
      const x0 = w / 2 - ((frames * fw + (frames - 1) * cell * 0.4) / 2) + f * (fw + cell * 0.4);
      const y0 = h / 2 - fh / 2;
      for (let r2 = 0; r2 < rows; r2++) {
        for (let c = 0; c < cols; c++) {
          const i = f * 10 + r2 * cols + c;
          ctx.lineWidth = 2.4; ctx.strokeStyle = ink;
          ctx.strokeRect(x0 + c * cell, y0 + r2 * cell, cell, cell);
          if (i < spec.count) {
            ctx.beginPath();
            ctx.arc(x0 + c * cell + cell / 2, y0 + r2 * cell + cell / 2, cell * 0.32, 0, Math.PI * 2);
            ctx.fillStyle = f === 0 ? '#7a5cff' : '#ff6f9c'; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.stroke();
          }
        }
      }
    }
  } else if (spec.kind === 'compareGroups') {
    const cell = fit(6, w - 40, 40, 22);
    [spec.a, spec.b].forEach((gr, side) => {
      const cx = side === 0 ? w * 0.27 : w * 0.73;
      const rows = layoutRows(gr.count, 3);
      const totalH = rows.length * cell * 0.95;
      const boxW = 3 * cell + 14, boxH = Math.max(totalH + 14, cell + 14);
      ctx.lineWidth = 3; ctx.strokeStyle = withAlpha(ink, 0.5);
      ctx.beginPath();
      ctx.roundRect(cx - boxW / 2, h / 2 - boxH / 2, boxW, boxH, 10);
      ctx.stroke();
      rows.forEach((n, ri) => {
        for (let i = 0; i < n; i++) {
          drawCountable(ctx, gr.sprite,
            cx - (n * cell) / 2 + i * cell + cell / 2,
            h / 2 - totalH / 2 + ri * cell * 0.95 + cell / 2, cell / 46);
        }
      });
      ctx.font = `800 ${Math.min(18, cell * 0.5)}px system-ui, sans-serif`;
      ctx.fillStyle = ink; ctx.textAlign = 'center';
      ctx.fillText(side === 0 ? 'A' : 'B', cx, h / 2 - boxH / 2 - 8);
    });
  } else if (spec.kind === 'dotArray') {
    const cell = Math.max(16, Math.min(34, (w - 30) / spec.cols, (h - 16) / spec.rows));
    const x0 = w / 2 - (spec.cols * cell) / 2, y0 = h / 2 - (spec.rows * cell) / 2;
    for (let r2 = 0; r2 < spec.rows; r2++) {
      for (let c = 0; c < spec.cols; c++) {
        ctx.beginPath();
        ctx.arc(x0 + c * cell + cell / 2, y0 + r2 * cell + cell / 2, cell * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#7a5cff'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.stroke();
      }
    }
  } else if (spec.kind === 'fractionBar' || spec.kind === 'fractionPair') {
    const bars = spec.kind === 'fractionBar' ? [[spec.num, spec.den, '#7a5cff']] :
      [[spec.a[0], spec.a[1], '#7a5cff'], [spec.b[0], spec.b[1], '#ff6f9c']];
    const bw = Math.min(w - 40, 300), bh = Math.min(34, (h - 20) / bars.length - 8);
    bars.forEach(([num, den, color], bi) => {
      const y0 = h / 2 - ((bars.length * (bh + 12) - 12) / 2) + bi * (bh + 12);
      const x0 = w / 2 - bw / 2;
      for (let i = 0; i < den; i++) {
        const cw = bw / den;
        ctx.beginPath(); ctx.rect(x0 + i * cw, y0, cw, bh);
        if (i < num) { ctx.fillStyle = withAlpha(color, 0.85); ctx.fill(); }
        ctx.lineWidth = 2.4; ctx.strokeStyle = ink; ctx.stroke();
      }
      if (spec.kind === 'fractionPair') {
        ctx.font = '700 15px system-ui, sans-serif';
        ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(`${num}/${den}`, x0 - 8, y0 + bh / 2);
      }
    });
  } else if (spec.kind === 'fractionCircle') {
    const r = Math.min(w, h) * 0.36;
    for (let i = 0; i < spec.den; i++) {
      const a0 = -Math.PI / 2 + (i / spec.den) * Math.PI * 2;
      const a1 = -Math.PI / 2 + ((i + 1) / spec.den) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.arc(w / 2, h / 2, r, a0, a1);
      ctx.closePath();
      if (i < spec.num) { ctx.fillStyle = withAlpha('#7a5cff', 0.85); ctx.fill(); }
      ctx.lineWidth = 2.6; ctx.strokeStyle = ink; ctx.stroke();
    }
  } else if (spec.kind === 'numberLine') {
    const { from, to, step = 1, mark = null } = spec;
    const x0 = 24, x1 = w - 24, y = h / 2 + 6;
    ctx.lineWidth = 3; ctx.strokeStyle = ink; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    const n = Math.round((to - from) / step);
    const labelEvery = Math.ceil(n / 10);
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.stroke();
      if (i % labelEvery === 0) {
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillStyle = ink; ctx.textAlign = 'center';
        const val = from + i * step;
        ctx.fillText(String(Math.round(val * 100) / 100), x, y + 22);
      }
      const val = from + i * step;
      if (mark !== null && Math.abs(val - mark) < step / 2 && Math.round((mark - from) / step) === i) {
        ctx.beginPath(); ctx.arc(x, y - 16, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6f9c'; ctx.fill();
        ctx.lineWidth = 2.4; ctx.strokeStyle = ink; ctx.stroke();
      }
    }
  } else if (spec.kind === 'shape') {
    const s = Math.min(w, h) * 0.6, cx = w / 2, cy = h / 2;
    ctx.lineWidth = 4; ctx.strokeStyle = ink;
    ctx.fillStyle = withAlpha(pal ? pal.accent : '#7a5cff', 0.75);
    ctx.beginPath();
    switch (spec.shape) {
      case 'circle': ctx.arc(cx, cy, s / 2, 0, Math.PI * 2); break;
      case 'square': ctx.rect(cx - s / 2, cy - s / 2, s, s); break;
      case 'rectangle': ctx.rect(cx - s * 0.62, cy - s * 0.36, s * 1.24, s * 0.72); break;
      case 'triangle':
        ctx.moveTo(cx, cy - s / 2); ctx.lineTo(cx + s / 2, cy + s / 2); ctx.lineTo(cx - s / 2, cy + s / 2);
        ctx.closePath(); break;
      case 'star': T.starPath(ctx, cx, cy, s / 2); break;
      case 'heart': T.heartPath(ctx, cx, cy, s); break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(a) * s / 2, y = cy + Math.sin(a) * s / 2;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); break;
      case 'oval': ctx.ellipse(cx, cy, s * 0.6, s * 0.38, 0, 0, Math.PI * 2); break;
    }
    ctx.fill(); ctx.stroke();
  } else if (spec.kind === 'placeValue') {
    const rodW = 14, rodH = Math.min(h - 24, 90);
    const cubeS = 15;
    const tensW = spec.tens * (rodW + 8);
    const onesCols = Math.ceil(spec.ones / 5) || 0;
    const total = tensW + 20 + onesCols * (cubeS + 6);
    let x = w / 2 - total / 2;
    for (let i = 0; i < spec.tens; i++) {
      ctx.fillStyle = '#7a5cff';
      ctx.fillRect(x, h / 2 - rodH / 2, rodW, rodH);
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(x, h / 2 - rodH / 2, rodW, rodH);
      for (let j = 1; j < 10; j++) {
        const y = h / 2 - rodH / 2 + (rodH * j) / 10;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rodW, y); ctx.stroke();
      }
      x += rodW + 8;
    }
    x += 20;
    for (let i = 0; i < spec.ones; i++) {
      const col = Math.floor(i / 5), row = i % 5;
      ctx.fillStyle = '#ff6f9c';
      const cx2 = x + col * (cubeS + 6), cy2 = h / 2 - (5 * (cubeS + 4)) / 2 + row * (cubeS + 4);
      ctx.fillRect(cx2, cy2, cubeS, cubeS);
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(cx2, cy2, cubeS, cubeS);
    }
  }
}
