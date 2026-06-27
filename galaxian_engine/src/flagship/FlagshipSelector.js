export class FlagshipSelector {

  static selectFlagship(swarm, side) {
    if (!swarm || !swarm.layout) return null;
    const flagships = swarm.layout.aliens.filter(a =>
      a.isFlagship && a.isAlive && !a.isDead && a.isInFormation && !a.isInFlight
    );
    if (flagships.length === 0) return null;

    if (side === 'right') {
      return flagships.reduce((a, b) => a.col > b.col ? a : b);
    }
    return flagships.reduce((a, b) => a.col < b.col ? a : b);
  }

  static selectRedFallback(swarm, side) {
    if (!swarm || !swarm.layout) return null;
    const redAliens = swarm.layout.aliens.filter(a =>
      a.type === 'red' && a.isAlive && !a.isDead && a.isInFormation && !a.isInFlight
    );
    if (redAliens.length === 0) return null;

    if (side === 'right') {
      return redAliens.reduce((a, b) => a.col > b.col ? a : b);
    }
    return redAliens.reduce((a, b) => a.col < b.col ? a : b);
  }

}
