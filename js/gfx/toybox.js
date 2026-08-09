// Shared drawing kit for the "cute but scary" chibi vinyl-toy look
// (Pop Mart / gachapon designer-figure vibe).
//
// Every creature draws inside a 100 x 100 unit box: x centred on 50, feet at y = 96.
// The bake step in sprite.js scales that box to whatever pixel size it needs.
//
// House rules that make things read as a collectible vinyl figure:
//   - chibi proportions: head is ~55% of the figure
//   - thick, soft, dark-plum outlines (never pure black)
//   - a vertical body gradient + one glossy sheen highlight top-left
//   - huge glossy eyes with a big white catchlight and a small secondary dot
//   - the "scary" lives entirely in the face: wide grin, tiny pointed teeth, horns
//   - a soft ellipse contact shadow so the figure feels like it sits on a shelf

import { lighten, darken, withAlpha, lerp } from '../core/utils.js';

export const INK = '#3d2447';

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

export function ink(ctx, width = 3.2, color = INK) {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Vertical vinyl gradient: lighter crown, richer middle, darker underside. */
export function vinyl(ctx, color, top, bottom) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, lighten(color, 0.16));
  g.addColorStop(0.5, color);
  g.addColorStop(1, darken(color, 0.13));
  ctx.fillStyle = g;
  ctx.fill();
}

