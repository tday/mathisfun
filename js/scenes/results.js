// Stage results. Framed against the child's own previous best — never against
// a perfect score, and never with a red "you failed".

import { el, clear, button, overlay, panel } from '../ui/dom.js';
import { drawSkyDecor, drawGround, outlinedText, drawStars, Particles, FONT } from '../gfx/fx.js';
import { palette } from '../gfx/palettes.js';
import { drawUnit } from '../gfx/sprite.js';
import { clamp } from '../core/utils.js';
import { say } from '../data/tuning.js';
import { worldById, heroTier, STAGES_PER_WORLD, isStageUnlocked } from '../data/worlds.js';
import { openGacha } from '../ui/panels.js';

export function createResults() {
  let game, world, data, pal, t, particles, shownStars, prevBest, headline;

  return {
    enter(p, g) {
      game = g;
      data = p;
      world = worldById(p.worldId);
      pal = palette(world.palette);
      t = 0;
      shownStars = 0;
      particles = new Particles();

      // play.js passes the best from *before* this run, so "personal best" means it.
      prevBest = data.prevBest ?? 0;

      headline = data.won ? say.stageWin() : say.stageLose();

      clear(overlay());
      clear(panel());

      const lines = [];
      lines.push(`You tried ${data.attempts} question${data.attempts === 1 ? '' : 's'} and earned ${data.coins} coins.`);
      if (data.correct > prevBest && data.correct > 0) lines.push(`New personal best: ${data.correct} right first time!`);
      else if (data.correct > 0) lines.push(`${data.correct} right first time — your best here is ${prevBest}.`);
      if (data.bestStreak >= 3) lines.push(`Longest streak: ${data.bestStreak} in a row!`);
      if (!data.won) lines.push('You keep every coin you earned. Nothing is lost.');
      if (data.assisted && data.won) lines.push('Some answers needed a peek — that is how learning works.');

      const body = el('div', { class: 'qcard' },
        el('p', { class: 'qprompt', style: { fontSize: '1.5rem' } }, headline),
        ...lines.map((l) => el('p', { class: 'feedback', style: { margin: 0 } }, l)),
      );

      const row = el('div', { class: 'row', style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' } });
      const nextStageNo = data.stage + 1;
      if (data.won && nextStageNo <= STAGES_PER_WORLD && isStageUnlocked(game.save, world, nextStageNo)) {
        row.append(button(`▶ Stage ${nextStageNo}`, { cls: 'primary', audio: game.audio },
          () => game.engine.go('play', { worldId: world.id, stage: nextStageNo })));
      }
      row.append(button(data.won ? '↻ Play again' : '↻ Try again', { cls: data.won ? 'ghost' : 'primary', audio: game.audio },
        () => game.engine.go('play', { worldId: world.id, stage: data.stage })));
      row.append(button('🎰 Capsule', { cls: 'ghost', audio: game.audio }, () => openGacha(game)));
      row.append(button('🗺 Map', { cls: 'ghost', audio: game.audio },
        () => game.engine.go('map', { worldId: world.id, stage: data.stage })));
      body.append(row);
      panel().append(body);

      if (data.won) game.audio?.playTheme({ ...world.music, tempo: world.music.tempo + 8, root: 57 + world.band });
    },

    exit() {
      clear(overlay());
      clear(panel());
    },

    update(dt) {
      t += dt;
      particles.update(dt);
      const target = data.stars;
      const due = Math.min(target, Math.floor(t / 0.55));
      if (due > shownStars) {
        shownStars = due;
        game.audio?.levelUp();
        particles.confetti(game.screen.w / 2, game.screen.h * 0.34, 18);
      }
    },

    render(ctx, v) {
      drawSkyDecor(ctx, v, pal, t);
      drawGround(ctx, v, pal, v.h * 0.78);

      ctx.textAlign = 'center';
      outlinedText(ctx, `${world.name} · Stage ${data.stage}`, v.w / 2, v.h * 0.14,
        `900 ${Math.min(v.w * 0.055, 28)}px ${FONT}`, '#fff8ec', 6);

      const starSize = clamp(Math.min(v.w, v.h) * 0.075, 22, 46);
      drawStars(ctx, v.w / 2, v.h * 0.3, starSize, shownStars);

      if (data.stars === 3 && shownStars >= 3) {
        outlinedText(ctx, 'PERFECT DEFENCE!', v.w / 2, v.h * 0.44,
          `900 ${Math.min(v.w * 0.05, 26)}px ${FONT}`, '#ffd34e', 6);
      } else if (data.won && data.assisted) {
        outlinedText(ctx, 'Keep going — you are growing!', v.w / 2, v.h * 0.44,
          `900 ${Math.min(v.w * 0.042, 22)}px ${FONT}`, '#fff8ec', 5);
      }

      const size = clamp(Math.min(v.w, v.h) * 0.22, 70, 170);
      const bob = Math.sin(t * 3) * 6;
      drawUnit(ctx, game.sprites.hero(heroTier(world), size, {
        cheer: data.won ? 1 : 0,
        blink: (t % 4.4) > 4.25 ? 1 : 0,
      }), v.w / 2, v.h * 0.8 - bob, size, { squash: Math.sin(t * 5.4) * 0.03 });

      particles.render(ctx);
    },

    debugState() {
      return { ...data, shownStars };
    },
  };
}
