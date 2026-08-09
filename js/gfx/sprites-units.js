// Every character in the game, drawn procedurally in a 100 x 100 unit box
// (x centred on 50, feet resting at y = 96).
//
// Each entry is `draw(ctx, opt)` where opt carries the world-tinted colours plus
// per-frame flags. sprite.js bakes these to offscreen canvases and caches them.
//
// Style: plump kawaii mascots. Flat colour, thin outline, tiny dot eyes, one
// small mouth, big blush. Each character is ONE clear silhouette plus ONE
// signature detail — spikes, a shell, ears — so it stays readable at 60px on a
// phone, which is the size that actually matters.

import {
  INK, blobPath, eggPath, roundRectPath, ink, fill, flat, body, belly, groundShadow,
  eye, mouth, blush, horn, earTriangle, earRound, limb, foot, nub, tail, spikes,
  helm, eliteBadge, aura, fiveStar,
} from './toybox.js';
import { lighten, darken } from '../core/utils.js';
import { HERO, HERO_TIERS } from './palettes.js';

const FEET = 96;

// ------------------------------------------------------------------- monsters

/** Blobbie — a round little slime with a single droplet antenna. */
function blobbie(ctx, o) {
  const { c, blink = 0, armored, elite } = o;
  groundShadow(ctx, 50, FEET, 30);

  const shape = () => blobPath(ctx, 50, 62, 33, 31, { flat: 0.34 });
  shape();
  flat(ctx, c.body);
  belly(ctx, shape, 50, 76, 20, 13, lighten(c.body, 0.14));

  // Antenna, drawn over the body so the stalk reads.
  limb(ctx, 50, 34, 54, 20, 4.5, c.accent);
  ctx.beginPath();
  ctx.arc(55, 16, 6.5, 0, Math.PI * 2);
  flat(ctx, lighten(c.accent, 0.18));

  eye(ctx, 40, 58, 5.2, { blink });
  eye(ctx, 61, 58, 5.2, { blink });
  blush(ctx, 29, 68, 7);
  blush(ctx, 72, 68, 7);
  mouth(ctx, 50, 70, 13, { kind: 'w' });

  if (armored) helm(ctx, 50, 34, 46, 21);
  if (elite) eliteBadge(ctx, 78, 32);
}

/** Shellby — a sleepy snail. Signature: the spiral shell. */
function shellby(ctx, o) {
  const { c, blink = 0, armored, elite } = o;
  groundShadow(ctx, 50, FEET, 34);

  // Slug body.
  ctx.beginPath();
  ctx.moveTo(14, 90);
  ctx.quadraticCurveTo(10, 72, 34, 70);
  ctx.lineTo(74, 70);
  ctx.quadraticCurveTo(92, 72, 88, 90);
  ctx.closePath();
  flat(ctx, lighten(c.body, 0.1));

  // Head.
  ctx.beginPath();
  ctx.ellipse(74, 72, 21, 19, 0, 0, Math.PI * 2);
  flat(ctx, c.body);

  // Shell — one clean spiral, the whole character in a single detail.
  ctx.beginPath();
  ctx.arc(38, 58, 26, 0, Math.PI * 2);
  flat(ctx, c.accent);
  ctx.beginPath();
  for (let i = 0; i <= 70; i++) {
    const t = i / 70, a = t * Math.PI * 3.2, r = 21 * (1 - t * 0.9);
    ctx[i === 0 ? 'moveTo' : 'lineTo'](38 + Math.cos(a) * r, 58 + Math.sin(a) * r);
  }
  ink(ctx, 2.6, darken(c.accent, 0.18));

  // Eye stalks. The eye sits in a pale bulb at the tip, otherwise it vanishes
  // into the stalk at gameplay size.
  limb(ctx, 70, 60, 67, 42, 4, c.body);
  limb(ctx, 82, 60, 87, 44, 4, c.body);
  for (const [ex, ey] of [[67, 38], [87, 40]]) {
    ctx.beginPath();
    ctx.arc(ex, ey, 7, 0, Math.PI * 2);
    flat(ctx, lighten(c.body, 0.24));
    eye(ctx, ex, ey, 4, { blink });
  }

  blush(ctx, 64, 78, 6);
  mouth(ctx, 76, 78, 10, { kind: 'line' });

  if (armored) helm(ctx, 74, 56, 30, 15);
  if (elite) eliteBadge(ctx, 18, 30);
}

