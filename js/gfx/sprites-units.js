// Chibi vinyl-toy monsters + hero. Every function draws into a 100x100 box,
// figure centered x=50, feet ~y=94. Cute-but-scary: big glossy eyes, toothy grins.

import { INK, shade, withAlpha, skin, HERO_TIER } from './palettes.js';
import * as T from './toybox.js';

// ---------- monster archetypes -------------------------------------------

function drawBlob(ctx, k, o) {
  T.blob(ctx, 50, 62, 66, 62, k.body, 0.1);
  // little jelly drip crown
  ctx.beginPath();
  ctx.moveTo(36, 34); ctx.quadraticCurveTo(40, 20, 47, 31);
  ctx.quadraticCurveTo(50, 14, 57, 29); ctx.quadraticCurveTo(63, 20, 63, 33);
  T.outlined(ctx, shade(k.body, 0.2), 3.4);
  T.glossyEyes(ctx, 50, 52, 7.5, 26, { mood: o.mood, closed: o.blink });
  T.toothyGrin(ctx, 50, 72, 34, 12, { teeth: 6 });
  T.blush(ctx, 50, 62, 52, 4.5, k.blush);
  T.sheen(ctx, 50, 58, 66, 62);
}

function drawSnail(ctx, k, o) {
  // shell
  ctx.beginPath(); ctx.arc(66, 52, 24, 0, Math.PI * 2);
  ctx.fillStyle = T.vinyl(ctx, 66, 48, 26, k.accent); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 4.2; a += 0.2) {
    const r = 2.5 + a * 4.4;
    const x = 66 + Math.cos(a - 1.2) * r, y = 52 + Math.sin(a - 1.2) * r;
    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.lineWidth = 3; ctx.strokeStyle = shade(k.accent, -0.3); ctx.lineCap = 'round'; ctx.stroke();
  // body
  T.blob(ctx, 36, 74, 46, 38, k.body, 0.15);
  // eye stalks
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(32 + s * 7, 60);
    ctx.quadraticCurveTo(30 + s * 10, 44, 30 + s * 12, 40);
    ctx.lineWidth = 5.5; ctx.strokeStyle = k.body; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = 8.5; ctx.strokeStyle = INK; ctx.globalCompositeOperation = 'destination-over'; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  T.glossyEyes(ctx, 30, 39, 6.5, 23, { mood: 2, closed: o.blink });
  T.smile(ctx, 34, 76, 13);
  T.fangs(ctx, 34, 78, 10, 5);
  T.blush(ctx, 34, 80, 34, 3.5, k.blush);
  T.sheen(ctx, 36, 70, 46, 38);
}

function drawBat(ctx, k, o) {
  // wings
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(50 + s * 22, 56);
    ctx.quadraticCurveTo(50 + s * 46, 40, 50 + s * 44, 62);
    ctx.quadraticCurveTo(50 + s * 38, 60, 50 + s * 34, 66);
    ctx.quadraticCurveTo(50 + s * 30, 62, 50 + s * 24, 68);
    ctx.closePath();
    T.outlined(ctx, k.dark, 3.4);
  }
  T.pointyEars(ctx, 50, 26, 34, 15, k.body, shade(k.body, 0.35));
  T.blob(ctx, 50, 58, 54, 52, k.body, 0);
  T.glossyEyes(ctx, 50, 50, 7.5, 24, { mood: o.mood, closed: o.blink });
  T.toothyGrin(ctx, 50, 68, 26, 10, { teeth: 5 });
  // dangly feet
  T.stubFeet(ctx, 50, 86, 16, 5, k.dark);
  T.sheen(ctx, 50, 54, 54, 52);
}

