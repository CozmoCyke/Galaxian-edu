export class SoundEffects {

  static playPlayerShot(ctx, dest, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  }

  static playEnemyShot(ctx, dest, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  static playAlienDive(ctx, dest, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  static playAlienDestroyed(ctx, dest, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  }

  static playFlagshipDestroyed(ctx, dest, volume) {
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const freq = 400 + i * 150;
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + i * 0.06 + 0.3);
      gain.gain.setValueAtTime(volume * 0.2, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.35);
    }
  }

  static playPlayerDestroyed(ctx, dest, volume) {
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    noise.connect(gain);
    gain.connect(dest);
    noise.start(now);
    noise.stop(now + 0.3);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);
    oscGain.gain.setValueAtTime(volume * 0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.25);
  }

}
