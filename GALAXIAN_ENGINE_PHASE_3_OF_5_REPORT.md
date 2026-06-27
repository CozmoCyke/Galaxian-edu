# Phase 3/5 — Automatic Ordinary Attack Scheduler

**Verdict: COMPLETE**

Automatic alien attacks driven by ASM counter cadence. RNG, column/row flags,
flank selection, difficulty system, and up to four simultaneous ordinary inflight aliens.

## Test Results

| Metric | Value |
|---|---|
| Baseline tests (Phase 1+2) | 534 |
| Phase 3 new tests | 1391 |
| Total tests | 1925 |
| Passed | 1925 |
| Failed | 0 |

## New Files Created

| File | Lines | Purpose |
|---|---|---|
| `src/core/GalaxianRng.js` | 19 | Deterministic 8-bit LCG (`state × 5 + 1 mod 256`) |
| `src/attacks/AlienAttackCounters.js` | 63 | Master + 15 secondary counters with tick/reload |
| `src/attacks/OrdinaryAlienSelector.js` | 116 | Column/row flags builder, flank-based alien selection |
| `src/attacks/OrdinaryAttackScheduler.js` | 170 | Orchestrator: counters, flank, selection, launch |
| `docs/ORDINARY_ATTACK_SCHEDULER.md` | 220 | Full ASM documentation of attack system |

## Files Modified

| File | Changes |
|---|---|
| `src/entities/Alien.js` | Added `id` (auto-increment), `isFlagship` getter |
| `src/entities/swarm/Swarm.js` | Added `isDead()` method |
| `src/states/PlayState.js` | Scheduler create on enter, update on tick, F4/F5 hotkeys |
| `src/debug/DebugOverlay.js` | 165px panel with scheduler/RNG/counters/difficulty |
| `docs/ASM_MAPPING.md` | Added Ordinary Attack Scheduler section (21 rows) |
| `tests/engine_tests.mjs` | Added 1391 new test assertions |

## ASM Routines Implemented

| ASM Address | Label | JS Implementation |
|---|---|---|
| `$1515` | `CHECK_IF_ALIEN_CAN_ATTACK` | `AlienAttackCounters.tick()` |
| `$1344` | `HANDLE_SINGLE_ALIEN_ATTACK` | `OrdinaryAttackScheduler.update()` |
| `$13E1` | `SET_ALIEN_ATTACK_FLANK` | `OrdinaryAttackScheduler._toggleFlank()` |
| `$14F3` | `HANDLE_LEVEL_DIFFICULTY` | `OrdinaryAttackScheduler.setBase/ExtraDifficulty()` |
| `$003C` | `GENERATE_RANDOM_NUMBER` | `GalaxianRng.nextByte()` |

## Memory Map Implemented

| Address | Label | JS Equivalent |
|---|---|---|
| `$401E` | `RAND_NUMBER` | `GalaxianRng._state` |
| `$4215` | `ALIENS_ATTACK_FROM_RIGHT_FLANK` | `OrdinaryAttackScheduler._side` |
| `$421A` | `DIFFICULTY_EXTRA_VALUE` | `OrdinaryAttackScheduler._extraDifficulty` |
| `$421B` | `DIFFICULTY_BASE_VALUE` | `OrdinaryAttackScheduler._baseDifficulty` |
| `$4228` | `CAN_ALIEN_ATTACK` | `AlienAttackCounters._canAttack` |
| `$424A` | `ALIEN_ATTACK_MASTER_COUNTER` | `counters[0]` |
| `$424B–$4259` | `ALIEN_ATTACK_SECONDARY_COUNTERS` | `counters[1..15]` |
| `$41E8–$41ED` | `HAVE_ALIENS_IN_ROW_FLAGS` | `buildRowFlags()` |
| `$41F0–$41FF` | `ALIEN_IN_COLUMN_FLAGS` | `buildColumnFlags()` |
| `$15E3` | Counter default values table | `DEFAULT_VALUES` array |

## Key Design Decisions

1. **Flank alternation**: Simplified from ASM's scroll-position-based selection to per-launch toggle. Fallback to opposite flank if first side empty.
2. **Guard order**: Game state check (`playerDying`/`gameOver`/swarm empty) BEFORE counter tick, matching ASM.
3. **`CAN_ALIEN_ATTACK` consumed immediately** after reading, matching ASM `ld ($4228),a` clearing.
4. **Column flags**: 10 swarm columns mapped to offset indices 3–12 in 16-byte array. Rightmost column = offset 3, leftmost = offset 12.
5. **Row flags**: 6 rows (0–5), row 5 reserved for flagships.
6. **Difficulty BASE** starts at 2, EXTRA at 0. Both cap at 7. B formula: `((max(1, BASE) & 15) + EXTRA + 1)`.
7. **Max inflight**: `((BASE + EXTRA) >> 1) + 1`, clamped to 4.
8. **Scheduler disabled by default** on PlayState enter; F4 toggles, F5 increments EXTRA, Shift+F5 resets EXTRA.

## Excluded (Phase 4/5)

- Enemy bullets
- Flagship/escort attacks
- Shock state
- Advanced sound effects
- F3/Shift+F3 manual launch (preserved from Phase 2)

## Browser Validation

- All 8 JavaScript modules parse and import without errors
- All 1925 tests pass (534 baseline + 1391 Phase 3)
- No `Math.random()` usage in any Phase 3 code
- Deterministic RNG: two schedulers with same seed produce identical sequence over 300 ticks

## Commits (8)

```
7cffef9 test: cover deterministic attack scheduling (1391 tests)
f28a52a feat: integrate scheduler in PlayState and DebugOverlay
6d992ed feat: add alien id counter, isFlagship getter, isDead method
0d11ffb feat: schedule automatic ordinary alien attacks
c71453e feat: select ordinary attackers from swarm flanks
65eb759 feat: implement alien attack counter bank (master + 15 secondary)
41f2086 feat: add deterministic Galaxian RNG (8-bit LCG)
9b0ff32 docs: add attack scheduler documentation and update ASM mapping
```

## Phase 3 Complete

1925 tests total, 0 failures. Ready for Phase 4 (flagship/escort attacks, enemy bullets, shock state, sound).
