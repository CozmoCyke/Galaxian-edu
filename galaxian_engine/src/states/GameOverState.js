import { Renderer } from '../rendering/Renderer.js';

export class GameOverState {

  constructor(game) {
    this.game = game;
    this.renderer = new Renderer(game.ctx);
    this._timer = 0;
    this._restartRequested = false;
  }

  enter() {
    this._timer = 120;
    this._restartRequested = false;
    if (this.game.score > this.game.highScore) {
      this.game.highScore = this.game.score;
    }
  }

  exit() {}

  update() {
    if (this.game.input.restartPressed) {
      this._restartRequested = true;
    }
    if (this._restartRequested) {
      this._timer--;
      if (this._timer <= 0) {
        this.game.sm.transition('playing');
      }
    }
  }

  render() {
    this.renderer.clear();

    this.game.ctx.fillStyle = '#FFFFFF';
    this.game.ctx.font = '8px monospace';
    this.game.ctx.fillText('GAME OVER', 104, 110);
    this.game.ctx.fillText('PRESS N TO RESTART', 80, 130);
  }

}
