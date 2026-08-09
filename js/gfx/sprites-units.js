// Every character in the game, drawn procedurally in a 100 x 100 unit box
// (x centred on 50, feet resting at y = 96).
//
// Each entry is `draw(ctx, opt)` where opt carries the world-tinted colours plus
// per-frame flags. sprite.js bakes these to offscreen canvases and caches them.

import {
  INK, blobPath, roundRectPath, ink, vinyl, sheen, bodyBlob, groundShadow,
  eye, grin, smile, blush, horn, earTriangle, limb, foot, tail, helm, eliteBadge, aura,
  fiveStar,
} from './toybox.js';
import { lighten, darken, withAlpha } from '../core/utils.js';
import { HERO, HERO_TIERS } from './palettes.js';

const FEET = 96;

/** Backlight for an "elite" (world-2) variant; the gold badge goes on top. */
function eliteTrim(ctx, cx, cy, r, accent) {
  aura(ctx, cx, cy, r * 1.6, accent, 0.55);
}

// ------------------------------------------------------------------- monsters

function blobbie(ctx, o) {
  const { c, blink = 0, look = [0.12, 0.1], armored, elite } = o;
  groundShadow(ctx, 50, FEET, 32);
  if (elite) eliteTrim(ctx, 50, 62, 34, c.accent);

  bodyBlob(ctx, 50, 62, 35, 33, c.body, { flat: 0.34 });

  // Droplet antenna — drawn over the body so the stalk actually shows.
  limb(ctx, 50, 34, 53, 22, 5, c.accent);
  ctx.beginPath();
  ctx.arc(54, 18, 7, 0, Math.PI * 2);
  ctx.fillStyle = lighten(c.accent, 0.2);
  ctx.fill();
  ink(ctx, 2.6);

  eye(ctx, 38, 55, 10.5, { blink, look, iris: c.iris, angry: 0.5, side: -1 });
  eye(ctx, 63, 55, 10.5, { blink, look, iris: c.iris, angry: 0.5, side: 1 });
  blush(ctx, 27, 70, 7.5, '#ff7a9e', 0.55);
  blush(ctx, 74, 70, 7.5, '#ff7a9e', 0.55);
  grin(ctx, 50, 71, 30, 8, { teeth: 5 });

  if (armored) helm(ctx, 50, 36, 52, 24);
  if (elite) eliteBadge(ctx, 76, 34);
}

function shellby(ctx, o) {
  const { c, blink = 0, look = [0.2, 0.05], armored, elite } = o;
  groundShadow(ctx, 50, FEET, 36);
  if (elite) eliteTrim(ctx, 44, 58, 32, c.accent);

  // Foot / body slug base.
  blobPath(ctx, 52, 84, 40, 13, { flat: 0.5 });
  vinyl(ctx, lighten(c.body, 0.08), 71, 97);
  ink(ctx, 3);

  // Spiral shell.
  ctx.save();
  ctx.translate(38, 58);
  blobPath(ctx, 0, 0, 27, 26, { flat: 0.05 });
  vinyl(ctx, c.accent, -26, 26);
  ctx.save(); ctx.clip(); sheen(ctx, -10, -12, 18, 15, 0.5); ctx.restore();
  blobPath(ctx, 0, 0, 27, 26, { flat: 0.05 });
  ink(ctx, 3.2);
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, a = t * Math.PI * 3.4, r = 24 * (1 - t * 0.92);
    const x = Math.cos(a) * r * 0.95, y = Math.sin(a) * r * 0.95;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](x, y);
  }
  ink(ctx, 3, withAlpha(INK, 0.75));
  ctx.restore();

  // Head with eye stalks.
  limb(ctx, 72, 74, 70, 50, 5, c.body);
  limb(ctx, 82, 74, 86, 52, 5, c.body);
  eye(ctx, 69, 45, 8.5, { blink, look, iris: c.iris, angry: 0.7, side: -1 });
  eye(ctx, 87, 47, 8.5, { blink, look, iris: c.iris, angry: 0.7, side: 1 });
  blobPath(ctx, 78, 76, 17, 13, { flat: 0.3 });
  ctx.fillStyle = c.body; ctx.fill(); ink(ctx, 3);
  grin(ctx, 79, 76, 17, 5, { teeth: 3, tongue: false });

  if (armored) helm(ctx, 78, 60, 30, 15);
  if (elite) eliteBadge(ctx, 26, 32);
}

