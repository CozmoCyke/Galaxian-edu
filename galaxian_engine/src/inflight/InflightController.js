import { InflightSlotPool } from './InflightSlotPool.js';
import { ArcRunner } from './ArcRunner.js';
import { ORDINARY_ALIEN_ARC_01 } from '../data/generated/ordinary-left-01.js';
import { STATE as ALIEN_STATE } from '../entities/Alien.js';

const STAGE = {
  PACKS_BAGS:         0,
  FLIES_IN_ARC:       1,
  READY_TO_ATTACK:    2,
  ATTACKING_PLAYER:   3,
  NEAR_BOTTOM:        4,
  REACHED_BOTTOM:     5,
  RETURNING:          6,
  BACK_IN_SWARM:      7,
};

const SCREEN_NEAR_BOTTOM_Y = 200;
const SCREEN_OFF_TOP_Y = 14;
const SPRITE_HEIGHT = 7;
const MAX_SORTIE_COUNT = 1;
const RETURN_DISTANCE_TOLERANCE = 25;

function computeSwarmTargetX(alien) {
  const idx = alien.swarmIndex;
  const row = (idx >> 4) & 7;
  return 124 - row * 6;
}

function computeSwarmTargetY(alien, swarm) {
  const col = alien.swarmIndex & 0x0F;
  return (swarm ? swarm.offsetY : 0) + col * 16 + 7;
}

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
      swarm,
      swarmIndex: alien.swarmIndex,
      stageOfLife: STAGE.PACKS_BAGS,
      x: alien.renderX,
      y: alien.renderY,
      speed: 1,
      clockwise: clockwise ? 1 : 0,
      arcTableLsb: 0,
      arcPosition: 0,
      pivotYValue: alien.renderY,
      pivotYValueAdd: 1,
      sortieCount: 0,
      animFrame: 0,
      flightTick: 0,
      returnTargetX: 0,
      returnTargetY: 0,
      runner: new ArcRunner(ORDINARY_ALIEN_ARC_01),
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
    const deadSlots = [];
    for (const [slot, record] of this.records) {
      if (!record.alien.alive || record.alien.isDying || record.alien.isDead) {
        deadSlots.push(slot);
        continue;
      }
      record.flightTick++;
      this._updateRecord(record);
    }
    for (const slot of deadSlots) {
      this.freeSlot(slot, false);
    }
  }

  _isOffScreenTop(y) {
    return y + SPRITE_HEIGHT < SCREEN_OFF_TOP_Y;
  }

  _updateRecord(record) {
    const alien = record.alien;

    switch (record.stageOfLife) {
      case STAGE.PACKS_BAGS:
        alien.beginFlight();
        record.stageOfLife = STAGE.FLIES_IN_ARC;
        break;

      case STAGE.FLIES_IN_ARC: {
        const result = record.runner.tick(record.clockwise !== 0);
        if (result) {
          alien.renderX += result.xDelta;
          alien.renderY += result.yDelta;
          record.x = alien.renderX;
          record.y = alien.renderY;
          record._lastDeltaX = result.xDelta;
          record._lastDeltaY = result.yDelta;

          if (this._isOffScreenTop(alien.renderY)) {
            record.stageOfLife = STAGE.REACHED_BOTTOM;
          } else if (result.completed) {
            record.stageOfLife = STAGE.READY_TO_ATTACK;
          }
        }
        break;
      }

      case STAGE.READY_TO_ATTACK:
        record.pivotYValue = alien.renderY;
        record.pivotYValueAdd = 1;
        record.speed = 1;
        record.stageOfLife = STAGE.ATTACKING_PLAYER;
        break;

      case STAGE.ATTACKING_PLAYER:
        alien.renderX++;
        record.pivotYValue += record.pivotYValueAdd;
        alien.renderY = record.pivotYValue;
        record.x = alien.renderX;
        record.y = alien.renderY;
        record._lastDeltaX = 1;
        record._lastDeltaY = record.pivotYValueAdd;

        if (this._isOffScreenTop(alien.renderY)) {
          record.stageOfLife = STAGE.REACHED_BOTTOM;
        } else if (alien.renderY >= SCREEN_NEAR_BOTTOM_Y) {
          record.stageOfLife = STAGE.NEAR_BOTTOM;
        }
        break;

      case STAGE.NEAR_BOTTOM:
        alien.renderX++;
        record.pivotYValue += record.pivotYValueAdd;
        alien.renderY = record.pivotYValue;
        record.x = alien.renderX;
        record.y = alien.renderY;
        record._lastDeltaX = 1;
        record._lastDeltaY = record.pivotYValueAdd;

        if (alien.renderY >= 240) {
          record.stageOfLife = STAGE.REACHED_BOTTOM;
        }
        break;

      case STAGE.REACHED_BOTTOM:
        record.sortieCount++;
        if (record.sortieCount >= MAX_SORTIE_COUNT) {
          record.returnTargetX = computeSwarmTargetX(alien);
          record.returnTargetY = computeSwarmTargetY(alien, record.swarm);
          record.stageOfLife = STAGE.RETURNING;
        }
        break;

      case STAGE.RETURNING: {
        const tx = computeSwarmTargetX(alien);
        const ty = computeSwarmTargetY(alien, record.swarm);
        record.returnTargetX = tx;
        record.returnTargetY = ty;

        const dx = tx - alien.renderX;
        record._lastDeltaY = Math.round(ty - alien.renderY);
        if (dx === 0) {
          alien.renderX = tx;
          alien.renderY = ty;
          alien.returnToFormation();
          record.stageOfLife = STAGE.BACK_IN_SWARM;
          this.freeSlot(record.slot, false);
        } else if (Math.abs(dx) <= RETURN_DISTANCE_TOLERANCE) {
          if (Math.abs(dx) <= 1) {
            alien.renderX = tx;
          } else {
            alien.renderX += dx > 0 ? 1 : -1;
          }
          alien.renderY = ty;
          record.x = alien.renderX;
          record.y = alien.renderY;
          record._lastDeltaX = dx > 0 ? 1 : -1;
        } else {
          alien.renderX += dx > 0 ? 1 : -1;
          alien.renderY = ty;
          record.x = alien.renderX;
          record.y = alien.renderY;
          record._lastDeltaX = dx > 0 ? 1 : -1;
        }
        break;
      }

      case STAGE.BACK_IN_SWARM:
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
