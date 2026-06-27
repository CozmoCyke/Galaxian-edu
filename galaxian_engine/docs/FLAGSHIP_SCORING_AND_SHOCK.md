# Flagship Scoring & Shock State

## Scoring Factor

When a flagship is destroyed, its point value depends on escort kills:

| Factor | Condition | Points |
|--------|-----------|--------|
| 0 | Escort count = 0 (no escorts allocated) | 200 |
| 1 | Escorts alive when flagship destroyed | 400 |
| 2 | 1 escort killed before flagship | 600 |
| 3 | Both escorts killed before flagship | 800 |

### Formula

```
factor = escortCount                     # 0-2
if any escorts destroyed before flagship: factor += 1
points = 200 * (factor + 1)
```

### ASM Reference

- Address: `$127C` (flagship scoring calculation)
- Memory: `$422A` (FLAGSHIP_ESCORT_COUNT), `$422D` (FLAGSHIP_SCORE_FACTOR)
- Both-escorts-dead check: `$127C: ASSERT_BOTH_FLAGSHIP_ESCORTS_ARE_ALIVE` — return flag inverts: both alive → no bonus (+0), any dead → bonus (+1)

## Shock State

When a flagship is hit (either the flagship itself or its escorts), the swarm enters shock:

| Property | Value |
|----------|-------|
| Flag | `IS_FLAGSHIP_HIT` (`$422B`) |
| Counter | `ALIENS_IN_SHOCK_COUNTER` (`$422C`) |
| Default Duration | 240 frames (~4 seconds at 60fps) |

### Behavior

1. **Trigger**: Set when flagship or escort is hit.
2. **Countdown**: Counter decrements by 1 each frame only when NO inflight aliens remain (`HAVE_NO_INFLIGHT_ALIENS`).
3. **Blocked**: Both `CHECK_IF_ALIEN_CAN_ATTACK` (`$15C3`) and `UPDATE_ATTACK_COUNTERS` (`$1555`) check `IS_FLAGSHIP_HIT`. If set, ALL new attacks are blocked — both flagship and ordinary.
4. **Clear**: Once counter reaches 0, `IS_FLAGSHIP_HIT` is cleared and attacks resume.

### Implementation

```js
class ShockController {
  trigger()     // Sets active + counter = 240, returns false if already active
  update({ noInflightAliens })  // Decrements counter only when no inflight aliens
  reset()       // Clears active + counter
  isActive      // true during shock
  counter       // remaining frames (0 when inactive)
}
```

The `FlagshipAttackCounters` guards against `isFlagshipHit` (which maps to `ShockController.isActive`), freezing all counter updates during shock.
