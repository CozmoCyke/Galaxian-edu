import { FlagshipAttackCounters } from './FlagshipAttackCounters.js';
import { FlagshipSelector } from './FlagshipSelector.js';
import { EscortSelector } from './EscortSelector.js';
import { FlagshipAttackGroup } from './FlagshipAttackGroup.js';

export class FlagshipAttackScheduler {

  constructor() {
    this.counters = new FlagshipAttackCounters();
    this._enabled = false;
    this._activeGroup = null;
    this._side = 'left';
    this._lastRefusalReason = 'none';
    this._lastGroupId = -1;
    this._lastCompletedGroup = null;
    this._lastKillEvent = null;
  }

  get enabled() { return this._enabled; }
  get activeGroup() { return this._activeGroup; }
  get side() { return this._side; }
  get lastRefusalReason() { return this._lastRefusalReason; }
  get lastGroupId() { return this._lastGroupId; }
  get lastCompletedGroup() { return this._lastCompletedGroup; }
  get lastKillEvent() { return this._lastKillEvent; }

  setEnabled(v) { this._enabled = v; }

  clearEvents() {
    this._lastCompletedGroup = null;
    this._lastKillEvent = null;
  }

  // Track active group lifecycle — call every frame from PlayState
  updateGroupLifecycle(inflightCtrl) {
    const group = this._activeGroup;
    if (!group || group.completed) return;

    const records = inflightCtrl.records;

    // Check flagship at slot 1
    if (!group.flagshipReturned && !group.flagshipDead) {
      const rec = records.get(1);
      if (!rec) {
        if (group.flagship.isDying || group.flagship.isDead) {
          group.onFlagshipDestroyed();
          this._lastKillEvent = { type: 'flagship_killed', group, alien: group.flagship };
        } else {
          group.onFlagshipReturned();
        }
      }
    }

    // Check escorts at slots 2, 3
    for (let i = 0; i < group.escorts.length; i++) {
      const escort = group.escorts[i];
      if (!escort) continue;
      if (group.escortReturned[i]) continue;
      const targetSlot = 2 + i;
      const rec = records.get(targetSlot);
      if (!rec) {
        if (escort.isDying || escort.isDead) {
          group.onEscortDestroyed(i);
          this._lastKillEvent = { type: 'escort_killed', group, alien: escort, index: i };
        } else {
          group.onEscortReturned(i);
        }
      }
    }

    if (group.isComplete) {
      group.markComplete();
      this._lastCompletedGroup = group;
      this._activeGroup = null;
    }
  }