function drawShroom(ctx, k, o) {
  // stem face
  T.blob(ctx, 50, 70, 46, 42, shade(k.body, 0.5), 0.1);
  // cap
  ctx.beginPath();
  ctx.moveTo(16, 48);
  ctx.quadraticCurveTo(20, 16, 50, 15);
  ctx.quadraticCurveTo(80, 16, 84, 48);
  ctx.quadraticCurveTo(50, 58, 16, 48);
  ctx.closePath();
  ctx.fillStyle = T.vinyl(ctx, 50, 32, 36, k.body); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  // cap spots
  ctx.fillStyle = shade(k.body, 0.5);
  for (const [x, y, r] of [[36, 30, 5.5], [58, 24, 4], [68, 38, 4.5]]) {
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  }
  T.glossyEyes(ctx, 50, 62, 6.5, 22, { mood: 1, closed: o.blink });
  T.smile(ctx, 50, 74, 12);
  T.fangs(ctx, 50, 75, 12, 5);
  T.stubFeet(ctx, 50, 92, 22, 6.5, shade(k.body, 0.5));
  T.sheen(ctx, 50, 30, 60, 34);
}

function drawSpider(ctx, k, o) {
  // legs
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const y0 = 58 + i * 7;
      ctx.moveTo(50 + s * 20, y0);
      ctx.quadraticCurveTo(50 + s * (38 + i * 3), y0 - 8, 50 + s * (42 + i * 2), y0 + 12);
      ctx.lineWidth = 4.6; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    }
  }
  T.blob(ctx, 50, 60, 56, 50, k.body, 0.05);
  // fuzzy tuft
  for (let i = 0; i < 5; i++) {
    const x = 36 + i * 7;
    ctx.beginPath(); ctx.moveTo(x, 38); ctx.quadraticCurveTo(x + 3, 30 - (i % 2) * 4, x + 6, 37);
    ctx.lineWidth = 3.2; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  }
  // 4 glossy eyes: 2 big + 2 small
  T.glossyEyes(ctx, 50, 54, 7, 22, { mood: o.mood, closed: o.blink });
  T.glossyEyes(ctx, 50, 44, 3.2, 40, { mood: 0, closed: o.blink });
  T.toothyGrin(ctx, 50, 68, 24, 9, { teeth: 5 });
  T.blush(ctx, 50, 58, 46, 4, k.blush);
  T.sheen(ctx, 50, 54, 56, 50);
}

function drawGhost(ctx, k, o) {
  ctx.beginPath();
  ctx.moveTo(24, 88);
  ctx.lineTo(24, 52);
  ctx.quadraticCurveTo(26, 22, 50, 22);
  ctx.quadraticCurveTo(74, 22, 76, 52);
  ctx.lineTo(76, 88);
  // wavy hem
  ctx.quadraticCurveTo(69, 78, 63, 88);
  ctx.quadraticCurveTo(56, 78, 50, 88);
  ctx.quadraticCurveTo(43, 78, 37, 88);
  ctx.quadraticCurveTo(30, 78, 24, 88);
  ctx.closePath();
  ctx.fillStyle = T.vinyl(ctx, 50, 48, 34, k.body); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  // little arms up (spooky!)
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(50 + s * 30, 56, 7, 5, s * 0.7, 0, Math.PI * 2);
    T.outlined(ctx, k.body, 3.2);
  }
  T.glossyEyes(ctx, 50, 46, 8, 26, { mood: o.mood, closed: o.blink });
  T.toothyGrin(ctx, 50, 64, 28, 11, { teeth: 5, tongue: true });
  T.sheen(ctx, 50, 44, 52, 60);
}

function drawImp(ctx, k, o) {
  // tail
  ctx.beginPath();
  ctx.moveTo(66, 78);
  ctx.quadraticCurveTo(88, 74, 84, 56);
  ctx.lineWidth = 4.5; ctx.strokeStyle = k.body; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineWidth = 7.5; ctx.strokeStyle = INK; ctx.globalCompositeOperation = 'destination-over'; ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  T.starPath(ctx, 85, 53, 5, 2.5, 3, -Math.PI / 2);
  T.outlined(ctx, k.body, 2.6);
  T.horns(ctx, 50, 26, 40, 14, shade(k.body, 0.4));
  T.blob(ctx, 50, 60, 58, 56, k.body, 0.05);
  T.glossyEyes(ctx, 50, 50, 7.5, 25, { mood: 1, closed: o.blink, iris: o.elite ? '#ffd150' : null });
  T.toothyGrin(ctx, 50, 68, 32, 12, { teeth: 7 });
  T.stubFeet(ctx, 50, 91, 24, 7, shade(k.body, -0.15));
  T.blush(ctx, 50, 60, 50, 4, k.blush);
  T.sheen(ctx, 50, 54, 58, 56);
}

