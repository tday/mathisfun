// Modal sheets: shop, settings, pause, the gacha capsule machine and the
// monster collection album.

import { el, button, showModal, spriteImg, clear, announce } from './dom.js';
import { PRICES, TOKENS } from '../data/tuning.js';
import { WORLDS } from '../data/worlds.js';
import { MONSTERS } from '../gfx/sprites-units.js';
import { plural } from '../core/utils.js';

const coinIcon = (game, size = 22) => spriteImg(game.sprites.prop('coin', size), size, 'coins');

function coinsLine(game) {
  return el('p', { class: 'sub' }, `You have ${plural(game.save.data.coins, 'coin')}`);
}

// ------------------------------------------------------------------- the shop

export function openShop(game, { inStage = false, canRefill = true, onBuy, onClose } = {}) {
  const save = game.save;

  const render = () => {
    const body = el('div');
    body.append(
      el('h2', {}, 'Monster Shop'),
      coinsLine(game),
    );

    const grid = el('div', { class: 'shop-grid' });
    const item = (icon, name, desc, price, canBuy, buy) => {
      const card = el('div', { class: `shop-item${canBuy ? '' : ' owned'}` },
        spriteImg(game.sprites.prop(icon, 54), 54, name),
        el('div', { class: 'name' }, name),
        el('div', { class: 'desc' }, desc),
      );
      card.append(button(
        canBuy ? `${price} 🪙` : '✓ Maxed',
        { cls: canBuy && save.data.coins >= price ? 'primary' : '', audio: game.audio, disabled: !canBuy || save.data.coins < price },
        () => {
          if (!save.spendCoins(price)) return;
          buy();
          game.audio?.coin();
          announce(`${name} bought.`);
          refresh();
          onBuy?.();
        },
      ));
      return card;
    };

    grid.append(item('shield', 'Shield', 'Blocks one monster from reaching the gate.',
      PRICES.shield, true, () => { save.data.shields++; save.save(); }));

    // Only offer a refill when there is actually a heart missing — otherwise a
    // child can spend 30 coins on nothing.
    if (inStage && canRefill) {
      grid.append(item('heart', 'Refill a heart', 'Get one heart back right now.',
        PRICES.heartRefill, true, () => { onBuy?.('heart'); }));
    }

    if (save.data.maxHearts < 4) {
      grid.append(item('heart', '4th Heart', 'Keeps a heart forever — more room for mistakes.',
        PRICES.heart4, true, () => { save.data.maxHearts = 4; save.save(); }));
    } else if (save.data.maxHearts < 5) {
      grid.append(item('heart', '5th Heart', 'One more heart, forever.',
        PRICES.heart5, true, () => { save.data.maxHearts = 5; save.save(); }));
    } else {
      grid.append(item('heart', 'Hearts', 'You have all five hearts!', 0, false, () => {}));
    }

    body.append(grid);
    body.append(el('div', { class: 'row' }, button('Done', { cls: 'primary', audio: game.audio }, () => close())));
    return body;
  };

  const close = showModal(render(), { onClose });
  const refresh = () => {
    const host = document.getElementById('modal');
    const sheet = host.querySelector('.sheet');
    if (sheet) { clear(sheet); sheet.append(render()); }
  };
  return close;
}

// -------------------------------------------------------------------- settings

export function openSettings(game) {
  const s = game.save.data.settings;
  const body = el('div');
  body.append(el('h2', {}, 'Settings'));

  const muteBtn = button(s.muted ? 'Sound is OFF' : 'Sound is ON', {
    cls: s.muted ? '' : 'mint', audio: game.audio, icon: s.muted ? 'iconSoundOff' : 'iconSoundOn', game,
  }, () => {
    const m = !game.save.data.settings.muted;
    game.audio.setMuted(m);
    game.save.save();
    clear(muteBtn);
    muteBtn.append(spriteImg(game.sprites.prop(m ? 'iconSoundOff' : 'iconSoundOn', 26), 26),
      el('span', {}, m ? 'Sound is OFF' : 'Sound is ON'));
    muteBtn.className = `btn ${m ? '' : 'mint'}`;
  });
  body.append(el('div', { class: 'row', style: { marginBottom: '10px' } }, muteBtn));

  const slider = (label, value, onInput) => {
    const input = el('input', { type: 'range', min: '0', max: '100', value: String(Math.round(value * 100)) });
    input.addEventListener('input', () => onInput(Number(input.value) / 100));
    return el('label', { class: 'slider-row' }, el('span', {}, label), input);
  };
  body.append(
    slider('Music', s.music, (v) => { game.audio.setMusicVolume(v); game.save.save(); }),
    slider('Sounds', s.sfx, (v) => { game.audio.setSfxVolume(v); game.save.save(); }),
  );

  const st = game.save.data.stats;
  const pct = st.attempts ? Math.round((st.correct / st.attempts) * 100) : 0;
  body.append(el('p', { class: 'sub', style: { marginTop: '14px' } },
    `You have tried ${plural(st.attempts, 'question')} and got ${st.correct} right (${pct}%). Every single try helped!`));

  const danger = button('Start over', { cls: 'small', audio: game.audio }, () => {
    const confirmBody = el('div', {},
      el('h2', {}, 'Start over?'),
      el('p', { class: 'sub' }, 'This erases all stars, coins and monsters. It cannot be undone.'),
      el('div', { class: 'row' },
        button('Keep my progress', { cls: 'primary', audio: game.audio }, () => closeConfirm()),
        button('Erase everything', { cls: 'pink', audio: game.audio }, () => {
          game.save.reset();
          closeConfirm();
          close();
          game.engine.go('title');
        })),
    );
    const closeConfirm = showModal(confirmBody);
  });

  body.append(el('div', { class: 'row', style: { marginTop: '12px' } },
    button('Done', { cls: 'primary', audio: game.audio }, () => close()), danger));

  const close = showModal(body);
  return close;
}

