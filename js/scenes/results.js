// Stage results. Framed against the child's own previous best — never against
// a perfect score, and never with a red "you failed".

import { el, clear, button, overlay, panel } from '../ui/dom.js';
import { drawSkyDecor, drawGround, outlinedText, fitFont, drawStars, Particles, FONT } from '../gfx/fx.js';
import { palette } from '../gfx/palettes.js';
import { INK, roundRectPath } from '../gfx/toybox.js';
import { drawUnit } from '../gfx/sprite.js';
import { clamp, plural } from '../core/utils.js';
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
      lines.push(`You tried ${plural(data.attempts, 'question')} and earned ${plural(data.coins, 'coin')}.`);
      if (data.correct > prevBest && data.correct > 0) lines.push(`New personal best: ${data.correct} right first time!`);
      else if (data.correct > 0) lines.push(`${data.correct} right first time — your best here is ${prevBest}.`);
      if (data.bestStreak >= 3) lines.push(`Longest streak: ${data.bestStreak} in a row!`);
      if (data.tokensEarned > 0) {
        lines.push(`You earned ${plural(data.tokensEarned, 'capsule token')}!`);
      }
      if (!data.won) lines.push('You keep every coin you earned. Nothing is lost.');
      if (data.assisted && data.won) lines.push('Some answers needed a peek — that is how learning works.');

      // The wrap matters: in landscape the card becomes two columns, text and
      // buttons. Without it every paragraph became its own narrow column and a
      // sentence came out four words tall.
      const text = el('div', { class: 'results-text' },
        el('p', { class: 'qprompt', style: { fontSize: 'clamp(1.4rem, 5vw, 2.4rem)' } }, headline),
        ...lines.map((l) => el('p', { class: 'feedback', style: { margin: 0 } }, l)),
      );
      const body = el('div', { class: 'qcard results-card' }, text);

      const row = el('div', { class: 'row', style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' } });
      const nextStageNo = data.stage + 1;
      if (data.won && nextStageNo <= STAGES_PER_WORLD && isStageUnlocked(game.save, world, nextStageNo)) {
        row.append(button(`Stage ${nextStageNo}`, { cls: 'primary', audio: game.audio, icon: 'iconPlay', game },
          () => game.engine.go('play', { worldId: world.id, stage: nextStageNo })));
      }
      row.append(button(data.won ? 'Play again' : 'Try again', {
        cls: data.won ? 'ghost' : 'primary', audio: game.audio, icon: 'iconRetry', game,
      }, () => game.engine.go('play', { worldId: world.id, stage: data.stage })));
      row.append(button('Capsule', { cls: 'ghost', audio: game.audio, icon: 'capsule', game },
        () => openGacha(game)));
      row.append(button('Map', { cls: 'ghost', audio: game.audio, icon: 'iconMap', game },
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
      const groundY = v.h * 0.78;
      drawGround(ctx, v, pal, groundY);

      ctx.textAlign = 'center';

      // Laid out as a measured top-down stack rather than at fixed fractions of
      // the height. The fractions were tuned against a tall portrait canvas; on
      // a landscape phone the canvas is a couple of hundred pixels tall and
      // 0.14 / 0.3 / 0.44 of it put the title plate, the stars and the banner
      // straight through each other.
      const pad = clamp(v.h * 0.03, 5, 16);
      let y = pad;

      const title = `${world.name} · Stage ${data.stage}`;
      // Fitted, not guessed: "Starlight Void · Stage 10" at a fixed size runs
      // wider than a phone and spills out of the plate drawn behind it.
      const tSize = fitFont(ctx, title, v.w - 44, clamp(Math.min(v.w * 0.055, v.h * 0.085), 12, 30));
      ctx.font = `900 ${tSize}px ${FONT}`;
      const plateH = tSize * 1.8;
      const plateW = Math.min(ctx.measureText(title).width + tSize * 1.5, v.w - 12);
      roundRectPath(ctx, (v.w - plateW) / 2, y, plateW, plateH, plateH / 2);
      ctx.fillStyle = INK;
      ctx.fill();
      outlinedText(ctx, title, v.w / 2, y + plateH / 2, `900 ${tSize}px ${FONT}`, '#fff8ec', 0, null);
      y += plateH + pad * 1.5;

      const starSize = clamp(Math.min(v.w * 0.075, v.h * 0.1), 12, 46);
      drawStars(ctx, v.w / 2, y + starSize, starSize, shownStars);
      y += starSize * 2 + pad;

      const banner = data.stars === 3 && shownStars >= 3
        ? { text: 'PERFECT DEFENCE!', color: '#ffd34e' }
        : data.won && data.assisted
          ? { text: 'Keep going — you are growing!', color: '#fff8ec' }
          : null;
      if (banner) {
        const bSize = fitFont(ctx, banner.text, v.w - 24,
          clamp(Math.min(v.w * 0.045, v.h * 0.07), 11, 26));
        ctx.save();
        // A little tracking on top of the capped outline: at phone sizes these
        // are heavy 900-weight caps, and their outlines still brush together
        // without it. Ignored silently where the canvas API lacks it.
        if ('letterSpacing' in ctx) ctx.letterSpacing = `${(bSize * 0.07).toFixed(2)}px`;
        outlinedText(ctx, banner.text, v.w / 2, y + bSize * 0.7,
          `900 ${bSize}px ${FONT}`, banner.color, 6);
        ctx.restore();
        y += bSize * 1.6 + pad;
      }

      // The hero takes whatever vertical room the stack left, standing on the
      // ground line — so it shrinks rather than colliding on a short canvas.
      const feet = groundY + v.h * 0.04;
      const size = clamp(Math.min(v.w * 0.32, feet - y), 40, 170);
      const bob = Math.sin(t * 3) * (size * 0.04);
      drawUnit(ctx, game.sprites.hero(heroTier(world), size, {
        cheer: data.won ? 1 : 0,
        blink: (t % 4.4) > 4.25 ? 1 : 0,
      }), v.w / 2, feet - bob, size, { squash: Math.sin(t * 5.4) * 0.03 });

      particles.render(ctx);
    },

    debugState() {
      return { ...data, shownStars };
    },
  };
}
