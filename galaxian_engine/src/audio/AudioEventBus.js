const EVENTS = {
  PLAYER_SHOT: 'PLAYER_SHOT',
  ENEMY_SHOT: 'ENEMY_SHOT',
  ALIEN_DIVE_STARTED: 'ALIEN_DIVE_STARTED',
  ALIEN_DESTROYED: 'ALIEN_DESTROYED',
  FLAGSHIP_DESTROYED: 'FLAGSHIP_DESTROYED',
  PLAYER_DESTROYED: 'PLAYER_DESTROYED',
  STAGE_STARTED: 'STAGE_STARTED',
  GAME_OVER: 'GAME_OVER',
};

let _events = [];
let _subscribers = [];

export { EVENTS };

export const AudioEventBus = {
  emit(type, data) {
    const event = { type, data, tick: performance.now() };
    _events.push(event);
    for (const fn of _subscribers) {
      try { fn(event); } catch (e) { /* subscriber error */ }
    }
  },

  subscribe(fn) {
    _subscribers.push(fn);
    return () => {
      _subscribers = _subscribers.filter(f => f !== fn);
    };
  },

  get events() { return _events.slice(); },

  get count() { return _events.length; },

  clear() {
    _events = [];
  },

  reset() {
    _events = [];
    _subscribers = [];
  },
};
