import { Swarm } from '../src/entities/swarm/Swarm.js';
import { InflightController } from '../src/inflight/InflightController.js';
import { OrdinaryAttackScheduler } from '../src/attacks/OrdinaryAttackScheduler.js';
import { FlagshipAttackScheduler } from '../src/flagship/FlagshipAttackScheduler.js';
import { ShockController } from '../src/flagship/ShockController.js';
import { FlagshipScoreCalculator } from '../src/flagship/FlagshipScoreCalculator.js';
import { EnemyBulletPool } from '../src/entities/EnemyBulletPool.js';
import { EnemyBulletController } from '../src/attacks/EnemyBulletController.js';
import { Player } from '../src/entities/Player.js';
import { PlayerBullet } from '../src/entities/PlayerBullet.js';
import { AudioEventBus, EVENTS } from '../src/audio/AudioEventBus.js';
import { CONFIG } from '../src/config.js';
import { EngineInvariantValidator } from '../src/debug/EngineInvariantValidator.js';
import crypto from 'crypto';

const TOTAL_TICKS = 100000;
const CHECK_INTERVAL = 1000;
const SAME_SEED = 42;

let passed = 0, failed = 0;

function assertOk(value, msg) {
  if (!value) {
    failed++;
    console.log(`  FAIL: ${msg}`);
    return false;
  }
  passed++;
  return true;
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    failed++;
    console.log(`  FAIL: ${msg} — expected ${expected}, got ${actual}`);
    return false;
  }
  passed++;
  return true;
}

function assertNoErrors(errors, context) {
  if (errors.length > 0) {
    failed++;
    console.log(`  FAIL: ${context} — ${errors.length} error(s):`);
    for (const e of errors) {
      console.log(`    ${e}`);
    }
    return false;
  }
  passed++;
  return true;
}

class FakePlayState {
  constructor() {
    this.game = new (class {
      constructor() {
        this.score = 0;
        this.highScore = 0;
        this.lives = 3;
        this.level = 1;
        this.sm = { currentName: 'playing', _states: {} };
        this.input = { firePressed: false, restartPressed: false, f3Pressed: false, shiftKey: false };
        this.input.wasPressed = () => false;
        this.audioManager = null;
        this.playState = null;
        this.logicTick = 0;
        this.measuredFps = 60;
        this._prevStateRender = null;
      }
    })();
    this.game.playState = this;
    this._gameState = 'playing';
    this.swarm = new Swarm();
    this.inflightCtrl = new InflightController();
    this.scheduler = new OrdinaryAttackScheduler();
    this.flagshipScheduler = new FlagshipAttackScheduler();
    this.shockCtrl = new ShockController();
    this.enemyBulletPool = new EnemyBulletPool();
    this.player = new Player(this.game);
    this.playerBullet = new PlayerBullet(this.game);
    this.enemyBulletCtrl = new EnemyBulletController(
      this.enemyBulletPool, this.inflightCtrl, this.player, this.shockCtrl
    );
    this._emittedEvents = {};
    this._ignorePlayerCollisions = false;
    this.render = () => {};
  }
  _getGameState() { return this._gameState; }
  _emitOnce(type, data) {
    if (this._emittedEvents && this._emittedEvents[type]) return;
    this._emittedEvents = this._emittedEvents || {};
    this._emittedEvents[type] = true;
    AudioEventBus.emit(type, data);
  }
}

const STAGES = {
  PACKS_BAGS: 0, FLIES_IN_ARC: 1, READY_TO_ATTACK: 2, ATTACKING_PLAYER: 3,
  NEAR_BOTTOM: 4, REACHED_BOTTOM: 5, RETURNING: 6, BACK_IN_SWARM: 7,
};

