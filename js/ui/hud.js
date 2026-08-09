// In-play HUD: hearts/shields, coins, wave badge, pause + mute.

import { el, button, icon, iconHTML } from './dom.js';
import { save } from '../core/save.js';
import { toggleMute } from '../audio/audio.js';

export class Hud {
  constructor(root, { onPause }) {
    this.root = el('div', 'hud', root);
    const left = el('div', 'hud-group', this.root);
    this.heartsEl = el('div', 'hud-hearts', left);
    this.shieldsEl = el('div', 'hud-shields', left);
    const mid = el('div', 'hud-group hud-mid', this.root);
    this.waveEl = el('div', 'hud-wave', mid);
    const right = el('div', 'hud-group', this.root);
    this.coinsEl = el('div', 'hud-coins', right);
    this.coinsEl.append(icon('coin'), el('span', 'hud-coin-num'));
    this.coinNum = this.coinsEl.querySelector('.hud-coin-num');
    this.muteBtn = button('btn-round', save.settings.muted ? '🔇' : '🔊', () => {
      const m = toggleMute();
      this.muteBtn.textContent = m ? '🔇' : '🔊';
    }, right);
    this.muteBtn.setAttribute('aria-label', 'Toggle sound');
    this.pauseBtn = button('btn-round', '⏸', onPause, right);
    this.pauseBtn.setAttribute('aria-label', 'Pause');
    this.lastCoins = -1;
  }

  update({ hearts, maxHearts, shields, waveText }) {
    // hearts
    const want = [];
    for (let i = 0; i < maxHearts; i++) want.push(i < hearts ? 'heart' : 'heartEmpty');
    const key = want.join(',') + '|' + shields;
    if (key !== this.heartKey) {
      this.heartKey = key;
      this.heartsEl.innerHTML = want.map((n) => iconHTML(n)).join('');
      this.shieldsEl.innerHTML = shields > 0
        ? `${iconHTML('shield')}<span class="hud-shield-num">${shields > 1 ? '×' + shields : ''}</span>`
        : '';
    }
    if (waveText !== this.lastWave) {
      this.lastWave = waveText;
      this.waveEl.textContent = waveText;
    }
    if (save.coins !== this.lastCoins) {
      this.lastCoins = save.coins;
      this.coinNum.textContent = save.coins;
      this.coinsEl.classList.remove('bump');
      void this.coinsEl.offsetWidth; // restart animation
      this.coinsEl.classList.add('bump');
    }
  }

  destroy() { this.root.remove(); }
}