/** Flitter — a chubby bat. Signature: big round ears and little wings. */
function flitter(ctx, o) {
  const { c, blink = 0, armored, elite } = o;
  groundShadow(ctx, 50, FEET, 26, 8, 0.13);

  // Wings, behind.
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(50 + s * 20, 54);
    ctx.quadraticCurveTo(50 + s * 48, 34, 50 + s * 44, 62);
    ctx.quadraticCurveTo(50 + s * 34, 54, 50 + s * 22, 68);
    ctx.closePath();
    flat(ctx, darken(c.accent, 0.04));
  }

  earRound(ctx, 32, 40, 12, c.body, lighten(c.body, 0.24));
  earRound(ctx, 68, 40, 12, c.body, lighten(c.body, 0.24));

  const shape = () => eggPath(ctx, 50, 62, 28, 30, { taper: 0.18, flat: 0.34 });
  shape();
  flat(ctx, c.body);
  belly(ctx, shape, 50, 76, 16, 12, lighten(c.body, 0.2));

  eye(ctx, 41, 58, 5, { blink });
  eye(ctx, 60, 58, 5, { blink });
  blush(ctx, 31, 67, 6.5);
  blush(ctx, 70, 67, 6.5);
  mouth(ctx, 50, 69, 12, { kind: 'fang' });

  foot(ctx, 41, 92, 14, 9, darken(c.accent, 0.02));
  foot(ctx, 60, 92, 14, 9, darken(c.accent, 0.02));

  if (armored) helm(ctx, 50, 38, 42, 20);
  if (elite) eliteBadge(ctx, 78, 30);
}

/** Shroomp — a mushroom. Signature: the spotted cap. */
function shroomp(ctx, o) {
  const { c, blink = 0, armored, elite } = o;
  groundShadow(ctx, 50, FEET, 30);

  // Stem, which carries the face.
  ctx.beginPath();
  ctx.moveTo(32, 92);
  ctx.quadraticCurveTo(30, 60, 38, 54);
  ctx.lineTo(62, 54);
  ctx.quadraticCurveTo(70, 60, 68, 92);
  ctx.quadraticCurveTo(50, 96, 32, 92);
  ctx.closePath();
  flat(ctx, '#fdf3e2');

  // Cap.
  const cap = () => {
    ctx.beginPath();
    ctx.moveTo(13, 54);
    ctx.quadraticCurveTo(16, 18, 50, 18);
    ctx.quadraticCurveTo(84, 18, 87, 54);
    ctx.quadraticCurveTo(50, 62, 13, 54);
    ctx.closePath();
  };
  cap();
  flat(ctx, c.body);
  ctx.save();
  cap();
  ctx.clip();
  for (const [x, y, r] of [[29, 38, 8], [55, 29, 9.5], [71, 44, 7]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.86, 0, 0, Math.PI * 2);
    fill(ctx, '#fff6ea');
  }
  ctx.restore();
  cap();
  ink(ctx);

  eye(ctx, 42, 70, 4.8, { blink });
  eye(ctx, 59, 70, 4.8, { blink });
  blush(ctx, 34, 78, 6);
  blush(ctx, 67, 78, 6);
  mouth(ctx, 50, 79, 11, { kind: 'line' });

  if (armored) helm(ctx, 50, 22, 50, 22);
  if (elite) eliteBadge(ctx, 84, 26);
}

/** Webble — a round spider. Signature: simple arched legs and four eyes. */
function webble(ctx, o) {
  const { c, blink = 0, armored, elite } = o;
  groundShadow(ctx, 50, FEET, 32);

  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const sy = 56 + i * 10;
      ctx.beginPath();
      ctx.moveTo(50 + s * 24, sy);
      ctx.quadraticCurveTo(50 + s * (44 + i * 4), sy - 6 + i * 3, 50 + s * (38 + i * 4), 92 - i * 4);
      ctx.lineCap = 'round';
      ctx.lineWidth = 7.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = darken(c.accent, 0.04);
      ctx.stroke();
    }
  }

  body(ctx, 50, 62, 29, 28, c.body, { flat: 0.26 });

  eye(ctx, 41, 58, 5, { blink });
  eye(ctx, 60, 58, 5, { blink });
  eye(ctx, 33, 68, 3, { blink });
  eye(ctx, 68, 68, 3, { blink });
  blush(ctx, 27, 64, 5.5);
  blush(ctx, 74, 64, 5.5);
  mouth(ctx, 50, 72, 11, { kind: 'w' });

  if (armored) helm(ctx, 50, 38, 44, 21);
  if (elite) eliteBadge(ctx, 80, 32);
}

