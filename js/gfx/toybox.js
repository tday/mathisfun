// Shared drawing kit for the game's kawaii-mascot look.
//
// Every creature draws inside a 100 x 100 unit box: x centred on 50, feet at y = 96.
// The bake step in sprite.js scales that box to whatever pixel size it needs.
//
// House rules, all of which also serve legibility for a five-year-old:
//   - plump, simple, rounded silhouettes; one readable shape per character
//   - FLAT colour. No gradients, no gloss — flat shapes read instantly at 60px
//   - thin, even, dark outlines that hold the shape together at any size
//   - tiny simple features: dot eyes, a small mouth, big soft blush
//   - character comes from silhouette plus ONE signature detail, never detail soup
//   - a soft contact shadow so the figure sits on the ground

import { lighten, darken, withAlpha, clamp, lerp } from '../core/utils.js';

export const INK = '#4a3a46';
export const LW = 2.4; // default outline weight, in unit space

// ------------------------------------------------------------------ primitives

/** Rounded blob path — an ellipse whose bottom can be flattened so it "sits". */
export function blobPath(ctx, cx, cy, rx, ry, { flat = 0.18, lean = 0 } = {}) {
  const k = 0.5523;
  const top = cy - ry, bot = cy + ry;
  const l = cx - rx, r = cx + rx;
  const kx = rx * k, ky = ry * k;
  const bx = rx * (1 - flat * 0.5);
  const tx = cx + lean * rx;
  ctx.beginPath();
  ctx.moveTo(tx, top);
  ctx.bezierCurveTo(tx + kx, top, r, cy - ky, r, cy);
  ctx.bezierCurveTo(r, cy + ky * (1 - flat), cx + bx, bot, cx, bot);
  ctx.bezierCurveTo(cx - bx, bot, l, cy + ky * (1 - flat), l, cy);
  ctx.bezierCurveTo(l, cy - ky, tx - kx, top, tx, top);
  ctx.closePath();
}

/** Egg shape — narrower at the top. The signature silhouette for this style. */
export function eggPath(ctx, cx, cy, rx, ry, { taper = 0.22, flat = 0.3 } = {}) {
  const k = 0.5523;
  const top = cy - ry, bot = cy + ry;
  const trx = rx * (1 - taper);
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx + trx * k * 1.4, top, cx + rx, cy - ry * k, cx + rx, cy);
  ctx.bezierCurveTo(cx + rx, cy + ry * k * (1 - flat), cx + rx * (1 - flat * 0.4), bot, cx, bot);
  ctx.bezierCurveTo(cx - rx * (1 - flat * 0.4), bot, cx - rx, cy + ry * k * (1 - flat), cx - rx, cy);
  ctx.bezierCurveTo(cx - rx, cy - ry * k, cx - trx * k * 1.4, top, cx, top);
  ctx.closePath();
}

export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function ink(ctx, width = LW, color = INK) {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Flat fill for the current path. Replaces the old gradient treatment. */
export function fill(ctx, color) {
  ctx.fillStyle = color;
  ctx.fill();
}

/** Fill flat, then outline — by far the most-used call in the game. */
export function flat(ctx, color, lw = LW) {
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, lw);
}

