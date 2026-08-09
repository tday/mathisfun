// World picker, grouped by grade band.
//
// Every band's first world is always unlocked: a 3rd grader should be able to
// start at 3rd grade without grinding through Pre-K, and a child who wants
// easier practice can always drop back.

import { el, clear, button, overlay, panel } from '../ui/dom.js';
import { drawSkyDecor, drawGround } from '../gfx/fx.js';
import { palette } from '../gfx/palettes.js';
import { BANDS, WORLDS, isWorldUnlocked, worldProgress, worldsInBand } from '../data/worlds.js';
import { MONSTERS } from '../gfx/sprites-units.js';

export function createWorldSelect() {
  let game, t = 0;

  function card(world) {
    const save = game.save;
    const unlocked = isWorldUnlocked(save, world);
    const prog = worldProgress(save, world);
    const pal = palette(world.palette);

    const preview = el('canvas', { width: 96, height: 96, 'aria-hidden': 'true' });
    preview.style.width = '72px';
    preview.style.height = '72px';
    const pctx = preview.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    preview.width = Math.round(72 * dpr);
    preview.height = Math.round(72 * dpr);
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = pctx.createLinearGradient(0, 0, 0, 72);
    g.addColorStop(0, pal.sky[0]);
    g.addColorStop(1, pal.ground);
    pctx.fillStyle = g;
    pctx.fillRect(0, 0, 72, 72);
    const mon = game.sprites.monster(world.enemies[0], world.palette, 62, {});
    if (mon) pctx.drawImage(mon, 5, 8, 62, 62);
    if (!unlocked) {
      pctx.fillStyle = 'rgba(43,27,56,0.55)';
      pctx.fillRect(0, 0, 72, 72);
      const lock = game.sprites.prop('lock', 36);
      if (lock) pctx.drawImage(lock, 18, 18, 36, 36);
    }

    const stars = el('div', { class: 'wc-stars' }, `★ ${prog.stars}/${prog.max}`);
    const btn = el('button', {
      class: `world-card${unlocked ? '' : ' locked'}`,
      type: 'button',
      disabled: !unlocked || undefined,
      'aria-label': unlocked
        ? `${world.name}, ${world.bandName}, ${prog.stars} of ${prog.max} stars`
        : `${world.name} is locked. Finish ${WORLDS[world.index - 1]?.name} to open it.`,
    },
      preview,
      el('div', { class: 'wc-body' },
        el('div', { class: 'wc-name' }, world.name),
        el('div', { class: 'wc-sub' }, unlocked ? `${MONSTERS[world.enemies[0]].name} & friends` : 'Beat the boss before this one'),
        stars,
      ),
    );
    btn.addEventListener('click', () => {
      if (!unlocked) return;
      game.audio?.tap();
      game.engine.go('map', { worldId: world.id });
    });
    return btn;
  }

  return {
    enter(_p, g) {
      game = g;
      t = 0;
      clear(overlay());

      const list = el('div', { class: 'world-list' });
      for (const band of BANDS) {
        list.append(el('h3', { class: 'band-head', style: { borderColor: band.color } },
          el('span', {}, band.name), el('small', {}, band.blurb)));
        const row = el('div', { class: 'world-row' });
        for (const w of worldsInBand(band.band)) row.append(card(w));
        list.append(row);
      }

      const scroller = el('div', { class: 'scroll-host' }, list);
      overlay().append(scroller);

      clear(panel());
      panel().append(el('div', { class: 'qcard', style: { gap: '4px' } },
        el('div', { class: 'row', style: { display: 'flex', gap: '10px', justifyContent: 'center' } },
          button('← Title', { cls: 'ghost small', audio: game.audio }, () => game.engine.go('title')),
          el('span', { class: 'feedback', style: { flex: '1', margin: 0 } }, 'Pick your grade — you can always try another!'),
        )));

      game.audio?.playTheme({ tempo: 100, mode: 'major', seed: 5, root: 57 });
    },

    exit() {
      clear(overlay());
      clear(panel());
    },

    update(dt) { t += dt; },

    render(ctx, v) {
      drawSkyDecor(ctx, v, palette('meadow'), t);
      drawGround(ctx, v, palette('meadow'), v.h * 0.86);
    },
  };
}