/** Boolie — a little ghost. Signature: the scalloped hem. */
function boolie(ctx, o) {
  const { c, blink = 0, armored, elite } = o;
  groundShadow(ctx, 50, FEET, 24, 7, 0.1);

  ctx.beginPath();
  ctx.moveTo(19, 64);
  ctx.bezierCurveTo(19, 24, 81, 24, 81, 64);
  ctx.lineTo(81, 80);
  // Even scallops along the hem: each lobe dips to the same depth, so the
  // silhouette reads as a ghost's ruffle rather than a single torn notch.
  const lobes = 3, w = 62 / lobes;
  for (let i = 0; i < lobes; i++) {
    const x0 = 81 - i * w;
    ctx.quadraticCurveTo(x0 - w * 0.5, 92, x0 - w, 80);
  }
  ctx.closePath();
  flat(ctx, c.body);

  eye(ctx, 40, 56, 5.2, { blink });
  eye(ctx, 61, 56, 5.2, { blink });
  blush(ctx, 29, 65, 6.5, '#b9a8e0', 0.5);
  blush(ctx, 72, 65, 6.5, '#b9a8e0', 0.5);
  mouth(ctx, 50, 67, 10, { kind: 'o' });

  if (armored) helm(ctx, 50, 36, 42, 20);
  if (elite) eliteBadge(ctx, 80, 30);
}

/** Hornlet — a small imp. Signature: two horns and a curly tail. */
function hornlet(ctx, o) {
  const { c, blink = 0, armored, elite } = o;
  groundShadow(ctx, 50, FEET, 28);

  tail(ctx, 70, 80, 18, c.accent, 1);

  const shape = () => eggPath(ctx, 50, 62, 27, 31, { taper: 0.2, flat: 0.34 });
  shape();
  flat(ctx, c.body);
  belly(ctx, shape, 50, 76, 16, 12, lighten(c.body, 0.2));

  horn(ctx, 34, 36, 11, 17, '#fff0d6', { curve: -0.35 });
  horn(ctx, 66, 36, 11, 17, '#fff0d6', { curve: 0.35 });
  earTriangle(ctx, 26, 54, 13, 14, c.body, lighten(c.body, 0.24), { lean: -0.8 });
  earTriangle(ctx, 74, 54, 13, 14, c.body, lighten(c.body, 0.24), { lean: 0.8 });

  nub(ctx, 26, 70, 7, c.body, -1);
  nub(ctx, 74, 70, 7, c.body, 1);
  foot(ctx, 41, 92, 14, 9, darken(c.accent, 0.04));
  foot(ctx, 60, 92, 14, 9, darken(c.accent, 0.04));

  eye(ctx, 41, 58, 5, { blink });
  eye(ctx, 60, 58, 5, { blink });
  blush(ctx, 31, 67, 6.5);
  blush(ctx, 70, 67, 6.5);
  mouth(ctx, 50, 69, 12, { kind: 'fang' });

  if (armored) helm(ctx, 50, 34, 40, 19);
  if (elite) eliteBadge(ctx, 82, 30);
}

/** Rumble — a rounded rock creature. Signature: chunky body and sleepy eyes. */
function rumble(ctx, o) {
  const { c, blink = 0, armored, elite } = o;
  groundShadow(ctx, 50, FEET, 34);

  const slab = () => roundRectPath(ctx, 19, 38, 62, 56, 22);
  slab();
  flat(ctx, c.body);

  // A couple of flat facets — the only "texture" this style allows.
  ctx.save();
  slab();
  ctx.clip();
  for (const tri of [[[24, 88], [36, 72], [48, 88]], [[56, 90], [70, 70], [82, 90]]]) {
    ctx.beginPath();
    ctx.moveTo(tri[0][0], tri[0][1]);
    ctx.lineTo(tri[1][0], tri[1][1]);
    ctx.lineTo(tri[2][0], tri[2][1]);
    ctx.closePath();
    fill(ctx, darken(c.body, 0.08));
  }
  ctx.restore();
  slab();
  ink(ctx);

  // Shoulder crags.
  ctx.beginPath();
  ctx.moveTo(16, 46);
  ctx.quadraticCurveTo(20, 32, 30, 42);
  ctx.closePath();
  flat(ctx, lighten(c.accent, 0.12));
  ctx.beginPath();
  ctx.moveTo(84, 44);
  ctx.quadraticCurveTo(80, 30, 70, 40);
  ctx.closePath();
  flat(ctx, lighten(c.accent, 0.12));

  eye(ctx, 39, 58, 5.2, { kind: 'sleepy', blink });
  eye(ctx, 62, 58, 5.2, { kind: 'sleepy', blink });
  blush(ctx, 29, 68, 6);
  blush(ctx, 72, 68, 6);
  mouth(ctx, 50, 70, 13, { kind: 'line' });

  if (armored) helm(ctx, 50, 38, 48, 22);
  if (elite) eliteBadge(ctx, 84, 32);
}

