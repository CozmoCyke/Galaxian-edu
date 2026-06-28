export class MusicSequencePlayer {

  constructor() {
    this._playing = false;
    this._timeouts = [];
  }

  get isPlaying() { return this._playing; }

  playStageStart(ctx, dest, volume) {
    this.stop();
    this._playing = true;
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047];

    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(notes[i], now + i * 0.1);
      gain.gain.setValueAtTime(volume * 0.2, now + i * 0.1);
      gain.gain.setValueAtTime(volume * 0.2, now + i * 0.1 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.12);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.12);
    }

    const totalDuration = notes.length * 0.1 + 0.15;
    this._timeouts.push(setTimeout(() => { this._playing = false; }, totalDuration * 1000));
  }

  playGameOver(ctx, dest, volume) {
    this.stop();
    this._playing = true;
    const now = ctx.currentTime;
    const notes = [784, 659, 523, 392];

    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i], now + i * 0.2);
      gain.gain.setValueAtTime(volume * 0.2, now + i * 0.2);
      gain.gain.setValueAtTime(volume * 0.2, now + i * 0.2 + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.25);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.25);
    }

    const totalDuration = notes.length * 0.2 + 0.3;
    this._timeouts.push(setTimeout(() => { this._playing = false; }, totalDuration * 1000));
  }

  stop() {
    this._playing = false;
    for (const t of this._timeouts) clearTimeout(t);
    this._timeouts = [];
  }

}
