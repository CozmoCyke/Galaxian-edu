import { CONFIG } from '../config.js';
import { AudioEventBus } from '../audio/AudioEventBus.js';

const STAGE_NAMES = [
  'PACKS_BAGS', 'FLIES_IN_ARC', 'READY_TO_ATTACK', 'ATTACKING_PLAYER',
  'NEAR_BOTTOM', 'REACHED_BOTTOM', 'RETURNING', 'BACK_IN_SWARM',
];

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
    const ps = this.game.playState;

    const panelH = 165;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - panelH, CONFIG.CANVAS_WIDTH, panelH);

    ctx.fillStyle = '#00FF00';
    ctx.font = '8px monospace';
    let y = CONFIG.CANVAS_HEIGHT - panelH + 6;
    const x1 = 4;

    ctx.fillText(`STATE: ${state}  TICK: ${this.game.logicTick}  FPS: ${this.game.measuredFps}`, x1, y);

    if (ps && ps.swarm) {
      const swarm = ps.swarm;
      const layout = swarm.layout;
      y += 9;
      ctx.fillText(
        `SWARM: dir=${swarm.direction === 1 ? 'RIGHT' : 'LEFT'}  ox=${swarm.offsetX}  oy=${swarm.offsetY}  ` +
        `alive=${layout.aliveCount}  form=${layout.inFormationCount}  total=${layout.totalCount}`,
        x1, y
      );

      y += 9;
      ctx.fillText(
        `PLAYER: x=${ps.player.x}  y=${ps.player.y}  alive=${ps.player.alive}  ` +
        `bullet=${ps.playerBullet.active}  score=${this.game.score}`,
        x1, y
      );

      if (ps.shockCtrl && ps.shockCtrl.isActive) {
        y += 9;
        ctx.fillStyle = '#FF0000';
        ctx.fillText(
          `SHOCK: ACTIVE  counter=${ps.shockCtrl.counter}/${ps.shockCtrl.duration}`,
          x1, y
        );
      }

      if (ps.flagshipScheduler) {
        y += 9;
        const fs = ps.flagshipScheduler;
        ctx.fillStyle = '#FF6600';
        ctx.fillText(
          `FSHIP: ${fs.enabled ? 'ON' : 'OFF'}  side=${fs.side}  ` +
          `master1=$${fs.counters.master1.toString(16).toUpperCase()}  ` +
          `master2=$${fs.counters.master2.toString(16).toUpperCase()}  ` +
          `secEn=${fs.counters.secondaryEnabled ? 1 : 0}  ` +
          `sec=$${fs.counters.secondary.toString(16).toUpperCase()}  ` +
          `canAtk=${fs.counters.canAttack ? 1 : 0}  ` +
          `lastRef=${fs.lastRefusalReason}`,
          x1, y
        );
        if (fs.activeGroup) {
          y += 9;
          const grp = fs.activeGroup;
          ctx.fillText(
            `GRP: id=${grp.groupId}  stage=${grp.stage}  ` +
            `side=${grp.side}  launchTick=${grp.launchTick}  ` +
            `act=${grp.activeMemberCount}  origEsc=${grp.originalEscortCount}  ` +
            `livEsc=${grp.livingEscortCount}  compl=${grp.completed}`,
            x1, y
          );
        }
      }

      if (ps.scheduler) {
        y += 9;
        const sched = ps.scheduler;
        ctx.fillStyle = '#FFFF00';
        ctx.fillText(
          `SCHED: ${sched.enabled ? 'ON' : 'OFF'}  side=${sched.side}  ` +
          `tick=${sched.tickCounter}  baseDiff=${sched.baseDifficulty}  extraDiff=${sched.extraDifficulty}  ` +
          `RNG=$${sched.rng.getState().toString(16).toUpperCase().padStart(2,'0')}  ` +
          `lastRef=${sched.lastRefusalReason}  lastSW=$${(sched.lastSwarmIndex >= 0 ? sched.lastSwarmIndex.toString(16).toUpperCase().padStart(2,'0') : '--')}`,
          x1, y
        );

        y += 9;
        const cnt = sched.counters;
        ctx.fillStyle = '#FFAA00';
        const maxInf = sched.maxInflight;
        ctx.fillText(
          `CTRS: master=${cnt.master}  canAttack=${cnt.canAttack ? 1 : 0}  ` +
          `b=${cnt.getB(sched.baseDifficulty, sched.extraDifficulty)}  ` +
          `maxInf=${maxInf}  totalLaunch=${sched.totalLaunches}`,
          x1, y
        );

        y += 9;
        let secStr = '';
        for (let i = 0; i < 15; i++) {
          secStr += cnt.counters[i + 1].toString(16).toUpperCase().padStart(2, '0');
          if (i < 14) secStr += ' ';
          if ((i + 1) % 5 === 0 && i < 14) secStr += '| ';
        }
        ctx.fillText(`SEC: ${secStr}`, x1, y);
      }

      if (ps.inflightCtrl && ps.inflightCtrl.isAnyActive) {
        y += 9;
        ctx.fillStyle = '#00FFFF';
        for (const rec of ps.inflightCtrl) {
          const alien = rec.alien;
          const stageNum = rec.stageOfLife;
          const stageName = STAGE_NAMES[stageNum] || '?';
          const dx = rec._lastDeltaX ?? '-';
          const dy = rec._lastDeltaY ?? '-';
          const returnDist = rec.stageOfLife === 6
            ? Math.round(Math.sqrt(
                (rec.returnTargetX - alien.renderX) ** 2 +
                (rec.returnTargetY - alien.renderY) ** 2
              ))
            : '-';

          let line = '';
          line += `ID=${alien.debugLabel()}  type=${alien.type}  swIdx=$${rec.swarmIndex.toString(16).toUpperCase().padStart(2,'0')}  `;
          line += `slot=${rec.slot}  stg=${stageNum}(${stageName})  cw=${rec.clockwise}`;
          ctx.fillText(line, x1, y);

          y += 9;
          line = '';
          line += `x=${Math.round(alien.renderX)}  y=${Math.round(alien.renderY)}  `;
          line += `dx=${dx}  dy=${dy}  spd=${rec.speed}  sc=${rec.sortieCount}  `;
          line += `ft=${rec.flightTick}`;
          ctx.fillText(line, x1, y);

          y += 9;
          line = '';
          if (rec.runner) {
            line += `arcIdx=${rec.runner.arcIndex}/${rec.runner.arcData.values.length}  `;
            line += `clk=${rec.runner.clock}  fr=${rec.runner.frame}`;
          } else {
            line += `arc: done`;
          }
          if (rec.stageOfLife >= 6) {
            line += `  retTgt=(${Math.round(rec.returnTargetX)},${Math.round(rec.returnTargetY)})`;
            line += `  dist=${returnDist}`;
          }
          ctx.fillText(line, x1, y);

          // Draw return target line during RETURNING
          if (rec.stageOfLife === 6) {
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(alien.renderX, alien.renderY);
            ctx.lineTo(rec.returnTargetX, rec.returnTargetY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#FF00FF';
            ctx.fillRect(rec.returnTargetX - 2, rec.returnTargetY - 2, 5, 5);
          }

          // Draw original grid position marker
          const origIdx = rec.swarmIndex;
          const origRow = (origIdx >> 4) & 7;
          const origCol = origIdx & 0x0F;
          const origX = swarm.offsetX + origCol * CONFIG.SWARM.H_SPACE;
          const origY = swarm.offsetY + origRow * CONFIG.SWARM.V_SPACE;
          ctx.strokeStyle = '#888800';
          ctx.lineWidth = 1;
          ctx.strokeRect(origX - 2, origY - 2, 5, 5);

          y += 9;
        }
      }
    }

    // Audio diagnostics
    if (this.game.audioManager) {
      const am = this.game.audioManager;
      const aeb = AudioEventBus;
      y += 9;
      ctx.fillStyle = '#00FFAA';
      ctx.fillText(
        `AUDIO: init=${am.initialized}  mute=${am.muted}  lock=${am.audioLocked}  ` +
        `bus=${aeb.count || aeb._logCount || 0}`,
        x1, y
      );
      y += 9;
      const hum = am._formationHum;
      ctx.fillText(
        `VOICES: hum=${hum ? hum.isRunning : '?'}  ` +
        `dive=${am._attackSound ? am._attackSound.activeCount : '?'}/${am._attackSound ? am._attackSound._maxActive : '?'}  ` +
        `music=${am._musicPlayer ? am._musicPlayer.isPlaying : '?'}`,
        x1, y
      );
    }

    // Invariant status (if validator is loaded)
    if (window.__galaxianInvariantResults) {
      y += 9;
      ctx.fillStyle = '#FF88FF';
      const inv = window.__galaxianInvariantResults;
      ctx.fillText(
        `INVARIANTS: ${inv.passed}/${inv.total} passed  errors=${inv.errors.length}`,
        x1, y
      );
    }

    // Player invincibility indicator
    if (ps && ps._ignorePlayerCollisions) {
      y += 9;
      ctx.fillStyle = '#00FFFF';
      ctx.fillText('INVINCIBLE', x1, y);
    }

    // Restart count tracking
    if (this.game._restartCount !== undefined) {
      y += 9;
      ctx.fillStyle = '#AAAAAA';
      ctx.fillText(`RESTARTS: ${this.game._restartCount}`, x1, y);
    }

    // Draw alien debug labels on the main game area
    if (ps && ps.swarm) {
      const layout = ps.swarm.layout;
      for (const alien of layout) {
        if (alien.isDead) continue;
        ctx.fillStyle = '#FFFF00';
        ctx.font = '5px monospace';
        ctx.fillText(alien.debugLabel(), alien.renderX, alien.renderY);
      }
    }
  }
}
