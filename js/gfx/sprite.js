// Sprite bake pipeline: vector draw functions -> cached offscreen canvases.
// Bake at RES x logical size so vinyl gradients stay crisp on retina.

const RES = 2;

export class SpriteBank {
  constructor() { this.cache = new Map(); }

  // drawFn(ctx, w, h) draws into a w x h logical box (ctx pre-scaled).
  bake(key, w, h, drawFn, anchor = { x: 0.5, y: 0.95 }) {
    let e = this.cache.get(key);
    if (e) return e;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * RES); c.height = Math.ceil(h * RES);
    const ctx = c.getContext('2d');
    ctx.scale(RES, RES);
    drawFn(ctx, w, h);
    e = { canvas: c, w, h, anchor };
    this.cache.set(key, e);
    return e;
  }

  clear() { this.cache.clear(); }
}

export const bank = new SpriteBank();

// Draw a baked sprite anchored at (x, y) with uniform scale s.
// squash: positive squashes vertically / widens (bouncy vinyl feel).
export function drawSprite(ctx, entry, x, y, s = 1, { flip = false, rot = 0, squash = 0, alpha = 1 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale((flip ? -1 : 1) * s * (1 + squash * 0.6), s * (1 - squash));
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(entry.canvas, -entry.anchor.x * entry.w, -entry.anchor.y * entry.h, entry.w, entry.h);
  ctx.restore();
}

// Bake straight to a data URL (for DOM icons: hearts, coins, buttons)
export function spriteDataURL(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w * RES; c.height = h * RES;
  const ctx = c.getContext('2d');
  ctx.scale(RES, RES);
  drawFn(ctx, w, h);
  return c.toDataURL('image/png');
}
