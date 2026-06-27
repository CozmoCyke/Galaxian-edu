import { GalaxianRng } from '../core/GalaxianRng.js';
import { AlienAttackCounters } from './AlienAttackCounters.js';
import { OrdinaryAlienSelector } from './OrdinaryAlienSelector.js';

export class OrdinaryAttackScheduler {

  constructor() {
    this.rng = new GalaxianRng(0);
    this.counters = new AlienAttackCounters();
    this._enabled = false;
    this._side = 'left';
    this._baseDifficulty = 2;
    this._extraDifficulty = 0;
    this._lastLaunchTick = -1;
    this._lastRefusalReason = 'none';
    this._lastSwarmIndex = -1;
    this._totalLaunches = 0;
    this._tickCounter = 0;
    this._isFlagshipHit = false;
  }

  get enabled() { return this._enabled; }
  get side() { return this._side; }
  get baseDifficulty() { return this._baseDifficulty; }
  get extraDifficulty() { return this._extraDifficulty; }
  get lastLaunchTick() { return this._lastLaunchTick; }
  get lastRefusalReason() { return this._lastRefusalReason; }
  get lastSwarmIndex() { return this._lastSwarmIndex; }
  get totalLaunches() { return this._totalLaunches; }
  get tickCounter() { return this._tickCounter; }

  setEnabled(value) {
    this._enabled = value;
  }

  setBaseDifficulty(value) {
    this._baseDifficulty = Math.min(Math.max(value, 0), 7);
  }

  setExtraDifficulty(value) {
    this._extraDifficulty = Math.min(Math.max(value, 0), 7);
  }

  reset() {
    this.counters.reset();
    this.rng.setState(0);
    this._side = 'left';
    this._lastLaunchTick = -1;
    this._lastRefusalReason = 'none';
    this._lastSwarmIndex = -1;
    this._totalLaunches = 0;
    this._tickCounter = 0;
    this._isFlagshipHit = false;
    this._enabled = false;
  }

  update(swarm, inflightCtrl, gameState) {
    this._tickCounter++;

    if (!this._enabled) {
      this._lastRefusalReason = 'scheduler disabled';
      return null;
    }

    if (gameState === 'playerDying' || gameState === 'gameOver') {
      this._lastRefusalReason = `game state: ${gameState}`;
      return null;
    }

    if (this._isFlagshipHit) {
      this._lastRefusalReason = 'flagship hit (shock)';
      return null;
    }

    if (!swarm || swarm.isDead()) {
      this._lastRefusalReason = 'no aliens in swarm';
      return null;
    }

    if (!this._isGameStateOk(gameState, swarm)) {
      return null;
    }

    this.counters.tick(this._baseDifficulty, this._extraDifficulty);

    if (!this.counters.canAttack) {
      this._lastRefusalReason = 'no counter hit zero';
      return null;
    }
    this.counters.canAttackConsumed();

    const maxInflight = this._computeMaxInflight();
    if (inflightCtrl.activeCount >= maxInflight) {
      this._lastRefusalReason = `max inflight (${inflightCtrl.activeCount}/${maxInflight})`;
      return null;
    }

    this._toggleFlank();

    const unavailableIds = this._getInflightAlienIds(inflightCtrl);
    let alien = OrdinaryAlienSelector.selectOrdinaryAlien({
      side: this._side,
      swarm,
      unavailableAlienIds: unavailableIds,
    });

    if (!alien) {
      this._toggleFlank();
      alien = OrdinaryAlienSelector.selectOrdinaryAlien({
        side: this._side,
        swarm,
        unavailableAlienIds: unavailableIds,
      });
    }

    if (!alien) {
      this._lastRefusalReason = 'no alien on either flank';
      return null;
    }

    const clockwise = this._side === 'right' ? 1 : 0;
    const record = inflightCtrl.launchOrdinaryAlien(alien, swarm, clockwise);
    if (!record) {
      this._lastRefusalReason = 'launch failed';
      return null;
    }

    this._lastLaunchTick = this._tickCounter;
    this._lastSwarmIndex = alien.swarmIndex;
    this._lastRefusalReason = 'none';
    this._totalLaunches++;
    return record;
  }

  _isGameStateOk(gameState, swarm) {
    if (gameState === 'playerDying' || gameState === 'gameOver') {
      this._lastRefusalReason = `game state: ${gameState}`;
      return false;
    }
    if (!swarm || swarm.isDead()) {
      this._lastRefusalReason = 'no aliens in swarm';
      return false;
    }
    return true;
  }

  _toggleFlank() {
    this._side = this._side === 'left' ? 'right' : 'left';
  }

  get maxInflight() {
    return this._computeMaxInflight();
  }

  _computeMaxInflight() {
    const raw = ((this._baseDifficulty + this._extraDifficulty) >> 1) + 1;
    return Math.min(raw, 4);
  }

  _getInflightAlienIds(inflightCtrl) {
    const ids = new Set();
    if (!inflightCtrl) return ids;
    for (const record of inflightCtrl) {
      if (record && record.alien) {
        ids.add(record.alien.id);
      }
    }
    return ids;
  }
}