function drawGolem(ctx, k, o) {
  // boulder body: chunky rounded square
  ctx.beginPath();
  ctx.moveTo(22, 84);
  ctx.lineTo(18, 46); ctx.quadraticCurveTo(18, 24, 42, 22);
  ctx.lineTo(62, 22); ctx.quadraticCurveTo(82, 26, 82, 48);
  ctx.lineTo(78, 84);
  ctx.quadraticCurveTo(50, 92, 22, 84);
  ctx.closePath();
  ctx.fillStyle = T.vinyl(ctx, 50, 50, 38, k.body); ctx.fill();
  ctx.lineWidth = 4.2; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  // cracks + moss
  T.stitch(ctx, 30, 36, 12, 0.5);
  T.stitch(ctx, 70, 66, 11, -0.4);
  ctx.fillStyle = withAlpha(k.accent, 0.7);
  ctx.beginPath(); ctx.ellipse(64, 30, 8, 4, 0.3, 0, Math.PI * 2); ctx.fill();
  // heavy brow eyes
  T.glossyEyes(ctx, 50, 52, 6.5, 24, { mood: 1, closed: o.blink });
  ctx.fillStyle = shade(k.body, -0.25);
  ctx.fillRect(34, 40, 32, 5);
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeRect(34, 40, 32, 5);
  T.toothyGrin(ctx, 50, 70, 26, 9, { teeth: 4 });
  // pebble fists
  T.stubArms(ctx, 50, 74, 66, 9, shade(k.body, -0.1));
  T.sheen(ctx, 50, 46, 60, 56);
}

export const ENEMIES = {
  blob:   { name: 'Blobbie',  draw: drawBlob,   helmetY: 30, speed: 1.0 },
  snail:  { name: 'Shellby',  draw: drawSnail,  helmetY: 34, speed: 0.8 },
  bat:    { name: 'Flitter',  draw: drawBat,    helmetY: 26, speed: 1.25, floats: true },
  shroom: { name: 'Shroomp',  draw: drawShroom, helmetY: 16, speed: 0.95 },
  spider: { name: 'Webble',   draw: drawSpider, helmetY: 32, speed: 1.15 },
  ghost:  { name: 'Boolie',   draw: drawGhost,  helmetY: 22, speed: 1.1, floats: true },
  imp:    { name: 'Hornlet',  draw: drawImp,    helmetY: 24, speed: 1.2 },
  golem:  { name: 'Rumble',   draw: drawGolem,  helmetY: 20, speed: 0.75 },
};

// Tiny knight armor overlay (2-hit enemies): helmet + chest plate
function drawArmor(ctx, helmetY) {
  const mid = 50;
  ctx.beginPath();
  ctx.moveTo(mid - 20, helmetY + 8);
  ctx.quadraticCurveTo(mid - 20, helmetY - 10, mid, helmetY - 11);
  ctx.quadraticCurveTo(mid + 20, helmetY - 10, mid + 20, helmetY + 8);
  ctx.closePath();
  ctx.fillStyle = '#cdd6e8'; ctx.fill();
  ctx.lineWidth = 3.6; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  // visor slit + rivets
  ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(mid - 12, helmetY + 2); ctx.lineTo(mid + 12, helmetY + 2); ctx.stroke();
  // plume
  ctx.beginPath();
  ctx.moveTo(mid - 2, helmetY - 10);
  ctx.quadraticCurveTo(mid - 10, helmetY - 24, mid + 6, helmetY - 22);
  ctx.quadraticCurveTo(mid + 4, helmetY - 14, mid + 2, helmetY - 10);
  ctx.closePath();
  T.outlined(ctx, '#ff6f9c', 3);
}

