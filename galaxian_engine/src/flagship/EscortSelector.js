export class EscortSelector {

  static selectEscorts(swarm, flagship, maxCount = 2) {
    if (!swarm || !swarm.layout || !flagship) return [];

    const flagships = swarm.layout.aliens.filter(a =>
      a.isFlagship && a.isAlive && !a.isDead
    );
    const usedByFlagships = new Set(flagships.map(f => f.swarmIndex));

    const redAliens = swarm.layout.aliens.filter(a =>
      a.type === 'red' && a.isAlive && !a.isDead && a.isInFormation &&
      !a.isInFlight && !usedByFlagships.has(a.swarmIndex)
    );

    const flagshipCol = flagship.col;
    const withDist = redAliens.map(a => ({
      alien: a,
      dist: Math.abs(a.col - flagshipCol)
    }));
    withDist.sort((a, b) => a.dist - b.dist);

    const result = [];
    for (const entry of withDist) {
      if (result.length >= maxCount) break;
      result.push(entry.alien);
    }

    return result;
  }

}
