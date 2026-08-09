// Bake pipeline: turn the procedural draw functions into cached offscreen
// canvases so the per-frame cost is a plain drawImage.
//
// Draw functions work in a 100 x 100 unit box. We bake at (size * quality) device
// pixels, where quality matches the capped device pixel ratio, so blitting into a
// `size` CSS-pixel box lands 1:1 on the physical display — crisp, no resampling.

import { MONSTERS, HERO_SPRITE } from './sprites-units.js';
import { moodColors } from './palettes.js';
import { PROPS } from './sprites-world.js';

const QUANT = 8; // round requested sizes to this step to keep the cache small

export class SpriteBank {
  constructor(quality = 2) {
    this.q = quality;
    this.cache = new Map();
  }

  setQuality(q) {
    const nq = Math.max(1, Math.min(2, q));
    if (Math.abs(nq - this.q) > 0.01) {
      this.q = nq;
      this.cache.clear();
    }
  }

  /** Bake `drawFn` (100x100 unit space) into a canvas `size` CSS px tall. */
  bake(key, size, drawFn) {
    const s = Math.max(QUANT, Math.round(size / QUANT) * QUANT);
    const k = `${key}@${s}`;
    let hit = this.cache.get(k);
    if (hit) return hit;

    const px = Math.ceil(s * this.q);
    const cv = document.createElement('canvas');
    cv.width = px;
    cv.height = px;
    const ctx = cv.getContext('2d');
    ctx.scale(px / 100, px / 100);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    drawFn(ctx);
    cv.cssSize = s;
    this.cache.set(k, cv);
    return cv;
  }

  monster(archetype, paletteId, size, opt = {}) {
    const { armored = false, elite = false, blink = 0 } = opt;
    const def = MONSTERS[archetype] || MONSTERS.blobbie;
    const key = `m:${archetype}:${paletteId}:${armored ? 'a' : ''}${elite ? 'e' : ''}:${blink > 0.5 ? 'b' : 'o'}`;
    return this.bake(key, size, (ctx) => {
      def.draw(ctx, { c: moodColors(archetype, paletteId), armored, elite, blink: blink > 0.5 ? 1 : 0 });
    });
  }

  hero(tier, size, opt = {}) {
    const { blink = 0, cheer = 0, cast = 0 } = opt;
    const key = `h:${tier}:${blink > 0.5 ? 'b' : 'o'}:${cheer ? 'c' : ''}:${cast ? 's' : ''}`;
    return this.bake(key, size, (ctx) => {
      HERO_SPRITE.draw(ctx, { tier, blink: blink > 0.5 ? 1 : 0, cheer, cast });
    });
  }

  prop(name, size, opt = {}) {
    const def = PROPS[name];
    if (!def) return null;
    const key = `p:${name}:${JSON.stringify(opt)}`;
    return this.bake(key, size, (ctx) => def(ctx, opt));
  }

  /** A solid-colour silhouette of a baked sprite — used for hit flashes. */
  flash(sprite, color = '#ffffff') {
    const k = `flash:${color}:${sprite.width}x${sprite.height}:${sprite.__id || (sprite.__id = ++flashId)}`;
    let hit = this.cache.get(k);
    if (hit) return hit;
    const cv = document.createElement('canvas');
    cv.width = sprite.width;
    cv.height = sprite.height;
    const ctx = cv.getContext('2d');
    ctx.drawImage(sprite, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, cv.width, cv.height);
    cv.cssSize = sprite.cssSize;
    this.cache.set(k, cv);
    return cv;
  }
}

let flashId = 0;

/**
 * Draw a baked sprite anchored at the character's feet.
 * `squash` gives the bouncy squash-and-stretch without needing extra art.
 */
export function drawUnit(ctx, sprite, x, footY, size, opt = {}) {
  if (!sprite) return;
  const { squash = 0, flip = false, alpha = 1, rot = 0, lift = 0 } = opt;
  const sx = 1 + squash;
  const sy = 1 - squash;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, footY - lift);
  if (rot) ctx.rotate(rot);
  ctx.scale(flip ? -sx : sx, sy);
  ctx.drawImage(sprite, -size / 2, -size, size, size);
  ctx.restore();
}