// ----------------------------------------------------------------------- pause

export function openPause(game, { onResume, onQuit }) {
  const body = el('div');
  body.append(
    el('h2', {}, 'Paused'),
    el('p', { class: 'sub' }, 'Take your time — there is no timer in this game.'),
    el('div', { class: 'row' },
      button('Keep playing', { cls: 'primary', audio: game.audio, icon: 'iconPlay', game }, () => close()),
      button('Leave stage', { cls: 'ghost', audio: game.audio, icon: 'iconMap', game }, () => { close(); onQuit?.(); }),
    ),
  );
  const close = showModal(body, { onClose: onResume, dismissable: false });
  return close;
}

// ------------------------------------------------------------------ collection

/** Every figure the game can produce: each world's monsters plus its boss. */
export function allFigures() {
  const out = [];
  for (const w of WORLDS) {
    for (const m of w.enemies) out.push({ id: `${w.id}:${m}`, world: w, archetype: m, boss: false });
    out.push({ id: `${w.id}:dragon`, world: w, archetype: 'dragon', boss: true });
  }
  return out;
}

/** Figures the player can currently pull — only from worlds they have played. */
export function availableFigures(save) {
  const played = new Set(Object.entries(save.data.stars)
    .filter(([, arr]) => arr.some((s) => s > 0))
    .map(([id]) => id));
  if (played.size === 0) played.add(WORLDS[0].id);
  return allFigures().filter((f) => played.has(f.world.id));
}

export function openCollection(game) {
  const save = game.save;
  const figures = allFigures();
  const owned = figures.filter((f) => save.hasFigure(f.id)).length;

  const body = el('div');
  body.append(
    el('h2', {}, 'My Monsters'),
    el('p', { class: 'sub' }, `${owned} of ${figures.length} figures collected`),
  );

  for (const w of WORLDS) {
    const mine = figures.filter((f) => f.world.id === w.id);
    if (!mine.some((f) => save.hasFigure(f.id))) continue;
    body.append(el('h3', { style: { margin: '12px 0 4px', fontSize: '1rem' } }, `${w.name} · ${w.bandName}`));
    const grid = el('div', { class: 'collection' });
    for (const f of mine) {
      const has = save.hasFigure(f.id);
      const fig = el('figure', { class: has ? '' : 'locked' });
      if (has) {
        fig.append(spriteImg(game.sprites.monster(f.archetype, w.palette, 60, { elite: f.boss }), 60,
          MONSTERS[f.archetype].name));
      } else {
        fig.append(spriteImg(game.sprites.prop('lock', 44), 60, 'Not found yet'));
      }
      const count = save.data.collection[f.id] || 0;
      fig.append(el('figcaption', {}, has ? (f.boss ? `★ ${w.boss.name}` : MONSTERS[f.archetype].name) : '???'));
      if (count > 1) fig.append(el('div', { class: 'dupes' }, `×${count}`));
      grid.append(fig);
    }
    body.append(grid);
  }

  if (owned === 0) {
    body.append(el('p', { class: 'sub' }, 'Play a stage, then visit the capsule machine on the map to find your first figure!'));
  }

  body.append(el('div', { class: 'row' }, button('Done', { cls: 'primary', audio: game.audio }, () => close())));
  const close = showModal(body);
  return close;
}

// ---------------------------------------------------------------------- gacha

/**
 * Capsule machine. Coins in, a monster figure out — duplicates convert to coins
 * so a repeat never feels like a loss. No real money anywhere in this game.
 */
/**
 * The capsule machine.
 *
 * Priced in tokens, not coins, and the budget is worked through on screen:
 * a child sees their tokens as objects, sees how many the capsule takes, and
 * sees the subtraction that is about to happen. Spending becomes the lesson.
 * No real money is involved anywhere.
 */
