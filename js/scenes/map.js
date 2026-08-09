// Mario-style world map: winding path, 10 stage nodes (DOM buttons for
// accessibility), boss castle at the end, shop + capsule machine.

import { rng, hash, makePath, clamp } from '../core/utils.js';
import { PALETTES, withAlpha, INK } from '../gfx/palettes.js';
import { bank, drawSprite } from '../gfx/sprite.js';
import { drawHero, drawEnemy } from '../gfx/sprites-units.js';
import { drawBackground, drawPathRibbon, drawCastle, drawProp } from '../gfx/sprites-world.js';
import { worldById, isStageUnlocked, starsFor, STAGES_PER_WORLD, WORLDS } from '../data/worlds.js';
import { save, persist } from '../core/save.js';
import { el, button, iconHTML } from '../ui/dom.js';
import { openShop, openGacha, openCollection } from '../ui/panels.js';
import { sfx } from '../audio/audio.js';
import { music } from '../audio/music.js';

export class MapScene {
  constructor(engine, uiRoot) {
    this.engine = engine;
    this.uiRoot = uiRoot;
  }

  enter({ worldId }) {
    this.world = worldById(worldId) || WORLDS[0];
    this.pal = PALETTES[this.world.theme];
    const r = rng(this.world.mapSeed);
    const pts = [{ x: 0.07, y: 0.78 }];
    for (let i = 0; i < 4; i++) {
      pts.push({ x: 0.16 + ((i + 0.5) / 4) * 0.6, y: i % 2 === 0 ? 0.24 + r() * 0.18 : 0.6 + r() * 0.2 });
    }
    pts.push({ x: 0.84, y: 0.3 + r() * 0.2 });
    pts.push({ x: 0.9, y: 0.6 });
    this.path = makePath(pts);
    this.time = 0;
    this.bgCanvas = null;
    this.critters = [0.22, 0.55, 0.8].map((t, i) => ({ t, i, phase: r() * 6 }));

    this.dom = el('div', 'scene-map', this.uiRoot);
    const bar = el('div', 'topbar', this.dom);
    button('btn-round', '←', () => this.engine.go('worldSelect'), bar).setAttribute('aria-label', 'Back to worlds');
    const title = el('div', 'topbar-title', bar);
    el('div', 'topbar-world', title, this.world.name);
    el('div', 'topbar-band', title, this.world.bandName);
    const coins = el('div', 'topbar-coins', bar);
    const updCoins = () => { coins.innerHTML = `${iconHTML('coin')} ${save.coins}`; };
    updCoins();
    this.updCoins = updCoins;

    const fabs = el('div', 'map-fabs', this.dom);
    button('btn-fab', '🛒', () => openShop({ onChange: updCoins }), fabs).setAttribute('aria-label', 'Shop');
    const gachaB = button('btn-fab', iconHTML('capsule', 'ic-big'), () => openGacha({ onChange: updCoins }), fabs);
    gachaB.setAttribute('aria-label', 'Capsule machine');
    button('btn-fab', '📖', () => openCollection(), fabs).setAttribute('aria-label', 'Collection');

    this.nodesEl = el('div', 'map-nodes', this.dom);
    this.buildNodes();
    this.toast = el('div', 'toast', this.dom);
    music.start(this.world.music);
    this.prebake();
    save.last = save.last?.startsWith(this.world.id) ? save.last : `${this.world.id}/1`;
    persist();
  }

  exit() { this.dom.remove(); }

  prebake() {
    bank.bake(`hero:${this.world.band}:false`, 100, 100, (c) => drawHero(c, this.world.band, {}));
    this.world.enemies.slice(0, 3).forEach((type, i) => {
      bank.bake(`m:${this.world.id}:${type}`, 100, 100,
        (c) => drawEnemy(c, type, this.pal.monsters[i % this.pal.monsters.length], {}));
    });
    bank.bake(`castle:${this.world.theme}`, 120, 120, (c) => drawCastle(c, this.pal), { x: 0.5, y: 0.93 });
  }

  nodeT(stage) { return (stage - 0.6) / (STAGES_PER_WORLD + 0.2); }

  buildNodes() {
    this.nodesEl.innerHTML = '';
    this.nodeBtns = [];
    const stars = starsFor(save, this.world.id);
    for (let s = 1; s <= STAGES_PER_WORLD; s++) {
      const unlocked = isStageUnlocked(save, this.world, s);
      const isBoss = s === STAGES_PER_WORLD;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `map-node ${isBoss ? 'boss' : ''} ${unlocked ? 'open' : 'locked'} ${stars[s - 1] > 0 ? 'done' : ''}`;
      const starRow = stars[s - 1] > 0
        ? `<span class="node-stars">${'★'.repeat(stars[s - 1])}</span>` : '';
      b.innerHTML = unlocked
        ? `<span class="node-num">${isBoss ? '👑' : s}</span>${starRow}`
        : `<span class="node-num">🔒</span>`;
      b.setAttribute('aria-label', `Stage ${s}${isBoss ? ' (boss)' : ''}${unlocked ? '' : ' locked'}`);
      b.addEventListener('click', () => {
        sfx.tap();
        if (!unlocked) {
          this.showToast(`Finish stage ${s - 1} first! You can do it!`);
          b.classList.add('wiggle');
          setTimeout(() => b.classList.remove('wiggle'), 500);
          return;
        }
        this.engine.go('play', { worldId: this.world.id, stage: s });
      });
      this.nodesEl.appendChild(b);
      this.nodeBtns.push(b);
    }
    this.placeNodes();
  }

