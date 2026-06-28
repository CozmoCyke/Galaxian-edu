import { CONFIG } from '../config.js';
import { STAGE as INFLIGHT_STAGE } from '../inflight/InflightController.js';

export class EnemyBulletController {

  constructor(bulletPool, inflightCtrl, player, shockCtrl) {
    this.pool = bulletPool;
    this.inflightCtrl = inflightCtrl;
    this.player = player;
    this.shockCtrl = shockCtrl;
    this._timers = new Map();
  }

  update(gameState) {
    if (gameState !== 'playing') return;
    if (this.shockCtrl && this.shockCtrl.isActive) return;
    if (!this.player || !this.player.alive || this.player.recovering) return;

    for (const record of this.inflightCtrl) {
      const { stageOfLife, alien } = record;
      if (stageOfLife < INFLIGHT_STAGE.ATTACKING_PLAYER) continue;
      if (stageOfLife > INFLIGHT_STAGE.NEAR_BOTTOM) continue;
      if (!alien || !alien.alive) continue;

      const key = alien.id;
      let timer = this._timers.get(key) || 0;
      if (timer > 0) {
        timer--;
        this._timers.set(key, timer);
        continue;
      }

      this._fireAtPlayer(record);
      this._timers.set(key, CONFIG.ENEMY_BULLET.FIRE_COOLDOWN);
    }
  }

  _fireAtPlayer(record) {
    const dx = this.player.x - record.x;
    const dy = this.player.y - record.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = CONFIG.ENEMY_BULLET.SPEED;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    this.pool.allocate(record.x, record.y, vx, vy);
  }

  reset() {
    this._timers.clear();
    this.pool.reset();
  }

}
