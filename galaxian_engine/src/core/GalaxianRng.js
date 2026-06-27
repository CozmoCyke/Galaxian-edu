export class GalaxianRng {

  constructor(seed = 0) {
    this._state = seed & 0xFF;
  }

  nextByte() {
    this._state = (this._state * 5 + 1) & 0xFF;
    return this._state;
  }

  getState() {
    return this._state;
  }

  setState(value) {
    this._state = value & 0xFF;
  }
}
