// Tiny DOM helpers + generated icon data-URLs so the HTML UI shares the
// canvas art language (no image files, no emoji font differences).

import { spriteDataURL } from '../gfx/sprite.js';
import { drawCoin, drawHeart, drawShield, drawStarIcon, drawCapsule } from '../gfx/sprites-world.js';
import { sfx } from '../audio/audio.js';

export function el(tag, cls = '', parent = null, text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

export function button(cls, html, onClick, parent = null) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn ${cls}`.trim();
  b.innerHTML = html;
  b.addEventListener('click', (ev) => { sfx.tap(); onClick?.(ev); });
  if (parent) parent.appendChild(b);
  return b;
}

// Generated icon set (lazy, cached)
let icons = null;
export function ICONS() {
  if (!icons) {
    icons = {
      coin: spriteDataURL(40, 40, (c) => drawCoin(c)),
      heart: spriteDataURL(40, 40, (c) => drawHeart(c, false)),
      heartEmpty: spriteDataURL(40, 40, (c) => drawHeart(c, true)),
      shield: spriteDataURL(40, 40, (c) => drawShield(c, false)),
      star: spriteDataURL(40, 40, (c) => drawStarIcon(c, true)),
      starOff: spriteDataURL(40, 40, (c) => drawStarIcon(c, false)),
      capsule: spriteDataURL(40, 40, (c) => drawCapsule(c)),
    };
  }
  return icons;
}

export function icon(name, cls = 'ic') {
  const img = document.createElement('img');
  img.src = ICONS()[name];
  img.alt = name;
  img.className = cls;
  img.draggable = false;
  return img;
}

export const iconHTML = (name, cls = 'ic') => `<img src="${ICONS()[name]}" alt="" class="${cls}" draggable="false">`;
