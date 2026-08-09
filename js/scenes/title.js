// Title screen: the hero out front, a few monsters bouncing in to say hello.

import { button, el, panel, clear, overlay } from '../ui/dom.js';
import { drawUnit } from '../gfx/sprite.js';
import { palette } from '../gfx/palettes.js';
import { worldById } from '../data/worlds.js';
import { outlinedText, drawGround, drawSkyDecor } from '../gfx/fx.js';
import { openSettings, openCollection } from '../ui/panels.js';

const CAST = [
  { key: 'blobbie', x: 0.24, s: 0.62, phase: 0 },
  { key: 'flitter', x: 0.76, s: 0.58, phase: 1.2 },
  { key: 'hornlet', x: 0.9, s: 0.5, phase: 2.1 },
  { key: 'shroomp', x: 0.1, s: 0.5, phase: 0.6 },
];

export function createTitle() {
  let game, t = 0;

  function build() {
    const save = game.save;
    const p = clear(panel());
    const row = el('div', { class: 'row', style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' } });

    const last = save.data.last;
    if (last) {
      const [wid, stage] = last.split('/');
      const w = worldById(wid);
      row.append(button(`Continue — ${w.name} ${stage}`, { cls: 'primary', audio: game.audio, icon: 'iconPlay', game }, () => {
        game.engine.go('map', { worldId: w.id });
      }));
      row.append(button('Choose a world', { cls: 'ghost', audio: game.audio }, () => game.engine.go('worldSelect')));
    } else {
      row.append(button('Play', { cls: 'primary', audio: game.audio, icon: 'iconPlay', game }, () => game.engine.go('worldSelect')));
    }

    const tools = el('div', { class: 'row', style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' } });
    tools.append(
      button('My Monsters', { cls: 'small ghost', audio: game.audio, icon: 'iconAlbum', game }, () => openCollection(game)),
      button('Settings', { cls: 'small ghost', audio: game.audio }, () => openSettings(game)),
    );

    p.append(el('div', { class: 'qcard', style: { gap: '4px' } }, row, tools));
  }

  return {
    enter(_params, g) {
      game = g;
      t = 0;
      clear(overlay());
      build();
      game.audio?.playTheme({ tempo: 104, mode: 'major', seed: 5, root: 57 });
      if (game.save.memoryOnly) {
        const warn = el('div', { class: 'wave-badge', style: { top: 'auto', bottom: '8px', background: '#d1791a' } },
          'Progress will not be saved in private mode');
        overlay().append(warn);
      }
    },

    exit() {
      clear(panel());
      clear(overlay());
    },

    update(dt) { t += dt; },

    render(ctx, view) {
      const pal = palette('meadow');
      drawSkyDecor(ctx, view, pal, t);
      const groundY = view.h * 0.82;
      drawGround(ctx, view, pal, groundY);

      // Logo.
      const cx = view.w / 2;
      const big = Math.min(view.w * 0.11, 62);
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(cx, view.h * 0.2 + Math.sin(t * 1.6) * 4);
      outlinedText(ctx, 'MONSTER MATH', 0, 0, `900 ${big}px ${FONT}`, '#ffd34e', 8);
      outlinedText(ctx, 'DEFENDERS', 0, big * 0.98, `900 ${big}px ${FONT}`, '#ff7ab8', 8);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.9;
      outlinedText(ctx, 'Every try earns coins!', cx, view.h * 0.2 + big * 1.9,
        `800 ${Math.min(view.w * 0.038, 21)}px ${FONT}`, '#fff8ec', 5);
      ctx.restore();

      // Cast.
      const heroSize = Math.min(view.w * 0.3, view.h * 0.36, 190);
      for (const c of CAST) {
        const size = heroSize * c.s;
        const bob = Math.sin(t * 2.2 + c.phase) * 6;
        const squash = Math.sin(t * 4.4 + c.phase) * 0.04;
        const blink = (t * 0.9 + c.phase) % 4.2 > 4.02 ? 1 : 0;
        const sp = game.sprites.monster(c.key, 'meadow', size, { blink });
        drawUnit(ctx, sp, view.w * c.x, groundY + 6 - bob, size, { squash, flip: c.x > 0.5 });
      }
      const hb = Math.sin(t * 2.6) * 5;
      const heroSprite = game.sprites.hero(Math.min(6, Math.floor(t / 3) % 7), heroSize, {
        blink: (t % 4.6) > 4.45 ? 1 : 0,
      });
      drawUnit(ctx, heroSprite, cx, groundY + 10 - hb, heroSize, { squash: Math.sin(t * 5.2) * 0.03 });
    },
  };
}

const FONT = 'ui-rounded, "SF Pro Rounded", "Varela Round", "Trebuchet MS", system-ui, sans-serif';
