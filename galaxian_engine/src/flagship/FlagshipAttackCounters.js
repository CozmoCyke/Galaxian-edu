export class FlagshipAttackCounters {

  constructor() {
    this.master1 = 0x40;
    this.master2 = 0x06;
    this.secondaryEnabled = false;
    this.secondary = 0;
    this.canAttack = false;
    this._gameInPlay = true;
  }

  updateAttackCounters({ hasPlayerSpawned, haveFlagships, isFlagshipHit, isGameInPlay, difficultyBase, difficultyExtra, extraFlagshipCount }) {
    if (!hasPlayerSpawned) return;
    if (!haveFlagships) return;
    if (isFlagshipHit) return;

    if (!isGameInPlay) {
      this.master1--;
      if (this.master1 > 0) return;
      this.master1 = 0x3C;
      this.master2--;
      if (this.master2 > 0) return;
      this.master2 = 0x05;
      this.secondary = 0x5A;
      this.secondaryEnabled = true;
      return;
    }

    this.master1--;
    if (this.master1 > 0) return;
    this.master1 = 0x3C;

    // Check if no blue/purple aliens remain (fast path)
    if (this._noBlueOrPurple) {
      this._setSecondaryFromValue(2);
      return;
    }

    this.master2--;
    if (this.master2 > 0) return;
    this.master2 = 1;

    const extraFlagships = (extraFlagshipCount != null) ? extraFlagshipCount : 0;
    const total = (difficultyBase || 0) + (difficultyExtra || 0);
    if (total === 0) return;

    let delay = ((total >> 2) & 3) ^ 0xFF;
    delay = (delay + 0x0A - extraFlagships) & 0xFF;
    this._setSecondaryFromValue(delay);
  }

  _setSecondaryFromValue(value) {
    this.master2 = value;
    this.secondary = (value << 2) & 0xFF;
    this.secondaryEnabled = true;
  }

  checkCanAttack({ hasPlayerSpawned, haveFlagships }) {
    if (!this.secondaryEnabled) return;

    this.secondary--;
    if (this.secondary > 0) return;

    this.secondaryEnabled = false;
    if (!hasPlayerSpawned) return;
    if (!haveFlagships) return;

    this.canAttack = true;
  }

  consumeAttack() {
    this.canAttack = false;
  }

  setNoBlueOrPurple(value) {
    this._noBlueOrPurple = value;
  }

  reset() {
    this.master1 = 0x40;
    this.master2 = 0x06;
    this.secondaryEnabled = false;
    this.secondary = 0;
    this.canAttack = false;
    this._noBlueOrPurple = false;
    this._gameInPlay = true;
  }

}
