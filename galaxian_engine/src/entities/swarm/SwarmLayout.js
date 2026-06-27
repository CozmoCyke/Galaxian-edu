import { CONFIG } from '../../config.js';
import { Alien } from '../Alien.js';

export class SwarmLayout {

  constructor() {
    this.aliens = [];
    this._grid = [];
    this._setup();
  }

  _setup() {
    const cols = CONFIG.SWARM.COLS;
    const rows = CONFIG.SWARM.ROWS;

    const layout = [
      { type: 'blue',     cols: [0,1,2,3,4,5,6,7,8,9] },
      { type: 'blue',     cols: [0,1,2,3,4,5,6,7,8,9] },
      { type: 'blue',     cols: [0,1,2,3,4,5,6,7,8,9] },
      { type: 'purple',   cols: [1,2,3,4,5,6,7,8] },
      { type: 'red',      cols: [2,3,4,5,6,7] },
      { type: 'flagship', cols: [3,6] },
    ];

    for (let r = 0; r < rows; r++) {
      this._grid[r] = [];
      const rowDef = layout[r];
      for (let c = 0; c < cols; c++) {
        this._grid[r][c] = null;
      }
      for (const colIdx of rowDef.cols) {
        const swarmIndex = r * CONFIG.SWARM.SWARM_ROW_SIZE + CONFIG.SWARM.SWARM_INDEX_OFFSET + colIdx;
        const alien = new Alien(swarmIndex, r, colIdx, rowDef.type);
        this.aliens.push(alien);
        this._grid[r][colIdx] = alien;
      }
    }
  }

  getAlien(row, col) {
    if (row < 0 || row >= CONFIG.SWARM.ROWS) return null;
    if (col < 0 || col >= CONFIG.SWARM.COLS) return null;
    return this._grid[row][col];
  }

  getAlienBySwarmIndex(index) {
    return this.aliens.find(a => a.swarmIndex === index) || null;
  }

  get aliveCount() {
    return this.aliens.filter(a => a.alive && !a.isDead).length;
  }

  get inFormationCount() {
    return this.aliens.filter(a => a.isInFormation).length;
  }

  get totalCount() {
    return this.aliens.length;
  }

  getAliveInRow(row) {
    return this.aliens.filter(a => a.row === row && a.alive && !a.isDead);
  }

  getAliveInCol(col) {
    return this.aliens.filter(a => a.col === col && a.alive && !a.isDead);
  }

  [Symbol.iterator]() {
    return this.aliens.values();
  }

}
