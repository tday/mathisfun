// The battle: monsters march the path, one live question at a time, and the
// ANSWER decides the fight. Wrong answers cost nothing directly — trying pays.

import { rng, hash, clamp, lerp } from '../core/utils.js';
import { PALETTES, withAlpha, INK } from '../gfx/palettes.js';
import { bank, drawSprite } from '../gfx/sprite.js';
import { drawEnemy, drawBoss, drawHero, ENEMIES } from '../gfx/sprites-units.js';
import { drawBackground, drawPathRibbon, drawCastle, drawProp, drawBolt } from '../gfx/sprites-world.js';
import { FX } from '../gfx/fx.js';
import { worldById } from '../data/worlds.js';
import { makeQuestion } from '../data/questions.js';
import { COINS, FLOW, PRAISE, MARCH, line } from '../data/tuning.js';
import { save, persist, addCoins, recordAttempt, setStageResult } from '../core/save.js';
import { Hud } from '../ui/hud.js';
import { QuestionPanel } from '../ui/questionPanel.js';
import { openPause, openShop } from '../ui/panels.js';
import { sfx } from '../audio/audio.js';
import { music } from '../audio/music.js';
import { stagePlan, makeStagePath, buildWaves } from './waves.js';

const ENEMY_BASE = 100; // logical sprite box

export class PlayScene {
  constructor(engine, uiRoot) {
    this.engine = engine;
    this.uiRoot = uiRoot;
  }

  enter({ worldId, stage }) {
    this.world = worldById(worldId);
    this.stage = stage;
    this.pal = PALETTES[this.world.theme];
    this.plan = stagePlan(this.world, stage);
    this.path = makeStagePath(this.world, stage);
    this.waves = buildWaves(this.world, stage, this.plan);
    this.rq = rng(hash('q', worldId, stage, save.stats.attempts));
    this.time = 0;
    this.phase = 'intro';
    this.banner = { text: `${this.world.name} — Stage ${stage}`, sub: 'Tap to defend the castle!', t: 1e9 };
    this.enemies = [];
    this.projectiles = [];
    this.fx = new FX();
    this.hearts = save.maxHearts;
    this.castleDamage = 0;
    this.waveIndex = -1;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.marchFreeze = 0;
    this.boss = null;
    this.bossSpawned = false;
    this.bossHits = 0;
    this.minionsSpawned = 0;
    // question state
    this.q = null;
    this.askDelay = 0.6;
    this.questionsAsked = 0;
    this.missesThisQ = 0;
    this.attemptCoinsThisQ = 0;
    this.stats = { attempts: 0, correct: 0, defeated: 0, escaped: 0, coins: 0 };
    this.allEventuallyCorrect = true;
    this.streak = 0;
    this.missRun = 0;
    this.correctRun = 0;
    this.ease = 0;
    this.heroCast = 0;
    this.celebrate = 0;
    this.bgCanvas = null;

    // DOM
    this.dom = document.createElement('div');
    this.dom.className = 'scene-play';
    this.uiRoot.appendChild(this.dom);
    this.hud = new Hud(this.dom, {
      onPause: () => openPause({
        onQuit: () => this.engine.go('map', { worldId: this.world.id }),
        onRestart: () => this.engine.go('play', { worldId: this.world.id, stage: this.stage }),
      }),
    });
    this.panel = new QuestionPanel(this.dom, this.pal);
    this.panel.message('Tap the battlefield to begin!');
    this.shopBtn = document.createElement('button');
    this.shopBtn.type = 'button';
    this.shopBtn.className = 'btn btn-shop';
    this.shopBtn.textContent = '🛒';
    this.shopBtn.setAttribute('aria-label', 'Shop');
    this.shopBtn.addEventListener('click', () => {
      sfx.tap();
      openShop({
        inStage: {
          hearts: () => this.hearts,
          refill: () => { this.hearts = Math.min(save.maxHearts, this.hearts + 1); sfx.heart(); },
        },
      });
    });
    this.dom.appendChild(this.shopBtn);
    music.start(this.world.music);
    this.prebake();
  }

  exit() {
    this.hud.destroy();
    this.panel.destroy();
    this.dom.remove();
  }

