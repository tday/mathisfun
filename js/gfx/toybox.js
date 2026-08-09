// Shared chibi vinyl-toy drawing kit (Pop Mart / gachapon style).
// Convention: unit draw functions work in a 100x100 box, figure centered ~x=50,
// feet near y=95. sprite.js pre-scales the context; line widths are absolute here.

import { INK, withAlpha, shade } from './palettes.js';

export const MOUTH_DARK = '#4a2038';

export function outlined(ctx, fill, lw = 4) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

// Radial vinyl gradient: soft top-left highlight -> base -> darker rim
export function vinyl(ctx, cx, cy, r, base) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.15);
  g.addColorStop(0, shade(base, 0.38));
  g.addColorStop(0.55, base);
  g.addColorStop(1, shade(base, -0.18));
  return g;
}

// Rounded blob body: squashable superellipse-ish shape
export function blobPath(ctx, cx, cy, w, h, sq = 0) {
  const hw = w / 2, hh = h / 2;
  const topY = cy - hh + sq * hh * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy + hh * 0.25);
  ctx.bezierCurveTo(cx - hw, topY - hh * 0.35, cx - hw * 0.55, topY - hh * 0.55, cx, topY - hh * 0.55 + hh * 0.55);
  ctx.bezierCurveTo(cx + hw * 0.55, topY - hh * 0.55, cx + hw, topY - hh * 0.35, cx + hw, cy + hh * 0.25);
  ctx.bezierCurveTo(cx + hw, cy + hh * 0.85, cx + hw * 0.6, cy + hh, cx, cy + hh);
  ctx.bezierCurveTo(cx - hw * 0.6, cy + hh, cx - hw, cy + hh * 0.85, cx - hw, cy + hh * 0.25);
  ctx.closePath();
}

export function blob(ctx, cx, cy, w, h, base, sq = 0, lw = 4) {
  blobPath(ctx, cx, cy, w, h, sq);
  ctx.fillStyle = vinyl(ctx, cx, cy - h * 0.1, Math.max(w, h) * 0.6, base);
  ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
}

// Belly patch
export function belly(ctx, cx, cy, w, h, color) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Big glossy toy eyes. mood: 0 sweet, 1 mischievous (inner tilt lids), 2 sleepy
export function glossyEyes(ctx, cx, cy, r, sep, { mood = 1, closed = false, iris = null, look = { x: 0, y: 0 } } = {}) {
  for (const s of [-1, 1]) {
    const ex = cx + s * sep / 2, ey = cy;
    if (closed) {
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.9, Math.PI * 0.15, Math.PI * 0.85);
      ctx.lineWidth = 3.4; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
      continue;
    }
    // eyeball
    ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fillStyle = INK; ctx.fill();
    if (iris) {
      ctx.beginPath(); ctx.arc(ex + look.x, ey + look.y, r * 0.62, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(ex, ey - r * 0.2, r * 0.1, ex, ey, r * 0.7);
      g.addColorStop(0, iris); g.addColorStop(1, shade(iris, -0.35));
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(ex + look.x, ey + look.y, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = INK; ctx.fill();
    }
    // highlights: the glossy dots
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ex - r * 0.32 + look.x, ey - r * 0.35 + look.y, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + r * 0.3 + look.x, ey + r * 0.32 + look.y, r * 0.12, 0, Math.PI * 2); ctx.fill();
    // mischievous brows (angled inward)
    if (mood === 1) {
      ctx.beginPath();
      ctx.moveTo(ex - r * 0.85, ey - r * 1.05 + (s < 0 ? r * 0.32 : 0));
      ctx.lineTo(ex + r * 0.85, ey - r * 1.05 + (s > 0 ? r * 0.32 : 0));
      ctx.lineWidth = 3.2; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    } else if (mood === 2) {
      ctx.beginPath();
      ctx.arc(ex, ey - r * 0.45, r * 1.02, Math.PI * 1.1, Math.PI * 1.9);
      ctx.lineWidth = 3.2; ctx.strokeStyle = INK; ctx.stroke();
    }
  }
}

// The signature wide toothy grin (cute-scary). w = mouth width.
export function toothyGrin(ctx, cx, cy, w, h, { teeth = 7, curve = 0.5, tongue = false } = {}) {
  const hw = w / 2;
  const lift = h * curve;
  // mouth shape: wide smile band
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - lift * 0.4);
  ctx.quadraticCurveTo(cx, cy - lift, cx + hw, cy - lift * 0.4);
  ctx.quadraticCurveTo(cx + hw * 0.85, cy + h * 0.75, cx, cy + h * 0.8);
  ctx.quadraticCurveTo(cx - hw * 0.85, cy + h * 0.75, cx - hw, cy - lift * 0.4);
  ctx.closePath();
  ctx.fillStyle = MOUTH_DARK; ctx.fill();
  ctx.lineWidth = 3.6; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.save();
  ctx.clip();
  if (tongue) {
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.75, w * 0.28, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff7d9e'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = shade('#ff7d9e', -0.3); ctx.stroke();
  }
  // pointy teeth row along the top lip
  ctx.beginPath();
  const n = teeth;
  const toothH = h * 0.52;
  ctx.moveTo(cx - hw, cy - lift * 0.42);
  for (let i = 0; i < n; i++) {
    const x0 = cx - hw + (w * i) / n;
    const x1 = cx - hw + (w * (i + 0.5)) / n;
    const x2 = cx - hw + (w * (i + 1)) / n;
    const yTop = cy - lift * 0.42 - Math.sin(((i + 0.5) / n) * Math.PI) * lift * 0.5;
    ctx.lineTo(x1, yTop + toothH);
    ctx.lineTo(x2, yTop);
  }
  ctx.lineTo(cx + hw, cy - lift);
  ctx.lineTo(cx - hw, cy - lift);
  ctx.closePath();
  ctx.fillStyle = '#fffdf5'; ctx.fill();
  ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.restore();
}

