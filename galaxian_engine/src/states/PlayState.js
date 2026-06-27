import { CONFIG } from '../config.js';
import { Renderer } from '../rendering/Renderer.js';
import { Player } from '../entities/Player.js';
import { PlayerBullet } from '../entities/PlayerBullet.js';
import { Swarm } from '../entities/swarm/Swarm.js';
import { InflightController } from '../inflight/InflightController.js';
import { OrdinaryAttackScheduler } from '../attacks/OrdinaryAttackScheduler.js';

export class PlayState {

  constructor(game) {
    this.game = game;
    this.game.playState = this;
    this.renderer = new Renderer(game.ctx);
    this.player = null;
    this.playerBullet = null;
    this.swarm = null;
  }

  enter() {
    this.player = new Player(this.game);
    this.playerBullet = new PlayerBullet(this.game);
    this.swarm = new Swarm();
    this.inflightCtrl = new InflightController();
    this.scheduler = new OrdinaryAttackScheduler();
    this._gameState = 'playing';
  }

  _launchDebugAlien(clockwise) {
    const alien = this.swarm.getAlienAt(0, 0);
    if (!alien) return;
    this.inflightCtrl.launchOrdinaryAlien(alien, this.swarm, clockwise);
  }

  exit() {
    this.game.playState = null;
  }

  _getGameState() {
    return this._gameState;
  }

  update() {
    this.player.update();

    if (this.game.input.firePressed) {
      this._fireBullet();
    }

    this.playerBullet.update();
    this._checkCollisions();
    this.swarm.update();
    this.inflightCtrl.update();

    if (this.game.input.f3Pressed) {
      this._launchDebugAlien(this.game.input.shiftKey);
    }

    if (this.game.input.wasPressed('F4')) {
      this.scheduler.setEnabled(!this.scheduler.enabled);
    }

    if (this.game.input.wasPressed('F5')) {
      if (this.game.input.shiftKey) {
        this.scheduler.setExtraDifficulty(0);
      } else {
        this.scheduler.setExtraDifficulty(Math.min(this.scheduler.extraDifficulty + 1, 7));
      }
    }

    if (this.scheduler.enabled) {
      this.scheduler.update(this.swarm, this.inflightCtrl, this._getGameState());
    }
  }

  _fireBullet() {
    if (this.player.recovering) return;
    this.playerBullet.fire(
      this.player.x + Math.floor(CONFIG.SWARM.H_SPACE / 2),
      this.player.y - CONFIG.BULLET.HEIGHT
    );
  }

  _checkCollisions() {
    if (!this.playerBullet.active) return;

    const bx = this.playerBullet.x;
    const by = this.playerBullet.y;
    const bw = this.playerBullet.width;
    const bh = this.playerBullet.height;

    for (const alien of this.swarm.layout) {
      if (!alien.isInFormation) continue;
      if (bx + bw <= alien.renderX) continue;
      if (bx >= alien.renderX + CONFIG.SWARM.ALIEN_WIDTH) continue;
      if (by + bh <= alien.renderY) continue;
      if (by >= alien.renderY + CONFIG.SWARM.ALIEN_HEIGHT) continue;

      this.playerBullet.active = false;
      alien.kill();
      this.game.score += alien.scoreValue;
      this._checkBonusLife();

      if (this.swarm.aliveCount === 0) {
        this._levelComplete();
      }
      return;
    }
  }

  _checkBonusLife() {
    if (this.game.score > 0 && this.game.score % CONFIG.SCORE.EXTRA_LIFE_INTERVAL === 0) {
      this.game.lives++;
    }
  }

  _levelComplete() {
    this.game.level++;
    this.swarm = new Swarm();
    this.player.reset();
  }

  render() {
    this.renderer.clear();

    this.swarm.render(this.game.ctx);
    this.player.render(this.game.ctx);
    this.playerBullet.render(this.game.ctx);

    this._drawHUD();
  }

  _drawHUD() {
    const ctx = this.game.ctx;

    ctx.fillStyle = '#BFBFBF';
    ctx.font = '8px monospace';
    ctx.fillText('1UP', 4, 10);

    ctx.fillStyle = '#BFBF00';
    ctx.fillText(String(this.game.score).padStart(6, '0'), 30, 10);

    ctx.fillStyle = '#BFBFBF';
    ctx.fillText('HI', 130, 10);
    ctx.fillStyle = '#BFBF00';
    ctx.fillText(String(this.game.highScore).padStart(6, '0'), 148, 10);

    const lives = Math.min(this.game.lives, 4);
    ctx.fillStyle = '#BFBFBF';
    for (let i = 0; i < lives; i++) {
      const lx = 220 + i * 12;
      const ly = 4;
      ctx.fillRect(lx, ly+2, 1, 4);
      ctx.fillRect(lx+1, ly+4, 1, 2);
      ctx.fillRect(lx+2, ly+3, 1, 2);
      ctx.fillRect(lx+3, ly, 1, 7);
      ctx.fillRect(lx+2, ly+1, 1, 1);

      ctx.fillRect(lx+6, ly+2, 1, 4);
      ctx.fillRect(lx+5, ly+4, 1, 2);
      ctx.fillRect(lx+4, ly+3, 1, 2);
      ctx.fillRect(lx+4, ly+1, 1, 1);
    }

    ctx.fillStyle = '#D10000';
    for (let i = 0; i < this.game.level; i++) {
      ctx.fillRect(268 - i * 8, 3, 3, 5);
      ctx.fillRect(268 - i * 8, 8, 1, 3);
      ctx.fillRect(268 - i * 8 + 3, 4, 2, 3);
      ctx.fillRect(268 - i * 8 + 5, 5, 2, 1);
    }
  }

}
