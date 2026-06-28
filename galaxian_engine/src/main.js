import { Game } from './core/Game.js';
import { CONFIG } from './config.js';
import { AudioManager } from './audio/AudioManager.js';

const canvas = document.getElementById('gameCanvas');
const debugCanvas = document.getElementById('debugCanvas');
const msgEl = document.getElementById('message');

canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;
debugCanvas.width = CONFIG.CANVAS_WIDTH;
debugCanvas.height = CONFIG.CANVAS_HEIGHT;

const audioManager = new AudioManager();
const game = new Game(canvas, debugCanvas, msgEl, audioManager);

game.input._onKeyDown = (function(orig) {
  return function(e) {
    if (e.key === CONFIG.DEBUG_KEY) {
      game.debugOverlay.toggle();
    }
    if (e.key === 'm' || e.key === 'M') {
      audioManager.setMuted(!audioManager.muted);
    }
    orig.call(this, e);
  };
})(game.input._onKeyDown);

// Unlock audio on first user interaction (required by browsers)
function unlockAudio() {
  audioManager.unlock();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
}
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

const isTestMode = window.location.search.includes('test=1');

window.addEventListener('load', () => {
  game.start();
  if (isTestMode) {
    import('./test/testAdapter.js').then(m => {
      m.initTestAdapter(game, audioManager);
      console.log('[TEST] __galaxianTest API ready');
      window.dispatchEvent(new CustomEvent('galaxianTestReady'));
    });
  }
});