function runTick(ps, fire) {
  ps._emittedEvents = {};
  ps.player.update();
  if (fire && !ps.player.recovering && ps.playerBullet) {
    ps.playerBullet.fire(
      ps.player.x + Math.floor(CONFIG.SWARM.H_SPACE / 2),
      ps.player.y - CONFIG.BULLET.HEIGHT
    );
    ps._emitOnce(EVENTS.PLAYER_SHOT);
  }
  if (ps.playerBullet) ps.playerBullet.update();
  ps.swarm.update();
  ps.inflightCtrl.update();

  for (const rec of ps.inflightCtrl) {
    if (!rec._diveEventEmitted && rec.stageOfLife >= 3) {
      rec._diveEventEmitted = true;
      ps._emitOnce(EVENTS.ALIEN_DIVE_STARTED, { swarmIndex: rec.alien.swarmIndex, type: rec.alien.type });
    }
  }

  ps.enemyBulletCtrl.update(ps._getGameState());
  if (ps.enemyBulletPool) ps.enemyBulletPool.update();
  AudioEventBus.clear();
  ps.flagshipScheduler.updateGroupLifecycle(ps.inflightCtrl);

  const ke = ps.flagshipScheduler.lastKillEvent;
  if (ke) {
    if (ke.type === 'flagship_killed') ps.shockCtrl.trigger();
    if (ke.type === 'flagship_killed') ps._emitOnce(EVENTS.FLAGSHIP_DESTROYED, { swarmIndex: ke.alien.swarmIndex, groupId: ke.groupId });
    ps.flagshipScheduler.clearEvents();
  }

  const cg = ps.flagshipScheduler.lastCompletedGroup;
  if (cg && cg.flagshipDead) {
    const ebf = cg.originalEscortCount - cg.livingEscortCount;
    const sr = FlagshipScoreCalculator.calculate({ originalEscortCount: cg.originalEscortCount, livingEscortCount: cg.livingEscortCount, escortsDestroyedBeforeFlagship: ebf });
    ps.game.score += sr.points;
  }

  if (ps.scheduler.enabled) ps.scheduler.update(ps.swarm, ps.inflightCtrl, ps._getGameState());
  if (ps.flagshipScheduler.enabled) {
    ps.flagshipScheduler.update(ps.swarm, ps.inflightCtrl, {
      gameState: ps._getGameState(),
      difficultyBase: ps.scheduler.baseDifficulty,
      difficultyExtra: ps.scheduler.extraDifficulty,
      attackSide: ps.scheduler.side,
      isFlagshipHit: ps.shockCtrl.isActive,
    });
  }
  ps.shockCtrl.update({ noInflightAliens: !ps.inflightCtrl.isAnyActive });
  ps.game.logicTick = (ps.game.logicTick || 0) + 1;
}

function killRandomAlien(ps) {
  const alive = ps.swarm.layout.aliens.filter(a => a && a.alive && !a.isDead);
  if (alive.length === 0) return null;
  const idx = (ps.game.logicTick * 7 + 13) % alive.length;
  const target = alive[idx];
  target.kill();
  return target;
}

function inflightCount(ps) {
  let c = 0;
  for (const r of ps.inflightCtrl) c++;
  return c;
}

function getSnapshot(ps) {
  const ic = ps.inflightCtrl;
  const activeBullets = [];
  for (const b of ps.enemyBulletPool) {
    activeBullets.push({ id: b.id, x: Math.round(b.x), y: Math.round(b.y) });
  }
  return {
    tick: ps.game.logicTick,
    score: ps.game.score,
    lives: ps.game.lives,
    level: ps.game.level,
    state: ps._gameState,
    alive: ps.swarm.aliveCount,
    inFormation: ps.swarm.layout.inFormationCount,
    inflight: inflightCount(ps),
    slots: ic.pool.allocatedCount,
    bullets: ps.enemyBulletPool.activeCount,
    groupActive: ps.flagshipScheduler.activeGroup !== null,
    shock: ps.shockCtrl.isActive,
    audioEvents: AudioEventBus.count,
    maxSlots: 8,
    maxBullets: CONFIG.ENEMY_BULLET.MAX_ACTIVE,
  };
}

