import { CONFIG } from '../config.js';

export class DebugOverlay {

  constructor(ctx, game) {
    this.ctx = ctx;
    this.game = game;
    this.enabled = false;
  }

  toggle() {
    this.enabled = !this.enabled;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    if (!this.enabled) return;

    const state = this.game.sm.currentName;
    const playState = this.game.playState;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - 50, CONFIG.CANVAS_WIDTH, 50);

    ctx.fillStyle = '#00FF00';
    ctx.font = '8px monospace';

    let y = CONFIG.CANVAS_HEIGHT - 44;
    ctx.fillText(`STATE: ${state}  TICK: ${this.game.logicTick}  FPS: ${this.game.measuredFps}`, 4, y);

    if (playState && playState.swarm) {
      y += 10;
      const swarm = playState.swarm;
      const layout = swarm.layout;
      ctx.fillText(
        `SWARM: dir=${swarm.direction === 1 ? 'RIGHT' : 'LEFT'}  ` +
        `ox=${swarm.offsetX}  oy=${swarm.offsetY}  ` +
        `alive=${layout.aliveCount}  form=${layout.inFormationCount}  ` +
        `total=${layout.totalCount}`,
        4, y
      );

      y += 10;
      ctx.fillText(
        `PLAYER: x=${playState.player.x}  y=${playState.player.y}  ` +
        `alive=${playState.player.alive}  ` +
        `bullet=${playState.playerBullet.active}  ` +
        `score=${this.game.score}`,
        4, y
      );
    }

    if (playState && playState.swarm) {
      const layout = playState.swarm.layout;
      for (const alien of layout) {
        if (alien.isDead) continue;
        ctx.fillStyle = '#FFFF00';
        ctx.font = '5px monospace';
        const label = `${alien.debugLabel()}`;
        ctx.fillText(label, alien.renderX, alien.renderY);
      }
    }
  }

}