// Simple sweet smile (hero, friendly props)
export function smile(ctx, cx, cy, w, { open = false } = {}) {
  ctx.beginPath();
  if (open) {
    ctx.arc(cx, cy, w / 2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = MOUTH_DARK; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  } else {
    ctx.arc(cx, cy - w * 0.1, w / 2, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.lineWidth = 3.4; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  }
}

// Two tiny fangs hanging from a smile line
export function fangs(ctx, cx, cy, sep, size) {
  ctx.fillStyle = '#fffdf5';
  for (const s of [-1, 1]) {
    const x = cx + s * sep / 2;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.45, cy);
    ctx.lineTo(x, cy + size);
    ctx.lineTo(x + size * 0.45, cy);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  }
}

export function horns(ctx, cx, cy, sep, size, color) {
  for (const s of [-1, 1]) {
    const x = cx + s * sep / 2;
    ctx.beginPath();
    ctx.moveTo(x - s * size * 0.35, cy + size * 0.2);
    ctx.quadraticCurveTo(x + s * size * 0.35, cy - size * 0.35, x + s * size * 0.28, cy - size);
    ctx.quadraticCurveTo(x + s * size * 0.75, cy - size * 0.15, x + s * size * 0.55, cy + size * 0.3);
    ctx.closePath();
    outlined(ctx, color, 3.2);
  }
}

export function roundEars(ctx, cx, cy, sep, r, color, inner) {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + s * sep / 2, cy, r, 0, Math.PI * 2);
    outlined(ctx, color, 3.6);
    if (inner) {
      ctx.beginPath();
      ctx.arc(cx + s * sep / 2, cy, r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = inner; ctx.fill();
    }
  }
}

export function pointyEars(ctx, cx, cy, sep, size, color, inner) {
  for (const s of [-1, 1]) {
    const x = cx + s * sep / 2;
    ctx.beginPath();
    ctx.moveTo(x - s * size * 0.5, cy + size * 0.35);
    ctx.quadraticCurveTo(x + s * size * 0.9, cy - size * 1.05, x + s * size * 0.62, cy + size * 0.5);
    ctx.closePath();
    outlined(ctx, color, 3.4);
    if (inner) {
      ctx.beginPath();
      ctx.moveTo(x - s * size * 0.1, cy + size * 0.32);
      ctx.quadraticCurveTo(x + s * size * 0.45, cy - size * 0.45, x + s * size * 0.4, cy + size * 0.4);
      ctx.closePath();
      ctx.fillStyle = inner; ctx.fill();
    }
  }
}

export function blush(ctx, cx, cy, sep, r, color = '#ff9db1') {
  ctx.fillStyle = withAlpha(color, 0.55);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * sep / 2, cy, r * 1.15, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// vinyl sheen highlight (top-left crescent + dot)
export function sheen(ctx, cx, cy, w, h) {
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.22, cy - h * 0.28, w * 0.16, h * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - w * 0.05, cy - h * 0.38, w * 0.045, 0, Math.PI * 2);
  ctx.fill();
}

export function groundShadow(ctx, cx, cy, w) {
  ctx.fillStyle = 'rgba(58,37,71,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, w / 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function stitch(ctx, x, y, len, angle) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.stroke();
  for (const t of [-0.3, 0.1, 0.5]) {
    ctx.beginPath(); ctx.moveTo(len * t, -len * 0.16); ctx.lineTo(len * t, len * 0.16); ctx.stroke();
  }
  ctx.restore();
}

export function stubFeet(ctx, cx, cy, sep, r, color) {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * sep / 2, cy, r, r * 0.62, 0, 0, Math.PI * 2);
    outlined(ctx, color, 3.4);
  }
}

export function stubArms(ctx, cx, cy, sep, r, color, lift = 0) {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * sep / 2, cy - lift * (s > 0 ? 1 : 0.2), r, r * 0.8, s * 0.5, 0, Math.PI * 2);
    outlined(ctx, color, 3.2);
  }
}

// A tiny star shape (used all over: coins, sparkles, staff)
export function starPath(ctx, cx, cy, rOuter, rInner = rOuter * 0.45, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function heartPath(ctx, cx, cy, size) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.95);
  ctx.bezierCurveTo(cx - s * 1.4, cy + s * 0.1, cx - s * 0.9, cy - s, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s, cx + s * 1.4, cy + s * 0.1, cx, cy + s * 0.95);
  ctx.closePath();
}
