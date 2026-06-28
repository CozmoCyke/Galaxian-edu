export class FormationHumController {

  constructor() {
    this._osc = null;
    this._gain = null;
    this._running = false;
  }

  get isRunning() { return this._running; }

  start(ctx, dest) {
    if (this._running) return;
    this._osc = ctx.createOscillator();
    this._gain = ctx.createGain();
    this._osc.type = 'triangle';
    this._osc.frequency.setValueAtTime(55, ctx.currentTime);
    this._gain.gain.setValueAtTime(0, ctx.currentTime);
    this._osc.connect(this._gain);
    this._gain.connect(dest);
    this._osc.start(ctx.currentTime);
    this._running = true;
  }

  update(aliveCount, totalCount, level) {
    if (!this._running || !this._osc || !this._gain) return;
    const ctx = this._osc.context;
    if (!ctx) return;

    const ratio = totalCount > 0 ? aliveCount / totalCount : 0;
    const minFreq = 40;
    const maxFreq = 80;
    const freq = maxFreq - ratio * (maxFreq - minFreq);
    this._osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const baseGain = 0.08;
    const maxGain = 0.18;
    const gain = baseGain + (1 - ratio) * (maxGain - baseGain);
    this._gain.gain.setValueAtTime(gain, ctx.currentTime);
  }

  setVolume(v) {
    if (!this._gain) return;
    const ctx = this._gain.context;
    if (ctx) {
      this._gain.gain.setValueAtTime(v, ctx.currentTime);
    }
  }

  stop() {
    if (!this._running) return;
    try {
      if (this._osc) {
        this._osc.stop();
        this._osc.disconnect();
      }
      if (this._gain) {
        this._gain.disconnect();
      }
    } catch (e) { /* already stopped */ }
    this._osc = null;
    this._gain = null;
    this._running = false;
  }

}