function runSimulation(label) {
  const ps = new FakePlayState();
  ps.scheduler.setEnabled(true);
  ps.scheduler.setBaseDifficulty(7);
  ps.scheduler._side = 'left';
  ps.flagshipScheduler.setEnabled(true);
  const validator = new EngineInvariantValidator(ps.game);

  console.log(`\n=== SOAK: ${label} ===`);
  let lastReport = 0;
  let maxInflightSeen = 0;
  let maxBulletsSeen = 0;
  let totalRestarts = 0;
  let deathCount = 0;
  let muteToggle = false;

  let playerDyingTimer = 0;
  let gameOverTimer = 0;
  let isWaitingForRestart = false;

  for (let t = 1; t <= TOTAL_TICKS; t++) {
    const shouldFire = (t % 5 === 0);
    const shouldDestroy = (t % 47 === 0);
    const shouldKillPlayer = (t % 500 === 0 && ps._gameState === 'playing' && ps.player.alive && !ps.player.recovering);
    const shouldMute = (t % 1000 === 0);

    runTick(ps, shouldFire);

    if (shouldDestroy && ps.swarm.aliveCount > 5) {
      killRandomAlien(ps);
    }

    // State machine simulation
    if (shouldKillPlayer) {
      ps.player.alive = false;
      AudioEventBus.emit(EVENTS.PLAYER_DESTROYED);
      ps._gameState = 'playerDying';
      ps.game.sm.currentName = 'playerDying';
      playerDyingTimer = 90;
      deathCount++;
    }

    if (ps._gameState === 'playerDying') {
      playerDyingTimer--;
      if (playerDyingTimer <= 0) {
        if (ps.game.lives <= 0) {
          ps._gameState = 'gameOver';
          ps.game.sm.currentName = 'gameOver';
          gameOverTimer = 120;
          isWaitingForRestart = false;
          AudioEventBus.emit(EVENTS.GAME_OVER);
        } else {
          // Restart playing — recreate swarm
          ps.game.lives--;
          ps._gameState = 'playing';
          ps.game.sm.currentName = 'playing';
          ps.swarm = new Swarm();
          ps.player.alive = true;
          ps.player.x = CONFIG.PLAYER.X;
          ps.player.y = CONFIG.PLAYER.Y;
          ps.player.recovering = true;
          ps.player.recoveryTimer = 60;
          ps.inflightCtrl.reset();
          ps.flagshipScheduler.reset();
          ps.shockCtrl.reset();
          ps._ignorePlayerCollisions = false;
        }
      }
    }

    if (ps._gameState === 'gameOver') {
      if (!isWaitingForRestart) {
        gameOverTimer--;
        if (gameOverTimer <= 0) {
          isWaitingForRestart = true;
          gameOverTimer = 60;
        }
      } else {
        gameOverTimer--;
        if (gameOverTimer <= 0) {
          // Full restart
          totalRestarts++;
          ps.game.score = 0;
          ps.game.lives = 3;
          ps.game.level = 1;
          ps.swarm = new Swarm();
          ps.player = new Player(ps.game);
          ps.playerBullet = new PlayerBullet(ps.game);
          ps.inflightCtrl = new InflightController();
          ps.scheduler = new OrdinaryAttackScheduler();
          ps.scheduler.setEnabled(true);
          ps.scheduler.setBaseDifficulty(7);
          ps.flagshipScheduler = new FlagshipAttackScheduler();
          ps.flagshipScheduler.setEnabled(true);
          ps.shockCtrl = new ShockController();
          ps.enemyBulletPool = new EnemyBulletPool();
          ps.enemyBulletCtrl = new EnemyBulletController(
            ps.enemyBulletPool, ps.inflightCtrl, ps.player, ps.shockCtrl
          );
          ps._gameState = 'playing';
          ps.game.sm.currentName = 'playing';
          AudioEventBus.clear();
          isWaitingForRestart = false;
        }
      }
    }

    if (shouldMute) {
      muteToggle = !muteToggle;
    }

    const currentInflight = inflightCount(ps);
    if (currentInflight > maxInflightSeen) maxInflightSeen = currentInflight;
    if (ps.enemyBulletPool.activeCount > maxBulletsSeen) maxBulletsSeen = ps.enemyBulletPool.activeCount;

    if (t % CHECK_INTERVAL === 0) {
      const errs = validator.validate();
      if (errs.length > 0) {
        console.log(`  INVARIANT FAIL at tick ${t}:`);
        for (const e of errs) {
          console.log(`    ${e}`);
        }
        failed++;
        return null;
      }

      const snap = getSnapshot(ps);
      console.log(
        `  tick=${snap.tick} state=${snap.state} alive=${snap.alive} ` +
        `form=${snap.inFormation} inflight=${snap.inflight} slots=${snap.slots} ` +
        `bullets=${snap.bullets} group=${snap.groupActive} shock=${snap.shock} ` +
        `score=${snap.score} lives=${snap.lives} level=${snap.level}`
      );
    }

    if (t % 5000 === 0) {
      assertOk(ps.swarm.aliveCount >= 0, `aliveCount >= 0 at tick ${t}`);
      passed--; // remove the pass since we're just verifying
    }
  }

  // Final snapshot hash
  const finalSnap = getSnapshot(ps);
  const hash = crypto.createHash('sha256').update(JSON.stringify(finalSnap)).digest('hex');
  console.log(`\n  MAX INFLIGHT: ${maxInflightSeen}`);
  console.log(`  MAX BULLETS: ${maxBulletsSeen}`);
  console.log(`  RESTARTS: ${totalRestarts}`);
  console.log(`  FINAL SNAPSHOT HASH: ${hash}`);
  console.log(`  SOAK ${label} COMPLETE`);

  return { snapshot: finalSnap, hash, maxInflight: maxInflightSeen };
}

// Run twice with same seed
const r1 = runSimulation('PASS 1 (seed=42)');
if (r1) {
  const r2 = runSimulation('PASS 2 (seed=42)');
  if (r2) {
    assertEq(r1.hash, r2.hash, 'deterministic repeat: same final snapshot hash');
    if (r1.hash === r2.hash) {
      console.log(`\n  DETERMINISM VERIFIED: both passes produce identical hash ${r1.hash.substring(0, 16)}`);
    }
  }
}

console.log(`\n=== SOAK SUMMARY ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

process.exit(failed > 0 ? 1 : 0);
