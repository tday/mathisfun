// The world map: ten stage nodes strung along a winding path, Mario-style.
//
// Tapping a node selects it; the big Play button in the panel is the real
// control, so the whole map is reachable by keyboard and screen reader too.

import { drawUnit } from '../gfx/sprite.js';
import { palette } from '../gfx/palettes.js';
import { drawSkyDecor, drawGround, outlinedText, drawStars, FONT, Particles } from '../gfx/fx.js';
import { INK, ink, roundRectPath } from '../gfx/toybox.js';
import { mulberry32, clamp, withAlpha, lerp, makeSpline } from '../core/utils.js';
import { el, clear, button, overlay, panel } from '../ui/dom.js';
import { openShop, openGacha, openCollection } from '../ui/panels.js';
import {
  worldById, heroTier, STAGES_PER_WORLD, isStageUnlocked, nextStage, worldProgress,
} from '../data/worlds.js';

export function createMap() {
  let game, world, pal, nodes, trail, decor, selected, t, particles, view, hero;
  let playBtn, titleEl;

  /**
   * Nodes are strung along one big winding trail rather than a rigid grid — it
   * fills the space the way a Mario overworld does, and the trail is just the
   * spline itself so the path can never miss a node.
   */
  function layout(w, h) {
    const rng = mulberry32(world.mapSeed);
    const ctrl = [{ x: 0.08, y: 0.82 }];
    const n = 5;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      ctrl.push({
        x: lerp(0.12, 0.88, t) + (rng() - 0.5) * 0.1,
        y: 0.78 - t * 0.5 + (rng() - 0.5) * 0.3,
      });
    }
    ctrl.push({ x: 0.9, y: 0.26 });

    const spline = makeSpline(ctrl, 260);
    const out = [];
    for (let i = 0; i < STAGES_PER_WORLD; i++) {
      const p = spline.at((i + 0.55) / (STAGES_PER_WORLD + 0.1));
      out.push({ i, stage: i + 1, x: p.x * w, y: clamp(p.y, 0.16, 0.86) * h });
    }

    const decor = [];
    const props = ['tree', 'rock', 'bush'];
    for (let i = 0; i < 12; i++) {
      const x = rng() * w, y = (0.2 + rng() * 0.74) * h;
      // Keep scenery clear of the nodes so nothing hides a stage.
      if (out.some((nd) => Math.hypot(nd.x - x, nd.y - y) < Math.min(w, h) * 0.13)) continue;
      decor.push({ name: props[Math.floor(rng() * props.length)], x, y, size: 40 + rng() * 56 });
    }

    return { nodes: out, trail: spline, decor };
  }

  function refreshPanel() {
    const save = game.save;
    const unlocked = isStageUnlocked(save, world, selected);
    const stars = save.starsFor(world.id)[selected - 1] || 0;
    playBtn.textContent = unlocked
      ? `▶ Play Stage ${selected}${selected === STAGES_PER_WORLD ? ' — Boss!' : ''}`
      : `🔒 Stage ${selected} is locked`;
    playBtn.disabled = !unlocked;
    playBtn.className = `btn ${unlocked ? 'primary' : ''}`;
    titleEl.textContent = unlocked && stars
      ? `${world.name} · Stage ${selected} · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`
      : `${world.name} · Stage ${selected}`;
  }

  function select(stage) {
    selected = clamp(stage, 1, STAGES_PER_WORLD);
    refreshPanel();
  }

  return {
    enter(p, g) {
      game = g;
      world = worldById(p.worldId);
      pal = palette(world.palette);
      t = 0;
      particles = new Particles();
      view = { w: game.screen.w, h: game.screen.h };
      ({ nodes, trail, decor } = layout(view.w, view.h));
      selected = p.stage || nextStage(game.save, world);
      hero = { at: selected - 1, x: 0, y: 0, walkTo: null };

      clear(overlay());
      const bar = el('div', { class: 'hud' },
        button('←', { cls: 'icon ghost', audio: game.audio, ariaLabel: 'Back to worlds' },
          () => game.engine.go('worldSelect')),
        el('div', { class: 'pill' }, `${world.bandName}`),
        el('div', { class: 'spacer' }),
        button('🎰', { cls: 'icon ghost', audio: game.audio, ariaLabel: 'Capsule machine' }, () => openGacha(game)),
        button('🧸', { cls: 'icon ghost', audio: game.audio, ariaLabel: 'Collection' }, () => openCollection(game)),
        button('🛒', { cls: 'icon ghost', audio: game.audio, ariaLabel: 'Shop' }, () => openShop(game)),
      );
      overlay().append(bar);

      titleEl = el('p', { class: 'feedback', style: { fontSize: '1.05rem', color: '#3d2447' } });
      playBtn = button('', { cls: 'primary', audio: game.audio }, () => {
        game.engine.go('play', { worldId: world.id, stage: selected });
      });
      const nav = el('div', { class: 'row', style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
        button('◀', { cls: 'small ghost', audio: game.audio, ariaLabel: 'Previous stage' }, () => select(selected - 1)),
        playBtn,
        button('▶', { cls: 'small ghost', audio: game.audio, ariaLabel: 'Next stage' }, () => select(selected + 1)),
      );
      clear(panel());
      panel().append(el('div', { class: 'qcard', style: { gap: '4px' } }, titleEl, nav));
      refreshPanel();

      game.audio?.playTheme({ ...world.music, tempo: world.music.tempo - 12, root: 55 + world.band });
    },

    exit() {
      clear(overlay());
      clear(panel());
    },

    onLayout(w, h) {
      view = { w, h };
      ({ nodes, trail, decor } = layout(w, h));
    },

    update(dt) {
      t += dt;
      particles.update(dt);
      // Hero strolls toward the selected node.
      const target = nodes[selected - 1];
      if (target) {
        hero.x = hero.x || target.x;
        hero.y = hero.y || target.y;
        hero.x = lerp(hero.x, target.x, Math.min(1, dt * 6));
        hero.y = lerp(hero.y, target.y, Math.min(1, dt * 6));
      }
    },

    onPointer(type, x, y) {
      if (type !== 'pointerdown') return;
      const r = nodeRadius();
      for (const n of nodes) {
        if (Math.hypot(n.x - x, n.y - y) <= r * 1.5) {
          game.audio?.tap();
          select(n.stage);
          particles.ring(n.x, n.y, '#ffd34e');
          return;
        }
      }
    },

    render(ctx, v) {
      view = v;
      drawSkyDecor(ctx, v, pal, t);
      drawGround(ctx, v, pal, v.h * 0.2);

      const save = game.save;
      const stars = save.starsFor(world.id);
      const r = nodeRadius();

      // Scenery first, so nothing overlaps a node.
      for (const d of decor) {
        const sp = game.sprites.prop(d.name, d.size, {
          color: d.name === 'rock' ? pal.groundDark : pal.prop,
        });
        if (sp) ctx.drawImage(sp, d.x - d.size / 2, d.y - d.size, d.size, d.size);
      }

      // The trail is the same spline the nodes sit on, so it always connects.
      const pts = trail.points;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [lw, col] of [[r * 0.52, pal.pathEdge], [r * 0.34, pal.path]]) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x * v.w, clamp(pts[0].y, 0.16, 0.86) * v.h);
        for (const p of pts) ctx.lineTo(p.x * v.w, clamp(p.y, 0.16, 0.86) * v.h);
        ctx.lineWidth = lw;
        ctx.strokeStyle = col;
        ctx.stroke();
      }
      ctx.restore();

      // Nodes.
      ctx.textAlign = 'center';
      for (const n of nodes) {
        const unlocked = isStageUnlocked(save, world, n.stage);
        const s = stars[n.i] || 0;
        const isBoss = n.stage === STAGES_PER_WORLD;
        const isSel = n.stage === selected;
        const pulse = isSel ? 1 + Math.sin(t * 4) * 0.05 : 1;

        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.scale(pulse, pulse);

        if (isBoss) {
          const bs = r * 3.1;
          const sp = game.sprites.prop('bossCastle', bs);
          if (sp) ctx.drawImage(sp, -bs / 2, -bs * 0.78, bs, bs);
        } else {
          ctx.beginPath();
          ctx.arc(0, 4, r, 0, Math.PI * 2);
          ctx.fillStyle = withAlpha('#2b1b38', 0.2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          const g = ctx.createLinearGradient(0, -r, 0, r);
          if (!unlocked) { g.addColorStop(0, '#cfc6da'); g.addColorStop(1, '#a99fb8'); }
          else if (s > 0) { g.addColorStop(0, '#ffe98a'); g.addColorStop(1, '#ffc93c'); }
          else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e4dcf0'); }
          ctx.fillStyle = g;
          ctx.fill();
          ink(ctx, 4);
        }

        if (!unlocked) {
          const ls = r * 1.1;
          const sp = game.sprites.prop('lock', ls);
          if (sp) ctx.drawImage(sp, -ls / 2, -ls / 2 - (isBoss ? r : 0), ls, ls);
        } else {
          outlinedText(ctx, String(n.stage), 0, isBoss ? -r * 1.5 : 1,
            `900 ${r * (isBoss ? 0.95 : 1.15)}px ${FONT}`, '#fff8ec', 5);
        }
        if (unlocked && s > 0) drawStars(ctx, 0, (isBoss ? r * 1.35 : r * 1.42), r * 0.36, s);
        ctx.restore();
      }

      // Hero standing on the selected node.
      const hs = clamp(Math.min(v.w, v.h) * 0.15, 48, 110);
      drawUnit(ctx, game.sprites.hero(heroTier(world), hs, { blink: (t % 4.6) > 4.45 ? 1 : 0 }),
        hero.x || v.w / 2, (hero.y || v.h / 2) - r * 0.5, hs,
        { squash: Math.sin(t * 5) * 0.03 });

      particles.render(ctx);

      // World name plate.
      const prog = worldProgress(save, world);
      ctx.textAlign = 'center';
      const plateW = Math.min(v.w * 0.8, 460);
      roundRectPath(ctx, (v.w - plateW) / 2, 54, plateW, 40, 20);
      ctx.fillStyle = withAlpha('#fff8ec', 0.92);
      ctx.fill();
      ink(ctx, 3, INK);
      outlinedText(ctx, `${world.name} · ${prog.stars}/${prog.max} ★`, v.w / 2, 74,
        `900 ${Math.min(v.w * 0.045, 21)}px ${FONT}`, '#3d2447', 0, null);
    },

    debugState() {
      return { world: world.id, selected, unlocked: isStageUnlocked(game.save, world, selected) };
    },
  };

  function nodeRadius() {
    return clamp(Math.min(view.w, view.h) * 0.062, 22, 46);
  }
}
