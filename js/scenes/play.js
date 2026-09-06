// The battle. Monsters march the path; answering the maths question is the only
// thing that stops them.
//
// Design rules that keep this kind:
//   - there is no timer; the marching monster is the only pressure
//   - a wrong answer costs zero hearts, and the same question can be retried
//   - after two misses the answer is shown so nobody gets stuck
//   - a monster that reaches the gate despawns, so hearts can never spiral
//   - every attempt pays coins, win or lose, and coins survive a lost stage

import { drawUnit } from '../gfx/sprite.js';
import { palette } from '../gfx/palettes.js';
import { Particles, drawSkyDecor, drawGround, outlinedText, FONT } from '../gfx/fx.js';
import { INK, roundRectPath, ink } from '../gfx/toybox.js';
import { withAlpha, clamp, mulberry32, hash, plural } from '../core/utils.js';
import { overlay, panel, clear, announce } from '../ui/dom.js';
import { Hud } from '../ui/hud.js';
import { QuestionPanel } from '../ui/questionPanel.js';
import { openPause, openShop } from '../ui/panels.js';
import { makeQuestion } from '../data/questions.js';
import { ECONOMY, COMBAT, TOKENS, starsFor, praise, encourage, say } from '../data/tuning.js';
import { buildSpawns, makeStagePath, makeEnemy } from './waves.js';
import { worldById, heroTier, STAGES_PER_WORLD } from '../data/worlds.js';

