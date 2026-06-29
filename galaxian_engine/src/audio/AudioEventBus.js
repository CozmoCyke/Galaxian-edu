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

const MAX_LOG = 1024;
let _log = [];
let _logIdx = 0;
let _logCount = 0;
let _subscribers = [];

export { EVENTS };

export const AudioEventBus = {
  emit(type, data) {
    const event = { type, data, tick: performance.now() };
    _log[_logIdx] = event;
    _logIdx = (_logIdx + 1) % MAX_LOG;
    if (_logCount < MAX_LOG) _logCount++;
    for (const fn of _subscribers) {
      try { fn(event); } catch (e) { }
    }
  },

  subscribe(fn) {
    _subscribers.push(fn);
    return () => {
      _subscribers = _subscribers.filter(f => f !== fn);
    };
  },

  get events() {
    return AudioEventBus.getEventLog();
  },

  getEventLog() {
    const result = [];
    const count = _logCount;
    if (count === 0) return result;
    const start = count < MAX_LOG ? 0 : _logIdx;
    const len = Math.min(count, MAX_LOG);
    for (let i = 0; i < len; i++) {
      result.push(_log[(start + i) % MAX_LOG]);
    }
    return result;
  },

  get count() { return _logCount; },

  clear() {
    _log = [];
    _logIdx = 0;
    _logCount = 0;
  },

  reset() {
    AudioEventBus.clear();
    _subscribers = [];
  },
};