/**
 * The boss. A plump dragon in the same language as everything else — bigger and
 * spikier, but never frightening. A boss should feel like an event, not a threat.
 */
function dragon(ctx, o) {
  const { c, blink = 0, elite } = o;
  groundShadow(ctx, 50, FEET, 40, 11, 0.2);
  if (elite) aura(ctx, 50, 58, 46, c.accent, 0.35);

  // Tail, curling out to the right.
  ctx.beginPath();
  ctx.moveTo(66, 84);
  ctx.quadraticCurveTo(94, 88, 90, 64);
  ctx.lineCap = 'round';
  ctx.lineWidth = 15;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 11;
  ctx.strokeStyle = c.body;
  ctx.stroke();

  // Back spikes, placed ON the body contour and rotated to point outward, so
  // they break the silhouette instead of hiding underneath it.
  const cx = 50, cy = 62, rx = 31, ry = 34;
  for (const deg of [-8, 18, 44, 68]) {
    const a = (deg * Math.PI) / 180;
    const x = cx + Math.sin(a) * rx;
    const y = cy - Math.cos(a) * ry;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-8, 3);
    ctx.quadraticCurveTo(0, -11, 8, 3);
    ctx.closePath();
    flat(ctx, lighten(c.accent, 0.24));
    ctx.restore();
  }

  const shape = () => eggPath(ctx, cx, cy, rx, ry, { taper: 0.16, flat: 0.34 });
  shape();
  flat(ctx, c.body);
  belly(ctx, shape, 50, 76, 19, 15, lighten(c.body, 0.24));

  nub(ctx, 23, 68, 8, c.body, -1);
  nub(ctx, 77, 68, 8, c.body, 1);
  foot(ctx, 39, 93, 17, 10, darken(c.accent, 0.04));
  foot(ctx, 61, 93, 17, 10, darken(c.accent, 0.04));

  eye(ctx, 40, 56, 6.4, { blink });
  eye(ctx, 61, 56, 6.4, { blink });
  blush(ctx, 28, 66, 8);
  blush(ctx, 73, 66, 8);
  mouth(ctx, 50, 68, 16, { kind: 'fang' });
}

// ----------------------------------------------------------------------- hero

/**
 * The player's champion. `tier` 0..6 tracks the grade band, so the hero visibly
 * grows in power across the whole game while staying the same friendly shape.
 */