export function createPlay() {
  let game, world, stage, pal;
  let path, castle, plan, params;
  let enemies, spawnIdx, projectiles, particles;
  let hearts, maxHearts, shields, coinsEarned, streak, bestStreak;
  let time, questionIndex, missStreak, easeLevel, assisted, correctCount, attempts;
  let recentSkills, recentPrompts;
  let over, outcome, waveShown, castleHit, heroCast, heroCheer, blinkT;
  let hud, qpanel, backdrop, backdropKey, view;
  let currentQuestion, tries, resolving;

  // ------------------------------------------------------------------ helpers

  const frontEnemy = () => {
    let best = null;
    for (const e of enemies) {
      if (!e.alive || e.dying > 0) continue;
      if (!best || e.t > best.t) best = e;
    }
    return best;
  };

  const toPx = (t) => {
    const p = path.at(t);
    return { x: p.x * view.w, y: p.y * view.h, angle: p.angle };
  };

  // Keep the whole castle on screen even on a narrow phone, where a fixed 0.87
  // of the width would push half of it past the right edge.
  const castlePx = () => {
    const half = unitSize() * 0.85;
    return { x: Math.min(castle.x * view.w, view.w - half), y: castle.y * view.h };
  };

  const heroPx = () => {
    const c = castlePx();
    return { x: c.x - view.w * 0.1, y: c.y + view.h * 0.06 };
  };

  const unitSize = () => clamp(Math.min(view.w, view.h) * 0.17, 54, 128);

  /**
   * A stage that asks the same skill five times running, or repeats a question
   * verbatim, reads as a worksheet however good the individual questions are.
   * Two guards: the ramp is told what was asked recently so it can steer away,
   * and an exact repeat of anything still in the window is re-rolled.
   */
  function nextQuestion() {
    const sig = (q) => `${q.prompt}|${JSON.stringify(q.visual)}`;
    let q = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      q = makeQuestion(world, stage, {
        easeLevel,
        warmup: questionIndex < 2,
        index: questionIndex + attempt * 1000,
        seed: hash(world.id, stage, 'q'),
        recent: recentSkills,
      });
      if (!recentPrompts.includes(sig(q))) break;
    }
    recentSkills.unshift(q.skill);
    recentSkills.length = Math.min(recentSkills.length, 4);
    recentPrompts.unshift(sig(q));
    recentPrompts.length = Math.min(recentPrompts.length, 12);

    currentQuestion = q;
    questionIndex++;
    tries = 0;
    resolving = false;
    qpanel.show(currentQuestion, { band: world.band });
  }

  function awardCoins(n, fromX, fromY) {
    coinsEarned += n;
    game.save.addCoins(n);
    hud.setCoins(game.save.data.coins);
    const rect = game.screen.canvas.getBoundingClientRect();
    const target = hud.coinTarget(rect);
    for (let i = 0; i < Math.min(n, 6); i++) {
      particles.coinFly(fromX + (Math.random() - 0.5) * 30, fromY + (Math.random() - 0.5) * 20, target.x, target.y);
    }
    game.audio?.coin(streak);
  }

  function shoot(target) {
    const h = heroPx();
    heroCast = 0.4;
    game.audio?.shoot();
    projectiles.push({
      x: h.x, y: h.y - unitSize() * 0.7,
      target,
      // Practice shots (no monster on screen) still fire, into the sky.
      tx: target ? null : h.x + view.w * 0.2,
      ty: target ? null : -40,
      age: 0,
    });
  }

  function damage(enemy) {
    enemy.hp--;
    enemy.hitFlash = 0.28;
    enemy.recoil = 1;
    const p = toPx(enemy.t);
    particles.ring(p.x, p.y - unitSize() * 0.4);
    if (enemy.hp <= 0) {
      enemy.dying = 0.45;
      particles.poof(p.x, p.y - unitSize() * 0.4, enemy.boss ? '#ffd166' : '#fff3a8', enemy.boss ? 28 : 14);
      game.audio?.poof();
      if (enemy.boss) {
        particles.confetti(p.x, p.y - unitSize() * 0.5, 40);
        particles.kick(10);
      }
    } else {
      game.audio?.poof();
      if (enemy.boss) game.audio?.bossRoar();
    }
  }

  function onAnswer(index) {
    if (over || resolving) return;
    const q = currentQuestion;
    const correct = index === q.answerIndex;
    const target = frontEnemy();
    const hx = heroPx();
    attempts++;

    // Effort always pays — this is the core of the whole design.
    let coins = ECONOMY.coinsPerAttempt;

    if (correct) {
      resolving = true;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      coins += ECONOMY.coinsCorrectBonus;
      coins += Math.min(streak - 1, ECONOMY.streakBonusMax) * ECONOMY.streakBonusPerStep;
      if (target?.boss) coins *= ECONOMY.bossMultiplier;

      if (tries === 0) {
        correctCount++;
        missStreak = Math.max(0, missStreak - 1);
      }
      game.save.logAttempt(q.skill, true);
      qpanel.markCorrect(index);
      qpanel.setFeedback(tries === 0 ? praise(world.band, streak) : 'You worked it out! 💪', { kind: 'good' });
      game.audio?.correct();
      heroCheer = 0.8;
      awardCoins(coins, hx.x, hx.y - unitSize() * 0.6);
      shoot(target);
      easeLevel = clamp(Math.floor(missStreak / 2), 0, 2);
      setTimeout(() => { if (!over) nextQuestion(); }, 780);
    } else {
      streak = 0;
      tries++;
      game.save.logAttempt(q.skill, false);
      qpanel.markWrong(index);
      awardCoins(coins, hx.x, hx.y - unitSize() * 0.6);
      game.audio?.wrong();

      if (tries >= 2) {
        // Nobody gets stuck: show the answer, still pay for the attempt.
        assisted = true;
        missStreak++;
        easeLevel = clamp(Math.floor(missStreak / 2), 0, 2);
        qpanel.reveal(q.answerIndex);
        qpanel.setFeedback(say.reveal(), { kind: 'try', hint: q.explain });
        resolving = true;
        // The revealed button becomes "tap to continue".
        qpanel.buttons[q.answerIndex].onclick = () => {
          if (over) return;
          game.audio?.tap();
          qpanel.lock();
          shoot(frontEnemy());
          heroCheer = 0.5;
          setTimeout(() => { if (!over) nextQuestion(); }, 620);
        };
        announce(`The answer is ${q.choices[q.answerIndex].text}. Tap it to keep going.`);
      } else {
        qpanel.setFeedback(encourage(world.band), { kind: 'try', hint: q.hint });
      }
    }
  }

  function gateHit(enemy) {
    enemy.alive = false;
    particles.kick(9);
    castleHit = 0.5;
    game.audio?.thud();
    if (shields > 0) {
      shields--;
      game.save.data.shields = shields;
      game.save.save();
      hud.setShields(shields);
      const c = castlePx();
      particles.text(c.x, c.y - 40, 'Shield!', '#6fd3ff', 22);
      announce('A shield blocked the monster.');
    } else {
      hearts--;
      hud.setHearts(hearts, maxHearts);
      game.audio?.heartLost();
      const c = castlePx();
      particles.text(c.x, c.y - 40, '−1', '#ff5d7e', 26);
      announce(`A monster got through. ${plural(hearts, 'heart')} left.`);
      if (hearts <= 0) finish(false);
    }
  }

  function finish(won) {
    if (over) return;
    over = true;
    outcome = won;
    qpanel.lock();
    const stars = starsFor({
      won,
      heartsLeft: hearts,
      maxHearts,
      allEventuallyCorrect: won && !assisted,
    });
    // Capsule tokens come from finishing, not from being perfect — so a child
    // who struggles still collects monsters at a steady rate.
    let tokensEarned = 0;
    if (won) {
      tokensEarned = TOKENS.perStageClear + (stars >= 3 ? TOKENS.perThreeStar : 0);
      game.save.addTokens(tokensEarned);
    }
    if (won) {
      game.audio?.fanfare();
      const c = castlePx();
      particles.confetti(c.x, c.y - 60, 46);
      game.save.addCoins(ECONOMY.stageClearBonus);
      coinsEarned += ECONOMY.stageClearBonus;
    } else {
      game.audio?.softEnd();
    }
    game.save.data.stats.bestStreak = Math.max(game.save.data.stats.bestStreak || 0, bestStreak);
    // Read the old best before recordStage overwrites it, otherwise the results
    // screen would congratulate a "new best" on literally every run.
    const prevBest = game.save.bestFor(world.id)[stage - 1] || 0;
    game.save.recordStage(world.id, stage, stars, correctCount);

    setTimeout(() => {
      game.engine.go('results', {
        worldId: world.id, stage, won, stars, coins: coinsEarned,
        correct: correctCount, attempts, bestStreak, assisted, prevBest, tokensEarned,
      });
    }, won ? 1500 : 1100);
  }

  // -------------------------------------------------------------- backdrop

  function buildBackdrop() {
    const key = `${world.id}|${stage}|${Math.round(view.w)}x${Math.round(view.h)}`;
    if (backdropKey === key && backdrop) return;
    backdropKey = key;
    const cv = document.createElement('canvas');
    const dpr = game.screen.dpr;
    cv.width = Math.max(1, Math.round(view.w * dpr));
    cv.height = Math.max(1, Math.round(view.h * dpr));
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawSkyDecor(c, view, pal, 0);
    drawGround(c, view, pal, view.h * 0.22);

    // Scenery, seeded so a stage always looks the same.
    const rng = mulberry32(hash(world.id, stage, 'decor'));
    const props = ['tree', 'rock', 'bush'];
    for (let i = 0; i < 9; i++) {
      const name = props[Math.floor(rng() * props.length)];
      const size = 44 + rng() * 60;
      const x = rng() * view.w;
      const y = view.h * (0.3 + rng() * 0.68);
      const sp = game.sprites.prop(name, size, { color: name === 'rock' ? pal.groundDark : pal.prop });
      if (sp) c.drawImage(sp, x - size / 2, y - size, size, size);
    }

    // The path: a fat rounded band with a lighter core.
    const pts = path.points;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const bandW = clamp(Math.min(view.w, view.h) * 0.075, 26, 62);
    for (const [w, col] of [[bandW, pal.pathEdge], [bandW * 0.76, pal.path]]) {
      c.beginPath();
      c.moveTo(pts[0].x * view.w, pts[0].y * view.h);
      for (const p of pts) c.lineTo(p.x * view.w, p.y * view.h);
      c.lineWidth = w;
      c.strokeStyle = col;
      c.stroke();
    }
    // Dashed centre line, like stepping stones.
    c.save();
    c.setLineDash([10, 16]);
    c.beginPath();
    c.moveTo(pts[0].x * view.w, pts[0].y * view.h);
    for (const p of pts) c.lineTo(p.x * view.w, p.y * view.h);
    c.lineWidth = 3;
    c.strokeStyle = withAlpha('#ffffff', 0.5);
    c.stroke();
    c.restore();

    backdrop = cv;
  }

  // ------------------------------------------------------------------- scene

  return {
    enter(p, g) {
      game = g;
      world = worldById(p.worldId);
      stage = clamp(p.stage || 1, 1, STAGES_PER_WORLD);
      pal = palette(world.palette);

      const built = makeStagePath(world, stage);
      path = built.spline;
      castle = built.castle;
      plan = buildSpawns(world, stage);
      params = plan.params;

      enemies = [];
      spawnIdx = 0;
      projectiles = [];
      particles = new Particles();

      maxHearts = game.save.data.maxHearts;
      hearts = maxHearts;
      shields = game.save.data.shields;
      coinsEarned = 0;
      streak = 0;
      bestStreak = 0;
      time = 0;
      questionIndex = 0;
      recentSkills = [];
      recentPrompts = [];
      missStreak = 0;
      easeLevel = 0;
      assisted = false;
      correctCount = 0;
      attempts = 0;
      over = false;
      outcome = null;
      waveShown = 0;
      castleHit = 0;
      heroCast = 0;
      heroCheer = 0;
      blinkT = 0;
      backdrop = null;
      backdropKey = null;
      view = { w: game.screen.w, h: game.screen.h };

      hud = new Hud(game, {
        onPause: () => {
          game.engine.paused = true;
          openPause(game, {
            onResume: () => { game.engine.paused = false; },
            onQuit: () => { game.engine.paused = false; game.engine.go('map', { worldId: world.id }); },
          });
        },
        onShop: () => {
          game.engine.paused = true;
          openShop(game, {
            inStage: true,
            canRefill: hearts < maxHearts,
            onBuy: (what) => {
              if (what === 'heart' && hearts < maxHearts) {
                hearts++;
                hud.setHearts(hearts, maxHearts);
              }
              shields = game.save.data.shields;
              hud.setShields(shields);
              hud.setCoins(game.save.data.coins);
            },
            onClose: () => { game.engine.paused = false; },
          });
        },
      });
      clear(overlay());
      hud.mount(overlay());
      hud.setHearts(hearts, maxHearts);
      hud.setShields(shields);
      hud.setCoins(game.save.data.coins);
      hud.setWave(params.isBoss ? 'Boss Castle!' : 'Get ready!');

      qpanel = new QuestionPanel(game, { onAnswer });
      clear(panel());
      qpanel.mount(panel());
      nextQuestion();

      game.audio?.playTheme({ ...world.music, root: 55 + world.band });
      if (params.isBoss) game.audio?.bossRoar();
    },

    exit() {
      hud?.destroy();
      qpanel?.destroy();
      clear(overlay());
      clear(panel());
      backdrop = null;
    },

    onLayout(w, h) {
      view = { w, h };
      backdropKey = null;
    },

    update(dt) {
      time += dt;
      particles.update(dt);
      castleHit = Math.max(0, castleHit - dt);
      heroCast = Math.max(0, heroCast - dt);
      heroCheer = Math.max(0, heroCheer - dt);
      blinkT += dt;

      // Spawning.
      while (spawnIdx < plan.spawns.length && plan.spawns[spawnIdx].at <= time) {
        const s = plan.spawns[spawnIdx];
        enemies.push(makeEnemy(s, params, world, spawnIdx));
        if (s.wave !== waveShown) {
          waveShown = s.wave;
          hud.setWave(s.boss ? `BOSS · ${world.boss.name}` : `Wave ${s.wave} of ${plan.totalWaves}`);
          if (s.boss) game.audio?.bossRoar();
        }
        spawnIdx++;
      }

      // March.
      for (const e of enemies) {
        if (!e.alive) continue;
        if (e.dying > 0) {
          e.dying -= dt;
          if (e.dying <= 0) e.alive = false;
          continue;
        }
        e.hitFlash = Math.max(0, e.hitFlash - dt);
        e.recoil = Math.max(0, e.recoil - dt * 3);
        e.blinkAt -= dt;
        if (e.blinkAt <= 0) { e.blink = 0.18; e.blinkAt = 2.5 + Math.random() * 4; }
        e.blink = Math.max(0, e.blink - dt);
        e.t += e.speed * dt * (e.recoil > 0 ? -0.4 : 1);
        e.t = Math.max(0, e.t);
        if (e.t >= 1) gateHit(e);
      }
      enemies = enemies.filter((e) => e.alive || e.dying > 0);

      // Projectiles.
      for (const pr of projectiles) {
        pr.age += dt;
        const from = { x: pr.x, y: pr.y };
        const to = pr.target && pr.target.alive
          ? (() => { const q = toPx(pr.target.t); return { x: q.x, y: q.y - unitSize() * 0.45 }; })()
          : { x: pr.tx ?? from.x, y: pr.ty ?? from.y };
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        const step = COMBAT.projectileSpeed * dt;
        if (dist <= step) {
          pr.done = true;
          if (pr.target && pr.target.alive && pr.target.dying <= 0) damage(pr.target);
          else particles.poof(to.x, to.y, '#9ef2ff', 8);
        } else {
          pr.x += ((to.x - from.x) / dist) * step;
          pr.y += ((to.y - from.y) / dist) * step;
        }
      }
      projectiles = projectiles.filter((p) => !p.done && p.age < 3);

      // Win check.
      if (!over && spawnIdx >= plan.spawns.length && enemies.length === 0 && time > 2) {
        finish(true);
      }
    },

    render(ctx, v) {
      view = v;
      buildBackdrop();
      ctx.save();
      particles.applyShake(ctx, time);
      ctx.drawImage(backdrop, 0, 0, v.w, v.h);

      const size = unitSize();
      const c = castlePx();
      const cSize = size * 1.7;
      const dmg = maxHearts - hearts;
      const castleSprite = game.sprites.prop('castle', cSize, { damage: dmg });
      const shakeX = castleHit > 0 ? Math.sin(time * 60) * castleHit * 6 : 0;
      if (castleSprite) ctx.drawImage(castleSprite, c.x - cSize / 2 + shakeX, c.y - cSize * 0.86, cSize, cSize);

      // Hero.
      const h = heroPx();
      const heroSprite = game.sprites.hero(heroTier(world), size, {
        blink: (blinkT % 4.4) > 4.25 ? 1 : 0,
        cheer: heroCheer > 0 ? 1 : 0,
        cast: heroCast > 0 ? 1 : 0,
      });
      drawUnit(ctx, heroSprite, h.x, h.y, size, {
        squash: Math.sin(time * 3) * 0.02 + (heroCast > 0 ? 0.06 : 0),
      });

      // Monsters, back to front along the path.
      const sorted = [...enemies].sort((a, b) => a.t - b.t);
      for (const e of sorted) {
        const p = toPx(e.t);
        const s = size * e.sizeMul;
        const bob = Math.sin(time * 3.4 + e.phase) * 4;
        const squash = Math.sin(time * 6.8 + e.phase) * 0.045;
        const dyingT = e.dying > 0 ? 1 - e.dying / 0.45 : 0;
        let sprite = game.sprites.monster(e.archetype, world.palette, s, {
          armored: e.armored, elite: e.elite, blink: e.blink > 0 ? 1 : 0,
        });
        if (e.hitFlash > 0) sprite = game.sprites.flash(sprite, '#ffffff');
        drawUnit(ctx, sprite, p.x, p.y - bob, s, {
          squash: squash + dyingT * 0.5,
          alpha: e.dying > 0 ? 1 - dyingT : 1,
          flip: Math.cos(p.angle) < 0,
          lift: dyingT * 26,
        });

        if (e.maxHp > 1 && !e.boss && e.dying <= 0) {
          drawHpPips(ctx, p.x, p.y - s * 1.02, e.hp, e.maxHp, e.boss ? s * 0.9 : s * 0.55);
        }
      }

      // Projectiles.
      for (const pr of projectiles) {
        const bs = size * 0.36;
        const sp = game.sprites.prop('bolt', bs, {});
        if (sp) ctx.drawImage(sp, pr.x - bs / 2, pr.y - bs / 2, bs, bs);
      }

      particles.render(ctx);
      ctx.restore();

      // Boss banner.
      const boss = enemies.find((e) => e.boss && e.alive && e.dying <= 0);
      if (boss) drawBossBar(ctx, v, boss, world.boss.name);

      if (over) {
        ctx.save();
        ctx.fillStyle = withAlpha('#2b1b38', 0.35);
        ctx.fillRect(0, 0, v.w, v.h);
        ctx.textAlign = 'center';
        const msg = outcome ? say.stageWin() : 'Good try!';
        outlinedText(ctx, msg, v.w / 2, v.h * 0.42, `900 ${Math.min(v.w * 0.1, 54)}px ${FONT}`,
          outcome ? '#ffd34e' : '#ffb347', 8);
        ctx.restore();
      }
    },

    // Hooks used by the browser smoke tests (?debug=1).
    debugState() {
      return {
        world: world.id, stage, hearts, maxHearts, coinsEarned, enemies: enemies.length,
        spawnsLeft: plan.spawns.length - spawnIdx, over, outcome, correctCount, attempts,
        band: world.band,
        boss: enemies.some((e) => e.boss && e.alive),
        bossHp: enemies.find((e) => e.boss)?.hp ?? null,
      };
    },
    debugQuestion() {
      return currentQuestion
        ? {
          prompt: currentQuestion.prompt,
          answerIndex: currentQuestion.answerIndex,
          choices: currentQuestion.choices.map((c) => c.text),
          skill: currentQuestion.skill,
          visual: currentQuestion.visual,
          promptIcon: currentQuestion.promptIcon,
          tries,
        }
        : null;
    },
  };
}