// Bake-key-friendly enemy renderer
export function drawEnemy(ctx, type, bodyColor, { blink = false, armor = false, elite = false, mood = 1 } = {}) {
  const meta = ENEMIES[type];
  const k = skin(bodyColor);
  ctx.save();
  if (elite) { ctx.translate(50, 96); ctx.scale(1.18, 1.18); ctx.translate(-50, -96); }
  meta.draw(ctx, k, { blink, elite, mood });
  if (armor) drawArmor(ctx, meta.helmetY);
  ctx.restore();
}

// ---------- boss: Gloom Dragon -------------------------------------------
export function drawBoss(ctx, bodyColor, { blink = false, mood = 1, hurt = false } = {}) {
  const k = skin(bodyColor);
  // wings
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(50 + s * 24, 46);
    ctx.quadraticCurveTo(50 + s * 52, 18, 50 + s * 46, 52);
    ctx.quadraticCurveTo(50 + s * 40, 48, 50 + s * 36, 56);
    ctx.closePath();
    T.outlined(ctx, shade(k.body, -0.22), 3.6);
  }
  // tail
  ctx.beginPath();
  ctx.moveTo(70, 80);
  ctx.quadraticCurveTo(94, 76, 90, 58);
  ctx.lineWidth = 5; ctx.strokeStyle = k.body; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineWidth = 8.4; ctx.strokeStyle = INK; ctx.globalCompositeOperation = 'destination-over'; ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  T.starPath(ctx, 91, 54, 6, 3, 3);
  T.outlined(ctx, shade(k.body, -0.22), 2.8);
  // horns + back spikes
  T.horns(ctx, 50, 20, 44, 15, shade(k.body, 0.45));
  ctx.fillStyle = shade(k.body, 0.45);
  for (const [x, y] of [[26, 34], [20, 48], [18, 62]]) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 4); ctx.lineTo(x + 1, y + 9); ctx.closePath();
    ctx.fill(); ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.stroke();
  }
  // body + belly
  T.blob(ctx, 50, 56, 62, 62, k.body, 0);
  T.belly(ctx, 50, 70, 34, 26, shade(k.body, 0.5));
  ctx.lineWidth = 2.6; ctx.strokeStyle = shade(k.body, -0.2);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(38, 62 + i * 7); ctx.quadraticCurveTo(50, 66 + i * 7, 62, 62 + i * 7); ctx.stroke();
  }
  // snout bump + nostrils
  T.glossyEyes(ctx, 50, 44, 8, 30, { mood: hurt ? 2 : mood, closed: blink || hurt, iris: '#ffd150' });
  T.toothyGrin(ctx, 50, 64, 36, 13, { teeth: 8, tongue: true });
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(44, 55, 1.8, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(56, 55, 1.8, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  // stub arms + feet
  T.stubArms(ctx, 50, 76, 60, 8, k.body);
  T.stubFeet(ctx, 50, 92, 30, 9, shade(k.body, -0.12));
  T.blush(ctx, 50, 54, 56, 4.5, k.blush);
  T.sheen(ctx, 50, 50, 62, 62);
}

// ---------- hero ----------------------------------------------------------
// band 0..6; look grows: headband -> cap -> wizard hat -> +cape -> +star staff -> +aura -> crown
export function drawHero(ctx, band, { blink = false, cast = false } = {}) {
  const robe = HERO_TIER.robe[band], hat = HERO_TIER.hat[band];
  const skinTone = '#ffd9b8', hair = '#7a4a2e';
  // aura for high bands
  if (band >= 5) {
    ctx.fillStyle = withAlpha('#ffd150', 0.28);
    ctx.beginPath(); ctx.ellipse(50, 58, 44, 42, 0, 0, Math.PI * 2); ctx.fill();
  }
  // cape
  if (band >= 3) {
    ctx.beginPath();
    ctx.moveTo(32, 48);
    ctx.quadraticCurveTo(24, 78, 30, 90);
    ctx.quadraticCurveTo(50, 84, 70, 90);
    ctx.quadraticCurveTo(76, 78, 68, 48);
    ctx.closePath();
    T.outlined(ctx, shade(hat, -0.12), 3.6);
  }
  // staff (behind body, right side) — tip gets fancier with band
  ctx.beginPath(); ctx.moveTo(76, 30); ctx.lineTo(76, 88);
  ctx.lineWidth = 5; ctx.strokeStyle = '#a8763e'; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.globalCompositeOperation = 'destination-over'; ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  if (band >= 4 || cast) {
    ctx.fillStyle = withAlpha('#ffe9a0', cast ? 0.85 : 0.5);
    ctx.beginPath(); ctx.arc(76, 26, cast ? 13 : 9, 0, Math.PI * 2); ctx.fill();
  }
  T.starPath(ctx, 76, 26, band >= 4 ? 8 : 6);
  T.outlined(ctx, '#ffd150', 3);
  // body robe
  T.blob(ctx, 50, 72, 44, 40, robe, 0.1);
  // belt
  ctx.fillStyle = shade(robe, -0.3);
  ctx.fillRect(33, 74, 34, 5);
  // head (big, chibi)
  ctx.beginPath(); ctx.arc(50, 42, 24, 0, Math.PI * 2);
  ctx.fillStyle = T.vinyl(ctx, 50, 38, 26, skinTone); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  // hair fringe
  ctx.beginPath();
  ctx.arc(50, 40, 23, Math.PI * 1.05, Math.PI * 1.95);
  ctx.quadraticCurveTo(62, 30, 50, 32);
  ctx.quadraticCurveTo(40, 30, 28, 38);
  ctx.fillStyle = hair; ctx.fill();
  T.glossyEyes(ctx, 50, 44, 6, 20, { mood: 0, closed: blink, iris: '#6ec1ff', look: { x: -1.2, y: 0 } });
  T.smile(ctx, 50, 54, 11, { open: cast });
  T.blush(ctx, 50, 50, 38, 3.5, '#ffb0a3');
  // headgear per band
  if (band === 0) {
    ctx.fillStyle = hat;
    ctx.fillRect(28, 26, 44, 7);
    ctx.lineWidth = 3.2; ctx.strokeStyle = INK; ctx.strokeRect(28, 26, 44, 7);
    T.starPath(ctx, 50, 29.5, 4.5); T.outlined(ctx, '#ffd150', 2.4);
  } else if (band === 1) {
    ctx.beginPath();
    ctx.arc(50, 26, 20, Math.PI, 0);
    ctx.closePath();
    T.outlined(ctx, hat, 3.4);
    ctx.beginPath(); ctx.ellipse(66, 26, 12, 4, 0, 0, Math.PI * 2);
    T.outlined(ctx, hat, 3);
  } else {
    // wizard hat, taller with band
    const hh = 26 + band * 3;
    ctx.beginPath();
    ctx.moveTo(24, 28);
    ctx.quadraticCurveTo(48, 20, 52 - band, 28 - hh);
    ctx.quadraticCurveTo(58, 24 - hh * 0.4, 76, 26);
    ctx.quadraticCurveTo(50, 36, 24, 28);
    ctx.closePath();
    T.outlined(ctx, hat, 3.8);
    T.starPath(ctx, 50, 20, 5);
    T.outlined(ctx, '#ffd150', 2.4);
    if (band >= 6) {
      // tiny crown on the hat tip
      ctx.fillStyle = '#ffd150';
      ctx.beginPath();
      ctx.moveTo(44, 0); ctx.lineTo(46, 8) ; ctx.lineTo(50, 3); ctx.lineTo(54, 8); ctx.lineTo(58, 0);
      ctx.lineTo(58, 11); ctx.lineTo(44, 11); ctx.closePath();
      ctx.fill(); ctx.lineWidth = 2.8; ctx.strokeStyle = INK; ctx.stroke();
    }
  }
  T.sheen(ctx, 50, 40, 48, 48);
}
