export class ArcRunner {
  constructor(arcData) {
    this.arcData = arcData;
    this.arcIndex = 0;
    this.clock = 3;
    this.frame = 12;
    this._completed = false;
  }

  tick(clockwise) {
    if (this._completed) return null;

    const pair = this.arcData.values[this.arcIndex];
    if (!pair || pair.y === null) {
      this._completed = true;
      return null;
    }

    const xDelta = pair.x;
    const yDelta = clockwise ? -pair.y : pair.y;

    this.arcIndex++;

    this.clock--;
    if (this.clock <= 0) {
      this.clock = 4;
      this.frame--;
      if (this.frame <= 0) {
        this._completed = true;
      }
    }

    return { xDelta, yDelta, completed: this._completed };
  }

  get completed() { return this._completed; }

  get progress() { return this.arcData.values.length > 0 ? this.arcIndex / this.arcData.values.length : 0; }

  get currentPair() {
    const p = this.arcData.values[this.arcIndex];
    return p && p.y !== null ? p : null;
  }

  reset() {
    this.arcIndex = 0;
    this.clock = 3;
    this.frame = 12;
    this._completed = false;
  }
}
