export class AttackSoundController {

  constructor() {
    this._activeCount = 0;
    this._maxActive = 3;
  }

  get activeCount() { return this._activeCount; }

  playDiveSound(ctx, dest, volume) {
    if (this._activeCount >= this._maxActive) return;
    this._activeCount++;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
    gain.gain.setValueAtTime(volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.15);

    osc.onended = () => {
      this._activeCount = Math.max(0, this._activeCount - 1);
    };

    setTimeout(() => {
      this._activeCount = Math.max(0, this._activeCount - 1);
    }, 200);
  }

  reset() {
    this._activeCount = 0;
  }

}