  placeNodes() {
    if (!this.w) return;
    for (let s = 1; s <= STAGES_PER_WORLD; s++) {
      const p = this.path.at(this.nodeT(s));
      const px = this.toPx(p.x, p.y);
      const b = this.nodeBtns[s - 1];
      b.style.left = `${px.x}px`;
      b.style.top = `${px.y}px`;
    }
  }

  showToast(text) {
    this.toast.textContent = text;
    this.toast.classList.add('show');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => this.toast.classList.remove('show'), 2200);
  }

  onLayout(w, h) {
    this.w = w; this.h = h;
    this.rect = { x: 0, y: 64, w, h: h - 84 };
    this.unit = clamp(Math.min(w, this.rect.h) * 0.15, 44, 80);
    // the map is mostly walkable ground; hills stay near the top
    this.groundTop = this.rect.y + this.rect.h * 0.14;
    this.bgCanvas = null;
    this.placeNodes();
  }

  toPx(nx, ny) {
    return {
      x: 20 + nx * (this.w - 40),
      y: this.groundTop + ny * (this.rect.y + this.rect.h - this.groundTop),
    };
  }

  buildBg() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas');
    c.width = this.w * dpr; c.height = this.h * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    const r = rng(this.world.mapSeed + 7);
    drawBackground(ctx, this.w, this.h, this.pal, r, {
      horizon: (this.rect.y + this.rect.h * 0.05) / this.h,
      ground: (this.groundTop - 10) / this.h,
    });
    drawPathRibbon(ctx, this.path, (x, y) => this.toPx(x, y), Math.max(20, this.unit * 0.42), this.pal);
    const kinds = this.pal.props;
    for (let i = 0; i < 10; i++) {
      const t = r();
      const p = this.path.at(t);
      const side = r() < 0.5 ? -1 : 1;
      const nx = p.x + Math.cos(p.angle + side * Math.PI / 2) * (0.12 + r() * 0.12);
      const ny = p.y + Math.sin(p.angle + side * Math.PI / 2) * (0.16 + r() * 0.12);
      if (nx < 0.03 || nx > 0.95 || ny < 0.03 || ny > 0.95) continue;
      const kind = kinds[Math.floor(r() * kinds.length)];
      const e = bank.bake(`prop:${this.world.theme}:${kind}`, 60, 60, (cc) => drawProp(cc, kind, this.pal), { x: 0.5, y: 0.93 });
      const px = this.toPx(nx, ny);
      const s = this.unit * (0.5 + r() * 0.3);
      ctx.drawImage(e.canvas, px.x - s / 2, px.y - s * 0.86, s, s);
    }
    this.bgCanvas = c;
  }

  currentStage() {
    const stars = starsFor(save, this.world.id);
    for (let s = 1; s <= STAGES_PER_WORLD; s++) if (stars[s - 1] === 0) return isStageUnlocked(save, this.world, s) ? s : Math.max(1, s - 1);
    return STAGES_PER_WORLD;
  }

  update(dt) { this.time += dt; }

  render(ctx, w, h) {
    if (!this.rect) this.onLayout(w, h);
    if (!this.bgCanvas) this.buildBg();
    ctx.drawImage(this.bgCanvas, 0, 0, w, h);
    // castle at the path's end
    const cp = this.toPx(0.9, 0.6);
    const castle = bank.cache.get(`castle:${this.world.theme}`);
    if (castle) {
      const cs = this.unit * 2.1;
      ctx.drawImage(castle.canvas, cp.x - cs * 0.35, cp.y - cs * 0.98, cs, cs);
    }
    // wandering critters
    this.critters.forEach((cr, i) => {
      const type = this.world.enemies[i % this.world.enemies.length];
      const entry = bank.cache.get(`m:${this.world.id}:${type}`);
      if (!entry) return;
      const t = (cr.t + Math.sin(this.time * 0.3 + cr.phase) * 0.02);
      const p = this.path.at(clamp(t, 0, 1));
      const side = i % 2 === 0 ? 1 : -1;
      const px = this.toPx(
        p.x + Math.cos(p.angle + side * Math.PI / 2) * 0.09,
        p.y + Math.sin(p.angle + side * Math.PI / 2) * 0.12);
      drawSprite(ctx, entry, px.x, px.y, (this.unit / 100) * 0.66,
        { squash: Math.sin(this.time * 5 + cr.phase) * 0.05 });
    });
    // hero token at current stage node
    const hs = this.currentStage();
    const hp = this.path.at(this.nodeT(hs));
    const hpx = this.toPx(hp.x, hp.y);
    const hero = bank.cache.get(`hero:${this.world.band}:false`);
    if (hero) {
      drawSprite(ctx, hero, hpx.x, hpx.y - this.unit * 0.55 - Math.abs(Math.sin(this.time * 2.6)) * 8,
        (this.unit / 100) * 0.85);
    }
  }
}
