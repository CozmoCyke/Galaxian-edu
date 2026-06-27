let groupIdCounter = 0;

export class FlagshipAttackGroup {

  constructor({ flagship, escorts = [], side, flagshipsRemaining }) {
    this.groupId = ++groupIdCounter;
    this.flagship = flagship;
    this.escorts = escorts;
    this.flagshipSlot = 1;
    this.escortSlots = escorts.length > 0 ? [2, 3].slice(0, escorts.length) : [];
    this.side = side;
    this.launchTick = 0;
    this.stage = 'forming';
    this.activeMemberCount = 1 + escorts.length;
    this.originalEscortCount = escorts.length;
    this.livingEscortCount = escorts.length;
    this.scoreFactor = 0;
    this.completed = false;
    this.flagshipReturned = false;
    this.escortReturned = new Array(escorts.length).fill(false);
    this.flagshipDead = false;
    this.flagshipsRemaining = flagshipsRemaining;
  }

  markLaunch(tick) {
    this.launchTick = tick;
    this.stage = 'launched';
  }

  onEscortDestroyed(escortIndex) {
    if (escortIndex >= 0 && escortIndex < this.escorts.length) {
      this.escorts[escortIndex] = null;
      this.livingEscortCount--;
      this.activeMemberCount--;
      this.escortReturned[escortIndex] = true;
    }
  }

  onFlagshipDestroyed() {
    this.flagshipDead = true;
    this.activeMemberCount--;
  }

  onEscortReturned(escortIndex) {
    if (escortIndex >= 0 && escortIndex < this.escortReturned.length) {
      this.escortReturned[escortIndex] = true;
      this.activeMemberCount--;
    }
  }

  onFlagshipReturned() {
    this.flagshipReturned = true;
    this.activeMemberCount--;
  }

  get isComplete() {
    return this.activeMemberCount <= 0 || this.completed;
  }

  markComplete() {
    this.completed = true;
  }

}
