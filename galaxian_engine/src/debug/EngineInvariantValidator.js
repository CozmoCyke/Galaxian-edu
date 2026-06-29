const MAX_ALIENS = 46;
const MAX_ENEMY_BULLETS = 14;
const TOTAL_SLOTS = 8;
const FLAGSHIP_SLOT = 1;
const ESCORT_SLOTS = [2, 3];
const ORDINARY_SLOTS = [4, 5, 6, 7];

export class EngineInvariantValidator {

  constructor(game) {
    this._game = game;
  }

  validate() {
    const errors = [];
    this._validateAliens(errors);
    this._validateSlots(errors);
    this._validateGroups(errors);
    this._validateProjectiles(errors);
    this._validateAudio(errors);
    this._validateState(errors);
    return errors;
  }

  _getIC() {
    const ps = this._game.playState;
    if (!ps) return null;
    return ps.inflightCtrl || null;
  }

  _validateAliens(errors) {
    const ps = this._game.playState;
    if (!ps || !ps.swarm || !ps.swarm.layout) return;
    const layout = ps.swarm.layout;
    if (typeof layout.aliens === 'undefined') {
      if (typeof layout.getAlienBySwarmIndex === 'function') {
        return;
      }
      return;
    }
    const allAliens = layout.aliens || [];
    const aliveAliens = allAliens.filter(a => a && a.alive);

    if (allAliens.length !== MAX_ALIENS) {
      errors.push(`ALIEN_COUNT: expected ${MAX_ALIENS}, got ${allAliens.length}`);
    }

    const swarmIndices = new Set();
    const ids = new Set();
    for (const a of allAliens) {
      if (!a) continue;
      if (ids.has(a.id)) errors.push(`DUPLICATE_ALIEN_ID: ${a.id}`);
      ids.add(a.id);
      if (swarmIndices.has(a.swarmIndex)) errors.push(`DUPLICATE_SWARM_INDEX: ${a.swarmIndex}`);
      swarmIndices.add(a.swarmIndex);
    }

    for (const a of allAliens) {
      if (!a || !a.alive) continue;
      const inForm = a.isInFormation || false;
      const dead = a.isDead || false;
      const inflight = a.isInFlight || false;
      const leaving = a.isLeaving || false;
      const dying = a.isDying || false;
      if (!inForm && !dead && !inflight && !leaving && !dying) {
        errors.push(`ALIEN_INVALID_STATE: id=${a.id} swarmIndex=${a.swarmIndex} state=${a.state}`);
      }
    }

    const ic = this._getIC();
    if (!ic) return;

    const inflightSet = new Set();
    for (const rec of ic) {
      if (inflightSet.has(rec.swarmIndex)) {
        errors.push(`DUPLICATE_INFLIGHT_SWARM_INDEX: ${rec.swarmIndex}`);
      }
      inflightSet.add(rec.swarmIndex);
    }

    const pool = ic.pool;
    if (pool) {
      let allocated = 0;
      for (const s of pool.slots) { if (s.allocated) allocated++; }
      if (allocated !== pool.allocatedCount) {
        errors.push(`SLOT_POOL_COUNT_MISMATCH: slots=${allocated} pool.allocatedCount=${pool.allocatedCount}`);
      }
    }
  }

  _validateSlots(errors) {
    const ps = this._game.playState;
    if (!ps || !ps.swarm || !ps.inflightCtrl) return;
    const ic = ps.inflightCtrl;
    const pool = ic.pool;
    if (!pool) return;

    const alienBySlot = new Map();
    for (const rec of ic) {
      if (rec.slot === undefined || rec.slot === null) continue;
      if (alienBySlot.has(rec.slot)) {
        errors.push(`SLOT_DOUBLE_OCCUPANCY: slot=${rec.slot} swarmIndices=${rec.swarmIndex},${alienBySlot.get(rec.slot)}`);
      }
      alienBySlot.set(rec.slot, rec.swarmIndex);
    }

    let inflightCount = 0;
    for (const rec of ic) inflightCount++;
    if (inflightCount > 7) {
      errors.push(`MAX_INFLIGHT_EXCEEDED: ${inflightCount} > 7`);
    }
  }

