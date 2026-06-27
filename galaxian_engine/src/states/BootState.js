import { Renderer } from '../rendering/Renderer.js';
import { AssetLoader } from '../rendering/AssetLoader.js';

export class BootState {

  constructor(game) {
    this.game = game;
    this.loader = new AssetLoader();
    this.renderer = new Renderer(game.ctx);
    this._done = false;
  }

  enter() {
    this.loader.loadAll().then(() => {
      this._done = true;
    });
  }

  exit() {}

  update() {
    if (this._done) {
      this.game.sm.transition('playing');
    }
  }

  render() {
    this.renderer.clear();
    this.game.ctx.fillStyle = '#FFFFFF';
    this.game.ctx.font = '8px monospace';
    this.game.ctx.fillText('GALAXIAN ENGINE', 80, 110);
    this.game.ctx.fillText('LOADING...', 100, 130);
  }

}