/** Soft contact shadow on the ground. */
export function groundShadow(ctx, cx, cy, rx, ry = rx * 0.3, alpha = 0.16) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, `rgba(74,58,70,${alpha})`);
  g.addColorStop(1, 'rgba(74,58,70,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A flat filled + outlined body. */
export function body(ctx, cx, cy, rx, ry, color, opt = {}) {
  const { flat: flatness = 0.24, lean = 0, lw = LW, egg = false, taper = 0.22 } = opt;
  if (egg) eggPath(ctx, cx, cy, rx, ry, { taper, flat: flatness });
  else blobPath(ctx, cx, cy, rx, ry, { flat: flatness, lean });
  flat(ctx, color, lw);
}

/** A lighter belly patch, clipped to whatever path `shape` draws. */
export function belly(ctx, shape, cx, cy, rx, ry, color) {
  ctx.save();
  shape();
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// ----------------------------------------------------------------------- face

/**
 * The eye. Small, solid and simple — this is the biggest single difference
 * between a kawaii mascot and a generic cartoon character.
 *
 * kind: 'dot'    solid oval with a tiny catchlight (default)
 *       'closed' happy upward arc
 *       'sleepy' dot with a heavy lid line over it
 *       'wide'   larger round eye, for the hero and the boss
 */
export function eye(ctx, x, y, r, opt = {}) {
  const { kind = 'dot', blink = 0, color = INK, lw = LW } = opt;
  const k = blink > 0.5 ? 'closed' : kind;

  if (k === 'closed') {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.45, r * 1.05, Math.PI * 1.15, Math.PI * 1.85);
    ink(ctx, lw * 1.25, color);
    return;
  }

  if (k === 'wide') {
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.92, r, 0, 0, Math.PI * 2);
    flat(ctx, '#ffffff', lw);
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.1, r * 0.5, r * 0.58, 0, 0, Math.PI * 2);
    fill(ctx, color);
    ctx.beginPath();
    ctx.ellipse(x - r * 0.2, y - r * 0.26, r * 0.2, r * 0.16, -0.5, 0, Math.PI * 2);
    fill(ctx, '#ffffff');
    return;
  }

  // 'dot' and 'sleepy'
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.82, r, 0, 0, Math.PI * 2);
  fill(ctx, color);
  // One small catchlight keeps the eye from reading as a hole.
  ctx.beginPath();
  ctx.ellipse(x - r * 0.26, y - r * 0.34, r * 0.24, r * 0.2, -0.5, 0, Math.PI * 2);
  fill(ctx, 'rgba(255,255,255,0.9)');

  if (k === 'sleepy') {
    ctx.beginPath();
    ctx.moveTo(x - r * 1.3, y - r * 0.45);
    ctx.quadraticCurveTo(x, y - r * 1.2, x + r * 1.3, y - r * 0.45);
    ink(ctx, lw * 1.1, color);
  }
}

/**
 * The mouth. Small and simple by default.
 *
 * kind: 'smile'  short upward arc (default)
 *       'line'   flat, faintly curved — the deadpan look
 *       'w'      the cat mouth
 *       'o'      small open oval
 *       'fang'   a smile with one tiny tooth: our entire "monster" budget
 *       'wide'   open smile with a tongue, for cheering
 */
export function mouth(ctx, cx, cy, w, opt = {}) {
  const { kind = 'smile', lw = LW, color = INK } = opt;
  const hw = w / 2;

  if (kind === 'line') {
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.quadraticCurveTo(cx, cy + w * 0.12, cx + hw, cy);
    ink(ctx, lw, color);
    return;
  }

  if (kind === 'w') {
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.quadraticCurveTo(cx - hw * 0.5, cy + w * 0.34, cx, cy + w * 0.04);
    ctx.quadraticCurveTo(cx + hw * 0.5, cy + w * 0.34, cx + hw, cy);
    ink(ctx, lw, color);
    return;
  }

  if (kind === 'o') {
    ctx.beginPath();
    ctx.ellipse(cx, cy + w * 0.16, w * 0.3, w * 0.36, 0, 0, Math.PI * 2);
    flat(ctx, '#8c4a5e', lw);
    return;
  }

  if (kind === 'wide') {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy);
      ctx.quadraticCurveTo(cx, cy + w * 0.95, cx + hw, cy);
      ctx.closePath();
    };
    ctx.save();
    path();
    fill(ctx, '#8c4a5e');
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(cx, cy + w * 0.72, hw * 0.62, w * 0.3, 0, 0, Math.PI * 2);
    fill(ctx, '#f2879f');
    ctx.restore();
    path();
    ink(ctx, lw, color);
    return;
  }

  if (kind === 'fang') {
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.quadraticCurveTo(cx, cy + w * 0.42, cx + hw, cy);
    ink(ctx, lw, color);
    // One little tooth: enough to say "monster", not enough to say "scary".
    ctx.beginPath();
    ctx.moveTo(cx - hw * 0.4, cy + w * 0.09);
    ctx.lineTo(cx - hw * 0.04, cy + w * 0.13);
    ctx.lineTo(cx - hw * 0.22, cy + w * 0.46);
    ctx.closePath();
    flat(ctx, '#fffdf6', lw * 0.7);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(cx - hw, cy);
  ctx.quadraticCurveTo(cx, cy + w * 0.5, cx + hw, cy);
  ink(ctx, lw, color);
}

/** Rosy cheek. Big and soft — a lot of the charm lives here. */
export function blush(ctx, x, y, r, color = '#ff9bb0', alpha = 0.6) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ----------------------------------------------------------------- appendages

export function horn(ctx, x, y, w, h, color, { curve = 0.3, lw = LW } = {}) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w * 0.1, y - h * 0.7, x + w * curve, y - h);
  ctx.quadraticCurveTo(x + w * 0.5, y - h * 0.42, x + w / 2, y);
  ctx.closePath();
  flat(ctx, color, lw);
}

