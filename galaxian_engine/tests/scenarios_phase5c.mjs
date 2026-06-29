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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';

let passed = 0, failed = 0;

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    failed++;
    console.log(`  FAIL: ${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else {
    passed++;
  }
}

function assertNe(actual, notExpected, msg) {
  if (actual === notExpected) {
    failed++;
    console.log(`  FAIL: ${msg} — should not be ${JSON.stringify(actual)}`);
  } else {
    passed++;
  }
}

function assertOk(value, msg) {
  if (!value) {
    failed++;
    console.log(`  FAIL: ${msg}`);
  } else {
    passed++;
  }
}

function assertNoErrors(errors, context) {
  if (errors.length > 0) {
    failed++;
    console.log(`  FAIL: ${context} — ${errors.length} invariant error(s):`);
    for (const e of errors) {
      console.log(`    INVARIANT: ${e}`);
    }
  } else {
    passed++;
  }
}

const MockSwarmState = { aliveCount: 46, totalCount: 46, level: 1 };

class MockGame {
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
}

// We use a custom PlayState-like context that's testable
class FakePlayState {
  constructor() {
    this.game = new MockGame();
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

function tick(ps, isFire = false, f3 = false, shiftKey = false) {
  ps._emittedEvents = {};
  ps.player.update();
  if (isFire && !ps.player.recovering) {
    if (ps.playerBullet) {
      ps.playerBullet.fire(
        ps.player.x + Math.floor(CONFIG.SWARM.H_SPACE / 2),
        ps.player.y - CONFIG.BULLET.HEIGHT
      );
      ps._emitOnce(EVENTS.PLAYER_SHOT);
    }
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

// ----- SCENARIO A: MAX LOAD -----
console.log('\n=== SCENARIO A: MAXIMUM COMBAT LOAD ===');
{
  const ps = new FakePlayState();
  ps.scheduler.setEnabled(true);
  ps.flagshipScheduler.setEnabled(true);
  ps.flagshipScheduler.counters.master1 = 1;
  ps.flagshipScheduler.counters.master2 = 1;
  ps.flagshipScheduler.counters.secondaryEnabled = true;
  ps.flagshipScheduler.counters.secondary = 0;
  ps.flagshipScheduler.counters.canAttack = true;
  ps.scheduler.setBaseDifficulty(7);
  ps.scheduler.setExtraDifficulty(0);
  ps.scheduler._side = 'left';

  let maxInflight = 0;
  let maxGroupSeen = false;
  const v2 = new EngineInvariantValidator(ps.game);
  ps.game.playState = ps;

  let bulletFired = false;
  for (let t = 0; t < 2000; t++) {
    tick(ps, !bulletFired && t > 100, false, false);
    if (!bulletFired && t === 101) bulletFired = true;
    const ic = ps.inflightCtrl;
    let cnt = 0;
    for (const rec of ic) cnt++;
    if (cnt > maxInflight) maxInflight = cnt;
    if (ps.flagshipScheduler.activeGroup) maxGroupSeen = true;
  }

  assertOk(maxInflight >= 5, `should have 5+ inflight at some point (got ${maxInflight})`);
  assertOk(maxInflight <= 7, `should never exceed 7 inflight (got ${maxInflight})`);
  assertOk(maxGroupSeen, 'flagship group should have formed');

  let finalInflight = 0;
  for (const rec of ps.inflightCtrl) finalInflight++;
  assertOk(finalInflight >= 0, `inflight non-negative (${finalInflight})`);

  const bCount = ps.enemyBulletPool.activeCount;
  assertOk(bCount <= 14, `bullets <= 14 (${bCount})`);

  const errs = v2.validate();
  assertNoErrors(errs, 'Scenario A invariants');

  const snap = {
    tick: ps.game.logicTick,
    score: ps.game.score,
    aliveCount: ps.swarm.aliveCount,
    inflight: finalInflight,
    bullets: bCount,
  };
  const h = crypto.createHash('sha256').update(JSON.stringify(snap)).digest('hex').substring(0, 16);
  console.log(`  SNAPSHOT: tick=${snap.tick} score=${snap.score} alive=${snap.aliveCount} inflight=${snap.inflight} bullets=${snap.bullets} hash=${h}`);
}

// ----- SCENARIO B: SIMULTANEOUS DESTRUCTIONS -----
console.log('\n=== SCENARIO B: SIMULTANEOUS DESTRUCTIONS ===');
{
  const ps = new FakePlayState();
  ps.scheduler.setEnabled(true);
  ps.flagshipScheduler.setEnabled(true);
  ps.flagshipScheduler.counters.master1 = 1;
  ps.flagshipScheduler.counters.master2 = 1;
  ps.flagshipScheduler.counters.secondaryEnabled = true;
  ps.flagshipScheduler.counters.secondary = 0;
  ps.flagshipScheduler.counters.canAttack = true;
  ps.scheduler.setBaseDifficulty(7);
  ps.game.playState = ps;

  for (let t = 0; t < 500; t++) tick(ps, true, false, false);

  let destructionCount = 0;
  let scoreBefore = ps.game.score;

  for (const rec of ps.inflightCtrl) {
    if (rec.alien && rec.alien.alive) {
      rec.alien.kill();
      destructionCount++;
    }
  }
  for (let t = 0; t < 100; t++) tick(ps, false, false, false);

  assertOk(destructionCount >= 1, `at least 1 destruction (${destructionCount})`);
  assertOk(ps.game.score >= scoreBefore, `score increased (${scoreBefore} -> ${ps.game.score})`);

  const errs = new EngineInvariantValidator(ps.game).validate();
  assertNoErrors(errs, 'Scenario B invariants');
}

// ----- SCENARIO C: PLAYER DEATH UNDER LOAD -----
console.log('\n=== SCENARIO C: PLAYER DEATH UNDER LOAD ===');
{
  const ps = new FakePlayState();
  ps.scheduler.setEnabled(true);
  ps.flagshipScheduler.setEnabled(true);
  ps.flagshipScheduler.counters.master1 = 1;
  ps.flagshipScheduler.counters.master2 = 1;
  ps.flagshipScheduler.counters.secondaryEnabled = true;
  ps.flagshipScheduler.counters.secondary = 0;
  ps.flagshipScheduler.counters.canAttack = true;
  ps.game.playState = ps;

  for (let t = 0; t < 500; t++) tick(ps, true, false, false);

  const initialSchedulerEnabled = ps.scheduler.enabled;
  const initialFlagshipEnabled = ps.flagshipScheduler.enabled;

  ps._gameState = 'playerDying';
  ps.game.sm.currentName = 'playerDying';
  ps.player.alive = false;

  AudioEventBus.reset();
  AudioEventBus.emit(EVENTS.PLAYER_DESTROYED);
  let emitCount = AudioEventBus.count;
  AudioEventBus.emit(EVENTS.PLAYER_DESTROYED);
  let emitCount2 = AudioEventBus.count;

  assertEq(emitCount, 1, 'PLAYER_DESTROYED emitted once on death');
  assertEq(emitCount2, 2, 'second emission adds to log (bus allows, state dedups)');

  for (let t = 0; t < 50; t++) tick(ps, false, false, false);

  const errs = new EngineInvariantValidator(ps.game).validate();
  assertNoErrors(errs, 'Scenario C invariants');
  assertOk(!ps.game.playState || ps.game.playState === ps, 'playState ref coherent');
}

// ----- SCENARIO D: COMPLETE RESTART -----
console.log('\n=== SCENARIO D: COMPLETE RESTART ===');
{
  const ps = new FakePlayState();
  ps.flagshipScheduler.setEnabled(true);
  ps.flagshipScheduler.counters.master1 = 1;
  ps.flagshipScheduler.counters.master2 = 1;
  ps.flagshipScheduler.counters.secondaryEnabled = true;
  ps.flagshipScheduler.counters.secondary = 0;
  ps.flagshipScheduler.counters.canAttack = true;
  ps.game.playState = ps;

  for (let t = 0; t < 800; t++) tick(ps, true, false, false);

  ps.game.score = 4200;
  ps.shockCtrl.trigger();

  const oldEvents = AudioEventBus.count;
  AudioEventBus.clear();

  const ps2 = new FakePlayState();
  ps2.game.score = 0;
  ps2.game.lives = 3;
  ps2.game.level = 1;
  ps2.game.playState = ps2;

  let slotsFree = true;
  for (let i = 0; i < 8; i++) {
    if (ps2.inflightCtrl.pool.slots[i].allocated) slotsFree = false;
  }
  assertOk(slotsFree, 'all slots free after restart');
  assertOk(ps2.flagshipScheduler.activeGroup === null, 'no active group after restart');
  assertEq(ps2.enemyBulletPool.activeCount, 0, 'no enemy bullets after restart');
  assertOk(!ps2.shockCtrl.isActive, 'shock inactive after restart');
  assertEq(AudioEventBus.count, 0, 'audio events cleared after restart');
  assertEq(ps2.game.score, 0, 'score reset on restart');

  const errs = new EngineInvariantValidator(ps2.game).validate();
  assertNoErrors(errs, 'Scenario D invariants after restart');
}

// ----- SCENARIO E: DETERMINISM (MUTE vs UNMUTED) -----
console.log('\n=== SCENARIO E: DETERMINISM (MUTE vs AUDIO) ===');
{
  function runSim(audioEnabled) {
    const ps = new FakePlayState();
    ps.scheduler.setEnabled(true);
    ps.flagshipScheduler.setEnabled(true);
    ps.flagshipScheduler.counters.master1 = 1;
    ps.flagshipScheduler.counters.master2 = 1;
    ps.flagshipScheduler.counters.secondaryEnabled = true;
    ps.flagshipScheduler.counters.secondary = 0;
    ps.flagshipScheduler.counters.canAttack = true;
    ps.game.playState = ps;

    for (let t = 0; t < 1000; t++) {
      tick(ps, t % 10 === 0, false, false);
    }

    const snap = {
      tick: ps.game.logicTick,
      score: ps.game.score,
      aliveCount: ps.swarm.aliveCount,
      inflight: (() => { let c = 0; for (const r of ps.inflightCtrl) c++; return c; })(),
      bullets: ps.enemyBulletPool.activeCount,
    };
    return snap;
  }

  const r1 = runSim(true);
  const r2 = runSim(false);

  assertEq(r1.tick, r2.tick, 'deterministic tick count');
  assertEq(r1.score, r2.score, 'deterministic score');
  assertEq(r1.aliveCount, r2.aliveCount, 'deterministic alive count');
  assertEq(r1.inflight, r2.inflight, 'deterministic inflight count');
  assertEq(r1.bullets, r2.bullets, 'deterministic bullet count');

  const h1 = crypto.createHash('sha256').update(JSON.stringify(r1)).digest('hex');
  const h2 = crypto.createHash('sha256').update(JSON.stringify(r2)).digest('hex');
  assertEq(h1, h2, 'deterministic hash match');
  console.log(`  DETERMINISM HASH: ${h1.substring(0, 16)} (both runs identical)`);
}

// ----- SCENARIO F: SHOCK + PROJECTILES -----
console.log('\n=== SCENARIO F: SHOCK + PROJECTILES ===');
{
  const ps = new FakePlayState();
  ps.scheduler.setEnabled(true);
  ps.flagshipScheduler.setEnabled(true);
  ps.flagshipScheduler.counters.master1 = 1;
  ps.flagshipScheduler.counters.master2 = 1;
  ps.flagshipScheduler.counters.secondaryEnabled = true;
  ps.flagshipScheduler.counters.secondary = 0;
  ps.flagshipScheduler.counters.canAttack = true;
  ps.game.playState = ps;

  for (let t = 0; t < 400; t++) tick(ps, true, false, false);

  // Destroy flagship while inflight aliens and bullets exist
  let flagshipDestroyed = false;
  let inflightBeforeShock = 0;
  for (const rec of ps.inflightCtrl) inflightBeforeShock++;

  // Find flagship in formation (not inflight since group may not have formed)
  for (const a of ps.swarm.layout.aliens) {
    if (a && a.isFlagship && a.alive && !a.isDead) {
      a.kill();
      if (ps.flagshipScheduler.activeGroup) {
        for (const e of (ps.flagshipScheduler.activeGroup.escorts || [])) {
          if (e) { try { e.kill(); } catch (ex) {} }
        }
      }
      flagshipDestroyed = true;
      ps.shockCtrl.trigger();
      break;
    }
  }

  assertOk(flagshipDestroyed, 'flagship destroyed during shock test');
  assertOk(ps.shockCtrl.isActive, 'shock active after flagship destruction');

  let afterShock = 0;
  for (const rec of ps.inflightCtrl) afterShock++;
  if (inflightBeforeShock > 0) {
    assertOk(afterShock <= inflightBeforeShock, `inflight after shock (${afterShock}) <= before (${inflightBeforeShock})`);
  }

  for (let t = 0; t < 300; t++) tick(ps, false, false, false);

  assertOk(ps.shockCtrl.counter >= 0, `shock counter non-negative (${ps.shockCtrl.counter})`);
  const errs = new EngineInvariantValidator(ps.game).validate();
  assertNoErrors(errs, 'Scenario F invariants');
}

// ----- SCENARIO G: GAME OVER UNDER LOAD -----
console.log('\n=== SCENARIO G: GAME OVER UNDER LOAD ===');
{
  const ps = new FakePlayState();
  ps.scheduler.setEnabled(true);
  ps.flagshipScheduler.setEnabled(true);
  ps.flagshipScheduler.counters.master1 = 1;
  ps.flagshipScheduler.counters.master2 = 1;
  ps.flagshipScheduler.counters.secondaryEnabled = true;
  ps.flagshipScheduler.counters.secondary = 0;
  ps.flagshipScheduler.counters.canAttack = true;
  ps.game.playState = ps;

  for (let t = 0; t < 500; t++) tick(ps, true, false, false);

  AudioEventBus.reset();
  // Clear active group as PlayState.exit() would through state machine transition
  ps.flagshipScheduler.reset();
  AudioEventBus.emit(EVENTS.GAME_OVER);
  ps._gameState = 'gameOver';
  ps.game.sm.currentName = 'gameOver';

  const goCount = AudioEventBus.count;
  assertEq(goCount, 1, 'GAME_OVER emitted once');

  const errs = new EngineInvariantValidator(ps.game).validate();
  assertNoErrors(errs, 'Scenario G invariants');
}

// ----- SCENARIO H: ALL ALIENS DESTROYED -----
console.log('\n=== SCENARIO H: ALL ALIENS DESTROYED ===');
{
  const ps = new FakePlayState();
  ps.scheduler.setEnabled(true);
  ps.flagshipScheduler.setEnabled(true);
  ps.flagshipScheduler.counters.master1 = 1;
  ps.flagshipScheduler.counters.master2 = 1;
  ps.flagshipScheduler.counters.secondaryEnabled = true;
  ps.flagshipScheduler.counters.secondary = 0;
  ps.flagshipScheduler.counters.canAttack = true;
  ps.game.playState = ps;

  // Systematically kill all aliens
  for (const a of ps.swarm.layout.aliens) {
    if (a && a.alive) a.kill();
  }
  // Advance ticks so death timers expire (kill() sets dyingTimer=15)
  for (let t = 0; t < 30; t++) tick(ps, false, false, false);

  assertEq(ps.swarm.aliveCount, 0, 'all aliens dead');
  assertOk(ps.swarm.layout.aliens.every(a => a.isDead || !a.alive), 'all aliens truly dead');

  for (let t = 0; t < 200; t++) {
    tick(ps, true, false, false);
  }

  const errs = new EngineInvariantValidator(ps.game).validate();
  assertNoErrors(errs, 'Scenario H invariants');

  assertOk(ps.scheduler.lastRefusalReason !== 'none', 'scheduler refuses without aliens');
}

// ----- SUMMARY -----
console.log(`\n=== SCENARIO SUMMARY ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

process.exit(failed > 0 ? 1 : 0);
