import { Renderer } from '../rendering/Renderer.js';

export class PlayerDyingState {

  constructor(game) {
    this.game = game;
    this.renderer = new Renderer(game.ctx);
    this._timer = 0;
  }

  enter() {
    this._timer = 90;
    this.game.lives--;
  }

  exit() {}

  update() {
    this._timer--;
    if (this._timer <= 0) {
      if (this.game.lives <= 0) {
        this.game.sm.transition('gameOver');
      } else {
        this.game.sm.transition('playing');
      }
    }
  }

  render() {
    if (this.game._prevStateRender) {
      this.game._prevStateRender();
      return;
    }
    this.renderer.clear();

    this.game.ctx.fillStyle = '#FFFFFF';
    this.game.ctx.font = '8px monospace';
    this.game.ctx.fillText('PLAYER EXPLODING...', 80, 120);
  }

}