export function openGacha(game) {
  const save = game.save;
  const COST = TOKENS.capsuleCost;

  /** A row of token icons, with the ones about to be spent greyed out. */
  const tokenRow = (count, spending = 0) => {
    const row = el('div', { class: 'token-row' });
    const shown = Math.min(count, 10);
    for (let i = 0; i < shown; i++) {
      row.append(spriteImg(game.sprites.prop('token', 44, { spent: i < spending }), 44));
    }
    if (count > shown) row.append(el('span', { class: 'token-more' }, `+${count - shown}`));
    if (count === 0) row.append(el('span', { class: 'token-more' }, 'none yet'));
    return row;
  };

  /** have − cost = left, laid out big enough to read and follow. */
  const sumLine = (have, cost) => el('div', { class: 'token-sum' },
    el('b', {}, String(have)), el('span', {}, '−'),
    el('b', {}, String(cost)), el('span', {}, '='),
    el('b', { class: 'result' }, String(Math.max(0, have - cost))));

  const render = (result) => {
    const have = save.data.tokens || 0;
    const body = el('div');
    body.append(el('h2', {}, 'Capsule Machine'));

    if (!result) {
      const canAfford = have >= COST;
      body.append(
        el('div', { style: { textAlign: 'center' } },
          spriteImg(game.sprites.prop('gachaMachine', 116), 116, 'Capsule machine')),
        el('p', { class: 'sub', style: { marginBottom: '4px' } }, 'Your tokens'),
        tokenRow(have, canAfford ? COST : 0),
        el('p', { class: 'sub', style: { margin: '10px 0 2px' } },
          `A capsule costs ${COST} tokens.`),
      );

      if (canAfford) {
        body.append(
          el('p', { class: 'sub', style: { margin: '0 0 4px' } }, 'After this capsule you will have'),
          sumLine(have, COST),
        );
      } else {
        body.append(el('p', { class: 'sub' },
          `You need ${COST - have} more. Finish a stage to earn a token!`));
      }

      const pool = availableFigures(save);
      const missing = pool.filter((f) => !save.hasFigure(f.id)).length;
      if (missing) body.append(el('p', { class: 'sub' }, `${plural(missing, 'monster')} still to find!`));

      body.append(el('div', { class: 'row' },
        button(`Open a capsule`, {
          cls: 'primary', audio: game.audio, disabled: !canAfford, icon: 'capsule', game,
        }, () => {
          if (!save.spendTokens(COST)) return;
          game.audio?.capsule();
          refresh(pull());
        }),
        button('Maybe later', { cls: 'ghost', audio: game.audio }, () => close()),
      ));
    } else {
      const { figure, isNew, refund, spentFrom } = result;
      body.append(
        el('div', { style: { textAlign: 'center' } },
          spriteImg(game.sprites.monster(figure.archetype, figure.world.palette, 128, { elite: figure.boss }), 128,
            MONSTERS[figure.archetype].name)),
        el('p', { class: 'qprompt', style: { fontSize: '1.5rem', margin: '4px 0' } },
          isNew ? `NEW! ${figure.boss ? figure.world.boss.name : MONSTERS[figure.archetype].name}`
            : `${MONSTERS[figure.archetype].name} again!`),
        el('p', { class: 'sub', style: { margin: '0 0 8px' } }, isNew
          ? `From ${figure.world.name}.`
          : `You already had this one, so here is ${refund} token back.`),
        // Close the loop: show the sum that just happened, then the new total.
        el('p', { class: 'sub', style: { margin: '0 0 2px' } }, 'You spent'),
        sumLine(spentFrom, COST),
        el('p', { class: 'sub', style: { margin: '8px 0 2px' } }, 'Tokens now'),
        tokenRow(save.data.tokens || 0),
      );
      body.append(el('div', { class: 'row', style: { marginTop: '10px' } },
        button('Again', {
          cls: 'primary', audio: game.audio, disabled: (save.data.tokens || 0) < COST, icon: 'capsule', game,
        }, () => {
          if (!save.spendTokens(COST)) return;
          game.audio?.capsule();
          refresh(pull());
        }),
        button('Done', { cls: 'ghost', audio: game.audio }, () => close()),
      ));
    }
    return body;
  };

  const pull = () => {
    const spentFrom = (save.data.tokens || 0) + COST; // tokens before this pull
    const pool = availableFigures(save);
    // Favour monsters the player has not seen; keep bosses genuinely rare.
    const weighted = pool.map((f) => ({
      f,
      w: (f.boss ? 1 : 6) * (save.hasFigure(f.id) ? 1 : 3),
    }));
    const total = weighted.reduce((a, b) => a + b.w, 0);
    let r = Math.random() * total;
    let figure = weighted[weighted.length - 1].f;
    for (const it of weighted) { r -= it.w; if (r <= 0) { figure = it.f; break; } }

    const isNew = !save.hasFigure(figure.id);
    save.addFigure(figure.id);
    let refund = 0;
    if (!isNew) {
      refund = TOKENS.duplicateRefund;
      save.addTokens(refund);
    }
    announce(isNew
      ? `New monster: ${MONSTERS[figure.archetype].name}`
      : `Duplicate, ${refund} token back`);
    return { figure, isNew, refund, spentFrom };
  };

  const close = showModal(render(null));
  const refresh = (result) => {
    const sheet = document.getElementById('modal').querySelector('.sheet');
    if (sheet) { clear(sheet); sheet.append(render(result)); }
  };
  return close;
}

