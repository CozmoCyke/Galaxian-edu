# Final Engine Invariants

## Invariant Categories

### Aliens (`EngineInvariantValidator.validateAliens`)

| Invariant | Description |
|---|---|
| Size | `swarm.layout.aliens` has exactly 46 entries |
| Duplicate swarmIndex | No two aliens share the same `swarmIndex` (0–45) |
| Duplicate id | No two aliens share the same `id` |
| Valid state | Each alien's `state` is one of: `IN_FORMATION`, `LEAVING`, `IN_FLIGHT`, `DYING`, `DEAD` |
| Dead/In-formation consistency | If `state === DEAD`, then `isDead === true`; if `isInFormation`, `state === IN_FORMATION` |

### Slots (`EngineInvariantValidator.validateSlots`)

| Invariant | Description |
|---|---|
| No double-occupancy | No two inflight records have the same `slot` |
| Max 7 inflight | `pool.allocatedCount <= 7` |

### Groups (`EngineInvariantValidator.validateGroups`)

| Invariant | Description |
|---|---|
| Flagship slot tracking | If `activeGroup` exists, the flagship occupies slot 1 |
| Escort slot tracking | If `activeGroup` exists with escorts, escorts occupy slots 2–3 |
| Escort returned | No `escortReturned[i]` without a corresponding slot-available check |

### Projectiles (`EngineInvariantValidator.validateProjectiles`)

| Invariant | Description |
|---|---|
| Max 14 | `enemyBulletPool.activeCount <= 14` |
| No NaN | No bullet has NaN x or y |
| No infinite | No bullet has infinite x or y |
| No duplicate id | No two active bullets share the same `id` |

### Audio (`EngineInvariantValidator.validateAudio`)

| Invariant | Description |
|---|---|
| Subcontrollers present | `audioManager._formationHum`, `_attackSound`, `_musicPlayer` are non-null after init |

### State (`EngineInvariantValidator.validateState`)

| Invariant | Description |
|---|---|
| sm.currentName consistent | `sm.currentName` matches `playState._gameState` during `playing` |
| No active group during gameOver | `activeGroup` is null when `currentName` is `gameOver` |

## Validation Points

Invariants are checked:
1. Every 1,000 ticks in soak tests
2. At the end of each browser scenario
3. On-demand via `EngineInvariantValidator.check(game)`
