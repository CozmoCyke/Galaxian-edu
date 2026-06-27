const SHOCK_DURATION = 240;

export class ShockController {

  constructor() {
    this._active = false;
    this._counter = 0;
    this._duration = SHOCK_DURATION;
  }

  get isActive() { return this._active; }
  get counter() { return this._counter; }
  get duration() { return this._duration; }

  trigger() {
    if (this._active) return false;
    this._active = true;
    this._counter = this._duration;
    return true;
  }

  update({ noInflightAliens }) {
    if (!this._active) return;

    if (noInflightAliens) {
      this._counter--;
      if (this._counter <= 0) {
        this._active = false;
        this._counter = 0;
      }
    }
  }

  reset() {
    this._active = false;
    this._counter = 0;
  }

}
