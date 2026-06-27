const SCREEN_COLUMNS = 10;
const ALIEN_FLAG_LEFTMOST = 12;
const ALIEN_FLAG_RIGHTMOST = 3;

export class OrdinaryAlienSelector {

  static buildColumnFlags(swarm) {
    const flags = new Uint8Array(16);
    if (!swarm || !swarm.layout) return flags;
    const layout = swarm.layout;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < SCREEN_COLUMNS; col++) {
        const alien = layout.getAlien(row, col);
        if (alien && alien.isAlive && alien.isInFormation && !alien.isFlagship) {
          const flagIndex = ALIEN_FLAG_RIGHTMOST + col;
          flags[flagIndex] = 1;
        }
      }
    }
    return flags;
  }

  static buildRowFlags(swarm) {
    const flags = new Uint8Array(6);
    if (!swarm || !swarm.layout) return flags;
    const layout = swarm.layout;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < SCREEN_COLUMNS; col++) {
        const alien = layout.getAlien(row, col);
        if (alien && alien.isAlive && alien.isInFormation && !alien.isFlagship) {
          flags[row] = 1;
          break;
        }
      }
    }
    return flags;
  }

  static hasFlagships(swarm) {
    if (!swarm || !swarm.layout) return false;
    const layout = swarm.layout;
    for (let col = 0; col < SCREEN_COLUMNS; col++) {
      const alien = layout.getAlien(5, col);
      if (alien && alien.isAlive && alien.isInFormation) return true;
    }
    return false;
  }

  static selectOrdinaryAlien({ side, swarm, unavailableAlienIds = new Set() }) {
    if (!swarm || !swarm.layout) return null;

    const columnFlags = this.buildColumnFlags(swarm);
    const hasFlagships = this.hasFlagships(swarm);

    let colIndex;

    if (side === 'left') {
      colIndex = this._findOccupiedColumnLeft(columnFlags);
    } else {
      colIndex = this._findOccupiedColumnRight(columnFlags);
    }

    if (colIndex === -1) return null;

    const alien = this._findAlienInColumn(swarm, colIndex, hasFlagships, unavailableAlienIds);
    return alien;
  }

  static _findOccupiedColumnLeft(flags) {
    for (let addr = ALIEN_FLAG_LEFTMOST; addr >= ALIEN_FLAG_RIGHTMOST; addr--) {
      if (flags[addr] === 1) {
        return addr - ALIEN_FLAG_RIGHTMOST;
      }
    }
    return -1;
  }

  static _findOccupiedColumnRight(flags) {
    for (let addr = ALIEN_FLAG_RIGHTMOST; addr <= ALIEN_FLAG_LEFTMOST; addr++) {
      if (flags[addr] === 1) {
        return addr - ALIEN_FLAG_RIGHTMOST;
      }
    }
    return -1;
  }

  static _findAlienInColumn(swarm, colIndex, hasFlagships, unavailableAlienIds) {
    const layout = swarm.layout;

    if (hasFlagships) {
      for (let row = 1; row < 5; row++) {
        const alien = layout.getAlien(row, colIndex);
        if (this._isSelectable(alien, unavailableAlienIds)) {
          return alien;
        }
      }
    } else {
      for (let row = 0; row < 5; row++) {
        const alien = layout.getAlien(row, colIndex);
        if (this._isSelectable(alien, unavailableAlienIds)) {
          return alien;
        }
      }
    }
    return null;
  }

  static _isSelectable(alien, unavailableAlienIds) {
    if (!alien) return false;
    if (!alien.isAlive) return false;
    if (!alien.isInFormation) return false;
    if (alien.isFlagship) return false;
    if (unavailableAlienIds.has(alien.id)) return false;
    return true;
  }
}