function flitter(ctx, o) {
  const { c, blink = 0, look = [0.1, 0.12], armored, elite } = o;
  groundShadow(ctx, 50, FEET, 26, 8, 0.16);
  if (elite) eliteTrim(ctx, 50, 56, 32, c.accent);

  // Wings behind the body.
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(50 + s * 22, 52);
    ctx.quadraticCurveTo(50 + s * 52, 26, 50 + s * 46, 56);
    ctx.quadraticCurveTo(50 + s * 40, 48, 50 + s * 36, 62);
    ctx.quadraticCurveTo(50 + s * 30, 54, 50 + s * 22, 66);
    ctx.closePath();
    ctx.fillStyle = darken(c.accent, 0.06);
    ctx.fill();
    ink(ctx, 2.8);
    ctx.restore();
  }

  earTriangle(ctx, 34, 40, 20, 26, c.body, lighten(c.accent, 0.25), { lean: -0.5 });
  earTriangle(ctx, 66, 40, 20, 26, c.body, lighten(c.accent, 0.25), { lean: 0.5 });

  bodyBlob(ctx, 50, 60, 29, 28, c.body, { flat: 0.3 });
  // Fuzzy chest tuft.
  ctx.beginPath();
  ctx.ellipse(50, 74, 15, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = lighten(c.body, 0.22);
  ctx.fill();

  eye(ctx, 40, 56, 10, { blink, look, iris: c.iris, angry: 0.4, side: -1 });
  eye(ctx, 61, 56, 10, { blink, look, iris: c.iris, angry: 0.4, side: 1 });
  blush(ctx, 30, 66, 6.5);
  blush(ctx, 71, 66, 6.5);
  grin(ctx, 50, 70, 22, 6.5, { teeth: 3, fangs: true });
  foot(ctx, 41, 90, 15, 10, darken(c.accent, 0.05));
  foot(ctx, 60, 90, 15, 10, darken(c.accent, 0.05));

  if (armored) helm(ctx, 50, 40, 44, 21);
  if (elite) eliteBadge(ctx, 76, 30);
}