  update(swarm, inflightCtrl, gameState) {
    if (!this._enabled) {
      this._lastRefusalReason = 'scheduler disabled';
      return null;
    }

    if (!swarm || swarm.isDead()) {
      this._lastRefusalReason = 'no aliens in swarm';
      return null;
    }

    if (gameState.gameState === 'playerDying' || gameState.gameState === 'gameOver') {
      this._lastRefusalReason = `game state: ${gameState.gameState}`;
      return null;
    }

    const haveFlagships = swarm.layout && swarm.layout.hasFlagships();
    if (!haveFlagships) {
      this._lastRefusalReason = 'no flagships in swarm';
      return null;
    }

    const hasPlayerSpawned = gameState.gameState === 'playing';
    const isFlagshipHit = gameState.isFlagshipHit || false;
    const isGameInPlay = true;

    // Update flagship attack counters
    this.counters.updateAttackCounters({
      hasPlayerSpawned,
      haveFlagships,
      isFlagshipHit,
      isGameInPlay,
      difficultyBase: gameState.difficultyBase || 2,
      difficultyExtra: gameState.difficultyExtra || 0,
      extraFlagshipCount: 0
    });

    // Check if flagship can attack (secondary counter hit zero)
    this.counters.checkCanAttack({ hasPlayerSpawned, haveFlagships });

    if (!this.counters.canAttack) {
      this._lastRefusalReason = 'no flagship counter hit zero';
      return null;
    }
    this.counters.consumeAttack();

    // Check flagship slot availability
    if (!inflightCtrl.pool.hasFreeFlagshipSlot()) {
      this._lastRefusalReason = 'flagship slot in use';
      return null;
    }

    // Use the same flank as ordinary scheduler
    this._side = gameState.attackSide || 'left';

    // Select flagship
    const flagship = FlagshipSelector.selectFlagship(swarm, this._side);
    if (!flagship) {
      // Try red fallback
      const redAlien = FlagshipSelector.selectRedFallback(swarm, this._side);
      if (!redAlien) {
        this._lastRefusalReason = 'no flagship or red alien available';
        return null;
      }
      // Use ordinary slot for red fallback
      const slot = inflightCtrl.pool.allocateNext();
      if (slot === null) {
        this._lastRefusalReason = 'no ordinary slot for red fallback';
        return null;
      }
      const result = inflightCtrl.launchOrdinaryAlien(redAlien, swarm, this._side === 'right' ? 1 : 0);
      if (!result) {
        this._lastRefusalReason = 'red fallback launch failed';
        inflightCtrl.pool.free(slot);
        return null;
      }
      this._lastRefusalReason = 'red fallback launched';
      return { type: 'red_fallback', alien: redAlien, slot };
    }

    // Select escorts
    const escorts = EscortSelector.selectEscorts(swarm, flagship, 2);
    const escortCount = Math.min(escorts.length, inflightCtrl.pool.hasFreeEscortSlot() ? 2 : 0);

    // Check slot availability before launching anything
    if (!inflightCtrl.pool.hasFreeFlagshipSlot()) {
      this._lastRefusalReason = 'flagship slot in use';
      return null;
    }
    if (escortCount > 0 && !inflightCtrl.pool.hasFreeEscortSlot()) {
      this._lastRefusalReason = 'escort slot in use';
      return null;
    }

    // Create group
    const group = new FlagshipAttackGroup({
      flagship,
      escorts: escorts.slice(0, escortCount),
      side: this._side,
      flagshipsRemaining: swarm.layout.aliens.filter(a => a.isFlagship && a.isAlive && a !== flagship).length
    });
    this._activeGroup = group;

    // Helper: launch alien, then reassign its inflight record to a target slot
    const launchAndAssignSlot = (alien, targetSlot, clockwise) => {
      const record = inflightCtrl.launchOrdinaryAlien(alien, swarm, clockwise);
      if (!record) return null;
      const oldSlot = record.slot;
      if (oldSlot !== targetSlot) {
        inflightCtrl.pool.free(oldSlot);
        inflightCtrl.pool.allocate(targetSlot);
        inflightCtrl.records.delete(oldSlot);
        record.slot = targetSlot;
        inflightCtrl.records.set(targetSlot, record);
      }
      return record;
    };

    // Launch flagship into slot 1
    const fsRecord = launchAndAssignSlot(flagship, 1, this._side === 'right' ? 1 : 0);
    if (!fsRecord) {
      this._lastRefusalReason = 'flagship launch failed';
      this._activeGroup = null;
      return null;
    }

    // Launch escorts into slots 2-3
    for (let i = 0; i < escortCount; i++) {
      const escort = escorts[i];
      const targetSlot = 2 + i;
      const escRecord = launchAndAssignSlot(escort, targetSlot, this._side === 'right' ? 1 : 0);
      if (!escRecord) {
        // Escort launch failed — free already-launched members
        if (inflightCtrl.pool.isAllocated(1)) {
          inflightCtrl.freeSlot(1, true);
        }
        for (let j = 0; j < i; j++) {
          inflightCtrl.freeSlot(2 + j, true);
        }
        this._activeGroup = null;
        this._lastRefusalReason = 'escort launch failed';
        return null;
      }
    }

    group.markLaunch(Date.now());
    this._lastGroupId = group.groupId;
    this._lastRefusalReason = 'flagship group launched';

    return {
      type: 'flagship_group',
      group,
      flagship,
      escorts: escorts.slice(0, escortCount),
    };
  }

  reset() {
    this.counters.reset();
    this._activeGroup = null;
    this._lastRefusalReason = 'none';
    this._lastGroupId = -1;
    this._lastCompletedGroup = null;
    this._lastKillEvent = null;
  }

}
