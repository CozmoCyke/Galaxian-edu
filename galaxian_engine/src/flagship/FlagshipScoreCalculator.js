export class FlagshipScoreCalculator {

  static calculate({ originalEscortCount, livingEscortCount, escortsDestroyedBeforeFlagship }) {
    let points;
    let factor;
    let reason;

    const allEscortsDead = livingEscortCount === 0;
    const allEscortsAliveAtEnd = livingEscortCount === originalEscortCount;

    if (allEscortsDead && escortsDestroyedBeforeFlagship && originalEscortCount === 2) {
      factor = 3;
      points = 800;
      reason = 'full: 2 escorts killed before flagship';
    } else if (allEscortsAliveAtEnd && originalEscortCount === 2) {
      factor = 1;
      points = 400;
      reason = 'partial: escorts alive when flagship killed';
    } else if (originalEscortCount === 2) {
      factor = 2;
      points = 600;
      reason = 'partial: 1 escort killed before flagship';
    } else if (originalEscortCount === 1) {
      if (allEscortsDead && escortsDestroyedBeforeFlagship) {
        factor = 2;
        points = 600;
        reason = '1 escort killed before flagship';
      } else {
        factor = 1;
        points = 400;
        reason = '1 escort alive when flagship killed';
      }
    } else {
      factor = 0;
      points = 200;
      reason = 'no escorts';
    }

    return { points, factor, reason, originalEscortCount, livingEscortCount };
  }

}
