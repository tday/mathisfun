// Boot: screen + engine + scenes, audio unlock, query routing, SW, debug hook.

import { Screen } from './core/screen.js';
import { Engine } from './core/engine.js';
import { save, persist, memoryMode } from './core/save.js';
import { unlockAudio, applyVolumes } from './audio/audio.js';
import { music } from './audio/music.js';
import { spriteDataURL } from './gfx/sprite.js';
import { drawStarIcon } from './gfx/sprites-world.js';
import { UI } from './gfx/palettes.js';
import { modalHooks } from './ui/panels.js';
import { TitleScene } from './scenes/title.js';
import { WorldSelectScene } from './scenes/worldSelect.js';
import { MapScene } from './scenes/map.js';
import { PlayScene } from './scenes/play.js';
import { ResultsScene } from './scenes/results.js';
import { GalleryScene } from './scenes/gallery.js';
import { worldById, WORLDS } from './data/worlds.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('game');
const uiRoot = document.getElementById('ui');

// theme the DOM to match the canvas art
for (const [k, v] of Object.entries(UI)) document.documentElement.style.setProperty(`--${k}`, v);

const screen = new Screen(canvas);
const engine = new Engine(screen);
const fast = parseFloat(params.get('fast') || '1');
if (fast > 1) engine.timeScale = Math.min(6, fast);
screen.onResize = (w, h) => engine.onLayout(w, h);
screen.onPointer((e) => engine.onPointer(e));

engine.register('title', new TitleScene(engine, uiRoot));
engine.register('worldSelect', new WorldSelectScene(engine, uiRoot));
engine.register('map', new MapScene(engine, uiRoot));
engine.register('play', new PlayScene(engine, uiRoot));
engine.register('results', new ResultsScene(engine, uiRoot));
engine.register('gallery', new GalleryScene(engine));

// modals pause gameplay
let modalDepth = 0;
modalHooks.onOpen = () => { modalDepth++; engine.paused = true; };
modalHooks.onClose = () => { modalDepth = Math.max(0, modalDepth - 1); engine.paused = modalDepth > 0; };

// audio unlock must happen inside the first user gesture (iOS)
const unlock = () => {
  unlockAudio();
  applyVolumes();
  music.resume();
  document.removeEventListener('pointerdown', unlock, true);
};
document.addEventListener('pointerdown', unlock, true);

// favicon from generated art (no icon file needed for the tab)
const fav = document.createElement('link');
fav.rel = 'icon';
fav.href = spriteDataURL(40, 40, (c) => drawStarIcon(c, true));
document.head.appendChild(fav);

// service worker: only on real HTTPS deploys (or ?sw=1 for local testing)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || params.get('sw') === '1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline still optional */ });
  });
}

// private-mode / quota warning (once)
setTimeout(() => {
  persist();
  if (memoryMode) {
    const warn = document.createElement('div');
    warn.className = 'storage-warn';
    warn.textContent = 'Heads up: progress can’t be saved in this browser mode.';
    document.body.appendChild(warn);
    setTimeout(() => warn.remove(), 6000);
  }
}, 1500);

// query routing (also powers the e2e tests): ?scene=play&world=g2w0&stage=3
const sceneParam = params.get('scene');
const start = () => {
  if (sceneParam === 'play') {
    const worldId = worldById(params.get('world')) ? params.get('world') : WORLDS[0].id;
    const stage = Math.max(1, Math.min(10, parseInt(params.get('stage') || '1', 10) || 1));
    engine.go('play', { worldId, stage }, true);
  } else if (sceneParam === 'map') {
    engine.go('map', { worldId: worldById(params.get('world')) ? params.get('world') : WORLDS[0].id }, true);
  } else if (sceneParam && engine.scenes.has(sceneParam)) {
    engine.go(sceneParam, {}, true);
  } else {
    engine.go('title', {}, true);
  }
  engine.start();
  document.getElementById('splash')?.remove();
};

// debug hook for automated tests
if (params.get('debug') === '1') {
  window.__mif = {
    engine, save,
    state: () => engine.scenes.get('play').debugState?.(),
    question: () => engine.scenes.get('play').q,
    go: (name, p) => engine.go(name, p, true),
  };
}

start();