  _validateGroups(errors) {
    const ps = this._game.playState;
    if (!ps || !ps.flagshipScheduler) return;
    const fs = ps.flagshipScheduler;
    const grp = fs.activeGroup;
    if (!grp || grp.completed) return;

    const ic = this._getIC();
    if (!ic) return;

    const flagshipsSeen = new Set();
    const flagshipRec = ic.getRecord(FLAGSHIP_SLOT);
    if (grp.flagship && flagshipRec) {
      if (flagshipRec.swarmIndex !== grp.flagship.swarmIndex) {
        errors.push(`GROUP_FLAGSHIP_SLOT_MISMATCH: group expects ${grp.flagship.swarmIndex}, slot 1 has ${flagshipRec.swarmIndex}`);
      }
      if (flagshipsSeen.has(grp.flagship.swarmIndex)) {
        errors.push(`GROUP_DUPLICATE_FLAGSHIP: ${grp.flagship.swarmIndex}`);
      }
      flagshipsSeen.add(grp.flagship.swarmIndex);
    }

    for (let i = 0; i < grp.escorts.length; i++) {
      const escort = grp.escorts[i];
      if (!escort) continue;
      if (grp.escortReturned[i]) continue;
      const targetSlot = 2 + i;
      const escRec = ic.getRecord(targetSlot);
      if (escRec) {
        if (escRec.swarmIndex !== escort.swarmIndex) {
          errors.push(`GROUP_ESCORT_SLOT_MISMATCH: group expects ${escort.swarmIndex} at slot ${targetSlot}, got ${escRec.swarmIndex}`);
        }
      } else {
        if (!escort.isDead && !escort.isDying) {
          errors.push(`GROUP_ESCORT_NOT_INFLIGHT: swarmIndex=${escort.swarmIndex} slot=${targetSlot}`);
        }
      }
    }
  }

  _validateProjectiles(errors) {
    const ps = this._game.playState;
    if (!ps || !ps.enemyBulletPool) return;
    const pool = ps.enemyBulletPool;

    let activeCount = 0;
    const activeIds = new Set();
    for (const b of pool) {
      activeCount++;
      if (activeIds.has(b.id)) errors.push(`DUPLICATE_BULLET_ID: ${b.id}`);
      activeIds.add(b.id);
      if (isNaN(b.x) || isNaN(b.y)) {
        errors.push(`BULLET_NAN: id=${b.id} x=${b.x} y=${b.y}`);
      }
      if (Math.abs(b.x) > 10000 || Math.abs(b.y) > 10000) {
        errors.push(`BULLET_OUT_OF_BOUNDS: id=${b.id} x=${b.x} y=${b.y}`);
      }
    }

    if (activeCount > MAX_ENEMY_BULLETS) {
      errors.push(`MAX_BULLETS_EXCEEDED: ${activeCount} > ${MAX_ENEMY_BULLETS}`);
    }

    if (pool.activeCount !== activeCount) {
      errors.push(`POOL_ACTIVE_COUNT_MISMATCH: iterated=${activeCount} pool.activeCount=${pool.activeCount}`);
    }
  }

  _validateAudio(errors) {
    const mgr = this._game.audioManager;
    if (mgr) {
      if (!mgr._formationHum || !mgr._attackSound || !mgr._musicPlayer) {
        errors.push('AUDIO_MANAGER_MISSING_SUBCONTROLLERS');
      }
    }
  }

  _validateState(errors) {
    const sm = this._game.sm;
    if (!sm) return;
    const ps = this._game.playState;

    const currentName = sm.currentName;
    if (currentName === 'playing' && ps) {
      const gs = ps._getGameState ? ps._getGameState() : null;
      if (gs && gs !== 'playing') {
        errors.push(`STATE_MISMATCH: sm=${currentName} _gameState=${gs}`);
      }
    }

    if (!currentName) {
      errors.push('NO_ACTIVE_STATE');
    }

    if (ps && currentName === 'gameOver' && ps.flagshipScheduler && ps.flagshipScheduler.activeGroup && !ps.flagshipScheduler.activeGroup.completed) {
      errors.push('ACTIVE_GROUP_DURING_GAMEOVER');
    }
  }
}
