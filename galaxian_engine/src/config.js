export const CONFIG = {

  CANVAS_WIDTH: 288,
  CANVAS_HEIGHT: 240,
  SCALE: 2,

  LOGIC_HZ: 60,
  FIXED_STEP_MS: 1000 / 60,

  MAX_FRAME_SKIP: 5,

  PLAYER: {
    X: 137,
    Y: 216,
    WIDTH: 14,
    HEIGHT: 15,
    SPEED: 1,
    FIRE_COOLDOWN: 0,
  },

  BULLET: {
    WIDTH: 1,
    HEIGHT: 4,
    SPEED: 5.5,
    MAX_ACTIVE: 1,
  },

  SWARM: {
    COLS: 10,
    ROWS: 6,
    ALIEN_WIDTH: 11,
    ALIEN_HEIGHT: 8,
    H_SPACE: 16,
    V_SPACE: 16,
    START_X: 48,
    START_Y: 20,
    LIMIT_LEFT: 0,
    LIMIT_RIGHT: 60,
    STEP: 1,
    SWARM_INDEX_OFFSET: 3,
    SWARM_ROW_SIZE: 16,
  },

  ALIEN_TYPES: {
    FLAGSHIP: { id: 'flagship', score: 300, color: '#FFFF00', priority: 4 },
    RED:       { id: 'red',      score: 200, color: '#DA00DA', priority: 3 },
    PURPLE:    { id: 'purple',   score: 100, color: '#D10000', priority: 2 },
    BLUE:      { id: 'blue',     score: 80,  color: '#00BFBF', priority: 1 },
  },

  ALIEN_ANIMATION_FRAMES: [1, 2, 3],

  SCORE: {
    EXTRA_LIFE_INTERVAL: 5000,
  },

  LIVES: {
    STARTING: 3,
    MAX_DISPLAY: 4,
  },

  ENEMY_BULLET: {
    WIDTH: 2,
    HEIGHT: 4,
    SPEED: 1.5,
    COLOR: '#FF4444',
    MAX_ACTIVE: 14,
    FIRE_COOLDOWN: 30,
  },

  DEBUG_KEY: 'F2',
  RESTART_KEY: 'N',

};
