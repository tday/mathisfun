// Dev-only sprite gallery: `?scene=gallery`. Not linked from the game UI.
// Lets us eyeball every monster in every world palette, plus all hero tiers.

import { MONSTERS } from '../gfx/sprites-units.js';
import { PALETTES } from '../gfx/palettes.js';
import { drawUnit } from '../gfx/sprite.js';
import { PROPS } from '../gfx/sprites-world.js';

const PAL_IDS = Object.keys(PALETTES);
const MON_IDS = Object.keys(MONSTERS);

export function createGallery() {
  let game, palIdx = 0, t = 0, mode = 0;
  const modes = ['monsters', 'heroes', 'props'];

  return {
    enter(_params, g) {
      game = g;
      const bar = document.createElement('div');
      bar.className = 'hud';
      bar.innerHTML = `
        <button class="btn small" data-a="pal">World: ${PAL_IDS[palIdx]}</button>
        <button class="btn small" data-a="mode">View: monsters</button>
        <div class="spacer"></div>
        <button class="btn small" data-a="exit">Exit</button>`;
      bar.addEventListener('click', (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'pal') {
          palIdx = (palIdx + 1) % PAL_IDS.length;
          bar.querySelector('[data-a="pal"]').textContent = `World: ${PAL_IDS[palIdx]}`;
        } else if (a === 'mode') {
          mode = (mode + 1) % modes.length;
          bar.querySelector('[data-a="mode"]').textContent = `View: ${modes[mode]}`;
        } else if (a === 'exit') game.engine.go('title');
      });
      document.getElementById('overlay').append(bar);
      this._bar = bar;
    },

    exit() { this._bar?.remove(); },

    update(dt) { t += dt; },

    render(ctx, view) {
      const pal = PALETTES[PAL_IDS[palIdx]];
      const g = ctx.createLinearGradient(0, 0, 0, view.h);
      g.addColorStop(0, pal.sky[0]);
      g.addColorStop(1, pal.sky[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, view.w, view.h);

      const items = mode === 0 ? MON_IDS : mode === 1 ? [0, 1, 2, 3, 4, 5, 6] : Object.keys(PROPS);
      const cols = Math.max(2, Math.floor(view.w / 130));
      const cell = view.w / cols;
      const size = Math.min(cell * 0.78, 130);
      const rows = Math.ceil(items.length / cols);
      const topPad = 78;
      const rowH = Math.min((view.h - topPad - 20) / rows, size * 1.5);

      ctx.textAlign = 'center';
      ctx.font = '700 12px system-ui';

      items.forEach((item, i) => {
        const cx = (i % cols) * cell + cell / 2;
        const cy = topPad + Math.floor(i / cols) * rowH + rowH * 0.78;
        const bob = Math.sin(t * 2.4 + i) * 5;
        const squash = Math.sin(t * 4.8 + i) * 0.035;
        const blink = (t * 1.1 + i * 0.7) % 4 > 3.85 ? 1 : 0;

        let sprite;
        if (mode === 0) {
          const armored = i % 4 === 3;
          const elite = i % 5 === 4;
          sprite = game.sprites.monster(item, PAL_IDS[palIdx], size, { armored, elite, blink });
        } else if (mode === 1) {
          sprite = game.sprites.hero(item, size, { blink });
        } else {
          sprite = game.sprites.prop(item, size, {});
        }
        drawUnit(ctx, sprite, cx, cy - bob, size, { squash });

        ctx.fillStyle = '#3d2447';
        const label = mode === 0 ? MONSTERS[item].name : mode === 1 ? `Tier ${item}` : item;
        ctx.fillText(label, cx, cy + 14);
      });
    },
  };
}