export function earTriangle(ctx, x, y, w, h, color, inner, { lean = 0, lw = LW } = {}) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x + lean * w * 0.5, y - h * 1.05, x + w / 2, y);
  ctx.closePath();
  flat(ctx, color, lw);
  if (inner) {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.22, y - h * 0.04);
    ctx.quadraticCurveTo(x + lean * w * 0.3, y - h * 0.58, x + w * 0.22, y - h * 0.04);
    ctx.closePath();
    fill(ctx, inner);
  }
}

export function earRound(ctx, x, y, r, color, inner, lw = LW) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  flat(ctx, color, lw);
  if (inner) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.52, 0, Math.PI * 2);
    fill(ctx, inner);
  }
}

export function limb(ctx, x1, y1, x2, y2, w, color, lw = LW) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineCap = 'round';
  ctx.lineWidth = w + lw * 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/** Stubby little paw / foot. */
export function foot(ctx, x, y, w, h, color, lw = LW) {
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  flat(ctx, color, lw);
}

/** Tiny nub arm sticking out of a round body. */
export function nub(ctx, x, y, r, color, dir = 1, lw = LW) {
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.78, dir * 0.4, 0, Math.PI * 2);
  flat(ctx, color, lw);
}

export function tail(ctx, x, y, len, color, dir = 1, lw = LW) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dir * len * 0.9, y - len * 0.1, x + dir * len * 0.7, y - len * 0.75);
  ctx.lineCap = 'round';
  ctx.lineWidth = 6 + lw * 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/** A row of simple back spikes, like the reference dinosaur. */
export function spikes(ctx, pts, color, lw = LW) {
  for (const [x, y, s] of pts) {
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.7);
    ctx.quadraticCurveTo(x, y - s * 0.9, x + s, y + s * 0.7);
    ctx.closePath();
    flat(ctx, color, lw);
  }
}

// --------------------------------------------------------------------- extras

export function sparkle(ctx, x, y, r, color = '#fff3a8', points = 4) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.36;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  fill(ctx, color);
  ctx.restore();
}

export function fiveStar(ctx, x, y, r, fillColor, outline = INK, lw = LW) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  fill(ctx, fillColor);
  if (outline) ink(ctx, lw, outline);
  ctx.restore();
}

export function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x, y + s * 0.05, x - s * 0.5, y - s * 0.12, x - s * 0.5, y - s * 0.42);
  ctx.bezierCurveTo(x - s * 0.5, y - s * 0.78, x - s * 0.08, y - s * 0.8, x, y - s * 0.52);
  ctx.bezierCurveTo(x + s * 0.08, y - s * 0.8, x + s * 0.5, y - s * 0.78, x + s * 0.5, y - s * 0.42);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.12, x, y + s * 0.05, x, y + s * 0.35);
  ctx.closePath();
}

/**
 * Knight's helm — marks a monster that needs two correct answers.
 * A simple flat cap worn on the crown, kept well clear of the face.
 */
export function helm(ctx, cx, topY, w, h, metal = '#c6cfdc') {
  const dome = () => {
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, topY + h * 0.55);
    ctx.quadraticCurveTo(cx - w / 2, topY - h * 0.6, cx, topY - h * 0.6);
    ctx.quadraticCurveTo(cx + w / 2, topY - h * 0.6, cx + w / 2, topY + h * 0.55);
    ctx.closePath();
  };
  dome();
  flat(ctx, metal, LW);
  roundRectPath(ctx, cx - w * 0.6, topY + h * 0.34, w * 1.2, h * 0.34, h * 0.17);
  flat(ctx, darken(metal, 0.14), LW);
  ctx.beginPath();
  ctx.arc(cx, topY - h * 0.66, w * 0.11, 0, Math.PI * 2);
  flat(ctx, '#ff8fa8', LW * 0.85);
}

/** Gold star badge marking an "elite" variant. Drawn last, above everything. */
export function eliteBadge(ctx, x, y, r = 9) {
  fiveStar(ctx, x, y, r, '#ffd34e');
}

/** Faint glow ring behind a figure. */
export function aura(ctx, cx, cy, r, color, strength = 0.5) {
  const g = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  g.addColorStop(0, withAlpha(color, strength * 0.7));
  g.addColorStop(0.7, withAlpha(color, strength * 0.2));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export { clamp, lerp, lighten, darken, withAlpha };
