// Boot: wire up screen, save, audio, sprite bank and the scene graph.

import { Screen } from './core/screen.js';
import { Engine } from './core/engine.js';
import { Save } from './core/save.js';
import { GameAudio } from './audio/audio.js';
import { SpriteBank } from './gfx/sprite.js';
import { installTouchLock } from './core/touchlock.js';

import { createTitle } from './scenes/title.js';
import { createWorldSelect } from './scenes/worldSelect.js';
import { createMap } from './scenes/map.js';
import { createPlay } from './scenes/play.js';
import { createResults } from './scenes/results.js';
import { createGallery } from './scenes/gallery.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');

function boot() {
  installTouchLock();
  const canvas = document.getElementById('game');
  const screen = new Screen(canvas);
  const save = new Save();
  const audio = new GameAudio(save.data.settings);
  const sprites = new SpriteBank(screen.dpr);

  const game = { screen, save, audio, sprites, debug: DEBUG };
  const engine = new Engine(screen, game);
  game.engine = engine;

  screen.onResize(() => sprites.setQuality(screen.dpr));

  engine
    .add('title', createTitle())
    .add('worldSelect', createWorldSelect())
    .add('map', createMap())
    .add('play', createPlay())
    .add('results', createResults())
    .add('gallery', createGallery());

  // Audio can only start inside a user gesture on mobile; every early tap tries.
  const unlock = () => {
    audio.unlock();
    if (audio.ready) {
      audio.setMuted(save.data.settings.muted);
      audio.setMusicVolume(save.data.settings.music);
      audio.setSfxVolume(save.data.settings.sfx);
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  engine.start();

  const start = params.get('scene') || 'title';
  const sceneParams = {};
  if (params.has('world')) sceneParams.worldId = params.get('world');
  if (params.has('stage')) sceneParams.stage = Number(params.get('stage'));
  engine.go(engine.scenes.has(start) ? start : 'title', sceneParams);

  const bootEl = document.getElementById('boot');
  bootEl.classList.add('gone');
  setTimeout(() => bootEl.remove(), 500);

  if (DEBUG) {
    // Test hook: lets the browser smoke tests read state and answer questions.
    window.__mmd = {
      game,
      scene: () => engine.currentName,
      state: () => engine.current?.debugState?.() ?? null,
      question: () => engine.current?.debugQuestion?.() ?? null,
      go: (n, p) => engine.go(n, p),
      save: () => save.data,
    };
  }

  // Offline support is a nice-to-have on tablets; never let it fight local dev.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || params.has('sw'))) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

try {
  boot();
} catch (err) {
  console.error(err);
  const b = document.getElementById('boot');
  if (b) b.innerHTML = `<div class="boot-inner"><p>Something went wrong starting the game.</p><pre style="font-size:12px;max-width:90vw;white-space:pre-wrap">${String(err)}</pre></div>`;
}