function hero(ctx, o) {
  const { tier = 0, blink = 0, cheer = 0, cast = 0 } = o;
  const t = HERO_TIERS[Math.max(0, Math.min(HERO_TIERS.length - 1, tier))];
  groundShadow(ctx, 50, FEET, 27);
  if (t.aura) aura(ctx, 50, 56, 44, t.aura, 0.38);

  if (t.wings) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(50 + s * 20, 58);
      ctx.quadraticCurveTo(50 + s * 50, 30, 50 + s * 38, 62);
      ctx.quadraticCurveTo(50 + s * 32, 54, 50 + s * 20, 68);
      ctx.closePath();
      flat(ctx, '#fffdf6');
    }
  }

  if (t.cape) {
    // Drawn wide and from shoulder height, otherwise the robe hides it entirely
    // and the tier reads as identical to the one before.
    ctx.beginPath();
    ctx.moveTo(36, 54);
    ctx.quadraticCurveTo(17, 76, 22, 92);
    ctx.quadraticCurveTo(50, 84, 78, 92);
    ctx.quadraticCurveTo(83, 76, 64, 54);
    ctx.closePath();
    flat(ctx, t.cape);
  }

  // Legs and boots.
  limb(ctx, 43, 84, 42, 90, 6.5, HERO.robeAlt);
  limb(ctx, 57, 84, 58, 90, 6.5, HERO.robeAlt);
  foot(ctx, 41, 92, 15, 9, '#7a5a44');
  foot(ctx, 59, 92, 15, 9, '#7a5a44');

  // Robe.
  ctx.beginPath();
  ctx.moveTo(36, 60);
  ctx.quadraticCurveTo(30, 80, 34, 88);
  ctx.quadraticCurveTo(50, 92, 66, 88);
  ctx.quadraticCurveTo(70, 80, 64, 60);
  ctx.closePath();
  flat(ctx, HERO.robe);

  // Staff arm.
  const sx = 74 + cast * 3, sy = 46 - cast * 6;
  limb(ctx, 66, 68, sx - 2, sy + 22, 6, HERO.skin);
  ctx.beginPath();
  ctx.moveTo(sx, sy + 44);
  ctx.lineTo(sx + 2, sy + 4);
  ctx.lineCap = 'round';
  ctx.lineWidth = 7.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 4.4;
  ctx.strokeStyle = HERO.staff;
  ctx.stroke();
  aura(ctx, sx + 2, sy, 12 + cast * 6, t.gem, 0.7);
  ctx.beginPath();
  ctx.arc(sx + 2, sy, 6.5, 0, Math.PI * 2);
  flat(ctx, t.gem);

  // Free arm, raised when cheering.
  limb(ctx, 34, 68, cheer > 0 ? 23 : 27, cheer > 0 ? 52 : 80, 6, HERO.skin);

  // Head.
  ctx.beginPath();
  ctx.ellipse(50, 44, 24, 23, 0, 0, Math.PI * 2);
  flat(ctx, HERO.skin);

  // Hair fringe, clipped to the head.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(50, 44, 24, 23, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(24, 38);
  ctx.quadraticCurveTo(32, 18, 50, 20);
  ctx.quadraticCurveTo(68, 18, 76, 38);
  ctx.quadraticCurveTo(64, 29, 50, 32);
  ctx.quadraticCurveTo(36, 29, 24, 38);
  ctx.closePath();
  fill(ctx, HERO.hair);
  ctx.restore();

  eye(ctx, 42, 46, 5.6, { blink });
  eye(ctx, 59, 46, 5.6, { blink });
  blush(ctx, 32, 54, 7);
  blush(ctx, 69, 54, 7);
  mouth(ctx, 50, 55, cheer > 0 ? 13 : 11, { kind: cheer > 0 ? 'wide' : 'smile' });

  // Hat.
  ctx.beginPath();
  ctx.moveTo(25, 30);
  ctx.quadraticCurveTo(50, 36, 75, 30);
  ctx.quadraticCurveTo(66, 8, 50, 6);
  ctx.quadraticCurveTo(34, 8, 25, 30);
  ctx.closePath();
  flat(ctx, t.hat);
  ctx.beginPath();
  ctx.ellipse(50, 30, 26, 5.5, 0, 0, Math.PI * 2);
  flat(ctx, darken(t.hat, 0.14));
  fiveStar(ctx, 50, 17, 6, t.gem);

  if (t.crown) {
    ctx.beginPath();
    ctx.moveTo(36, 12);
    ctx.lineTo(40, 3);
    ctx.lineTo(45, 9);
    ctx.lineTo(50, 0);
    ctx.lineTo(55, 9);
    ctx.lineTo(60, 3);
    ctx.lineTo(64, 12);
    ctx.closePath();
    flat(ctx, '#ffd34e');
  }
}

// ---------------------------------------------------------------- the registry

export const MONSTERS = {
  blobbie: { draw: blobbie, name: 'Blobbie' },
  shellby: { draw: shellby, name: 'Shellby' },
  flitter: { draw: flitter, name: 'Flitter' },
  shroomp: { draw: shroomp, name: 'Shroomp' },
  webble: { draw: webble, name: 'Webble' },
  boolie: { draw: boolie, name: 'Boolie' },
  hornlet: { draw: hornlet, name: 'Hornlet' },
  rumble: { draw: rumble, name: 'Rumble' },
  dragon: { draw: dragon, name: 'Gloom Dragon' },
};

export const HERO_SPRITE = { draw: hero, name: 'Hero' };

export const MONSTER_KEYS = Object.keys(MONSTERS).filter((k) => k !== 'dragon');