  prebake() {
    // bake every sprite variant this stage can need
    for (let i = 0; i < this.world.enemies.length; i++) {
      const type = this.world.enemies[i];
      const color = this.pal.monsters[i % this.pal.monsters.length];
      for (const armor of [false, true]) {
        for (const blink of [false, true]) {
          bank.bake(`e:${this.world.id}:${type}:${armor}:${blink}`, ENEMY_BASE, ENEMY_BASE,
            (c) => drawEnemy(c, type, color, { armor, blink, elite: this.world.indexInBand === 1 }));
        }
      }
    }
    for (const blink of [false, true]) {
      bank.bake(`boss:${this.world.id}:${blink}`, ENEMY_BASE, ENEMY_BASE,
        (c) => drawBoss(c, this.pal.accent, { blink }));
    }
    for (const cast of [false, true]) {
      bank.bake(`hero:${this.world.band}:${cast}`, ENEMY_BASE, ENEMY_BASE,
        (c) => drawHero(c, this.world.band, { cast }));
    }
    bank.bake('bolt', 40, 40, (c) => drawBolt(c), { x: 0.5, y: 0.5 });
    bank.bake(`castle:${this.world.theme}`, 120, 120, (c) => drawCastle(c, this.pal), { x: 0.5, y: 0.93 });
  }

  onLayout(w, h) {
    this.w = w; this.h = h;
    const panelH = this.panel?.height || 180;
    this.rect = { x: 0, y: 56, w, h: Math.max(140, h - panelH - 72) };
    this.unit = clamp(Math.min(w, this.rect.h) * 0.16, 46, 88);
    // the path lives on the ground band, below the scenery horizon
    this.groundTop = this.rect.y + this.rect.h * 0.3;
    this.groundBot = this.rect.y + this.rect.h;
    this.bgCanvas = null; // rebuild lazily in render
  }

  toPx(nx, ny) {
    return {
      x: nx * (this.w - this.unit * 1.15),
      y: this.groundTop + ny * (this.groundBot - this.groundTop),
    };
  }