function shroomp(ctx, o) {
  const { c, blink = 0, look = [0.1, 0.1], armored, elite } = o;
  groundShadow(ctx, 50, FEET, 30);
  if (elite) eliteTrim(ctx, 50, 44, 36, c.accent);

  // Stem (the body + face).
  blobPath(ctx, 50, 74, 24, 24, { flat: 0.4 });
  vinyl(ctx, '#fff2df', 50, 96);
  ink(ctx, 3.2);

  // Cap.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(12, 52);
  ctx.quadraticCurveTo(16, 16, 50, 16);
  ctx.quadraticCurveTo(84, 16, 88, 52);
  ctx.quadraticCurveTo(70, 60, 50, 60);
  ctx.quadraticCurveTo(30, 60, 12, 52);
  ctx.closePath();
  vinyl(ctx, c.body, 16, 60);
  ctx.save(); ctx.clip();
  sheen(ctx, 32, 28, 26, 16, 0.5);
  ctx.fillStyle = withAlpha('#fffaf0', 0.92);
  for (const [x, y, r] of [[30, 36, 8], [55, 28, 10], [72, 42, 7], [45, 46, 5.5]]) {
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(12, 52);
  ctx.quadraticCurveTo(16, 16, 50, 16);
  ctx.quadraticCurveTo(84, 16, 88, 52);
  ctx.quadraticCurveTo(70, 60, 50, 60);
  ctx.quadraticCurveTo(30, 60, 12, 52);
  ctx.closePath();
  ink(ctx, 3.2);
  ctx.restore();

  eye(ctx, 41, 70, 8.5, { blink, look, iris: c.iris, angry: 1, side: -1 });
  eye(ctx, 60, 70, 8.5, { blink, look, iris: c.iris, angry: 1, side: 1 });
  grin(ctx, 50, 82, 20, 6, { teeth: 4, tongue: false });

  if (armored) helm(ctx, 50, 24, 54, 23);
  if (elite) eliteBadge(ctx, 82, 26);
}

function webble(ctx, o) {
  const { c, blink = 0, look = [0.1, 0.1], armored, elite } = o;
  groundShadow(ctx, 50, FEET, 34);
  if (elite) eliteTrim(ctx, 50, 58, 32, c.accent);

  // Six legs, arched.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const sy = 52 + i * 11;
      const ex = 50 + s * (34 + i * 5);
      ctx.beginPath();
      ctx.moveTo(50 + s * 20, sy);
      ctx.quadraticCurveTo(50 + s * (36 + i * 6), sy - 12 + i * 5, ex, 88 - i * 2);
      ctx.lineCap = 'round';
      ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke();
      ctx.lineWidth = 4.6; ctx.strokeStyle = darken(c.accent, 0.05); ctx.stroke();
    }
  }

  bodyBlob(ctx, 50, 62, 30, 29, c.body, { flat: 0.24 });

  // Four eyes: two big, two small — creepy count, cute execution.
  eye(ctx, 40, 56, 10, { blink, look, iris: c.iris, angry: 0.3, side: -1 });
  eye(ctx, 61, 56, 10, { blink, look, iris: c.iris, angry: 0.3, side: 1 });
  eye(ctx, 31, 68, 5.2, { blink, look, iris: c.iris, side: -1 });
  eye(ctx, 70, 68, 5.2, { blink, look, iris: c.iris, side: 1 });
  grin(ctx, 50, 74, 20, 6, { teeth: 4, fangs: true, tongue: false });

  if (armored) helm(ctx, 50, 40, 48, 23);
  if (elite) eliteBadge(ctx, 78, 32);
}

function boolie(ctx, o) {
  const { c, blink = 0, look = [0.14, 0.06], armored, elite } = o;
  groundShadow(ctx, 50, FEET, 24, 7, 0.13);
  if (elite) eliteTrim(ctx, 50, 54, 32, c.accent);

  // Ghost body: blob on top, scalloped hem at the bottom.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(18, 62);
  ctx.bezierCurveTo(18, 24, 82, 24, 82, 62);
  ctx.lineTo(82, 76);
  const lobes = 4, w = 64 / lobes;
  for (let i = 0; i < lobes; i++) {
    const x0 = 82 - i * w;
    ctx.quadraticCurveTo(x0 - w * 0.5, 76 + (i % 2 ? 16 : 6), x0 - w, 76 + (i % 2 ? 2 : 10));
  }
  ctx.closePath();
  vinyl(ctx, c.body, 24, 90);
  ctx.save(); ctx.clip(); sheen(ctx, 34, 40, 22, 20, 0.65); ctx.restore();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(18, 62);
  ctx.bezierCurveTo(18, 24, 82, 24, 82, 62);
  ctx.lineTo(82, 76);
  for (let i = 0; i < lobes; i++) {
    const x0 = 82 - i * w;
    ctx.quadraticCurveTo(x0 - w * 0.5, 76 + (i % 2 ? 16 : 6), x0 - w, 76 + (i % 2 ? 2 : 10));
  }
  ctx.closePath();
  ink(ctx, 3.2);

  eye(ctx, 39, 52, 10.5, { blink, look, iris: c.iris, angry: 0.6, side: -1 });
  eye(ctx, 62, 52, 10.5, { blink, look, iris: c.iris, angry: 0.6, side: 1 });
  blush(ctx, 28, 64, 6.5, '#b6a4ff', 0.45);
  blush(ctx, 73, 64, 6.5, '#b6a4ff', 0.45);
  grin(ctx, 50, 68, 24, 8, { teeth: 4, fangs: true });

  if (armored) helm(ctx, 50, 36, 46, 22);
  if (elite) eliteBadge(ctx, 78, 28);
}

