// World props, HUD icons and the countable objects used by the early-grade
// question visuals. Same 100 x 100 unit box convention as the monsters.

import {
  INK, blobPath, roundRectPath, ink, groundShadow,
  heartPath, fiveStar, aura, eye, fill, flat,
} from './toybox.js';
import { lighten, withAlpha } from '../core/utils.js';

function glossy(ctx, pathFn, color, lw = 3) {
  pathFn();
  fill(ctx, color);
  pathFn();
  ink(ctx, lw);
}

// ---------------------------------------------------------------- countables

const apple = (ctx) => {
  groundShadow(ctx, 50, 92, 26, 7, 0.16);
  glossy(ctx, () => blobPath(ctx, 50, 58, 32, 30, { flat: 0.1 }), '#ff6b81');
  ctx.beginPath();
  ctx.moveTo(50, 30); ctx.quadraticCurveTo(52, 16, 60, 12);
  ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = '#8a5a3a'; ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(66, 22, 13, 7, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#66c56e'; ctx.fill(); ink(ctx, 2.4);
};

const star = (ctx) => {
  groundShadow(ctx, 50, 92, 24, 6, 0.14);
  aura(ctx, 50, 52, 42, '#ffe66d', 0.45);
  fiveStar(ctx, 50, 52, 38, '#ffd34e');
  ctx.save(); ctx.globalAlpha = 0.5;
  fiveStar(ctx, 46, 46, 16, '#fff6c4', null);
  ctx.restore();
};

const duck = (ctx) => {
  groundShadow(ctx, 50, 92, 28, 7, 0.16);
  blobPath(ctx, 46, 66, 30, 24, { flat: 0.2 });
  fill(ctx, '#ffd94f'); ink(ctx, 3);
  blobPath(ctx, 68, 40, 18, 17, { flat: 0.05 });
  fill(ctx, '#ffe071'); ink(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(82, 40); ctx.lineTo(96, 45); ctx.lineTo(82, 50);
  ctx.closePath(); ctx.fillStyle = '#ff9a3c'; ctx.fill(); ink(ctx, 2.4);
  eye(ctx, 70, 36, 5, { iris: '#2b1633' });
  ctx.beginPath();
  ctx.ellipse(38, 62, 13, 9, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c73c'; ctx.fill(); ink(ctx, 2.4);
};

const shell = (ctx) => {
  groundShadow(ctx, 50, 92, 26, 7, 0.16);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(50, 90);
  ctx.quadraticCurveTo(8, 74, 20, 34);
  ctx.quadraticCurveTo(50, 4, 80, 34);
  ctx.quadraticCurveTo(92, 74, 50, 90);
  ctx.closePath();
  fill(ctx, '#ffb3c7');
  ctx.save(); ctx.clip();
  ctx.strokeStyle = withAlpha('#c9748e', 0.8); ctx.lineWidth = 3;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(50, 88);
    ctx.quadraticCurveTo(50 + i * 15, 40, 50 + i * 12, 12);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(50, 90);
  ctx.quadraticCurveTo(8, 74, 20, 34);
  ctx.quadraticCurveTo(50, 4, 80, 34);
  ctx.quadraticCurveTo(92, 74, 50, 90);
  ctx.closePath();
  ink(ctx, 3);
  ctx.restore();
};

const block = (ctx) => {
  roundRectPath(ctx, 14, 22, 72, 66, 14);
  fill(ctx, '#7ec8ff');
  ctx.save(); roundRectPath(ctx, 14, 22, 72, 66, 14); ctx.clip(); ctx.restore();
  roundRectPath(ctx, 14, 22, 72, 66, 14); ink(ctx, 3.4);
};

const dot = (ctx, o = {}) => {
  ctx.beginPath();
  ctx.arc(50, 50, 38, 0, Math.PI * 2);
  ctx.fillStyle = o.color || '#6f7bff';
  ctx.fill();
  ink(ctx, 3);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.ellipse(38, 38, 14, 10, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();
};

// --------------------------------------------------------------- HUD & reward

const coin = (ctx) => {
  aura(ctx, 50, 50, 46, '#ffd34e', 0.4);
  ctx.beginPath(); ctx.arc(50, 50, 36, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(0, 14, 0, 86);
  g.addColorStop(0, '#ffe98a'); g.addColorStop(0.5, '#ffd34e'); g.addColorStop(1, '#e0a423');
  ctx.fillStyle = g; ctx.fill(); ink(ctx, 3.4);
  ctx.beginPath(); ctx.arc(50, 50, 25, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha('#a5761a', 0.6); ctx.lineWidth = 3; ctx.stroke();
  fiveStar(ctx, 50, 50, 15, '#fff3c4', null);
  ctx.save(); ctx.globalAlpha = 0.55;
  ctx.beginPath(); ctx.ellipse(36, 32, 12, 8, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
};

const heart = (ctx, o = {}) => {
  const empty = !!o.empty;
  heartPath(ctx, 50, 64, 84);
  if (empty) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fill();
    ink(ctx, 4.5, withAlpha(INK, 0.55));
  } else {
    const g = ctx.createLinearGradient(0, 10, 0, 90);
    g.addColorStop(0, '#ff96ad'); g.addColorStop(0.55, '#ff5d7e'); g.addColorStop(1, '#d63a5e');
    ctx.fillStyle = g; ctx.fill(); ink(ctx, 4);
    ctx.save(); ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.ellipse(36, 34, 11, 7, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
  }
};

const shield = (ctx) => {
  const p = () => {
    ctx.beginPath();
    ctx.moveTo(50, 8);
    ctx.lineTo(88, 24);
    ctx.quadraticCurveTo(88, 72, 50, 94);
    ctx.quadraticCurveTo(12, 72, 12, 24);
    ctx.closePath();
  };
  glossy(ctx, p, '#6fd3ff', 3.6);
  fiveStar(ctx, 50, 46, 20, '#fff8ec', withAlpha(INK, 0.7), 2);
};

const capsule = (ctx, o = {}) => {
  const color = o.color || '#ff9ec4';
  groundShadow(ctx, 50, 92, 30, 8, 0.18);
  ctx.save();
  ctx.beginPath(); ctx.arc(50, 50, 38, Math.PI, 0); ctx.closePath();
  const g = ctx.createLinearGradient(0, 12, 0, 50);
  g.addColorStop(0, lighten(color, 0.25)); g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.fill(); ink(ctx, 3.4);
  ctx.beginPath(); ctx.arc(50, 50, 38, 0, Math.PI); ctx.closePath();
  ctx.fillStyle = '#fff6e8'; ctx.fill(); ink(ctx, 3.4);
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(12, 50); ctx.lineTo(88, 50);
  ctx.lineWidth = 3.4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.save(); ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.ellipse(34, 30, 13, 8, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
};

/** The gacha machine on the world map. */
const gachaMachine = (ctx) => {
  groundShadow(ctx, 50, 94, 36, 9, 0.2);
  roundRectPath(ctx, 20, 46, 60, 48, 10);
  fill(ctx, '#ff7ab8'); ink(ctx, 3.4);
  ctx.beginPath(); ctx.arc(50, 34, 30, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha('#dff6ff', 0.9); ctx.fill(); ink(ctx, 3.4);
  const balls = [['#ffd34e', 40, 30], ['#7ee0ff', 58, 26], ['#a9ff8f', 50, 44], ['#ff9ec4', 36, 44], ['#c8a4ff', 62, 42]];
  for (const [col, x, y] of balls) {
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill(); ink(ctx, 2.2);
  }
  ctx.save(); ctx.globalAlpha = 0.45;
  ctx.beginPath(); ctx.ellipse(38, 20, 12, 8, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
  roundRectPath(ctx, 36, 60, 28, 20, 6);
  ctx.fillStyle = '#3d2447'; ctx.fill();
  ctx.beginPath(); ctx.arc(74, 62, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd34e'; ctx.fill(); ink(ctx, 2.4);
};

// ------------------------------------------------------------------ structures

/** The castle the player is defending. Cracks appear as hearts are lost. */
const castle = (ctx, o = {}) => {
  const dmg = o.damage || 0;
  const stone = '#e6e0f0', stoneDark = '#bdb2d4';
  groundShadow(ctx, 50, 96, 44, 10, 0.2);

  // Towers.
  for (const x of [18, 82]) {
    roundRectPath(ctx, x - 15, 26, 30, 68, 6);
    fill(ctx, stone); ink(ctx, 3.2);
    ctx.beginPath();
    ctx.moveTo(x - 18, 26); ctx.lineTo(x, 6); ctx.lineTo(x + 18, 26); ctx.closePath();
    ctx.fillStyle = '#ff6f91'; ctx.fill(); ink(ctx, 3);
  }
  // Keep.
  roundRectPath(ctx, 30, 40, 40, 54, 5);
  fill(ctx, lighten(stone, 0.05)); ink(ctx, 3.2);
  // Battlements.
  for (let i = 0; i < 4; i++) {
    roundRectPath(ctx, 30 + i * 11, 32, 8, 12, 2);
    ctx.fillStyle = stoneDark; ctx.fill(); ink(ctx, 2.4);
  }
  // Gate.
  ctx.beginPath();
  ctx.moveTo(41, 94); ctx.lineTo(41, 68);
  ctx.quadraticCurveTo(50, 56, 59, 68); ctx.lineTo(59, 94);
  ctx.closePath();
  ctx.fillStyle = '#7a5a3c'; ctx.fill(); ink(ctx, 3);
  ctx.strokeStyle = withAlpha('#4a3524', 0.7); ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(41 + i * 6, 62 + i); ctx.lineTo(41 + i * 6, 94); ctx.stroke();
  }
  if (dmg > 0) {
    ctx.strokeStyle = withAlpha(INK, 0.55); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    const cracks = [[[34, 46], [38, 56], [33, 62]], [[68, 50], [63, 58], [67, 66]], [[24, 40], [20, 50], [26, 58]]];
    for (let i = 0; i < Math.min(dmg, cracks.length); i++) {
      const c = cracks[i];
      ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]);
      for (const p of c.slice(1)) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    }
  }
  // Flag.
  ctx.beginPath(); ctx.moveTo(50, 32); ctx.lineTo(50, 8);
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(50, 9); ctx.lineTo(72, 15); ctx.lineTo(50, 21); ctx.closePath();
  ctx.fillStyle = '#ffd34e'; ctx.fill(); ink(ctx, 2.2);
};

/** Boss castle marker for stage 10 on the map. */
const bossCastle = (ctx) => {
  groundShadow(ctx, 50, 96, 42, 10, 0.24);
  for (const x of [20, 80]) {
    roundRectPath(ctx, x - 14, 30, 28, 64, 5);
    fill(ctx, '#6b5a86'); ink(ctx, 3.2);
    ctx.beginPath();
    ctx.moveTo(x - 17, 30); ctx.lineTo(x, 8); ctx.lineTo(x + 17, 30); ctx.closePath();
    ctx.fillStyle = '#3d2447'; ctx.fill(); ink(ctx, 3);
  }
  roundRectPath(ctx, 30, 44, 40, 50, 4);
  fill(ctx, '#7d6a9c'); ink(ctx, 3.2);
  ctx.beginPath();
  ctx.moveTo(41, 94); ctx.lineTo(41, 70);
  ctx.quadraticCurveTo(50, 58, 59, 70); ctx.lineTo(59, 94);
  ctx.closePath();
  ctx.fillStyle = '#2b1b38'; ctx.fill(); ink(ctx, 3);
  for (const [x, y] of [[46, 78], [55, 78]]) {
    ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6f4a'; ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(50, 36); ctx.lineTo(50, 10);
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(50, 11); ctx.lineTo(70, 17); ctx.lineTo(50, 23); ctx.closePath();
  ctx.fillStyle = '#ff6f4a'; ctx.fill(); ink(ctx, 2.2);
};

// -------------------------------------------------------------- scenery props

const tree = (ctx, o = {}) => {
  const c = o.color || '#5fb56a';
  groundShadow(ctx, 50, 94, 26, 7, 0.16);
  ctx.beginPath(); ctx.moveTo(50, 94); ctx.lineTo(50, 60);
  ctx.lineWidth = 13; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineWidth = 9; ctx.strokeStyle = '#8a5f3c'; ctx.stroke();
  for (const [x, y, r] of [[50, 34, 28], [30, 50, 20], [70, 50, 20]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = c; ctx.fill(); ink(ctx, 3);
  }
  ctx.save(); ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.arc(40, 26, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
};

const rock = (ctx, o = {}) => {
  const c = o.color || '#9aa8bd';
  groundShadow(ctx, 50, 92, 26, 7, 0.16);
  ctx.beginPath();
  ctx.moveTo(14, 90); ctx.quadraticCurveTo(10, 58, 36, 46);
  ctx.quadraticCurveTo(58, 34, 76, 52); ctx.quadraticCurveTo(94, 66, 86, 90);
  ctx.closePath();
  fill(ctx, c); ink(ctx, 3.2);
  ctx.save(); ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.ellipse(42, 58, 14, 8, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
};

const bush = (ctx, o = {}) => {
  const c = o.color || '#66c56e';
  groundShadow(ctx, 50, 90, 28, 7, 0.14);
  for (const [x, y, r] of [[30, 66, 20], [50, 56, 25], [70, 66, 20]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = c; ctx.fill(); ink(ctx, 3);
  }
};

/** Friendly signpost used on the map for locked stages. */
const lock = (ctx) => {
  roundRectPath(ctx, 24, 46, 52, 42, 10);
  fill(ctx, '#b6aec6'); ink(ctx, 3.4);
  ctx.beginPath();
  ctx.arc(50, 46, 17, Math.PI, 0);
  ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = '#8d84a3'; ctx.stroke();
  ctx.beginPath(); ctx.arc(50, 64, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#3d2447'; ctx.fill();
};

/** Projectile the hero fires on a correct answer. */
const bolt = (ctx, o = {}) => {
  const c = o.color || '#9ef2ff';
  aura(ctx, 50, 50, 48, c, 0.85);
  ctx.beginPath(); ctx.arc(50, 50, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.beginPath(); ctx.arc(50, 50, 17, 0, Math.PI * 2);
  ctx.fillStyle = c; ctx.fill();
};


// ---------------------------------------------------------------- UI icons
// Drawn rather than emoji: emoji coverage varies by device and font, and a
// five-year-old cannot recover from a control that renders as a blank box.

const iconPause = (ctx) => {
  roundRectPath(ctx, 26, 22, 16, 56, 7);
  fill(ctx, INK);
  roundRectPath(ctx, 58, 22, 16, 56, 7);
  fill(ctx, INK);
};

const iconShop = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(20, 40);
  ctx.lineTo(80, 40);
  ctx.lineTo(71, 82);
  ctx.quadraticCurveTo(70, 88, 63, 88);
  ctx.lineTo(37, 88);
  ctx.quadraticCurveTo(30, 88, 29, 82);
  ctx.closePath();
  flat(ctx, '#ffd34e');
  ctx.beginPath();
  ctx.moveTo(36, 40);
  ctx.quadraticCurveTo(38, 14, 50, 14);
  ctx.quadraticCurveTo(62, 14, 64, 40);
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.stroke();
};

const speakerBody = (ctx, color) => {
  ctx.beginPath();
  ctx.moveTo(20, 40);
  ctx.lineTo(34, 40);
  ctx.lineTo(52, 22);
  ctx.lineTo(52, 78);
  ctx.lineTo(34, 60);
  ctx.lineTo(20, 60);
  ctx.closePath();
  flat(ctx, color);
};

const iconSoundOn = (ctx) => {
  speakerBody(ctx, '#ffd34e');
  for (const [r, a] of [[12, 0.9], [22, 0.6]]) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(58, 50, r, -0.9, 0.9);
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
};

const iconSoundOff = (ctx) => {
  speakerBody(ctx, '#c9c2d0');
  ctx.beginPath();
  ctx.moveTo(62, 36);
  ctx.lineTo(84, 62);
  ctx.moveTo(84, 36);
  ctx.lineTo(62, 62);
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.stroke();
};

const iconBack = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(62, 22);
  ctx.lineTo(34, 50);
  ctx.lineTo(62, 78);
  ctx.lineWidth = 11;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
};

const iconPlay = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(34, 22);
  ctx.lineTo(78, 50);
  ctx.lineTo(34, 78);
  ctx.closePath();
  fill(ctx, INK);
};

const iconArrow = (ctx, o = {}) => {
  const dir = o.dir === 'left' ? -1 : 1;
  ctx.save();
  ctx.translate(50, 50);
  ctx.scale(dir, 1);
  ctx.beginPath();
  ctx.moveTo(-14, -26);
  ctx.lineTo(14, 0);
  ctx.lineTo(-14, 26);
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
};

const iconAlbum = (ctx) => {
  roundRectPath(ctx, 16, 20, 68, 62, 10);
  flat(ctx, '#ffd9e6');
  for (const [x, y] of [[34, 40], [66, 40], [34, 64], [66, 64]]) {
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    flat(ctx, '#ffffff');
  }
};

const iconRetry = (ctx) => {
  ctx.beginPath();
  ctx.arc(50, 52, 26, 0.5, Math.PI * 1.75);
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(72, 20);
  ctx.lineTo(76, 44);
  ctx.lineTo(52, 40);
  ctx.closePath();
  fill(ctx, INK);
};

const iconMap = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(16, 30);
  ctx.lineTo(38, 20);
  ctx.lineTo(62, 32);
  ctx.lineTo(84, 22);
  ctx.lineTo(84, 74);
  ctx.lineTo(62, 84);
  ctx.lineTo(38, 72);
  ctx.lineTo(16, 82);
  ctx.closePath();
  flat(ctx, '#a9dfae');
  ctx.beginPath();
  ctx.moveTo(38, 20);
  ctx.lineTo(38, 72);
  ctx.moveTo(62, 32);
  ctx.lineTo(62, 84);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
};

/** A single spendable token. Small numbers, unlike coins. */
const token = (ctx, o = {}) => {
  const spent = !!o.spent;
  ctx.beginPath();
  ctx.arc(50, 50, 38, 0, Math.PI * 2);
  flat(ctx, spent ? '#ded7e4' : '#c9a4f0', 3);
  ctx.beginPath();
  ctx.arc(50, 50, 26, 0, Math.PI * 2);
  flat(ctx, spent ? '#ece7f0' : '#e6d2ff', 3);
  fiveStar(ctx, 50, 50, 15, spent ? '#c6bccd' : '#fff3c4', null);
};


/**
 * Direction chips for comparison questions. "Which has MORE?" and "Which has
 * FEWER?" are the same shape to a pre-reader but have opposite answers, so the
 * direction has to be carried by something other than the word.
 */
const arrowChip = (ctx, up, color) => {
  ctx.beginPath();
  ctx.arc(50, 50, 42, 0, Math.PI * 2);
  flat(ctx, color, 3.5);
  // Head and tail stated outright: an inverted arrow is worse than no arrow,
  // because a child will trust it and get the opposite answer.
  const headY = up ? 26 : 74;
  const tailY = up ? 74 : 26;
  const barbY = up ? headY + 20 : headY - 20;
  ctx.beginPath();
  ctx.moveTo(50, tailY);
  ctx.lineTo(50, headY);
  ctx.moveTo(50, headY);
  ctx.lineTo(30, barbY);
  ctx.moveTo(50, headY);
  ctx.lineTo(70, barbY);
  ctx.lineWidth = 11;
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
};

const iconMore = (ctx) => arrowChip(ctx, true, '#57cc7a');
const iconFewer = (ctx) => arrowChip(ctx, false, '#6fa8e8');

export const PROPS = {
  apple, star, duck, shell, block, dot,
  coin, heart, shield, capsule, gachaMachine,
  castle, bossCastle, tree, rock, bush, lock, bolt, token,
  iconPause, iconShop, iconSoundOn, iconSoundOff, iconBack, iconPlay,
  iconArrow, iconAlbum, iconRetry, iconMap, iconMore, iconFewer,
};

/** Countable sprites available to the early-grade question visuals. */
export const COUNTABLES = ['apple', 'star', 'duck', 'shell', 'block'];