  buildBg() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas');
    c.width = this.w * dpr; c.height = this.h * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    const r = rng(hash('bg', this.world.id, this.stage));
    drawBackground(ctx, this.w, this.h, this.pal, r, {
      horizon: (this.rect.y + this.rect.h * 0.16) / this.h,
      ground: (this.groundTop - this.unit * 0.2) / this.h,
    });
    drawPathRibbon(ctx, this.path, (x, y) => this.toPx(x, y), Math.max(26, this.unit * 0.52), this.pal);
    // scatter props alongside the path
    const kinds = this.pal.props;
    for (let i = 0; i < 12; i++) {
      const t = 0.08 + r() * 0.8;
      const p = this.path.at(t);
      const side = r() < 0.5 ? -1 : 1;
      const off = 0.12 + r() * 0.1;
      const nx = p.x + Math.cos(p.angle + side * Math.PI / 2) * off;
      const ny = p.y + Math.sin(p.angle + side * Math.PI / 2) * off * 1.4;
      if (nx < 0.02 || nx > 0.95 || ny < 0.02 || ny > 0.97) continue;
      const kind = kinds[Math.floor(r() * kinds.length)];
      const px = this.toPx(nx, ny);
      const s = this.unit * (0.5 + r() * 0.3);
      const e = bank.bake(`prop:${this.world.theme}:${kind}`, 60, 60, (cc) => drawProp(cc, kind, this.pal), { x: 0.5, y: 0.93 });
      ctx.drawImage(e.canvas, px.x - s / 2, px.y - s * 0.86, s, s);
    }
    this.bgCanvas = c;
  }

  // ---------- flow ---------------------------------------------------------

  startBattle() {
    this.phase = 'playing';
    this.banner.t = 0;
    this.nextWave();
  }

  nextWave() {
    this.waveIndex++;
    if (this.waveIndex >= this.waves.length) {
      if (this.plan.isBoss && !this.bossSpawned) { this.spawnBoss(); return; }
      this.winStage();
      return;
    }
    this.spawnQueue = [...this.waves[this.waveIndex]];
    this.spawnTimer = 1.6;
    const total = this.plan.isBoss ? this.waves.length + 1 : this.waves.length;
    this.banner = { text: `Wave ${this.waveIndex + 1} of ${total}`, sub: '', t: 1.6 };
    sfx.wave();
    if (!this.q) this.panel.message(`Wave ${this.waveIndex + 1} — get ready!`);
  }

  spawnBoss() {
    this.bossSpawned = true;
    this.boss = {
      type: 'boss', boss: true, t: 0, hp: this.plan.bossHp, maxHp: this.plan.bossHp,
      speedMul: 1, alive: true, bob: Math.random() * 6, colorIndex: 0, armor: false, elite: false,
    };
    this.enemies.push(this.boss);
    this.banner = { text: `${this.world.bossName} appears!`, sub: 'Answer to strike!', t: 2.2 };
    this.fx.shakeIt(8);
    sfx.thud();
  }

  spawnMinion() {
    const pool = this.waves[0] || [];
    const def = pool[this.minionsSpawned % Math.max(1, pool.length)] ||
      { type: this.world.enemies[0], armor: false, hp: 1, elite: false, speedMul: 1, colorIndex: 0 };
    this.enemies.push({ ...def, t: 0, alive: true, bob: Math.random() * 6, boss: false });
    this.minionsSpawned++;
  }

  aliveEnemies() { return this.enemies.filter((e) => e.alive); }
  frontEnemy() {
    let best = null;
    for (const e of this.aliveEnemies()) if (!best || e.t > best.t) best = e;
    return best;
  }

  askQuestion() {
    const warmup = this.questionsAsked < FLOW.warmupQuestions;
    this.q = makeQuestion(this.world, this.stage, { ease: this.ease, warmup }, this.rq);
    this.questionsAsked++;
    this.missesThisQ = 0;
    this.attemptCoinsThisQ = 0;
    this.panel.ask(this.q, (idx, meta) => this.answer(idx, meta));
  }

  answer(idx, { revealed }) {
    if (this.phase !== 'playing' || !this.q) return;
    const q = this.q;
    const correct = idx === q.answerIndex;
    this.stats.attempts++;
    recordAttempt(q.skill, correct && !revealed);
    let coinsGained = 0;
    if (this.attemptCoinsThisQ < COINS.attemptCapPerQuestion) {
      coinsGained += COINS.attempt;
      this.attemptCoinsThisQ++;
    }
    if (correct) {
      const target = this.frontEnemy();
      if (!revealed) {
        this.streak++;
        this.stats.correct++;
        save.stats.bestStreak = Math.max(save.stats.bestStreak, this.streak);
        coinsGained += COINS.correctBonus + clamp(this.streak - 1, 0, COINS.streakCap);
        this.correctRun++;
        if (this.correctRun >= 2) { this.ease = Math.max(0, this.ease - 1); this.correctRun = 0; }
      }
      this.missRun = 0;
      if (target?.boss) coinsGained *= COINS.bossMult;
      addCoins(coinsGained);
      this.stats.coins += coinsGained;
      const praise = revealed ? line(PRAISE.effortShort)
        : this.streak >= 3 ? `${line(PRAISE.streak)} ${this.streak} in a row!`
        : line(this.world.band <= 1 ? PRAISE.correctShort : PRAISE.correct);
      this.panel.markCorrect(idx, praise, `+${coinsGained} 🪙`);
      if (!revealed) sfx.correct(this.streak);
      this.fireAt(target);
      this.q = null;
      this.askDelay = FLOW.newQuestionDelay;
    } else {
      addCoins(coinsGained);
      this.stats.coins += coinsGained;
      this.streak = 0;
      this.correctRun = 0;
      this.missesThisQ++;
      this.missRun++;
      if (this.missRun >= FLOW.easeUpAfterMisses) {
        this.ease = Math.min(FLOW.easeMax, this.ease + 1);
        this.missRun = 0;
      }
      if (this.missesThisQ >= FLOW.glowAfterMisses) {
        this.panel.reveal(q.explain, line(PRAISE.reveal));
      } else {
        this.panel.markWrong(idx, q.hint, line(this.world.band <= 1 ? PRAISE.effortShort : PRAISE.effort));
      }
    }
    persist();
  }

  fireAt(target) {
    this.heroCast = 0.45;
    if (!target) return;
    const hp = this.heroPos();
    sfx.whoosh();
    this.projectiles.push({ x0: hp.x, y0: hp.y - this.unit * 0.9, target, t: 0 });
  }

  hitEnemy(e) {
    const pos = this.enemyPx(e);
    if (e.boss) {
      this.bossHits++;
      e.hp--;
      e.t = Math.max(0, e.t - MARCH.bossKnockback);
      e.hurt = 0.5;
      sfx.bossHit();
      this.fx.sparkle(pos.x, pos.y - this.unit, '#ffd150', 10);
      this.fx.shakeIt(5);
      if (e.hp <= 0) {
        e.alive = false;
        this.stats.defeated++;
        this.fx.poof(pos.x, pos.y - this.unit, this.pal.accent);
        this.fx.coinBurst(pos.x, pos.y - this.unit, 10);
        sfx.poof();
        this.winStage();
        return;
      }
      if (this.bossHits % 3 === 0 && this.minionsSpawned < 3) this.spawnMinion();
      return;
    }
    e.hp--;
    if (e.hp > 0) {
      e.armor = false; // armor pops off
      this.fx.sparkle(pos.x, pos.y - this.unit * 0.6, '#cdd6e8', 8);
      this.fx.floatText(pos.x, pos.y - this.unit, 'Armor break!', '#5ab8ff', 16);
      sfx.pop();
      return;
    }
    e.alive = false;
    this.stats.defeated++;
    this.fx.poof(pos.x, pos.y - this.unit * 0.5, this.pal.monsters[e.colorIndex % this.pal.monsters.length]);
    this.fx.coinBurst(pos.x, pos.y - this.unit * 0.5, 5);
    sfx.poof();
  }

  breach(e) {
    e.alive = false;
    this.marchFreeze = FLOW.gateGraceSec;
    const gp = this.toPx(0.92, 0.62);
    if (!e.boss) this.stats.escaped++;
    if (save.shields > 0) {
      save.shields--;
      this.fx.floatText(gp.x, gp.y - this.unit * 1.6, 'Shield!', '#5ab8ff', 20);
      this.fx.sparkle(gp.x, gp.y - this.unit, '#5ab8ff', 12);
      sfx.pop();
    } else {
      this.hearts--;
      this.castleDamage++;
      this.fx.floatText(gp.x, gp.y - this.unit * 1.6, '-1 ❤', '#ff6f9c', 20);
      this.fx.shakeIt(9);
      sfx.thud();
    }
    if (e.boss) {
      // the boss never despawns: it retreats and comes back for more
      e.alive = true;
      e.t = MARCH.bossRetreatTo;
    }
    if (this.hearts <= 0) this.loseStage();
    persist();
  }

  computeStars() {
    let stars = this.hearts >= save.maxHearts ? 3 : this.hearts / save.maxHearts >= 0.5 ? 2 : 1;
    if (this.allEventuallyCorrect && this.questionsAsked > 0) stars = Math.min(3, stars + 1);
    return stars;
  }

  winStage() {
    if (this.phase !== 'playing') return;
    this.phase = 'won';
    if (this.q && this.missesThisQ > 0) this.allEventuallyCorrect = false;
    this.celebrate = 2.4;
    const stars = this.computeStars();
    this.result = {
      won: true, stars,
      defeated: this.stats.defeated, escaped: this.stats.escaped,
      attempts: this.stats.attempts, correct: this.stats.correct,
      coins: this.stats.coins,
      prevBest: setStageResult(this.world.id, this.stage, stars, this.stats.defeated),
      persevered: this.allEventuallyCorrect,
    };
    save.last = `${this.world.id}/${this.stage}`;
    persist();
    this.banner = { text: 'Castle saved!', sub: '', t: 2.4 };
    this.panel.message('You did it! 🎉');
    this.fx.confetti(this.w, this.h, [this.pal.accent, '#ffd150', '#7a5cff', '#54c26e', '#ff6f9c']);
    sfx.fanfare();
  }

  loseStage() {
    if (this.phase !== 'playing') return;
    this.phase = 'lost';
    this.celebrate = 2.2;
    this.result = {
      won: false, stars: 0,
      defeated: this.stats.defeated, escaped: this.stats.escaped,
      attempts: this.stats.attempts, correct: this.stats.correct,
      coins: this.stats.coins, prevBest: 0, persevered: false,
    };
    persist();
    this.banner = { text: 'The castle needs a rest…', sub: 'You keep every coin you earned!', t: 2.2 };
    this.panel.message('Great effort! Try again — you keep all your coins! 💪');
    sfx.softLose();
  }

  // ---------- update -------------------------------------------------------

  update(dt) {
    this.time += dt;
    this.fx.update(dt);
    this.heroCast = Math.max(0, this.heroCast - dt);
    if (this.banner.t < 1e8) this.banner.t -= dt;
    // battlefield shrinks/grows if the question card changed height a lot
    this.frame = (this.frame || 0) + 1;
    if (this.frame % 30 === 0 && this.w) {
      const ph = this.panel.height || 180;
      if (Math.abs(ph - (this.lastPanelH || 0)) > 30) {
        this.lastPanelH = ph;
        this.onLayout(this.w, this.h);
      }
    }

    if (this.phase === 'won' || this.phase === 'lost') {
      this.celebrate -= dt;
      if (this.celebrate <= 0) {
        this.engine.go('results', { worldId: this.world.id, stage: this.stage, result: this.result });
      }
      return;
    }
    if (this.phase !== 'playing') return;

    // spawning
    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const def = this.spawnQueue.shift();
        this.enemies.push({ ...def, t: 0, alive: true, bob: Math.random() * 6, boss: false });
        this.spawnTimer = def.gap;
      }
    }

    // march
    if (this.marchFreeze > 0) this.marchFreeze -= dt;
    else {
      for (const e of this.aliveEnemies()) {
        const sp = e.boss ? this.plan.bossSpeed : this.plan.speed * e.speedMul;
        e.t += sp * dt;
        if (e.hurt) e.hurt = Math.max(0, e.hurt - dt);
        if (e.t >= 1) this.breach(e);
      }
    }

    // projectiles
    for (const p of this.projectiles) {
      p.t += dt / 0.28;
      if (p.t >= 1 && !p.done) { p.done = true; if (p.target.alive) this.hitEnemy(p.target); }
    }
    this.projectiles = this.projectiles.filter((p) => !p.done);

    // wave clear -> next
    if (!this.spawnQueue.length && this.aliveEnemies().length === 0 && this.projectiles.length === 0) {
      if (this.q) { this.q = null; }
      this.nextWave();
    }

    // question cadence
    if (!this.q && this.phase === 'playing') {
      this.askDelay -= dt;
      if (this.askDelay <= 0 && this.aliveEnemies().length > 0) this.askQuestion();
    }

    this.hud.update({
      hearts: this.hearts, maxHearts: save.maxHearts, shields: save.shields,
      waveText: this.plan.isBoss && this.bossSpawned
        ? `👑 ${this.world.bossName}`
        : `Wave ${Math.max(1, this.waveIndex + 1)}/${this.plan.isBoss ? this.waves.length + 1 : this.waves.length}`,
    });
  }

  onPointer(e) {
    if (e.type !== 'down') return;
    if (this.phase === 'intro') { this.startBattle(); sfx.tap(); }
    else if ((this.phase === 'won' || this.phase === 'lost') && this.celebrate > 0.3) this.celebrate = 0.3;
  }

  // ---------- render -------------------------------------------------------

  heroPos() {
    const g = this.toPx(0.8, 0.88);
    return { x: g.x, y: g.y };
  }

  enemyPx(e) {
    const p = this.path.at(clamp(e.t, 0, 1));
    const px = this.toPx(p.x, p.y);
    const meta = e.boss ? { floats: false } : ENEMIES[e.type];
    if (meta.floats) px.y -= this.unit * (0.22 + Math.sin(this.time * 2.4 + e.bob) * 0.08);
    return px;
  }

  render(ctx, w, h) {
    if (!this.rect) this.onLayout(w, h);
    if (!this.bgCanvas) this.buildBg();
    const sh = this.fx.shakeOffset;
    ctx.save();
    ctx.translate(sh.x, sh.y);
    ctx.drawImage(this.bgCanvas, 0, 0, w, h);

    // castle (live: shows damage)
    const cp = this.toPx(0.92, 0.62);
    const castleEntry = bank.bake(`castle:${this.world.theme}`, 120, 120, () => {}, { x: 0.5, y: 0.93 });
    const cs = this.unit * 2.5;
    ctx.drawImage(castleEntry.canvas, cp.x - cs * 0.5, cp.y - cs * 0.93 + this.unit * 0.55, cs, cs);

    // enemies, sorted so closer-to-gate draws on top
    const list = this.aliveEnemies().sort((a, b) => a.t - b.t);
    for (const e of list) {
      const px = this.enemyPx(e);
      const isBlink = ((this.time * 0.9 + e.bob) % 3.1) < 0.1;
      const key = e.boss ? `boss:${this.world.id}:${isBlink}` : `e:${this.world.id}:${e.type}:${!!e.armor}:${isBlink}`;
      const entry = bank.cache.get(key) || bank.cache.get(key.replace(/:true$/, ':false'));
      if (!entry) continue;
      const scale = (this.unit / ENEMY_BASE) * (e.boss ? 2.1 : 1);
      const squash = e.boss
        ? Math.sin(this.time * 3 + e.bob) * 0.03
        : Math.sin(this.time * 7 + e.bob) * 0.055;
      drawSprite(ctx, entry, px.x, px.y, scale, { squash, rot: e.hurt ? Math.sin(this.time * 40) * 0.08 : 0 });
      this.drawShadowAndPips(ctx, e, px, scale);
    }

    // hero
    const hp = this.heroPos();
    const heroEntry = bank.cache.get(`hero:${this.world.band}:${this.heroCast > 0.15}`);
    if (heroEntry) {
      drawSprite(ctx, heroEntry, hp.x, hp.y, (this.unit / ENEMY_BASE) * 1.18,
        { squash: Math.sin(this.time * 4) * 0.03 });
    }

    // projectiles: arcing star bolts
    const bolt = bank.cache.get('bolt');
    for (const p of this.projectiles) {
      const tp = this.enemyPx(p.target);
      const tx = lerp(p.x0, tp.x, p.t);
      const ty = lerp(p.y0, tp.y - this.unit * 0.5, p.t) - Math.sin(p.t * Math.PI) * this.unit * 1.1;
      if (bolt) drawSprite(ctx, bolt, tx, ty, this.unit / 70, { rot: this.time * 12 });
      this.fx.parts.push({
        x: tx, y: ty, vx: 0, vy: 0, life: 0.18, maxLife: 0.18,
        size: 2.5, color: withAlpha('#ffd150', 0.7), kind: 'circle', rot: 0,
      });
    }

    // boss hp bar
    if (this.boss?.alive && this.bossSpawned) this.drawBossBar(ctx, w);

    this.fx.draw(ctx);
    ctx.restore();

    // banner text
    if (this.banner.t > 0) {
      const a = this.phase === 'intro' ? 1 : clamp(this.banner.t, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      const cy = this.rect.y + this.rect.h * 0.34;
      ctx.font = `800 ${clamp(w * 0.055, 22, 40)}px 'Chalkboard SE','Comic Sans MS',system-ui,sans-serif`;
      ctx.lineWidth = 7; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round';
      ctx.strokeText(this.banner.text, w / 2, cy);
      ctx.fillStyle = INK;
      ctx.fillText(this.banner.text, w / 2, cy);
      if (this.banner.sub) {
        ctx.font = `700 ${clamp(w * 0.032, 15, 22)}px system-ui,sans-serif`;
        ctx.lineWidth = 5; ctx.strokeText(this.banner.sub, w / 2, cy + clamp(w * 0.06, 28, 40));
        ctx.fillText(this.banner.sub, w / 2, cy + clamp(w * 0.06, 28, 40));
      }
      ctx.restore();
    }
  }

  drawShadowAndPips(ctx, e, px, scale) {
    // armored: little hp pips above
    if (!e.boss && e.armor && e.hp > 1) {
      ctx.fillStyle = withAlpha('#cdd6e8', 0.95);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      for (let i = 0; i < e.hp; i++) {
        ctx.beginPath();
        ctx.arc(px.x - 8 + i * 16, px.y - this.unit * (e.boss ? 2.2 : 1.18), 5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
    }
  }

  drawBossBar(ctx, w) {
    const bw = Math.min(w * 0.6, 360), bh = 16;
    const x = w / 2 - bw / 2, y = this.rect.y + 8;
    ctx.save();
    ctx.font = `800 13px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = '#fff';
    ctx.strokeText(this.world.bossName, w / 2, y - 4);
    ctx.fillStyle = INK; ctx.fillText(this.world.bossName, w / 2, y - 4);
    ctx.fillStyle = withAlpha(INK, 0.25);
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 8); ctx.fill();
    const frac = Math.max(0, this.boss.hp / this.boss.maxHp);
    ctx.fillStyle = frac > 0.5 ? '#54c26e' : frac > 0.25 ? '#ffb84f' : '#ff6f9c';
    if (frac > 0) { ctx.beginPath(); ctx.roundRect(x + 2, y + 2, (bw - 4) * frac, bh - 4, 6); ctx.fill(); }
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 8); ctx.stroke();
    ctx.restore();
  }

  // e2e/debug hook
  debugState() {
    return {
      phase: this.phase,
      question: this.q,
      hearts: this.hearts,
      enemies: this.aliveEnemies().length,
      stats: { ...this.stats },
      waveIndex: this.waveIndex,
    };
  }
}
