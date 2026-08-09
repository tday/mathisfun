// Dev-only sprite gallery (?scene=gallery) — the art-style checkpoint.

import { PALETTES, INK } from '../gfx/palettes.js';
import { bank, drawSprite } from '../gfx/sprite.js';
import { drawEnemy, drawBoss, drawHero, ENEMIES } from '../gfx/sprites-units.js';
import { drawCastle, drawProp, drawCoin, drawHeart, drawShield, drawCapsule, drawStarIcon, COUNTABLES } from '../gfx/sprites-world.js';

const THEMES = ['meadow', 'cave', 'volcano', 'space'];

export class GalleryScene {
  constructor(engine) { this.engine = engine; this.time = 0; }

  enter() {
    this.time = 0;
    const types = Object.keys(ENEMIES);
    for (const theme of THEMES) {
      const pal = PALETTES[theme];
      types.forEach((t, i) => {
        bank.bake(`g:${theme}:${t}`, 100, 100, (c) => drawEnemy(c, t, pal.monsters[i % pal.monsters.length], {}));
      });
      bank.bake(`g:${theme}:boss`, 100, 100, (c) => drawBoss(c, pal.accent, {}));
      bank.bake(`g:${theme}:castle`, 120, 120, (c) => drawCastle(c, pal), { x: 0.5, y: 0.93 });
    }
    types.forEach((t) => {
      bank.bake(`g:armor:${t}`, 100, 100, (c) => drawEnemy(c, t, PALETTES.meadow.monsters[1], { armor: true }));
    });
    for (let b = 0; b < 7; b++) bank.bake(`g:hero:${b}`, 100, 100, (c) => drawHero(c, b, {}));
  }
  exit() {}
  update(dt) { this.time += dt; }

  render(ctx, w, h) {
    ctx.fillStyle = '#f4eef7';
    ctx.fillRect(0, 0, w, h);
    const types = Object.keys(ENEMIES);
    const cell = Math.min(w / (types.length + 2), 92);
    let y = cell * 1.1;
    ctx.font = `700 12px system-ui`;
    ctx.fillStyle = INK;
    for (const theme of THEMES) {
      ctx.fillText(theme, 8, y - cell * 0.85);
      types.forEach((t, i) => {
        const e = bank.cache.get(`g:${theme}:${t}`);
        if (e) drawSprite(ctx, e, cell * (i + 0.6), y, cell / 105, { squash: Math.sin(this.time * 6 + i) * 0.04 });
      });
      const boss = bank.cache.get(`g:${theme}:boss`);
      if (boss) drawSprite(ctx, boss, cell * (types.length + 0.9), y + cell * 0.1, (cell / 105) * 1.3);
      y += cell * 1.15;
    }
    // armored row
    ctx.fillStyle = INK;
    ctx.fillText('armored', 8, y - cell * 0.85);
    types.forEach((t, i) => {
      const e = bank.cache.get(`g:armor:${t}`);
      if (e) drawSprite(ctx, e, cell * (i + 0.6), y, cell / 105);
    });
    y += cell * 1.2;
    // hero tiers
    ctx.fillStyle = INK;
    ctx.fillText('hero tiers PreK→5th', 8, y - cell * 0.9);
    for (let b = 0; b < 7; b++) {
      const e = bank.cache.get(`g:hero:${b}`);
      if (e) drawSprite(ctx, e, cell * (b + 0.6), y, cell / 100);
    }
    const castle = bank.cache.get('g:meadow:castle');
    if (castle) drawSprite(ctx, castle, cell * 8.2, y, cell / 100);
    y += cell * 0.9;
    // items + countables direct draw
    const items = [drawCoin, (c) => drawHeart(c), (c) => drawShield(c), (c) => drawCapsule(c), (c) => drawStarIcon(c)];
    items.forEach((fn, i) => {
      ctx.save();
      ctx.translate(cell * 0.25 + i * cell * 0.62, y);
      ctx.scale(cell / 62, cell / 62);
      fn(ctx);
      ctx.restore();
    });
    Object.values(COUNTABLES).forEach((fn, i) => {
      ctx.save();
      ctx.translate(cell * 3.6 + i * cell * 0.62, y);
      ctx.scale(cell / 62, cell / 62);
      fn(ctx);
      ctx.restore();
    });
  }
}
