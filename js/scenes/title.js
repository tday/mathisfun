// Title screen: castle, hero, a parade of cute-scary monsters, big Play.

import { rng, clamp } from '../core/utils.js';
import { PALETTES, withAlpha } from '../gfx/palettes.js';
import { bank, drawSprite } from '../gfx/sprite.js';
import { drawHero, drawEnemy, ENEMIES } from '../gfx/sprites-units.js';
import { drawBackground, drawCastle } from '../gfx/sprites-world.js';
import { save } from '../core/save.js';
import { worldById, WORLDS } from '../data/worlds.js';
import { el, button } from '../ui/dom.js';
import { openSettings, openCollection } from '../ui/panels.js';
import { toggleMute } from '../audio/audio.js';
import { music } from '../audio/music.js';

const PARADE = ['blob', 'snail', 'bat', 'shroom', 'spider', 'ghost', 'imp', 'golem'];

export class TitleScene {
  constructor(engine, uiRoot) {
    this.engine = engine;
    this.uiRoot = uiRoot;
  }

  enter() {
    this.time = 0;
    this.pal = PALETTES.meadow;
    this.bgCanvas = null;
    this.dom = el('div', 'scene-title', this.uiRoot);

    const logo = el('div', 'logo', this.dom);
    el('div', 'logo-top', logo, 'MONSTER MATH');
    el('div', 'logo-bot', logo, 'DEFENDERS');
    el('div', 'logo-sub', logo, 'Math is fun — every try makes you stronger!');

    const menu = el('div', 'title-menu', this.dom);
    const hasSave = !!save.last;
    button('btn btn-primary btn-big', hasSave ? '▶ &nbsp;Keep Playing' : '▶ &nbsp;Play', () => {
      if (hasSave) {
        const [wid] = save.last.split('/');
        if (worldById(wid)) { this.engine.go('map', { worldId: wid }); return; }
      }
      this.engine.go('worldSelect');
    }, menu);
    button('btn wide', '🗺 &nbsp;Choose World', () => this.engine.go('worldSelect'), menu);
    button('btn wide', '📖 &nbsp;Collection', () => openCollection(), menu);
    button('btn wide', '⚙ &nbsp;Settings', () => openSettings(), menu);

    this.muteBtn = button('btn-round title-mute', save.settings.muted ? '🔇' : '🔊', () => {
      const m = toggleMute();
      this.muteBtn.textContent = m ? '🔇' : '🔊';
    }, this.dom);
    this.muteBtn.setAttribute('aria-label', 'Toggle sound');

    // bake title cast
    bank.bake('hero:2:false', 100, 100, (c) => drawHero(c, 2, {}));
    PARADE.forEach((t, i) => bank.bake(`title:${t}`, 100, 100,
      (c) => drawEnemy(c, t, this.pal.monsters[i % this.pal.monsters.length], {})));
    bank.bake('castle:meadow', 120, 120, (c) => drawCastle(c, this.pal), { x: 0.5, y: 0.93 });
    music.start({ tempo: 104, minor: false, seed: 42 });
  }

  exit() { this.dom.remove(); }
  onLayout() { this.bgCanvas = null; }
  update(dt) { this.time += dt; }

  render(ctx, w, h) {
    if (!this.bgCanvas) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const c = document.createElement('canvas');
      c.width = w * dpr; c.height = h * dpr;
      const cctx = c.getContext('2d');
      cctx.scale(dpr, dpr);
      drawBackground(cctx, w, h, this.pal, rng(5));
      this.bgCanvas = c;
    }
    ctx.drawImage(this.bgCanvas, 0, 0, w, h);
    const unit = clamp(Math.min(w, h) * 0.17, 52, 110);
    // castle
    const castle = bank.cache.get('castle:meadow');
    if (castle) {
      const cs = unit * 2.4;
      ctx.drawImage(castle.canvas, w * 0.78 - cs / 2, h * 0.62 - cs * 0.93, cs, cs);
    }
    // hero waving by the castle
    const hero = bank.cache.get('hero:2:false');
    if (hero) {
      drawSprite(ctx, hero, w * 0.64, h * 0.64, (unit / 100) * 1.15,
        { squash: Math.sin(this.time * 3) * 0.04 });
    }
    // monster parade marching along the bottom
    const groundY = h * 0.9;
    PARADE.forEach((t, i) => {
      const entry = bank.cache.get(`title:${t}`);
      if (!entry) return;
      const spacing = Math.max(120, w / 6);
      const x = ((i * spacing + this.time * 42) % (w + spacing * 2)) - spacing;
      const float = ENEMIES[t].floats ? Math.sin(this.time * 2.5 + i) * 8 - unit * 0.2 : 0;
      drawSprite(ctx, entry, x, groundY + float, (unit / 100) * 0.8,
        { squash: Math.sin(this.time * 7 + i * 1.7) * 0.06 });
    });
    // drifting math bubbles
    ctx.save();
    ctx.font = `800 ${unit * 0.4}px 'Chalkboard SE','Comic Sans MS',system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ['+', '−', '×', '÷', '=', '?'].forEach((sym, i) => {
      const y = (h + 80 - ((this.time * 26 + i * 150) % (h + 160)));
      const x = w * (0.12 + (i * 0.15) % 0.8) + Math.sin(this.time + i * 2) * 16;
      ctx.fillStyle = withAlpha('#ffffff', 0.5);
      ctx.beginPath(); ctx.arc(x, y - unit * 0.13, unit * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = withAlpha('#7a5cff', 0.75);
      ctx.fillText(sym, x, y);
    });
    ctx.restore();
  }
}
