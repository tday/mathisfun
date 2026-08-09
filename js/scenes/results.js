// Stage results: stars, coins earned, "beat your best" framing, growth line.
// Progress vs YOUR OWN best — never vs perfection.

import { PALETTES } from '../gfx/palettes.js';
import { bank, drawSprite } from '../gfx/sprite.js';
import { drawHero } from '../gfx/sprites-units.js';
import { drawBackground } from '../gfx/sprites-world.js';
import { rng, hash, clamp } from '../core/utils.js';
import { FX } from '../gfx/fx.js';
import { worldById, isStageUnlocked, STAGES_PER_WORLD, WORLDS } from '../data/worlds.js';
import { save } from '../core/save.js';
import { RESULT_LINES, line } from '../data/tuning.js';
import { el, button, iconHTML } from '../ui/dom.js';

export class ResultsScene {
  constructor(engine, uiRoot) {
    this.engine = engine;
    this.uiRoot = uiRoot;
  }

  enter({ worldId, stage, result }) {
    this.world = worldById(worldId);
    this.stage = stage;
    this.result = result;
    this.pal = PALETTES[this.world.theme];
    this.time = 0;
    this.fx = new FX();
    this.bgCanvas = null;

    const r = result;
    this.dom = el('div', 'scene-results', this.uiRoot);
    const card = el('div', 'result-card', this.dom);
    el('div', 'result-title', card,
      r.won ? (r.stars === 3 && r.escaped === 0 ? line(RESULT_LINES.winPerfect) : line(RESULT_LINES.win)) : line(RESULT_LINES.lose));

    const starsRow = el('div', 'result-stars', card);
    for (let i = 0; i < 3; i++) {
      const s = el('span', `result-star ${i < r.stars ? 'on' : ''}`, starsRow);
      s.innerHTML = iconHTML(i < r.stars ? 'star' : 'starOff', 'ic-star');
      s.style.animationDelay = `${0.3 + i * 0.35}s`;
    }
    if (r.persevered && r.won) el('div', 'result-persevere', card, '💪 Perseverance bonus — you worked out every answer!');

    const rows = el('div', 'result-rows', card);
    const row = (label, value) => {
      const d = el('div', 'result-row', rows);
      el('span', 'rr-label', d, label);
      const v = el('span', 'rr-val', d);
      v.innerHTML = value;
      return d;
    };
    row('Coins earned', `+${r.coins} ${iconHTML('coin', 'ic-sm')}`);
    row('Monsters stopped', `${r.defeated}`);
    row('Brave tries', `${r.attempts}`);
    if (r.won && r.defeated > r.prevBest && r.prevBest > 0) {
      el('div', 'result-best', card, `🎉 You beat your best by ${r.defeated - r.prevBest}!`);
    }
    el('div', 'result-growth', card, line(RESULT_LINES.growth));

    const btns = el('div', 'result-btns', card);
    button('btn', '🗺 Map', () => this.engine.go('map', { worldId }), btns);
    button('btn', '🔁 Again', () => this.engine.go('play', { worldId, stage }), btns);
    if (r.won) {
      if (stage < STAGES_PER_WORLD && isStageUnlocked(save, this.world, stage + 1)) {
        button('btn btn-primary', 'Next ▶', () => this.engine.go('play', { worldId, stage: stage + 1 }), btns);
      } else if (stage === STAGES_PER_WORLD) {
        const next = WORLDS.find((w) => w.band === this.world.band && w.indexInBand === 1) && this.world.indexInBand === 0
          ? WORLDS.find((w) => w.band === this.world.band && w.indexInBand === 1)
          : WORLDS.find((w) => w.band === this.world.band + 1 && w.indexInBand === 0);
        if (next) {
          button('btn btn-primary', `${next.name} ▶`, () => this.engine.go('map', { worldId: next.id }), btns);
        }
      }
    }
    if (r.won) this.confettiT = 0;
  }

  exit() { this.dom.remove(); }
  onLayout() { this.bgCanvas = null; }

  update(dt) {
    this.time += dt;
    this.fx.update(dt);
    if (this.result.won && this.confettiT !== undefined) {
      this.confettiT -= dt;
      if (this.confettiT <= 0 && this.w) {
        this.fx.confetti(this.w, this.h * 0.5, [this.pal.accent, '#ffd150', '#7a5cff', '#54c26e', '#ff6f9c']);
        this.confettiT = 2.6;
      }
    }
  }

  render(ctx, w, h) {
    this.w = w; this.h = h;
    if (!this.bgCanvas) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const c = document.createElement('canvas');
      c.width = w * dpr; c.height = h * dpr;
      const cctx = c.getContext('2d');
      cctx.scale(dpr, dpr);
      drawBackground(cctx, w, h, this.pal, rng(hash('res', this.world.id)));
      this.bgCanvas = c;
    }
    ctx.drawImage(this.bgCanvas, 0, 0, w, h);
    const unit = clamp(Math.min(w, h) * 0.18, 60, 120);
    const hero = bank.bake(`hero:${this.world.band}:${this.result.won}`, 100, 100,
      (c) => drawHero(c, this.world.band, { cast: this.result.won }));
    drawSprite(ctx, hero, w * 0.5, h * 0.97, (unit / 100) * 1.1,
      { squash: this.result.won ? Math.sin(this.time * 6) * 0.07 : 0.02 });
    this.fx.draw(ctx);
  }
}