function hornlet(ctx, o) {
  const { c, blink = 0, look = [0.12, 0.1], armored, elite } = o;
  groundShadow(ctx, 50, FEET, 28);
  if (elite) eliteTrim(ctx, 50, 50, 32, c.accent);

  tail(ctx, 68, 82, 20, c.accent, 1);

  // Small torso, big head — classic chibi ratio.
  blobPath(ctx, 50, 80, 20, 17, { flat: 0.35 });
  ctx.fillStyle = c.accent; ctx.fill(); ink(ctx, 3);
  foot(ctx, 40, 93, 15, 9, darken(c.accent, 0.1));
  foot(ctx, 61, 93, 15, 9, darken(c.accent, 0.1));
  limb(ctx, 33, 76, 24, 84, 6, c.body);
  limb(ctx, 68, 76, 77, 84, 6, c.body);

  horn(ctx, 33, 34, 13, 20, '#fff0d0', { curve: -0.35 });
  horn(ctx, 67, 34, 13, 20, '#fff0d0', { curve: 0.35 });
  earTriangle(ctx, 27, 52, 15, 16, c.body, lighten(c.body, 0.25), { lean: -0.8 });
  earTriangle(ctx, 73, 52, 15, 16, c.body, lighten(c.body, 0.25), { lean: 0.8 });

  bodyBlob(ctx, 50, 50, 26, 24, c.body, { flat: 0.14 });

  eye(ctx, 41, 47, 9, { blink, look, iris: c.iris, angry: 1, side: -1 });
  eye(ctx, 60, 47, 9, { blink, look, iris: c.iris, angry: 1, side: 1 });
  blush(ctx, 31, 57, 6);
  blush(ctx, 70, 57, 6);
  grin(ctx, 50, 60, 21, 6.5, { teeth: 4, fangs: true });

  if (armored) helm(ctx, 50, 28, 42, 20);
  if (elite) eliteBadge(ctx, 80, 26);
}

function rumble(ctx, o) {
  const { c, blink = 0, look = [0.08, 0.1], armored, elite } = o;
  groundShadow(ctx, 50, FEET, 36);
  if (elite) eliteTrim(ctx, 50, 58, 34, c.accent);

  // Chunky rounded slab body with rock shards.
  roundRectPath(ctx, 18, 36, 64, 56, 20);
  vinyl(ctx, c.body, 36, 92);
  ctx.save();
  roundRectPath(ctx, 18, 36, 64, 56, 20);
  ctx.clip();
  sheen(ctx, 34, 48, 22, 16, 0.42);
  ctx.fillStyle = withAlpha(darken(c.body, 0.16), 0.85);
  for (const [x, y, s] of [[28, 78, 9], [64, 72, 11], [44, 86, 7]]) {
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.6); ctx.lineTo(x, y - s * 0.8);
    ctx.lineTo(x + s, y + s * 0.5); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  roundRectPath(ctx, 18, 36, 64, 56, 20);
  ink(ctx, 3.4);

  // Shoulder crags.
  for (const [x, y, s, r] of [[20, 42, 12, -0.4], [80, 40, 13, 0.4]]) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.7, y + s * 0.5);
    ctx.quadraticCurveTo(x + r * s, y - s, x + s * 0.7, y + s * 0.4);
    ctx.closePath();
    ctx.fillStyle = lighten(c.accent, 0.1); ctx.fill(); ink(ctx, 2.8);
  }

  // Glowing eyes — the menace here is "ancient thing waking up".
  for (const [x, side] of [[38, -1], [62, 1]]) {
    aura(ctx, x, 56, 13, '#ffd166', 0.7);
    eye(ctx, x, 56, 9, { blink, look, iris: '#e08a2e', scleraColor: '#fff3d0', angry: 1, side });
  }
  grin(ctx, 50, 74, 26, 6.5, { teeth: 5, fangs: false, tongue: false });

  if (armored) helm(ctx, 50, 40, 52, 24);
  if (elite) eliteBadge(ctx, 82, 30);
}

