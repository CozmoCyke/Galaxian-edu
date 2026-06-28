import { AudioEventBus, EVENTS } from './AudioEventBus.js';
import { SoundEffects } from './SoundEffects.js';
import { FormationHumController } from './FormationHumController.js';
import { AttackSoundController } from './AttackSoundController.js';
import { MusicSequencePlayer } from './MusicSequencePlayer.js';
import { CONFIG } from '../config.js';

export class AudioManager {

  constructor() {
    this._ctx = null;
    this._muted = false;
    this._volume = CONFIG.AUDIO ? CONFIG.AUDIO.MASTER_VOLUME : 0.5;
    this._masterGain = null;
    this._initialized = false;
    this._audioLocked = true;

    this._formationHum = new FormationHumController();
    this._attackSound = new AttackSoundController();
    this._musicPlayer = new MusicSequencePlayer();

    this._lastAlienCount = -1;
    this._diveEmittedFor = new Set();
    this._prevBulletCount = 0;
    this._prevKillEvent = null;
    this._prevCompletedGroupId = null;
  }

  get audioLocked() { return this._audioLocked; }
  get initialized() { return this._initialized; }
  get muted() { return this._muted; }

  init() {
    if (this._initialized) return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        this._audioLocked = false;
        return;
      }
      this._ctx = new Ctor();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.setValueAtTime(this._muted ? 0 : this._volume, this._ctx.currentTime);
      this._masterGain.connect(this._ctx.destination);
      this._initialized = true;

      if (this._ctx.state === 'suspended') {
        this._audioLocked = true;
      } else {
        this._audioLocked = false;
        this._formationHum.start(this._ctx, this._masterGain);
      }
    } catch (e) {
      this._audioLocked = false;
    }
  }

  unlock() {
    if (!this._ctx) {
      this.init();
    }
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume();
      this._audioLocked = false;
      if (!this._formationHum.isRunning) {
        this._formationHum.start(this._ctx, this._masterGain);
      }
    }
  }

  setMuted(v) {
    this._muted = v;
    if (this._masterGain && this._ctx) {
      this._masterGain.gain.setValueAtTime(v ? 0 : this._volume, this._ctx.currentTime);
    }
    if (!v && this._formationHum.isRunning) {
      this._formationHum.setVolume(this._volume);
    }
  }

  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._masterGain && this._ctx && !this._muted) {
      this._masterGain.gain.setValueAtTime(this._volume, this._ctx.currentTime);
    }
  }

  update(swarmState) {
    if (!this._initialized || this._muted) return;

    const ctx = this._ctx;
    if (!ctx || ctx.state === 'closed') return;
    if (ctx.state === 'suspended') {
      this._audioLocked = true;
      return;
    }

    this._processEvents(ctx);

    if (swarmState) {
      this._formationHum.update(
        swarmState.aliveCount,
        swarmState.totalCount || 46,
        swarmState.level || 1
      );
      this._formationHum.setVolume(this._volume);
    } else {
      this._formationHum.setVolume(0);
    }
  }

  _processEvents(ctx) {
    const events = AudioEventBus.events;
    const dest = this._masterGain;

    for (const event of events) {
      switch (event.type) {
        case EVENTS.PLAYER_SHOT:
          SoundEffects.playPlayerShot(ctx, dest, this._volume);
          break;
        case EVENTS.ENEMY_SHOT:
          SoundEffects.playEnemyShot(ctx, dest, this._volume);
          break;
        case EVENTS.ALIEN_DIVE_STARTED:
          this._attackSound.playDiveSound(ctx, dest, this._volume);
          break;
        case EVENTS.ALIEN_DESTROYED:
          SoundEffects.playAlienDestroyed(ctx, dest, this._volume);
          break;
        case EVENTS.FLAGSHIP_DESTROYED:
          SoundEffects.playFlagshipDestroyed(ctx, dest, this._volume);
          break;
        case EVENTS.PLAYER_DESTROYED:
          SoundEffects.playPlayerDestroyed(ctx, dest, this._volume);
          break;
        case EVENTS.STAGE_STARTED:
          this._musicPlayer.playStageStart(ctx, dest, this._volume);
          break;
        case EVENTS.GAME_OVER:
          this._musicPlayer.playGameOver(ctx, dest, this._volume);
          break;
      }
    }

    AudioEventBus.clear();
  }

  reset() {
    this._formationHum.stop();
    this._attackSound.reset();
    this._musicPlayer.stop();
    AudioEventBus.clear();
    this._diveEmittedFor.clear();
    this._prevBulletCount = 0;
    this._prevKillEvent = null;
    this._prevCompletedGroupId = null;
    this._lastAlienCount = -1;
  }

  destroy() {
    this.reset();
    if (this._masterGain) {
      try { this._masterGain.disconnect(); } catch (e) { /* ignore */ }
    }
    if (this._ctx && this._ctx.state !== 'closed') {
      this._ctx.close();
    }
    this._ctx = null;
    this._initialized = false;
  }

}