function drawHpPips(ctx, x, y, hp, maxHp, width) {
  const w = width, h = 7;
  roundRectPath(ctx, x - w / 2, y, w, h, 3.5);
  ctx.fillStyle = withAlpha('#2b1b38', 0.55);
  ctx.fill();
  const seg = w / maxHp;
  for (let i = 0; i < hp; i++) {
    roundRectPath(ctx, x - w / 2 + i * seg + 1.5, y + 1.5, seg - 3, h - 3, 2.5);
    ctx.fillStyle = i === 0 ? '#ff7ab8' : '#ffd34e';
    ctx.fill();
  }
}

function drawBossBar(ctx, view, boss, name) {
  const w = Math.min(view.w * 0.62, 420);
  const x = (view.w - w) / 2;
  const y = view.h - 46;
  roundRectPath(ctx, x, y, w, 26, 13);
  ctx.fillStyle = withAlpha('#2b1b38', 0.8);
  ctx.fill();
  ink(ctx, 3, INK);
  const frac = clamp(boss.hp / boss.maxHp, 0, 1);
  if (frac > 0) {
    roundRectPath(ctx, x + 3, y + 3, Math.max(10, (w - 6) * frac), 20, 10);
    const g = ctx.createLinearGradient(0, y, 0, y + 26);
    g.addColorStop(0, '#ff9ec4');
    g.addColorStop(1, '#ff4f7e');
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.textAlign = 'center';
  outlinedText(ctx, `${name}  ${boss.hp}/${boss.maxHp}`, view.w / 2, y + 13, `900 15px ${FONT}`, '#fff8ec', 4);
}