function dragon(ctx, o) {
  const { c, blink = 0, look = [0.12, 0.08], elite } = o;
  groundShadow(ctx, 50, FEET, 42, 12, 0.26);
  aura(ctx, 50, 54, 48, c.accent, elite ? 0.6 : 0.4);

  // Wings.
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(50 + s * 24, 46);
    ctx.quadraticCurveTo(50 + s * 62, 8, 50 + s * 54, 44);
    ctx.quadraticCurveTo(50 + s * 48, 34, 50 + s * 44, 52);
    ctx.quadraticCurveTo(50 + s * 36, 42, 50 + s * 26, 58);
    ctx.closePath();
    ctx.fillStyle = darken(c.accent, 0.1);
    ctx.fill();
    ink(ctx, 3);
    ctx.restore();
  }

  // Tail + body.
  ctx.beginPath();
  ctx.moveTo(62, 82);
  ctx.quadraticCurveTo(92, 84, 88, 62);
  ctx.lineWidth = 13; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineWidth = 9; ctx.strokeStyle = c.body; ctx.stroke();

  blobPath(ctx, 50, 76, 26, 21, { flat: 0.32 });
  vinyl(ctx, c.body, 55, 97); ink(ctx, 3.2);
  ctx.beginPath();
  ctx.ellipse(50, 80, 15, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = lighten(c.body, 0.28); ctx.fill();

  // Head.
  horn(ctx, 31, 30, 14, 22, '#fff0d0', { curve: -0.4 });
  horn(ctx, 69, 30, 14, 22, '#fff0d0', { curve: 0.4 });
  bodyBlob(ctx, 50, 44, 30, 27, c.body, { flat: 0.1 });

  // Snout with a mouthful of teeth.
  blobPath(ctx, 50, 58, 20, 12, { flat: 0.2 });
  ctx.fillStyle = lighten(c.body, 0.16); ctx.fill(); ink(ctx, 2.8);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(44, 54, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(56, 54, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  grin(ctx, 50, 61, 26, 8, { teeth: 6, fangs: true });

  eye(ctx, 39, 40, 10, { blink, look, iris: '#ffd166', scleraColor: '#fff6e0', angry: 1.2, side: -1 });
  eye(ctx, 62, 40, 10, { blink, look, iris: '#ffd166', scleraColor: '#fff6e0', angry: 1.2, side: 1 });

  // Back spines.
  for (let i = 0; i < 3; i++) {
    const x = 62 + i * 9, y = 74 - i * 3;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 5); ctx.lineTo(x, y - 7); ctx.lineTo(x + 5, y + 5);
    ctx.closePath();
    ctx.fillStyle = lighten(c.accent, 0.2); ctx.fill(); ink(ctx, 2.2);
  }
}

// ----------------------------------------------------------------------- hero

/**
 * The player's champion. `tier` 0..6 tracks the grade band, so the hero visibly
 * grows in power right alongside the maths.
 */
function hero(ctx, o) {
  const { tier = 0, blink = 0, look = [0.12, 0.06], cheer = 0, cast = 0 } = o;
  const t = HERO_TIERS[Math.max(0, Math.min(HERO_TIERS.length - 1, tier))];
  groundShadow(ctx, 50, FEET, 28);
  if (t.aura) aura(ctx, 50, 56, 46, t.aura, 0.5);

  if (t.wings) {
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(50 + s * 20, 58);
      ctx.quadraticCurveTo(50 + s * 54, 26, 50 + s * 40, 62);
      ctx.quadraticCurveTo(50 + s * 34, 52, 50 + s * 20, 68);
      ctx.closePath();
      ctx.fillStyle = withAlpha('#ffffff', 0.9); ctx.fill(); ink(ctx, 2.6);
      ctx.restore();
    }
  }

  if (t.cape) {
    ctx.beginPath();
    ctx.moveTo(34, 58);
    ctx.quadraticCurveTo(20, 78, 26, 92);
    ctx.quadraticCurveTo(50, 84, 74, 92);
    ctx.quadraticCurveTo(80, 78, 66, 58);
    ctx.closePath();
    vinyl(ctx, t.cape, 58, 92); ink(ctx, 3);
  }

  // Legs + boots.
  limb(ctx, 43, 84, 41, 91, 7, HERO.robeAlt);
  limb(ctx, 57, 84, 59, 91, 7, HERO.robeAlt);
  foot(ctx, 40, 93, 16, 9, '#6b4a3a');
  foot(ctx, 60, 93, 16, 9, '#6b4a3a');

  // Robe.
  ctx.beginPath();
  ctx.moveTo(36, 60);
  ctx.quadraticCurveTo(30, 80, 33, 88);
  ctx.quadraticCurveTo(50, 93, 67, 88);
  ctx.quadraticCurveTo(70, 80, 64, 60);
  ctx.closePath();
  vinyl(ctx, HERO.robe, 60, 90); ink(ctx, 3.2);

  // Staff arm.
  const sx = 74 + cast * 3, sy = 44 - cast * 6;
  limb(ctx, 66, 68, sx - 2, sy + 22, 6.5, HERO.skin);
  ctx.beginPath();
  ctx.moveTo(sx, sy + 44); ctx.lineTo(sx + 2, sy + 4);
  ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineWidth = 4.6; ctx.strokeStyle = HERO.staff; ctx.stroke();
  aura(ctx, sx + 2, sy, 13 + cast * 6, t.gem, 0.8);
  ctx.beginPath(); ctx.arc(sx + 2, sy, 7, 0, Math.PI * 2);
  ctx.fillStyle = t.gem; ctx.fill(); ink(ctx, 2.4);

  // Free arm (raised when cheering).
  limb(ctx, 34, 68, cheer > 0 ? 22 : 26, cheer > 0 ? 50 : 80, 6.5, HERO.skin);

  // Head.
  bodyBlob(ctx, 50, 42, 25, 24, HERO.skin, { flat: 0.06, lw: 3 });
  // Hair fringe.
  ctx.save();
  blobPath(ctx, 50, 42, 25, 24, { flat: 0.06 });
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(24, 34);
  ctx.quadraticCurveTo(34, 16, 50, 18);
  ctx.quadraticCurveTo(68, 16, 76, 34);
  ctx.quadraticCurveTo(64, 26, 50, 30);
  ctx.quadraticCurveTo(36, 26, 24, 34);
  ctx.closePath();
  ctx.fillStyle = HERO.hair; ctx.fill();
  ctx.restore();

  eye(ctx, 41, 43, 8.5, { blink, look, iris: '#3b2a5c', side: -1 });
  eye(ctx, 59, 43, 8.5, { blink, look, iris: '#3b2a5c', side: 1 });
  blush(ctx, 31, 51, 6.5);
  blush(ctx, 69, 51, 6.5);
  smile(ctx, 50, 53, 13, cheer > 0 ? 9 : 6);

  // Hat (or crown at high tiers, worn over the hat).
  ctx.beginPath();
  ctx.moveTo(24, 28);
  ctx.quadraticCurveTo(50, 34, 76, 28);
  ctx.quadraticCurveTo(66, 6, 50, 4);
  ctx.quadraticCurveTo(34, 6, 24, 28);
  ctx.closePath();
  vinyl(ctx, t.hat, 4, 30); ink(ctx, 3);
  ctx.beginPath();
  ctx.ellipse(50, 28, 27, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = darken(t.hat, 0.12); ctx.fill(); ink(ctx, 2.8);
  fiveStar(ctx, 50, 16, 6.5, t.gem);

  if (t.crown) {
    ctx.beginPath();
    ctx.moveTo(34, 12); ctx.lineTo(38, 2); ctx.lineTo(44, 9);
    ctx.lineTo(50, -2); ctx.lineTo(56, 9); ctx.lineTo(62, 2); ctx.lineTo(66, 12);
    ctx.closePath();
    ctx.fillStyle = '#ffd34e'; ctx.fill(); ink(ctx, 2.4);
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
