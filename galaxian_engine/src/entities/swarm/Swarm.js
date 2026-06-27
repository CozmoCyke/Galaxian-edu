import { CONFIG } from '../../config.js';
import { SwarmLayout } from './SwarmLayout.js';

export class Swarm {

  constructor() {
    this.layout = new SwarmLayout();
    this.offsetX = 0;
    this.offsetY = CONFIG.SWARM.START_Y;
    this.direction = 1;
    this.step = CONFIG.SWARM.STEP;
    this.moveTimer = 0;
    this.moveInterval = 1;
  }

  reset() {
    this.layout = new SwarmLayout();
    this.offsetX = 0;
    this.offsetY = CONFIG.SWARM.START_Y;
    this.direction = 1;
    this.moveTimer = 0;
  }

  update() {
    this.moveTimer++;
    if (this.moveTimer < this.moveInterval) return;
    this.moveTimer = 0;

    this.offsetX += this.step * this.direction;

    const limitLeft = CONFIG.SWARM.LIMIT_LEFT;
    const limitRight = CONFIG.SWARM.LIMIT_RIGHT;
    if (this.offsetX > limitRight) {
      this.offsetX = limitRight;
      this.direction = -1;
    }
    if (this.offsetX < limitLeft) {
      this.offsetX = limitLeft;
      this.direction = 1;
    }

    for (const alien of this.layout) {
      alien.update(this.offsetX, this.offsetY);
    }
  }

  getAlienAt(row, col) {
    return this.layout.getAlien(row, col);
  }

  isDead() { return this.layout.aliveCount === 0; }
  get aliveCount() { return this.layout.aliveCount; }
  get inFormationCount() { return this.layout.inFormationCount; }
  get totalCount() { return this.layout.totalCount; }

  render(ctx) {
    for (const alien of this.layout) {
      alien.render(ctx);
    }
  }

}
