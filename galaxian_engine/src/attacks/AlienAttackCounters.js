const DEFAULT_VALUES = [
  0x05, 0x2F, 0x43, 0x77, 0x71, 0x6D, 0x67, 0x65,
  0x4F, 0x49, 0x43, 0x3D, 0x3B, 0x35, 0x2B, 0x29,
];

export const MASTER_INDEX = 0;
export const SECONDARY_COUNT = 15;
export const TOTAL_COUNTERS = 16;

export class AlienAttackCounters {

  constructor() {
    this.counters = new Uint8Array(DEFAULT_VALUES);
    this._canAttack = false;
    this._hitCount = 0;
  }

  get master() { return this.counters[MASTER_INDEX]; }
  get secondary() { return this.counters.subarray(1); }
  get canAttack() { return this._canAttack; }

  canAttackConsumed() {
    this._canAttack = false;
  }

  reset() {
    this.counters.set(DEFAULT_VALUES);
    this._canAttack = false;
    this._hitCount = 0;
  }

  tick(base, extra) {
    this._hitCount = 0;

    const b = this._computeB(base, extra);

    this.counters[MASTER_INDEX]--;
    if (this.counters[MASTER_INDEX] !== 0) return;

    this.counters[MASTER_INDEX] = DEFAULT_VALUES[MASTER_INDEX];

    for (let i = 1; i <= b; i++) {
      this.counters[i]--;
      if (this.counters[i] === 0) {
        this.counters[i] = DEFAULT_VALUES[i];
        this._hitCount++;
      }
    }

    if (this._hitCount > 0) {
      this._canAttack = true;
    }
  }

  _computeB(base, extra) {
    const adjustedBase = base < 2 ? 0 : base;
    return ((adjustedBase + extra) & 0x0F) + 1;
  }

  getB(base, extra) {
    return this._computeB(base, extra);
  }
}
