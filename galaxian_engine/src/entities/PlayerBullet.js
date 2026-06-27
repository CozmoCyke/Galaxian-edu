import { CONFIG } from '../config.js';

export class PlayerBullet {

  constructor(game) {
    this.game = game;
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.width = CONFIG.BULLET.WIDTH;
    this.height = CONFIG.BULLET.HEIGHT;
    this.speed = CONFIG.BULLET.SPEED;
  }

  fire(x, y) {
    if (this.active) return;
    this.x = x;
    this.y = y;
    this.active = true;
  }

  update() {
    if (!this.active) return;
    this.y -= this.speed;
    if (this.y + this.height < 0) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    ctx.fillStyle = '#BFBF00';
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.width, this.height);
  }

}
