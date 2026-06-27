import { CONFIG } from '../config.js';

let _nextId = 1;

const STATE = {
  IN_FORMATION:    'inFormation',
  LEAVING:         'leavingFormation',
  IN_FLIGHT:       'inFlight',
  RETURNING:       'returning',
  DYING:           'dying',
  DEAD:            'dead',
};

const ANIM_SEQ = [1, 2, 3];

export { STATE };

export class Alien {

  constructor(swarmIndex, row, col, type) {
    this.id = _nextId++;
    this.swarmIndex = swarmIndex;
    this.row = row;
    this.col = col;
    this.type = type;

    this.state = STATE.IN_FORMATION;
    this.alive = true;

    this.formationX = 0;
    this.formationY = 0;
    this.renderX = 0;
    this.renderY = 0;

    this.animFrame = 0;
    this.animTimer = 0;
    this.animSpeed = 4;

    this.deathTimer = 0;
    this.dyingFrames = 15;
  }

  update(swarmOffsetX, swarmOffsetY) {
    this.formationX = swarmOffsetX + this.col * CONFIG.SWARM.H_SPACE;
    this.formationY = swarmOffsetY + this.row * CONFIG.SWARM.V_SPACE;

    this.renderX = Math.round(this.formationX);
    this.renderY = Math.round(this.formationY);

    if (this.state === STATE.IN_FORMATION) {
      this.animTimer++;
      if (this.animTimer >= this.animSpeed) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % ANIM_SEQ.length;
      }
    }

    if (this.state === STATE.DYING) {
      this.deathTimer--;
      if (this.deathTimer <= 0) {
        this.state = STATE.DEAD;
        this.alive = false;
      }
    }
  }

  kill() {
    if (this.state === STATE.DEAD) return;
    this.state = STATE.DYING;
    this.deathTimer = this.dyingFrames;
    this.alive = true;
  }

  leaveFormation() {
    if (this.state !== STATE.IN_FORMATION) return false;
    this.state = STATE.LEAVING;
    return true;
  }

  beginFlight() {
    if (this.state !== STATE.LEAVING) return false;
    this.state = STATE.IN_FLIGHT;
    return true;
  }

  returnToFormation() {
    this.state = STATE.IN_FORMATION;
  }

  get isInFormation() { return this.state === STATE.IN_FORMATION; }
  get isDying() { return this.state === STATE.DYING; }
  get isDead() { return this.state === STATE.DEAD; }
  get isLeaving() { return this.state === STATE.LEAVING; }
  get isInFlight() { return this.state === STATE.IN_FLIGHT; }
  get isReturning() { return this.state === STATE.RETURNING; }
  get isActive() { return this.state !== STATE.DEAD && this.state !== STATE.DYING; }

  get isFlagship() { return this.type === 'flagship'; }
  get isAlive() { return this.alive; }

  get scoreValue() {
    const typeConfig = CONFIG.ALIEN_TYPES[this.type.toUpperCase()];
    return typeConfig ? typeConfig.score : 100;
  }

  get color() {
    const typeConfig = CONFIG.ALIEN_TYPES[this.type.toUpperCase()];
    return typeConfig ? typeConfig.color : '#FFFFFF';
  }

  debugLabel() {
    return `${this.type[0].toUpperCase()}${this.swarmIndex}`;
  }

  render(ctx) {
    if (this.state === STATE.DEAD) return;

    const x = this.renderX;
    const y = this.renderY;

    if (this.state === STATE.DYING) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, CONFIG.SWARM.ALIEN_WIDTH, CONFIG.SWARM.ALIEN_HEIGHT);
      return;
    }

    ctx.fillStyle = this.color;
    this._drawSprite(ctx, x, y);
  }

  _drawSprite(ctx, x, y) {
    const w = CONFIG.SWARM.ALIEN_WIDTH;
    const h = CONFIG.SWARM.ALIEN_HEIGHT;
    const ty = this.type;

    switch (ty) {
      case 'flagship':
        ctx.fillRect(x+5, y, 1, 2);
        ctx.fillRect(x+4, y+2, 3, 1);
        ctx.fillRect(x+3, y+3, 5, 2);
        ctx.fillRect(x+2, y+4, 1, 1);
        ctx.fillRect(x+8, y+4, 1, 1);
        ctx.fillRect(x+1, y+5, 3, 1);
        ctx.fillRect(x+7, y+5, 3, 1);
        ctx.fillRect(x, y+6, 2, 2);
        ctx.fillRect(x+9, y+6, 2, 2);
        ctx.fillRect(x+3, y+6, 1, 2);
        ctx.fillRect(x+7, y+6, 1, 2);
        ctx.fillRect(x+5, y+6, 1, 2);
        break;

      case 'red':
        ctx.fillRect(x+3, y, 1, 2);
        ctx.fillRect(x+7, y, 1, 2);
        ctx.fillRect(x+2, y+2, 7, 2);
        ctx.fillRect(x+1, y+4, 3, 1);
        ctx.fillRect(x+7, y+4, 3, 1);
        ctx.fillRect(x, y+5, 2, 1);
        ctx.fillRect(x+9, y+5, 2, 1);
        ctx.fillRect(x+2, y+5, 1, 1);
        ctx.fillRect(x+8, y+5, 1, 1);
        ctx.fillRect(x+3, y+6, 5, 2);
        break;

      case 'purple':
        ctx.fillRect(x+2, y, 1, 2);
        ctx.fillRect(x+8, y, 1, 2);
        ctx.fillRect(x+1, y+2, 9, 1);
        ctx.fillRect(x+1, y+3, 2, 1);
        ctx.fillRect(x+8, y+3, 2, 1);
        ctx.fillRect(x, y+4, 2, 2);
        ctx.fillRect(x+9, y+4, 2, 2);
        ctx.fillRect(x+3, y+4, 5, 1);
        ctx.fillRect(x+4, y+5, 3, 1);
        ctx.fillRect(x+5, y+6, 1, 2);
        break;

      case 'blue':
        ctx.fillRect(x+3, y, 1, 1);
        ctx.fillRect(x+7, y, 1, 1);
        ctx.fillRect(x+2, y+1, 7, 1);
        ctx.fillRect(x+1, y+2, 9, 1);
        ctx.fillRect(x+1, y+3, 2, 1);
        ctx.fillRect(x+8, y+3, 2, 1);
        ctx.fillRect(x, y+4, 2, 2);
        ctx.fillRect(x+9, y+4, 2, 2);
        ctx.fillRect(x+3, y+4, 5, 2);
        ctx.fillRect(x+5, y+6, 1, 2);
        break;
    }
  }

}