/** Glossy highlight. Call while the body path is still the current clip. */
export function sheen(ctx, cx, cy, rx, ry, strength = 0.55) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, `rgba(255,255,255,${strength})`);
  g.addColorStop(0.6, 'rgba(255,255,255,0.10)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Soft contact shadow on the ground. */
export function groundShadow(ctx, cx, cy, rx, ry = rx * 0.34, alpha = 0.22) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, `rgba(40,20,50,${alpha})`);
  g.addColorStop(1, 'rgba(40,20,50,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A filled + outlined blob with gradient and sheen, the workhorse for bodies. */
export function bodyBlob(ctx, cx, cy, rx, ry, color, opt = {}) {
  const { flat = 0.18, lean = 0, lw = 3.2, gloss = 0.5 } = opt;
  blobPath(ctx, cx, cy, rx, ry, { flat, lean });
  vinyl(ctx, color, cy - ry, cy + ry);
  ctx.save();
  ctx.clip();
  sheen(ctx, cx - rx * 0.36, cy - ry * 0.45, rx * 0.62, ry * 0.5, gloss);
  ctx.restore();
  blobPath(ctx, cx, cy, rx, ry, { flat, lean });
  ink(ctx, lw);
}

// ----------------------------------------------------------------------- face

/**
 * A tapered eyebrow, angled down toward the nose. `side` is -1 for the left eye
 * and +1 for the right, so the pair mirrors properly — this is the single
 * detail that decides whether a face reads "mischievous" or "wearing goggles".
 */
export function brow(ctx, x, y, w, side = -1, angry = 1, color = INK) {
  const tilt = 0.38 * Math.min(1.2, angry);
  const half = w * 0.5;
  const th = w * 0.19;
  const ox = side * half;   // outer end — thick, and rides high
  const ix = -side * half;  // inner end — tapers, and dips toward the nose
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-side * tilt);
  ctx.beginPath();
  ctx.moveTo(ox, -th * 0.6);
  ctx.quadraticCurveTo(0, -th * 1.15, ix, -th * 0.02);
  ctx.lineTo(ix, th * 0.28);
  ctx.quadraticCurveTo(0, th * 0.45, ox, th * 0.62);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/**
 * Big glossy eye. `blink` 0..1 closes it into a happy arc.
 * `look` nudges the pupil so a whole row of monsters can glance at the hero.
 * `angry` > 0 adds a mirrored brow; pass `side` -1/+1 so the pair points inward.
 */
export function eye(ctx, x, y, r, opt = {}) {
  const {
    blink = 0, look = [0.1, 0.08], iris = '#2b1633', scleraColor = '#ffffff',
    lw = 2.6, angry = 0, pupil = 0.46, side = -1,
  } = opt;

  if (angry > 0) brow(ctx, x, y - r * 1.62, r * 1.85, side, angry);

  if (blink > 0.75) {
    // Closed, upside-down-U — reads as delighted, which is the cute half of the brief.
    ctx.beginPath();
    ctx.arc(x, y + r * 0.15, r * 0.82, Math.PI * 1.12, Math.PI * 1.88);
    ink(ctx, lw * 1.15);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * lerp(1, 0.18, blink), 0, 0, Math.PI * 2);
  ctx.fillStyle = scleraColor;
  ctx.fill();
  ctx.clip();

  // Iris with a glassy radial falloff.
  const ix = x + look[0] * r * 0.55, iy = y + look[1] * r * 0.55;
  const ir = r * 0.66;
  const g = ctx.createRadialGradient(ix, iy - ir * 0.2, ir * 0.1, ix, iy, ir);
  g.addColorStop(0, lighten(iris, 0.22));
  g.addColorStop(0.75, iris);
  g.addColorStop(1, darken(iris, 0.18));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(ix, iy, ir, ir, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a0d22';
  ctx.beginPath();
  ctx.ellipse(ix, iy, ir * pupil, ir * pupil, 0, 0, Math.PI * 2);
  ctx.fill();

  // Catchlights — the single biggest "expensive vinyl toy" tell.
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(ix - ir * 0.34, iy - ir * 0.42, ir * 0.3, ir * 0.24, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(ix + ir * 0.3, iy + ir * 0.34, ir * 0.15, ir * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(x, y, r, r * lerp(1, 0.18, blink), 0, 0, Math.PI * 2);
  ink(ctx, lw);
}

/**
 * The signature grin. Wide, curved, filled dark, with tiny pointed teeth.
 * `fangs` adds two longer canines; `tongue` adds a soft pink tongue.
 */
export function grin(ctx, cx, cy, w, h, opt = {}) {
  const { teeth = 3, fangs = true, tongue = true, lw = 2.8, curve = 1 } = opt;
  const hw = w / 2;
  const depth = h * 2.3 * curve;

  const mouthPath = () => {
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.quadraticCurveTo(cx, cy + depth, cx + hw, cy);
    ctx.quadraticCurveTo(cx, cy - h * 0.15, cx - hw, cy);
    ctx.closePath();
  };

  ctx.save();
  mouthPath();
  ctx.fillStyle = '#4e152f';
  ctx.fill();
  ctx.clip();

  if (tongue) {
    ctx.fillStyle = '#f27b9b';
    ctx.beginPath();
    ctx.ellipse(cx, cy + depth * 0.82, hw * 0.55, depth * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Big upper teeth hanging from the lip — few and chunky reads better at
  // gameplay size than a fine sawtooth, which just turns into grey mush.
  ctx.fillStyle = '#fffdf6';
  const n = Math.max(2, teeth);
  const slot = w / n;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = cx - hw + w * t;
    const th = depth * (0.42 + 0.14 * Math.sin(Math.PI * t));
    const tw = slot * 0.38;
    ctx.beginPath();
    ctx.moveTo(x - tw, cy - h * 0.5);
    ctx.lineTo(x + tw, cy - h * 0.5);
    ctx.lineTo(x + tw * 0.55, cy + th);
    ctx.quadraticCurveTo(x, cy + th * 1.2, x - tw * 0.55, cy + th);
    ctx.closePath();
    ctx.fill();
  }

  // Two long canines at the corners — the whole "scary" budget, spent here.
  if (fangs) {
    for (const s of [-1, 1]) {
      const x = cx + s * hw * 0.74;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.075, cy - h * 0.4);
      ctx.lineTo(x + w * 0.075, cy - h * 0.4);
      ctx.lineTo(x, cy + depth * 0.78);
      ctx.closePath();
      ctx.fill();
    }
  }

  // A hint of lower teeth so the mouth looks like a bite, not a hole.
  ctx.fillStyle = '#f6f0e4';
  for (let i = 0; i < 2; i++) {
    const x = cx + (i === 0 ? -1 : 1) * hw * 0.3;
    ctx.beginPath();
    ctx.moveTo(x - slot * 0.28, cy + depth);
    ctx.lineTo(x + slot * 0.28, cy + depth);
    ctx.lineTo(x, cy + depth * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  mouthPath();
  ink(ctx, lw);
}

/** A simple smile line, for friendlier characters (the hero, gentle enemies). */
export function smile(ctx, cx, cy, w, h, lw = 2.6) {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.quadraticCurveTo(cx, cy + h, cx + w / 2, cy);
  ink(ctx, lw);
}

/** Rosy cheek blush — pure cuteness ballast against all those teeth. */
export function blush(ctx, x, y, r, color = '#ff8fb0', alpha = 0.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ----------------------------------------------------------------- appendages

export function horn(ctx, x, y, w, h, color, { curve = 0.3, lw = 2.6 } = {}) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w * 0.1, y - h * 0.7, x + w * curve, y - h);
  ctx.quadraticCurveTo(x + w * 0.5, y - h * 0.42, x + w / 2, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, lighten(color, 0.2));
  g.addColorStop(1, darken(color, 0.1));
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, lw);
}

export function earTriangle(ctx, x, y, w, h, color, inner, { lean = 0, lw = 2.6 } = {}) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x + lean * w * 0.5, y - h * 1.05, x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, lw);
  if (inner) {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.24, y - h * 0.06);
    ctx.quadraticCurveTo(x + lean * w * 0.3, y - h * 0.62, x + w * 0.24, y - h * 0.06);
    ctx.closePath();
    ctx.fillStyle = inner;
    ctx.fill();
  }
}

export function limb(ctx, x1, y1, x2, y2, w, color, lw = 2.6) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineCap = 'round';
  ctx.lineWidth = w + lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/** Stubby vinyl foot. */
export function foot(ctx, x, y, w, h, color, lw = 2.6) {
  blobPath(ctx, x, y, w / 2, h / 2, { flat: 0.4 });
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, lw);
}

