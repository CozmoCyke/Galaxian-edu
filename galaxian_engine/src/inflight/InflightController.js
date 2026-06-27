import { InflightSlotPool } from './InflightSlotPool.js';

const STAGE = {
  PACKS_BAGS:         0,
  FLIES_IN_ARC:       1,
  READY_TO_ATTACK:    2,
  ATTACKING_PLAYER:   3,
  NEAR_BOTTOM:        4,
  REACHED_BOTTOM:     5,
  RETURNING:          6,
};

export class InflightController {

  constructor() {
    this.pool = new InflightSlotPool();
    this.records = new Map();
  }

  get activeCount() { return this.records.size; }
  get isAnyActive() { return this.records.size > 0; }

  launchOrdinaryAlien(alien, swarm, clockwise) {
    if (!alien) return null;
    if (!alien.isInFormation) return null;

    const slot = this.pool.allocateNext();
    if (slot === null) return null;

    alien.leaveFormation();

    const record = {
      slot,
      alien,
      swarmIndex: alien.swarmIndex,
      stageOfLife: STAGE.PACKS_BAGS,
      x: alien.renderX,
      y: alien.renderY,
      speed: 0,
      clockwise: clockwise ? 1 : 0,
      arcTableLsb: 0,
      arcPosition: 0,
      pivotY: 0,
      pivotYAdd: 0,
      sortieCount: 0,
      animFrame: 0,
    };

    this.records.set(slot, record);
    return record;
  }

  getRecord(slot) {
    return this.records.get(slot) || null;
  }

  getRecordByAlien(alien) {
    for (const r of this.records.values()) {
      if (r.alien === alien) return r;
    }
    return null;
  }

  freeSlot(slot, returnToSwarm) {
    const record = this.records.get(slot);
    if (!record) return false;
    if (returnToSwarm !== false) {
      record.alien.returnToFormation();
    }
    this.records.delete(slot);
    this.pool.free(slot);
    return true;
  }

  reset() {
    this.records.clear();
    this.pool.reset();
  }

  update() {
    for (const [slot, record] of this.records) {
      this._updateRecord(record);
    }
  }

  _updateRecord(record) {
    const alien = record.alien;

    switch (record.stageOfLife) {
      case STAGE.PACKS_BAGS:
        alien.beginFlight();
        record.stageOfLife = STAGE.FLIES_IN_ARC;
        break;

      case STAGE.FLIES_IN_ARC:
        break;

      case STAGE.READY_TO_ATTACK:
        break;

      case STAGE.ATTACKING_PLAYER:
        break;

      case STAGE.NEAR_BOTTOM:
        break;

      case STAGE.REACHED_BOTTOM:
        break;

      case STAGE.RETURNING:
        break;
    }
  }

  forEach(fn) {
    this.records.forEach(fn);
  }

  [Symbol.iterator]() {
    return this.records.values();
  }
}
