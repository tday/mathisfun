// The world map: ten stage nodes strung along a winding path, Mario-style.
//
// Tapping a node selects it; the big Play button in the panel is the real
// control, so the whole map is reachable by keyboard and screen reader too.

import { drawUnit } from '../gfx/sprite.js';
import { palette } from '../gfx/palettes.js';
import { drawSkyDecor, drawGround, outlinedText, fitFont, drawStars, FONT, Particles } from '../gfx/fx.js';
import { INK, ink, roundRectPath } from '../gfx/toybox.js';
import { mulberry32, clamp, withAlpha, lerp, makeSpline } from '../core/utils.js';
import { el, clear, button, overlay, panel, spriteImg } from '../ui/dom.js';
import { openShop, openGacha, openCollection } from '../ui/panels.js';
import {
  worldById, heroTier, STAGES_PER_WORLD, isStageUnlocked, nextStage, worldProgress,
} from '../data/worlds.js';

export function createMap() {
  let game, world, pal, nodes, trail, decor, grid, selected, t, particles, view, hero;
  let playBtn, titleEl, bar;

  /**
   * Node positions adapt to the screen shape. A single free-form spline looked
   * good on a laptop but bunched stages on top of each other on a tall phone,
   * so the nodes sit on a serpentine grid sized to the viewport and the trail
   * is a spline drawn *through* them — even spacing, and the path can never
   * miss a node.
   */
  function layout(w, h) {
    const rng = mulberry32(world.mapSeed);
    const portrait = h > w * 1.15;
    const cols = portrait ? 3 : 5;
    const rows = Math.ceil(STAGES_PER_WORLD / cols);

    const padX = w * (portrait ? 0.17 : 0.1);
    // Top margin clears the HUD and the world name plate; the bottom margin has
    // to fit the star row that hangs under each node.
    const padTop = Math.max(h * 0.24, 132);
    const padBot = Math.max(h * 0.16, 76);
    const usableW = Math.max(1, w - padX * 2);
    const usableH = Math.max(1, h - padTop - padBot);

    const out = [];
    for (let i = 0; i < STAGES_PER_WORLD; i++) {
      const row = Math.floor(i / cols);
      const idx = i % cols;
      // Serpentine, so the path snakes instead of jumping back each row.
      const col = row % 2 === 0 ? idx : cols - 1 - idx;
      const fx = cols === 1 ? 0.5 : col / (cols - 1);
      const fy = rows === 1 ? 0.5 : row / (rows - 1);
      out.push({
        i,
        stage: i + 1,
        // Stage 1 sits at the bottom and the boss at the top.
        x: padX + fx * usableW + (rng() - 0.5) * usableW * 0.05,
        y: padTop + (1 - fy) * usableH + (rng() - 0.5) * usableH * 0.03,
      });
    }

    const spline = makeSpline(out.map((n) => ({ x: n.x / w, y: n.y / h })), 300);

    const decor = [];
    const props = ['tree', 'rock', 'bush'];
    const clearance = Math.min(w, h) * 0.15;
    for (let i = 0; i < 14; i++) {
      const x = rng() * w;
      const y = (0.22 + rng() * 0.72) * h;
      if (out.some((nd) => Math.hypot(nd.x - x, nd.y - y) < clearance)) continue;
      decor.push({ name: props[Math.floor(rng() * props.length)], x, y, size: 38 + rng() * 52 });
    }

    return { nodes: out, trail: spline, decor, cols, rows };
  }

  function refreshPanel() {
    const save = game.save;
    const unlocked = isStageUnlocked(save, world, selected);
    const stars = save.starsFor(world.id)[selected - 1] || 0;
    playBtn.textContent = unlocked
      ? `Play Stage ${selected}${selected === STAGES_PER_WORLD ? ' — Boss!' : ''}`
      : `Stage ${selected} is locked`;
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
      grid = layout(view.w, view.h);
      ({ nodes, trail, decor } = grid);
      selected = p.stage || nextStage(game.save, world);
      hero = { at: selected - 1, x: 0, y: 0, walkTo: null };

      clear(overlay());
      bar = el('div', { class: 'hud' },
        button('', { cls: 'icon ghost', audio: game.audio, ariaLabel: 'Back to worlds', icon: 'iconBack', game },
          () => game.engine.go('worldSelect')),
        // The unit name is for a grown-up and is already on the world card, so
        // it is dropped on a narrow screen rather than wrapping the HUD onto a
        // second row — which landed it straight on top of the world plate.
        el('div', { class: 'pill', title: `${world.unit} · ${world.im}` },
          world.bandName,
          el('span', { class: 'hud-unit' }, ` · ${world.unit}`)),
        el('div', { class: 'spacer' }),
        el('div', { class: 'pill', 'aria-label': `${game.save.data.tokens || 0} capsule tokens` },
          spriteImg(game.sprites.prop('token', 24), 24),
          el('span', {}, String(game.save.data.tokens || 0))),
        button('', { cls: 'icon ghost', audio: game.audio, ariaLabel: 'Capsule machine', icon: 'capsule', game }, () => openGacha(game)),
        button('', { cls: 'icon ghost', audio: game.audio, ariaLabel: 'My monsters', icon: 'iconAlbum', game }, () => openCollection(game)),
        button('', { cls: 'icon ghost', audio: game.audio, ariaLabel: 'Shop', icon: 'iconShop', game }, () => openShop(game)),
      );
      overlay().append(bar);

      titleEl = el('p', { class: 'feedback', style: { fontSize: '1.05rem', color: '#3d2447' } });
      playBtn = button('', { cls: 'primary', audio: game.audio }, () => {
        game.engine.go('play', { worldId: world.id, stage: selected });
      });
      const nav = el('div', { class: 'row', style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
        button('', { cls: 'icon ghost', audio: game.audio, ariaLabel: 'Previous stage', icon: 'iconArrow', iconOpts: { dir: 'left' }, game }, () => select(selected - 1)),
        playBtn,
        button('', { cls: 'icon ghost', audio: game.audio, ariaLabel: 'Next stage', icon: 'iconArrow', game }, () => select(selected + 1)),
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
      grid = layout(w, h);
      ({ nodes, trail, decor } = grid);
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
          const bs = r * 2.5;
          const sp = game.sprites.prop('bossCastle', bs);
          if (sp) ctx.drawImage(sp, -bs / 2, -bs * 0.62, bs, bs);
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
          outlinedText(ctx, String(n.stage), 0, isBoss ? -r * 1.15 : 1,
            `900 ${r * (isBoss ? 0.95 : 1.15)}px ${FONT}`, '#fff8ec', 5);
        }
        if (unlocked && s > 0) drawStars(ctx, 0, (isBoss ? r * 1.35 : r * 1.42), r * 0.26, s);
        ctx.restore();
      }

      // Hero standing on the selected node.
      const hs = clamp(Math.min(v.w, v.h) * 0.15, 48, 110);
      drawUnit(ctx, game.sprites.hero(heroTier(world), hs, { blink: (t % 4.6) > 4.45 ? 1 : 0 }),
        hero.x || v.w / 2, (hero.y || v.h / 2) - r * 0.5, hs,
        { squash: Math.sin(t * 5) * 0.03 });

      particles.render(ctx);

      // World name plate, sat below whatever height the HUD actually took —
      // a fixed offset put it under the HUD's second row the moment the HUD
      // wrapped.
      const prog = worldProgress(save, world);
      ctx.textAlign = 'center';
      const label = `${world.name} · ${prog.stars}/${prog.max} ★`;
      const plateW = Math.min(v.w * 0.86, 460);
      const plateY = (bar?.offsetHeight || 44) + 14;
      const lSize = fitFont(ctx, label, plateW - 24, Math.min(v.w * 0.045, 21));
      roundRectPath(ctx, (v.w - plateW) / 2, plateY, plateW, 40, 20);
      ctx.fillStyle = withAlpha('#fff8ec', 0.92);
      ctx.fill();
      ink(ctx, 3, INK);
      outlinedText(ctx, label, v.w / 2, plateY + 20, `900 ${lSize}px ${FONT}`, '#3d2447', 0, null);
    },

    debugState() {
      return { world: world.id, selected, unlocked: isStageUnlocked(game.save, world, selected) };
    },
  };

  function nodeRadius() {
    const cols = grid.cols || 5;
    const rows = grid.rows || 2;
    // Fit inside a grid cell so neighbouring stages can never touch.
    return clamp(Math.min(view.w / (cols * 2.5), view.h / (rows * 3.2)), 18, 44);
  }
}
