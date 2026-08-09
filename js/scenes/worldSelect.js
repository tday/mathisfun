// Grade-band grouped world picker. World 1 of EVERY grade is always open,
// so a 3rd grader starts at 3rd grade — world 2 unlocks by beating world 1.

import { PALETTES, withAlpha } from '../gfx/palettes.js';
import { drawEnemy } from '../gfx/sprites-units.js';
import { WORLDS, BAND_NAMES, isWorldUnlocked, worldStars, STAGES_PER_WORLD } from '../data/worlds.js';
import { save } from '../core/save.js';
import { el, button, iconHTML } from '../ui/dom.js';
import { sfx } from '../audio/audio.js';
import { music } from '../audio/music.js';

function worldThumb(world, size = 56) {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = size * dpr; c.height = size * dpr;
  c.style.width = `${size}px`; c.style.height = `${size}px`;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const pal = PALETTES[world.theme];
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.ground);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(0, 0, size, size, 12); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(0, 0, size, size, 12); ctx.clip();
  ctx.translate(size * 0.5 - 50 * (size / 110), size * 0.98 - 96 * (size / 110));
  ctx.scale(size / 110, size / 110);
  drawEnemy(ctx, world.enemies[0], pal.monsters[0], {});
  ctx.restore();
  return c;
}

export class WorldSelectScene {
  constructor(engine, uiRoot) {
    this.engine = engine;
    this.uiRoot = uiRoot;
  }

  enter() {
    this.time = 0;
    this.dom = el('div', 'scene-worlds', this.uiRoot);
    const bar = el('div', 'topbar', this.dom);
    button('btn-round', '←', () => this.engine.go('title'), bar).setAttribute('aria-label', 'Back to title');
    el('div', 'topbar-title', bar).innerHTML = '<div class="topbar-world">Choose your world</div><div class="topbar-band">Start at YOUR grade — every grade’s first world is open!</div>';
    const coins = el('div', 'topbar-coins', bar);
    coins.innerHTML = `${iconHTML('coin')} ${save.coins}`;

    const scroll = el('div', 'world-scroll', this.dom);
    for (let band = 0; band < BAND_NAMES.length; band++) {
      const sec = el('div', 'band-sec', scroll);
      el('div', 'band-title', sec, BAND_NAMES[band]);
      const row = el('div', 'band-row', sec);
      for (const world of WORLDS.filter((w) => w.band === band)) {
        const unlocked = isWorldUnlocked(save, world);
        const stars = worldStars(save, world.id);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `world-card ${unlocked ? '' : 'locked'}`;
        card.appendChild(worldThumb(world));
        const info = el('div', 'world-info', card);
        el('div', 'world-name', info, world.name);
        const meta = el('div', 'world-meta', info);
        meta.innerHTML = unlocked
          ? `${iconHTML('star', 'ic-sm')} ${stars}/${STAGES_PER_WORLD * 3}`
          : `🔒 Beat ${WORLDS.find((w) => w.band === band && w.indexInBand === 0).name}`;
        card.addEventListener('click', () => {
          sfx.tap();
          if (!unlocked) {
            card.classList.add('wiggle');
            setTimeout(() => card.classList.remove('wiggle'), 500);
            return;
          }
          this.engine.go('map', { worldId: world.id });
        });
        row.appendChild(card);
      }
    }
    music.start({ tempo: 100, minor: false, seed: 99 });
  }

  exit() { this.dom.remove(); }
  update(dt) { this.time += dt; }

  render(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8fd0ff'); g.addColorStop(1, '#e8fbe4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = withAlpha('#ffffff', 0.5);
    for (let i = 0; i < 6; i++) {
      const x = ((i * 197 + this.time * 12) % (w + 160)) - 80;
      const y = 60 + (i % 3) * 70;
      for (const [dx, dy, r] of [[0, 0, 22], [-20, 8, 15], [22, 9, 16]]) {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}
