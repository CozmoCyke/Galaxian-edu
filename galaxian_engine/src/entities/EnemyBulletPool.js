import { CONFIG } from '../config.js';

export class EnemyBulletPool {

  constructor() {
    this.slots = new Array(CONFIG.ENEMY_BULLET.MAX_ACTIVE);
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0, id: 0 };
    }
    this._nextId = 1;
  }

  get activeCount() {
    let count = 0;
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].active) count++;
    }
    return count;
  }

  allocate(x, y, vx, vy) {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.active) {
        slot.active = true;
        slot.x = x;
        slot.y = y;
        slot.vx = vx;
        slot.vy = vy;
        slot.id = this._nextId++;
        return slot;
      }
    }
    return null;
  }

  free(slot) {
    if (slot && typeof slot === 'object') {
      slot.active = false;
    }
  }

  update() {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.active) continue;
      slot.x += slot.vx;
      slot.y += slot.vy;
      if (slot.y > CONFIG.CANVAS_HEIGHT + 8) {
        slot.active = false;
      }
    }
  }

  reset() {
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].active = false;
    }
  }

  render(ctx) {
    const w = CONFIG.ENEMY_BULLET.WIDTH;
    const h = CONFIG.ENEMY_BULLET.HEIGHT;
    ctx.fillStyle = CONFIG.ENEMY_BULLET.COLOR;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.active) continue;
      ctx.fillRect(Math.round(slot.x), Math.round(slot.y), w, h);
    }
  }

  forEach(fn) {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].active) {
        fn(this.slots[i], i);
      }
    }
  }

  [Symbol.iterator]() {
    const slots = this.slots;
    let idx = 0;
    return {
      next() {
        while (idx < slots.length && !slots[idx].active) idx++;
        if (idx >= slots.length) return { done: true };
        return { value: slots[idx++], done: false };
      }
    };
  }

}
