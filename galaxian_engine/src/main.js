import { Game } from './core/Game.js';
import { CONFIG } from './config.js';

const canvas = document.getElementById('gameCanvas');
const debugCanvas = document.getElementById('debugCanvas');
const msgEl = document.getElementById('message');

canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;
debugCanvas.width = CONFIG.CANVAS_WIDTH;
debugCanvas.height = CONFIG.CANVAS_HEIGHT;

const game = new Game(canvas, debugCanvas, msgEl);

game.input._onKeyDown = (function(orig) {
  return function(e) {
    if (e.key === CONFIG.DEBUG_KEY) {
      game.debugOverlay.toggle();
    }
    orig.call(this, e);
  };
})(game.input._onKeyDown);

window.addEventListener('load', () => {
  game.start();
});