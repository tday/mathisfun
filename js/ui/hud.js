// In-stage overlay HUD: hearts, shields, coins, wave badge, pause and mute.

import { el, clear, button, spriteImg } from './dom.js';

export class Hud {
  constructor(game, { onPause, onShop } = {}) {
    this.game = game;
    this.heartsEl = el('div', { class: 'pill hearts', 'aria-label': 'Hearts' });
    this.coinsEl = el('div', { class: 'pill', 'aria-label': 'Coins' });
    this.shieldEl = el('div', { class: 'pill', 'aria-label': 'Shields', hidden: true });

    this.pauseBtn = button('', {
      cls: 'icon ghost', audio: game.audio, ariaLabel: 'Pause', icon: 'iconPause', game,
    }, onPause);
    this.shopBtn = button('', {
      cls: 'icon ghost', audio: game.audio, ariaLabel: 'Shop', icon: 'iconShop', game,
    }, onShop);
    this.muteBtn = button('', {
      cls: 'icon ghost',
      audio: game.audio,
      ariaLabel: 'Sound on or off',
      icon: game.save.data.settings.muted ? 'iconSoundOff' : 'iconSoundOn',
      game,
    }, () => {
      const m = !game.save.data.settings.muted;
      game.audio.setMuted(m);
      game.save.save();
      clear(this.muteBtn);
      this.muteBtn.append(spriteImg(game.sprites.prop(m ? 'iconSoundOff' : 'iconSoundOn', 30), 30));
    });

    this.waveLabel = el('span');
    this.waveBadge = el('div', { class: 'wave-badge', hidden: true }, this.waveLabel);

    // The badge lives inside the HUD flow rather than floating at a fixed
    // offset: on a narrow phone the controls wrap to two rows, and an
    // absolutely-positioned badge landed straight on top of them.
    this.root = el('div', { class: 'hud' },
      this.heartsEl, this.shieldEl, this.coinsEl,
      el('div', { class: 'spacer' }),
      this.shopBtn, this.muteBtn, this.pauseBtn,
      this.waveBadge);
  }

  mount(host) {
    host.append(this.root);
  }

  destroy() {
    this.root.remove();
  }

  setHearts(current, max) {
    if (this._hearts === `${current}/${max}`) return;
    this._hearts = `${current}/${max}`;
    clear(this.heartsEl);
    for (let i = 0; i < max; i++) {
      this.heartsEl.append(spriteImg(this.game.sprites.prop('heart', 26, { empty: i >= current }), 26));
    }
    this.heartsEl.setAttribute('aria-label', `${current} of ${max} hearts left`);
  }

  setShields(n) {
    this.shieldEl.hidden = n <= 0;
    if (n <= 0) return;
    if (this._shields === n) return;
    this._shields = n;
    clear(this.shieldEl);
    this.shieldEl.append(spriteImg(this.game.sprites.prop('shield', 24), 24), el('span', {}, `×${n}`));
  }

  setCoins(n) {
    if (this._coins === n) return;
    this._coins = n;
    clear(this.coinsEl);
    this.coinsEl.append(spriteImg(this.game.sprites.prop('coin', 24), 24), el('span', {}, String(n)));
    this.coinsEl.setAttribute('aria-label', `${n} coins`);
  }

  setWave(text) {
    this.waveBadge.hidden = !text;
    if (text) this.waveLabel.textContent = text;
  }

  /** Screen position of the coin counter, so coin particles can fly to it. */
  coinTarget(canvasRect) {
    const r = this.coinsEl.getBoundingClientRect();
    return { x: r.left + r.width / 2 - canvasRect.left, y: r.top + r.height / 2 - canvasRect.top };
  }
}
