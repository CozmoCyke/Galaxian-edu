// Test adapter for automated browser validation (Phases 4, 5A, 5B).
// Activated via ?test=1 query parameter.
// Calls the same public methods as keyboard input — does not bypass
// scheduler, counters, selectors, slot allocation, group, shock, returns, or audio.

import { AudioEventBus, EVENTS } from '../audio/AudioEventBus.js';

export function initTestAdapter(game, audioManager) {
  const api = {};
  api._audioManager = audioManager || null;

  Object.defineProperty(window, '__galaxianTest', {
    value: api,
    configurable: false,
    writable: false,
  });

  api.toggleFlagshipScheduler = () => {
    const ps = game.playState;
    if (!ps || !ps.flagshipScheduler) return false;
    ps.flagshipScheduler.setEnabled(!ps.flagshipScheduler.enabled);
    return ps.flagshipScheduler.enabled;
  };

  api.toggleOrdinaryScheduler = () => {
    const ps = game.playState;
    if (!ps || !ps.scheduler) return false;
    ps.scheduler.setEnabled(!ps.scheduler.enabled);
    return ps.scheduler.enabled;
  };

  api.advanceTicks = (count) => {
    for (let i = 0; i < count; i++) {
      game.update();
    }
    if (game.loop) game.loop._logicTick += count;
  };

  api.destroyAlien = (swarmIndex) => {
    const ps = game.playState;
    if (!ps || !ps.swarm) return false;
    const alien = ps.swarm.layout.getAlienBySwarmIndex(swarmIndex);
    if (!alien || !alien.alive) return false;
    alien.kill();
    return true;
  };

  api.setGameState = (stateName) => {
    if (game.sm._states[stateName]) {
      game.sm.transition(stateName);
      return true;
    }
    return false;
  };

  // Simulates keyboard F6: toggle flagship scheduler on/off (same public method)
  api.simulateF6 = () => {
    const ps = game.playState;
    if (!ps || !ps.flagshipScheduler) return;
    ps.flagshipScheduler.setEnabled(!ps.flagshipScheduler.enabled);
  };

  // Simulates keyboard Ctrl+F6: debug flagship launch (calls _debugLaunchFlagship)
  // This advances ticks with the scheduler enabled until a group is created.
  // The scheduler runs through its normal counter cycle; no counters are bypassed.
  api.simulateCtrlF6 = () => {
    const ps = game.playState;
    if (!ps || !ps.flagshipScheduler || !ps.swarm || !ps.inflightCtrl) return null;

    ps.flagshipScheduler.setEnabled(true);
    let maxTicks = 2000;
    let tick = 0;
    while (tick < maxTicks) {
      game.update();
      if (ps.flagshipScheduler.activeGroup) break;
      tick++;
    }
    return tick;
  };

  // Prepare escorts: keep at most `count` red aliens (non-flagship, alive),
  // sorted by proximity to center column. Kills the rest.
  api.prepareEscorts = (count) => {
    const ps = game.playState;
    if (!ps || !ps.swarm || !ps.swarm.layout) return;
    const aliens = ps.swarm.layout.aliens;
    const reds = aliens.filter(a => a && a.alive && a.type === 'red');
    reds.sort((a, b) => Math.abs((a.col || 0) - 5) - Math.abs((b.col || 0) - 5));
    const toKill = reds.slice(count);
    for (const alien of toKill) {
      alien.kill();
    }
  };

  api.launchFlagship = ({ escortCount } = {}) => {
    if (escortCount !== undefined) {
      api.prepareEscorts(escortCount);
    }
    api.simulateCtrlF6();
    api.advanceTicks(30);
    return api.getSnapshot();
  };

  api.getEnemyBulletSnapshot = () => {
    const ps = game.playState;
    if (!ps || !ps.enemyBulletPool) return { activeCount: 0, bullets: [] };
    const bullets = [];
    for (const b of ps.enemyBulletPool) {
      bullets.push({ x: Math.round(b.x), y: Math.round(b.y), vx: b.vx, vy: b.vy, id: b.id });
    }
    return { activeCount: bullets.length, bullets };
  };

  api.setPlayerInvincible = (invincible) => {
    const ps = game.playState;
    if (!ps) return;
    ps._ignorePlayerCollisions = invincible;
  };

  api.setLives = (n) => { game.lives = n; };

  api.setScore = (n) => { game.score = n; };

  api.forceEnemyFire = () => {
    const ps = game.playState;
    if (!ps || !ps.enemyBulletCtrl || !ps.inflightCtrl) return false;
    const player = ps.player;
    if (!player) return false;
    for (const record of ps.inflightCtrl) {
      if (!record.alien || !record.alien.alive) continue;
      const dx = player.x - record.x;
      const dy = player.y - record.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 1.5;
      ps.enemyBulletPool.allocate(record.x, record.y, (dx / dist) * speed, (dy / dist) * speed);
      return true;
    }
    return false;
  };

  api.getAudioEvents = () => AudioEventBus.events;

  api.clearAudioEvents = () => { AudioEventBus.clear(); };

  api.emitAudioEvent = (type) => { AudioEventBus.emit(type); };

  api._getGame = () => game;

  api.getAudioManagerState = () => {
    if (!api._audioManager) return null;
    return {
      initialized: api._audioManager.initialized,
      muted: api._audioManager.muted,
      audioLocked: api._audioManager.audioLocked,
    };
  };

  api.getSnapshot = () => {
    const ps = game.playState;
    if (!ps) return { state: game.sm.currentName, tick: game.logicTick };

    const inflightSlots = [];
    for (const rec of ps.inflightCtrl) {
      inflightSlots.push({
        slot: rec.slot,
        swarmIndex: rec.alien.swarmIndex,
        type: rec.alien.type,
        stage: rec.stageOfLife,
        active: rec.alive !== false,
        x: Math.round(rec.alien.renderX),
        y: Math.round(rec.alien.renderY),
      });
    }

    const pool = ps.inflightCtrl.pool;

    return {
      state: game.sm.currentName,
      tick: game.logicTick,
      score: game.score,
      swarm: {
        aliveCount: ps.swarm.aliveCount,
        inFormationCount: ps.swarm.layout.inFormationCount,
        totalCount: ps.swarm.layout.totalCount,
      },
      slots: {
        allocated: pool ? pool.allocatedCount : 0,
        free: pool ? pool.freeCount : 0,
        slot0: pool ? pool.slots[0].allocated : null,
        slot1: pool ? pool.slots[1].allocated : null,
        slot2: pool ? pool.slots[2].allocated : null,
        slot3: pool ? pool.slots[3].allocated : null,
        slot4: pool ? pool.slots[4].allocated : null,
        slot5: pool ? pool.slots[5].allocated : null,
        slot6: pool ? pool.slots[6].allocated : null,
        slot7: pool ? pool.slots[7].allocated : null,
        canAllocFlagship: pool ? pool.hasFreeFlagshipSlot() : null,
        canAllocEscort: pool ? pool.hasFreeEscortSlot() : null,
      },
      inflight: {
        activeCount: inflightSlots.length,
        aliens: inflightSlots,
        isAnyActive: ps.inflightCtrl.isAnyActive,
      },
      flagshipScheduler: {
        enabled: ps.flagshipScheduler ? ps.flagshipScheduler.enabled : null,
        canAttack: ps.flagshipScheduler ? ps.flagshipScheduler.counters.canAttack : null,
        lastRefusal: ps.flagshipScheduler ? ps.flagshipScheduler.lastRefusalReason : null,
        master1: ps.flagshipScheduler ? ps.flagshipScheduler.counters.master1 : null,
        master2: ps.flagshipScheduler ? ps.flagshipScheduler.counters.master2 : null,
        secondaryEnabled: ps.flagshipScheduler ? ps.flagshipScheduler.counters.secondaryEnabled : null,
        secondary: ps.flagshipScheduler ? ps.flagshipScheduler.counters.secondary : null,
        activeGroup: ps.flagshipScheduler && ps.flagshipScheduler.activeGroup ? {
          groupId: ps.flagshipScheduler.activeGroup.groupId,
          stage: ps.flagshipScheduler.activeGroup.stage,
          activeMemberCount: ps.flagshipScheduler.activeGroup.activeMemberCount,
          livingEscortCount: ps.flagshipScheduler.activeGroup.livingEscortCount,
          originalEscortCount: ps.flagshipScheduler.activeGroup.originalEscortCount,
          completed: ps.flagshipScheduler.activeGroup.completed,
          flagshipSlot: ps.flagshipScheduler.activeGroup.flagshipSlot,
          escorts: ps.flagshipScheduler.activeGroup.escorts.map(e => e ? { swarmIndex: e.swarmIndex, slot: e.slot, type: e.type, col: e.col, row: e.row } : null),
        } : null,
      },
      shock: {
        isActive: ps.shockCtrl ? ps.shockCtrl.isActive : null,
        counter: ps.shockCtrl ? ps.shockCtrl.counter : null,
        duration: ps.shockCtrl ? ps.shockCtrl.duration : null,
      },
      enemyBullets: {
        activeCount: ps.enemyBulletPool ? ps.enemyBulletPool.activeCount : 0,
        maxActive: 14,
      },
      audioEvents: AudioEventBus.count,
      player: {
        x: Math.round(ps.player.x),
        y: Math.round(ps.player.y),
        alive: ps.player.alive,
      },
    };
  };
}
