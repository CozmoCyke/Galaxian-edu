import { CONFIG } from '../config.js';

export class Player {

  constructor(game) {
    this.game = game;
    this.x = CONFIG.PLAYER.X;
    this.y = CONFIG.PLAYER.Y;
    this.width = CONFIG.PLAYER.WIDTH;
    this.height = CONFIG.PLAYER.HEIGHT;
    this.speed = CONFIG.PLAYER.SPEED;
    this.alive = true;
    this.recovering = false;
    this.recoverTimer = 0;
    this.tempX = 0;
    this.tempY = 0;
    this._resetPos();
  }

  _resetPos() {
    this.x = Math.floor((CONFIG.CANVAS_WIDTH - this.width) / 2);
    this.y = CONFIG.CANVAS_HEIGHT - this.height - 5;
  }

  reset() {
    this._resetPos();
    this.alive = true;
    this.recovering = false;
    this.recoverTimer = 0;
  }

  update() {
    if (this.recovering) {
      this.recoverTimer--;
      if (this.recoverTimer <= 0) {
        this.x = this.tempX;
        this.y = this.tempY;
        this.recovering = false;
      }
      return;
    }

    const input = this.game.input;
    if (input.left)  this.x -= this.speed;
    if (input.right) this.x += this.speed;

    if (this.x < 0) this.x = 0;
    if (this.x + this.width > CONFIG.CANVAS_WIDTH) {
      this.x = CONFIG.CANVAS_WIDTH - this.width;
    }
  }

  startRecover() {
    this.tempX = this.x;
    this.tempY = this.y;
    this.x = -1000;
    this.y = -1000;
    this.recovering = true;
    this.recoverTimer = 90;
  }

  render(ctx) {
    if (!this.alive || this.recovering) return;

    const x = Math.round(this.x);
    const y = Math.round(this.y);

    ctx.fillStyle = '#D10000';
    ctx.fillRect(x+6, y, 3, 1);
    ctx.fillRect(x+5, y+1, 5, 7);
    ctx.fillRect(x+4, y+2, 1, 1);
    ctx.fillRect(x+10, y+2, 1, 1);
    ctx.fillRect(x+3, y+3, 2, 2);
    ctx.fillRect(x+10, y+3, 2, 2);
    ctx.fillRect(x+3, y+5, 1, 1);
    ctx.fillRect(x+11, y+5, 1, 1);
    ctx.fillRect(x+1, y+7, 1, 1);
    ctx.fillRect(x+13, y+7, 1, 1);

    ctx.fillStyle = '#BFBFBF';
    ctx.fillRect(x+1, y+8, 1, 1);
    ctx.fillRect(x+13, y+8, 1, 1);
    ctx.fillRect(x, y+9, 3, 5);
    ctx.fillRect(x+12, y+9, 3, 5);
    ctx.fillRect(x+5, y+8, 2, 7);
    ctx.fillRect(x+8, y+8, 2, 7);
    ctx.fillRect(x+1, y+14, 1, 2);
    ctx.fillRect(x+13, y+14, 1, 2);
    ctx.fillRect(x+3, y+10, 1, 2);
    ctx.fillRect(x+4, y+9, 1, 2);
    ctx.fillRect(x+10, y+9, 1, 2);
    ctx.fillRect(x+11, y+10, 1, 2);

    if (!this.game.playState || !this.game.playState.playerBullet || !this.game.playState.playerBullet.active) {
      ctx.fillStyle = '#BFBF00';
      ctx.fillRect(x+7, y-4, 1, 4);
    }
  }

}