/** Little curled tail. */
export function tail(ctx, x, y, len, color, dir = 1, lw = 2.6) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dir * len * 0.9, y - len * 0.1, x + dir * len * 0.7, y - len * 0.75);
  ctx.lineCap = 'round';
  ctx.lineWidth = 6 + lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.stroke();
  // Arrow tip, because tiny devil tails are funny.
  ctx.beginPath();
  ctx.moveTo(x + dir * len * 0.7, y - len * 0.75);
  ctx.lineTo(x + dir * len * 0.4, y - len * 0.95);
  ctx.lineTo(x + dir * len * 0.95, y - len * 1.02);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, lw * 0.8);
}

// --------------------------------------------------------------------- extras

/** Star / sparkle used for poofs, rewards and the "correct!" burst. */
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
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function fiveStar(ctx, x, y, r, fill, outline = INK, lw = 2.4) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
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
 * Knight's helm — the "this one takes two correct answers" tell.
 * Worn on the crown rather than across the chest, because most of these
 * monsters *are* a head, and a chest plate just covers up the face.
 */
export function helm(ctx, cx, topY, w, h, metal = '#c3cddc') {
  const dome = () => {
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, topY + h * 0.6);
    ctx.quadraticCurveTo(cx - w / 2, topY - h * 0.55, cx, topY - h * 0.55);
    ctx.quadraticCurveTo(cx + w / 2, topY - h * 0.55, cx + w / 2, topY + h * 0.6);
    ctx.closePath();
  };
  dome();
  const g = ctx.createLinearGradient(0, topY - h * 0.55, 0, topY + h * 0.6);
  g.addColorStop(0, lighten(metal, 0.3));
  g.addColorStop(0.5, metal);
  g.addColorStop(1, darken(metal, 0.22));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  dome();
  ctx.clip();
  sheen(ctx, cx - w * 0.22, topY - h * 0.2, w * 0.3, h * 0.34, 0.7);
  ctx.restore();
  dome();
  ink(ctx, 3);

  // Brim.
  roundRectPath(ctx, cx - w * 0.58, topY + h * 0.42, w * 1.16, h * 0.34, h * 0.17);
  ctx.fillStyle = darken(metal, 0.12);
  ctx.fill();
  ink(ctx, 2.8);

  // Plume, so the knights read as characters and not as grey blobs.
  ctx.beginPath();
  ctx.moveTo(cx, topY - h * 0.5);
  ctx.quadraticCurveTo(cx + w * 0.3, topY - h * 1.25, cx + w * 0.08, topY - h * 1.4);
  ctx.quadraticCurveTo(cx - w * 0.02, topY - h * 0.95, cx - w * 0.1, topY - h * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#ff6f91';
  ctx.fill();
  ink(ctx, 2.4);
}

/** Gold star badge marking an "elite" variant. Drawn last, above everything. */
export function eliteBadge(ctx, x, y, r = 9) {
  aura(ctx, x, y, r * 2.2, '#ffd34e', 0.75);
  fiveStar(ctx, x, y, r, '#ffd34e');
}

/** Armour plate overlay, kept for props that genuinely have a torso. */
export function armour(ctx, cx, cy, w, h, metal = '#b9c6da') {
  roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, h * 0.42);
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  g.addColorStop(0, lighten(metal, 0.28));
  g.addColorStop(0.45, metal);
  g.addColorStop(1, darken(metal, 0.22));
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 3);
  // Rivets.
  ctx.fillStyle = darken(metal, 0.3);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + s * w * 0.33, cy, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = withAlpha('#ffffff', 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.3, cy - h * 0.22);
  ctx.lineTo(cx + w * 0.18, cy - h * 0.22);
  ctx.stroke();
}

/** Faint aura ring behind a figure — used for elite enemies and hero tiers. */
export function aura(ctx, cx, cy, r, color, strength = 0.5) {
  const g = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  g.addColorStop(0, withAlpha(color, strength * 0.75));
  g.addColorStop(0.7, withAlpha(color, strength * 0.22));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}
