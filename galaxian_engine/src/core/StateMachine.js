export class StateMachine {

  constructor() {
    this._states = {};
    this._current = null;
    this._currentName = null;
  }

  add(name, state) {
    this._states[name] = state;
    state._sm = this;
  }

  transition(name) {
    const state = this._states[name];
    if (!state) {
      console.error(`StateMachine: unknown state "${name}"`);
      return;
    }
    if (this._current) {
      if (this._onExit) this._onExit(this._currentName, name);
      this._current.exit();
    }
    this._currentName = name;
    this._current = state;
    state.enter();
  }

  onExit(callback) {
    this._onExit = callback;
  }

  update() {
    if (this._current) this._current.update();
  }

  get currentName() { return this._currentName; }

}
