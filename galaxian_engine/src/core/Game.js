import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { StateMachine } from './StateMachine.js';
import { BootState } from '../states/BootState.js';
import { PlayState } from '../states/PlayState.js';
import { PlayerDyingState } from '../states/PlayerDyingState.js';
import { GameOverState } from '../states/GameOverState.js';
import { DebugOverlay } from '../debug/DebugOverlay.js';

export class Game {

  constructor(canvas, debugCanvas, msgEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.debugCanvas = debugCanvas;
    this.debugCtx = debugCanvas.getContext('2d');
    this.msgEl = msgEl;

    this.input = new InputManager();
    this.input.attach();

    this.debugOverlay = new DebugOverlay(this.debugCtx, this);

    this.sm = new StateMachine();
    this._registerStates();

    this.loop = new GameLoop(
      () => this.update(),
      () => this.render()
    );

    this.score = 0;
    this.highScore = 0;
    this.lives = 3;
    this.level = 1;
  }

  _registerStates() {
    this.sm.add('boot', new BootState(this));
    this.sm.add('playing', new PlayState(this));
    this.sm.add('playerDying', new PlayerDyingState(this));
    this.sm.add('gameOver', new GameOverState(this));

    this.sm.onExit((fromName, toName) => {
      if (toName === 'playerDying' && this.sm._current) {
        const prevRender = this.sm._current.render.bind(this.sm._current);
        this._prevStateRender = prevRender;
      }
    });
  }

  start() {
    this.sm.transition('boot');
    this.loop.start();
  }

  update() {
    this.sm.update();
    this.input.endFrame();
  }

  render() {
    if (this.sm._current) {
      this.sm._current.render();
    }
    this.debugOverlay.render();
  }

  get logicTick() { return this.loop.logicTick; }
  get measuredFps() { return this.loop.measuredFps; }

}
