import { CONFIG } from '../config.js';

export class GameLoop {

  constructor(updateFn, renderFn) {
    this._update = updateFn;
    this._render = renderFn;
    this._running = false;
    this._rafId = null;
    this._accumulator = 0;
    this._lastTime = 0;
    this._logicTick = 0;
    this._frameCount = 0;
    this._fpsTimer = 0;
    this._measuredFps = 0;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._accumulator = 0;
    this._lastTime = performance.now();
    this._logicTick = 0;
    this._frameCount = 0;
    this._fpsTimer = this._lastTime;
    this._tick(performance.now());
  }

  stop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  get logicTick() { return this._logicTick; }
  get measuredFps() { return this._measuredFps; }

  _tick = (time) => {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._tick);

    const dt = Math.min(time - this._lastTime, 200);
    this._lastTime = time;
    this._accumulator += dt;

    let steps = 0;
    while (this._accumulator >= CONFIG.FIXED_STEP_MS && steps < CONFIG.MAX_FRAME_SKIP) {
      this._update();
      this._logicTick++;
      this._accumulator -= CONFIG.FIXED_STEP_MS;
      steps++;
    }

    if (steps === CONFIG.MAX_FRAME_SKIP) {
      this._accumulator = 0;
    }

    this._frameCount++;

    if (time - this._fpsTimer >= 1000) {
      this._measuredFps = this._frameCount;
      this._frameCount = 0;
      this._fpsTimer = time;
    }

    this._render();
  };

}
