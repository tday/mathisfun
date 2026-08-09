// World scenery, castle, props, question countables, item icons.
// Same chibi glossy language as the units.

import { INK, shade, withAlpha, mix } from './palettes.js';
import * as T from './toybox.js';

// ---------- full-canvas background (bake once per stage/resize) ----------
export function drawBackground(ctx, w, h, pal, r) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  // celestial
  if (pal.celestial === 'sun') {
    const sx = w * 0.82, sy = h * 0.16, sr = Math.min(w, h) * 0.07;
    ctx.fillStyle = withAlpha('#fff3b8', 0.6);
    ctx.beginPath(); ctx.arc(sx, sy, sr * 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe27a'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = withAlpha('#e8a838', 0.7); ctx.stroke();
  } else if (pal.celestial === 'moon') {
    const sx = w * 0.82, sy = h * 0.14, sr = Math.min(w, h) * 0.055;
    ctx.fillStyle = withAlpha('#fff8dc', 0.9);
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.skyTop;
    ctx.beginPath(); ctx.arc(sx - sr * 0.45, sy - sr * 0.2, sr * 0.85, 0, Math.PI * 2); ctx.fill();
  }
  if (pal.celestial === 'stars' || pal.celestial === 'moon') {
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h * 0.55, s = 0.6 + r() * 1.6;
      ctx.fillStyle = withAlpha('#fff8dc', 0.4 + r() * 0.6);
      T.starPath(ctx, x, y, s * 2, s * 0.9, 4);
      ctx.fill();
    }
  }
  // clouds (day worlds)
  if (pal.celestial === 'sun') {
    ctx.fillStyle = withAlpha('#ffffff', 0.85);
    for (let i = 0; i < 4; i++) {
      const cx = r() * w, cy = h * (0.08 + r() * 0.2), cs = Math.min(w, h) * (0.03 + r() * 0.03);
      for (const [dx, dy, m] of [[0, 0, 1.5], [-1.2, 0.35, 1.05], [1.2, 0.4, 1.1], [2.2, 0.15, 0.8]]) {
        ctx.beginPath(); ctx.arc(cx + dx * cs, cy + dy * cs, cs * m, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // rolling hills
  const horizon = h * 0.55;
  for (let layer = 0; layer < 2; layer++) {
    const col = pal.hills[layer];
    const base = horizon + layer * h * 0.08;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, base);
    const bumps = 3 + layer;
    for (let i = 0; i <= bumps; i++) {
      const x0 = (w * i) / bumps;
      const x1 = (w * (i + 0.5)) / bumps;
      ctx.quadraticCurveTo(x1, base - h * (0.05 + 0.04 * ((i + layer) % 2)), x0 + w / bumps, base);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  // ground
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
  ctx.fillStyle = withAlpha(shade(pal.ground, -0.2), 0.35);
  for (let i = 0; i < 30; i++) {
    const x = r() * w, y = h * (0.7 + r() * 0.28);
    ctx.beginPath(); ctx.ellipse(x, y, 2 + r() * 3, 1 + r() * 1.5, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- the enemy path ribbon ----------------------------------------
export function drawPathRibbon(ctx, path, toPx, width, pal) {
  const pts = path.points.map((p) => toPx(p.x, p.y));
  const stroke = (lw, color) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineWidth = lw; ctx.strokeStyle = color;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
  };
  stroke(width * 1.25, pal.pathEdge);
  stroke(width, pal.path);
  // stepping dots
  ctx.fillStyle = withAlpha(pal.pathEdge, 0.55);
  for (let t = 0.03; t < 0.99; t += 0.045) {
    const p = path.at(t);
    const px = toPx(p.x, p.y);
    ctx.beginPath(); ctx.ellipse(px.x, px.y, width * 0.08, width * 0.055, p.angle, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- castle (the thing we protect) — 120x120 box, feet y~112 ------
export function drawCastle(ctx, pal, damaged = 0) {
  const stone = mix('#f0e6f7', pal.skyBot, 0.25);
  const roof = pal.accent;
  const tower = (x, tw, th) => {
    ctx.fillStyle = T.vinyl(ctx, x, 100 - th / 2, tw, stone);
    ctx.beginPath();
    ctx.moveTo(x - tw / 2, 112); ctx.lineTo(x - tw / 2, 112 - th);
    ctx.lineTo(x + tw / 2, 112 - th); ctx.lineTo(x + tw / 2, 112);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    // battlement
    ctx.fillStyle = stone;
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(x + i * tw * 0.32 - tw * 0.1, 112 - th - 7, tw * 0.2, 8);
      ctx.strokeRect(x + i * tw * 0.32 - tw * 0.1, 112 - th - 7, tw * 0.2, 8);
    }
    // cone roof
    ctx.beginPath();
    ctx.moveTo(x - tw * 0.62, 112 - th - 6);
    ctx.lineTo(x, 112 - th - 30 - tw * 0.2);
    ctx.lineTo(x + tw * 0.62, 112 - th - 6);
    ctx.closePath();
    T.outlined(ctx, roof, 3.6);
  };
  tower(28, 26, 54);
  tower(92, 26, 54);
  // keep
  ctx.fillStyle = T.vinyl(ctx, 60, 75, 40, stone);
  ctx.beginPath();
  ctx.moveTo(38, 112); ctx.lineTo(38, 52);
  ctx.quadraticCurveTo(60, 42, 82, 52);
  ctx.lineTo(82, 112); ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  // gate
  ctx.beginPath();
  ctx.moveTo(48, 112); ctx.lineTo(48, 86);
  ctx.quadraticCurveTo(60, 74, 72, 86); ctx.lineTo(72, 112);
  ctx.closePath();
  T.outlined(ctx, T.MOUTH_DARK, 3.6);
  ctx.strokeStyle = withAlpha('#f0e6f7', 0.5); ctx.lineWidth = 2;
  for (let y = 82; y < 110; y += 8) { ctx.beginPath(); ctx.moveTo(49, y + 6); ctx.lineTo(71, y); ctx.stroke(); }
  // cute face on the keep (the castle is a friend!)
  T.glossyEyes(ctx, 60, 62, 4.5, 15, { mood: 0 });
  T.blush(ctx, 60, 67, 26, 2.5);
  // flag
  ctx.beginPath(); ctx.moveTo(60, 44); ctx.lineTo(60, 22);
  ctx.lineWidth = 3.4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(60, 22); ctx.quadraticCurveTo(74, 24, 78, 28); ctx.quadraticCurveTo(70, 30, 60, 33);
  ctx.closePath();
  T.outlined(ctx, roof, 3);
  T.starPath(ctx, 69, 27.5, 3.4); ctx.fillStyle = '#fff'; ctx.fill();
  // damage cracks
  if (damaged > 0) {
    ctx.lineWidth = 2.6; ctx.strokeStyle = withAlpha(INK, 0.65);
    for (let i = 0; i < damaged; i++) {
      const x = 44 + i * 14, y = 96 - (i % 2) * 12;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 5); ctx.lineTo(x + 1, y + 9); ctx.lineTo(x + 6, y + 14);
      ctx.stroke();
    }
  }
}

// ---------- scatter props — 60x60 box, feet y~56 --------------------------
export function drawProp(ctx, kind, pal) {
  const dk = pal.deco;
  switch (kind) {
    case 'flower': {
      ctx.beginPath(); ctx.moveTo(30, 56); ctx.quadraticCurveTo(28, 42, 30, 34);
      ctx.lineWidth = 3.4; ctx.strokeStyle = '#54a848'; ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath(); ctx.ellipse(30 + Math.cos(a) * 8, 30 + Math.sin(a) * 8, 6, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = dk[0]; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(30, 30, 6, 0, Math.PI * 2);
      T.outlined(ctx, '#ffe27a', 2.4);
      break;
    }
    case 'bush':
      for (const [x, y, r] of [[20, 48, 12], [40, 48, 12], [30, 40, 13]]) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        T.outlined(ctx, shade(pal.ground, -0.08), 3);
      }
      break;
    case 'shell':
      ctx.beginPath(); ctx.moveTo(18, 50); ctx.quadraticCurveTo(30, 20, 42, 50); ctx.closePath();
      T.outlined(ctx, dk[0], 3);
      ctx.lineWidth = 2; ctx.strokeStyle = withAlpha(INK, 0.5);
      for (const t of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(30 + t * 10, 50); ctx.lineTo(30 + t * 4, 30); ctx.stroke(); }
      break;
    case 'palm': {
      ctx.beginPath(); ctx.moveTo(28, 56); ctx.quadraticCurveTo(32, 30, 30, 18);
      ctx.lineWidth = 5; ctx.strokeStyle = '#b8905e'; ctx.lineCap = 'round'; ctx.stroke();
      ctx.lineWidth = 7.6; ctx.strokeStyle = INK; ctx.globalCompositeOperation = 'destination-over'; ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      for (const a of [-2.4, -1.6, -0.8, 0.2, 1]) {
        ctx.beginPath(); ctx.moveTo(30, 18);
        ctx.quadraticCurveTo(30 + Math.cos(a) * 16, 14 + Math.sin(a) * 10, 30 + Math.cos(a) * 22, 20 + Math.sin(a) * 14);
        ctx.lineWidth = 4.6; ctx.strokeStyle = '#54a848'; ctx.stroke();
      }
      break;
    }
    case 'pine':
      for (let i = 0; i < 3; i++) {
        const yw = 18 - i * 3, y = 52 - i * 12;
        ctx.beginPath(); ctx.moveTo(30 - yw, y); ctx.lineTo(30, y - 16); ctx.lineTo(30 + yw, y); ctx.closePath();
        T.outlined(ctx, mix('#54a848', pal.skyBot, 0.12), 3);
      }
      break;
    case 'mushroom':
      ctx.fillStyle = '#fff2dc';
      ctx.fillRect(26, 40, 8, 16);
      ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.strokeRect(26, 40, 8, 16);
      ctx.beginPath(); ctx.moveTo(14, 42); ctx.quadraticCurveTo(30, 18, 46, 42); ctx.closePath();
      T.outlined(ctx, dk[0], 3);
      ctx.fillStyle = '#fff2dc';
      for (const [x, y] of [[24, 34], [36, 32]]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 'reed':
      for (const [x, tilt] of [[24, -0.1], [30, 0.05], [36, 0.15]]) {
        ctx.beginPath(); ctx.moveTo(x, 56); ctx.quadraticCurveTo(x + tilt * 30, 36, x + tilt * 40, 22);
        ctx.lineWidth = 3.2; ctx.strokeStyle = '#6b8a5e'; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x + tilt * 40, 20, 3.4, 7, tilt, 0, Math.PI * 2);
        T.outlined(ctx, '#8a6b4a', 2.4);
      }
      break;
    case 'lily':
      ctx.beginPath(); ctx.ellipse(30, 48, 16, 7, 0, 0.2, Math.PI * 1.9);
      T.outlined(ctx, '#54a848', 3);
      ctx.beginPath(); ctx.arc(30, 40, 6, 0, Math.PI * 2);
      T.outlined(ctx, dk[1] || '#ffa1c4', 2.6);
      break;
    case 'cloudpuff':
      ctx.fillStyle = withAlpha('#ffffff', 0.95);
      for (const [dx, dy, r] of [[-10, 4, 9], [0, 0, 12], [11, 4, 9]]) {
        ctx.beginPath(); ctx.arc(30 + dx, 42 + dy, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineWidth = 3; ctx.strokeStyle = withAlpha(INK, 0.35);
      ctx.beginPath(); ctx.arc(30, 42, 12, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'rainbow':
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(30, 54, 22 - i * 6, Math.PI, 0);
        ctx.lineWidth = 5; ctx.strokeStyle = [dk[1] || '#ffd76e', '#8fd977', '#8fc7ff'][i]; ctx.stroke();
      }
      break;
    case 'snowlump':
      ctx.beginPath(); ctx.ellipse(30, 50, 18, 9, 0, 0, Math.PI * 2);
      T.outlined(ctx, '#ffffff', 3);
      break;
    case 'cactus':
      ctx.beginPath();
      ctx.moveTo(26, 56); ctx.lineTo(26, 28); ctx.quadraticCurveTo(26, 20, 32, 20);
      ctx.quadraticCurveTo(38, 20, 38, 28); ctx.lineTo(38, 56); ctx.closePath();
      T.outlined(ctx, '#6dc08b', 3.2);
      ctx.beginPath(); ctx.moveTo(38, 36); ctx.quadraticCurveTo(48, 36, 48, 28);
      ctx.lineWidth = 6; ctx.strokeStyle = '#6dc08b'; ctx.lineCap = 'round'; ctx.stroke();
      break;
    case 'rock':
      ctx.beginPath();
      ctx.moveTo(14, 54); ctx.quadraticCurveTo(16, 36, 30, 34);
      ctx.quadraticCurveTo(46, 34, 46, 54); ctx.closePath();
      T.outlined(ctx, mix('#9a97a8', pal.ground, 0.3), 3.2);
      break;
    case 'crystal':
      for (const [x, hgt, w2] of [[24, 26, 8], [34, 34, 9], [42, 20, 6]]) {
        ctx.beginPath();
        ctx.moveTo(x - w2 / 2, 56); ctx.lineTo(x - w2 / 2, 56 - hgt * 0.6); ctx.lineTo(x, 56 - hgt);
        ctx.lineTo(x + w2 / 2, 56 - hgt * 0.6); ctx.lineTo(x + w2 / 2, 56);
        ctx.closePath();
        ctx.fillStyle = withAlpha(dk[0], 0.85); ctx.fill();
        ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, 56 - hgt); ctx.lineTo(x, 56);
        ctx.lineWidth = 1.6; ctx.strokeStyle = withAlpha('#ffffff', 0.6); ctx.stroke();
      }
      break;
    case 'ember':
      ctx.fillStyle = withAlpha(dk[0], 0.8);
      for (const [x, y, r] of [[24, 46, 3], [34, 38, 2.4], [40, 48, 2]]) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.ellipse(30, 52, 12, 5, 0, 0, Math.PI * 2);
      T.outlined(ctx, shade(pal.ground, -0.15), 2.6);
      break;
    case 'star':
      T.starPath(ctx, 30, 40, 10);
      T.outlined(ctx, dk[0], 2.8);
      break;
    case 'deadtree':
      ctx.lineWidth = 4.4; ctx.strokeStyle = INK; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(30, 56); ctx.lineTo(30, 30);
      ctx.moveTo(30, 40); ctx.lineTo(20, 30); ctx.moveTo(30, 34); ctx.lineTo(40, 24);
      ctx.moveTo(20, 30); ctx.lineTo(18, 24); ctx.moveTo(40, 24); ctx.lineTo(44, 20);
      ctx.stroke();
      break;
  }
}

// ---------- countable objects for questions — 40x40 box -------------------
export const COUNTABLES = {
  apple(ctx) {
    ctx.beginPath(); ctx.arc(20, 23, 12, 0, Math.PI * 2);
    ctx.fillStyle = T.vinyl(ctx, 20, 21, 13, '#ff8a80'); ctx.fill();
    ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 11); ctx.quadraticCurveTo(21, 6, 25, 5);
    ctx.lineWidth = 2.6; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(26, 8, 4, 2.4, -0.5, 0, Math.PI * 2);
    T.outlined(ctx, '#8fd977', 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(15, 18, 3, 0, Math.PI * 2); ctx.fill();
  },
  duck(ctx) {
    ctx.beginPath(); ctx.ellipse(19, 26, 12, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = T.vinyl(ctx, 18, 24, 12, '#ffd76e'); ctx.fill();
    ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(27, 14, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd76e'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(33, 14); ctx.quadraticCurveTo(39, 15, 34, 18); ctx.closePath();
    T.outlined(ctx, '#ff9d50', 2);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(28, 12, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(28.6, 11.4, 0.7, 0, Math.PI * 2); ctx.fill();
  },
  star(ctx) {
    T.starPath(ctx, 20, 21, 13);
    ctx.fillStyle = T.vinyl(ctx, 18, 18, 13, '#ffd150'); ctx.fill();
    ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(16, 16, 2.4, 0, Math.PI * 2); ctx.fill();
  },
  shell(ctx) {
    ctx.beginPath(); ctx.moveTo(8, 28); ctx.quadraticCurveTo(20, 4, 32, 28); ctx.closePath();
    ctx.fillStyle = T.vinyl(ctx, 20, 22, 13, '#ffa1c4'); ctx.fill();
    ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineWidth = 1.8; ctx.strokeStyle = withAlpha(INK, 0.45);
    for (const t of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(20 + t * 16, 28); ctx.lineTo(20 + t * 5, 12); ctx.stroke(); }
  },
  fish(ctx) {
    ctx.beginPath(); ctx.ellipse(18, 20, 12, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = T.vinyl(ctx, 16, 18, 12, '#7fd9e8'); ctx.fill();
    ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(29, 20); ctx.lineTo(36, 14); ctx.lineTo(36, 26); ctx.closePath();
    T.outlined(ctx, '#7fd9e8', 2.4);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(13, 18, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(13.6, 17.4, 0.7, 0, Math.PI * 2); ctx.fill();
  },
  cookie(ctx) {
    ctx.beginPath(); ctx.arc(20, 20, 13, 0, Math.PI * 2);
    ctx.fillStyle = T.vinyl(ctx, 18, 18, 14, '#e8b06b'); ctx.fill();
    ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#6b4a38';
    for (const [x, y] of [[14, 15], [24, 13], [26, 24], [16, 26], [21, 20]]) {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
  },
  balloon(ctx) {
    ctx.beginPath(); ctx.moveTo(20, 30); ctx.quadraticCurveTo(21, 34, 19, 37);
    ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(20, 17, 11, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = T.vinyl(ctx, 18, 14, 13, '#c5a3ff'); ctx.fill();
    ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(17, 30); ctx.lineTo(23, 30); ctx.lineTo(20, 33); ctx.closePath();
    ctx.fillStyle = '#c5a3ff'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(15, 11, 3, 0, Math.PI * 2); ctx.fill();
  },
  bug(ctx) {
    ctx.beginPath(); ctx.ellipse(20, 22, 12, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = T.vinyl(ctx, 18, 20, 12, '#ff6f9c'); ctx.fill();
    ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 12); ctx.lineTo(20, 32);
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = INK;
    for (const [x, y] of [[14, 18], [26, 19], [16, 27], [24, 26]]) {
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(20, 10, 4.5, 0, Math.PI * 2); ctx.fill();
  },
};

// ---------- item icons (also used as DOM images) — 40x40 ------------------
export function drawCoin(ctx) {
  ctx.beginPath(); ctx.arc(20, 20, 14, 0, Math.PI * 2);
  ctx.fillStyle = T.vinyl(ctx, 18, 17, 15, '#ffcf4d'); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.arc(20, 20, 10, 0, Math.PI * 2);
  ctx.lineWidth = 1.8; ctx.strokeStyle = withAlpha('#b8860b', 0.6); ctx.stroke();
  T.starPath(ctx, 20, 20, 7);
  ctx.fillStyle = '#b8860b'; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath(); ctx.arc(14, 13, 2.6, 0, Math.PI * 2); ctx.fill();
}
export function drawHeart(ctx, empty = false) {
  T.heartPath(ctx, 20, 21, 26);
  if (empty) {
    ctx.fillStyle = 'rgba(58,37,71,0.15)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = withAlpha(INK, 0.5); ctx.stroke();
  } else {
    ctx.fillStyle = T.vinyl(ctx, 17, 15, 15, '#ff6f9c'); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(14, 14, 2.8, 0, Math.PI * 2); ctx.fill();
  }
}
export function drawShield(ctx, empty = false) {
  ctx.beginPath();
  ctx.moveTo(20, 4); ctx.lineTo(33, 9); ctx.quadraticCurveTo(33, 26, 20, 36);
  ctx.quadraticCurveTo(7, 26, 7, 9); ctx.closePath();
  if (empty) {
    ctx.fillStyle = 'rgba(58,37,71,0.15)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = withAlpha(INK, 0.5); ctx.stroke();
  } else {
    ctx.fillStyle = T.vinyl(ctx, 17, 14, 16, '#5ab8ff'); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    T.starPath(ctx, 20, 18, 6.5);
    ctx.fillStyle = '#fff'; ctx.fill();
  }
}
export function drawStarIcon(ctx, filled = true) {
  T.starPath(ctx, 20, 21, 15);
  ctx.fillStyle = filled ? T.vinyl(ctx, 17, 17, 15, '#ffd150') : 'rgba(58,37,71,0.15)';
  ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = filled ? INK : withAlpha(INK, 0.45);
  ctx.lineJoin = 'round'; ctx.stroke();
  if (filled) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(15, 15, 2.4, 0, Math.PI * 2); ctx.fill();
  }
}
export function drawCapsule(ctx, topColor = '#ff6f9c', wobble = 0) {
  ctx.save();
  ctx.translate(20, 22); ctx.rotate(wobble); ctx.translate(-20, -22);
  ctx.beginPath(); ctx.arc(20, 22, 14, 0, Math.PI, false); ctx.closePath();
  ctx.fillStyle = '#f4f0ff'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.arc(20, 22, 14, Math.PI, 0, false); ctx.closePath();
  ctx.fillStyle = T.vinyl(ctx, 17, 15, 15, topColor); ctx.fill();
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, 22); ctx.lineTo(34, 22);
  ctx.lineWidth = 2.4; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.arc(14, 13, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
export function drawBolt(ctx) {
  // hero projectile: glowing star
  ctx.fillStyle = withAlpha('#ffe9a0', 0.55);
  ctx.beginPath(); ctx.arc(20, 20, 15, 0, Math.PI * 2); ctx.fill();
  T.starPath(ctx, 20, 20, 11);
  ctx.fillStyle = '#ffd150'; ctx.fill();
  ctx.lineWidth = 2.6; ctx.strokeStyle = '#e8a838'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(17, 16, 2.6, 0, Math.PI * 2); ctx.fill();
}
