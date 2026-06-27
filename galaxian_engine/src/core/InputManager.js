export class InputManager {

  constructor() {
    this._pressed = {};
    this._justPressed = {};
    this._justReleased = {};
    this._previous = {};
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
    const code = e.key;
    if (!this._pressed[code]) {
      this._justPressed[code] = true;
    }
    this._pressed[code] = true;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(code)) {
      e.preventDefault();
    }
  }

  _onKeyUp(e) {
    const code = e.key;
    this._pressed[code] = false;
    this._justReleased[code] = true;
  }

  isDown(key) {
    return !!this._pressed[key];
  }

  wasPressed(key) {
    return !!this._justPressed[key];
  }

  wasReleased(key) {
    return !!this._justReleased[key];
  }

  endFrame() {
    this._justPressed = {};
    this._justReleased = {};
  }

  get left() { return this.isDown('ArrowLeft') || this.isDown('a'); }
  get right() { return this.isDown('ArrowRight') || this.isDown('d'); }
  get fire() { return this.isDown(' '); }
  get firePressed() { return this.wasPressed(' '); }
  get restartPressed() { return this.wasPressed('n') || this.wasPressed('N'); }
  get debugPressed() { return this.wasPressed('F2'); }

}
