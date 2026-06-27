# Galaxian Engine — Phase 4 of 5: Flagship & Escort Attack System

## Overview

Phase 4 implements the flagship/escort attack system with coordinated attack groups, contextual scoring, shock state, and red fallback. This phase adds the full flagship pipeline to the Galaxian Engine, including the counter system, alien selection, atomic group allocation, orchestrated launch, return/death tracking, scoring factor calculation, and shock state management.

## Files Created/Modified

### New Files (7 source + 1 test + 2 docs)

| File | Purpose |
|---|---|
| `src/flagship/FlagshipAttackCounters.js` | Two-master + secondary counter system (master1→master2→enable→secondary→canAttack) |
| `src/flagship/FlagshipSelector.js` | Leftmost/rightmost flagship or red alien selection by side |
| `src/flagship/EscortSelector.js` | Proximity-based red alien escort selection (nearest column to flagship, max 2) |
| `src/flagship/FlagshipAttackGroup.js` | Coordinated attack group with per-member return/death tracking |
| `src/flagship/FlagshipAttackScheduler.js` | Orchestrator — counters → validation → selection → atomic allocation → launch |
| `src/flagship/ShockController.js` | Trigger/update/reset shock with 240-frame timer, freezes during inflight activity |
| `src/flagship/FlagshipScoreCalculator.js` | Pure contextual scorer (factor 0–3, points 200–800) |
| `src/flagship/index.js` | Barrel export for all 6 flagship modules |
| `tests/scenarios_phase4.mjs` | 62 deterministic scenario tests across 11 scenarios |
| `docs/FLAGSHIP_ESCORT_ATTACKS.md` | Full ASM documentation of the flagship/escort system |
| `docs/FLAGSHIP_SCORING_AND_SHOCK.md` | Scoring factor and shock state lifecycle documentation |

### Modified Files

| File | Changes |
|---|---|
| `src/inflight/InflightSlotPool.js` | Added `allocateFlagshipSlot()`, `allocateEscortSlot()`, `allocateFlagshipGroup()` (atomic 1+2), `freeFlagshipGroup()`, `hasFreeFlagshipSlot()`, `hasFreeEscortSlot()`, `freeEscortSlot()`. Updated `canAllocate()` to allow reserved slots 0–3. |
| `src/states/PlayState.js` | Creates `FlagshipAttackScheduler` + `ShockController` on `enter()`. Calls `flagshipScheduler.update()` after ordinary scheduler. Calls `shockCtrl.update()` each frame. F6 toggles flagship scheduler. Ctrl+F6 triggers debug flagship launch. |
| `src/debug/DebugOverlay.js` | Added shock section (active/counter/duration), flagship scheduler panel (ON/OFF, side, master counters, secondary state, canAttack, last refusal), group info (id, stage, side, launch tick, active count, escort counts, completion). |
| `src/entities/swarm/SwarmLayout.js` | Added `hasFlagships()` method. |
| `src/flagship/FlagshipSelector.js` | Fixed `a.isDead()` → `a.isDead` (getter vs function), `swarm.layout.isInFlight(a)` → `a.isInFlight` |
| `src/flagship/EscortSelector.js` | Fixed `a.isDead()` → `a.isDead`, `swarm.layout.isInFlight(a)` → `a.isInFlight`, `a.gridIndex` → `a.swarmIndex` |
| `tests/engine_tests.mjs` | Added 78 Phase 4 unit tests across 7 categories (counters × 24, scores × 6, shock × 7, selectors × 7, escorts × 2, slot pool × 16, scheduler × 6) |
| `docs/ASM_MAPPING.md` | Added Phase 4 flagship/escort attack mapping (24 new ASM→JS entries) |

## Slot Architecture

```
Slot 0: auxiliary/reserved
Slot 1: FLAGSHIP (flagship only)
Slot 2: ESCORT 1 (escort only)
Slot 3: ESCORT 2 (escort only)
Slots 4-7: ORDINARY (red fallback uses slot 7)
```

Group allocation is atomic: `allocateFlagshipGroup()` allocates all 3 slots at once. If flagship slot fails (slot 1 busy), entire group is refused.

## Counter System

```
master1 ($4245, default $40) → decrements each frame
  └─ on zero: reload to $3C, decrement master2
master2 ($4246, default $06) → decrements each frame when master1 wraps
  └─ on zero: reload to 1, enable secondary counter
secondaryEnabled ($422E) → flag indicating secondary is active
secondary ($422F, computed) → decrements each frame
  └─ on zero: set canAttack ($4229)
```

The no-blue-or-purple fast path ($15A3) sets A=2, secondary=$08 instead of computing from difficulty.

## Scoring

| Factor | Condition | Points |
|--------|-----------|--------|
| 0 | No escorts allocated | 200 |
| 1 | Escorts alive when flagship dies | 400 |
| 2 | 1 escort killed before flagship | 600 |
| 3 | Both escorts killed before flagship | 800 |

## Shock State

- Triggered when a flagship member is hit
- Duration: 240 frames (~4 seconds)
- Counter only decrements when `noInflightAliens` is true
- Guards `UPDATE_ATTACK_COUNTERS` (`$1555`) and `CHECK_IF_ALIEN_CAN_ATTACK` (`$15C3`) — blocks ALL new attacks during shock

## Per-Frame Cadence

```
1. UPDATE_ATTACK_COUNTERS ($1555)   → FlagshipAttackCounters.updateAttackCounters()
2. CHECK_IF_FLAGSHIP_CAN_ATTACK       → counters.checkCanAttack()
3. HANDLE_FLAGSHIP_ATTACK ($140C)     → scheduler.update() [before ordinary at $1344]
4. HANDLE_SHOCKED_SWARM ($1688)       → ShockController.update()
5. HANDLE_SINGLE_ALIEN_ATTACK ($1344)  → OrdinaryAttackScheduler.update()
```

## Test Results

- `tests/engine_tests.mjs`: **2003/2003 passed** (baseline 1925 + 78 Phase 4 unit tests)
- `tests/scenarios_phase4.mjs`: **62/62 passed** (11 deterministic scenarios)

## Key Design Decisions

1. Attack side matches ordinary scheduler (both set by `SET_ALIEN_ATTACK_FLANK`)
2. Red fallback uses slot 7 (last ordinary slot) matching ASM at $14E7
3. Escort selection prioritizes proximity to flagship column (matching ASM scan pattern)
4. Shock counter only decrements when no inflight aliens remain per ASM guard at $169A–$169E
5. Group allocation is atomic (all-or-nothing for flagship + 2 escorts)
6. `FlagshipScoreCalculator` is a pure function for independent testability
7. Debug overlay shows flagship info in `#FF6600` (distinct from ordinary's `#FFFF00`)
8. F6 toggles flagship scheduler; Ctrl+F6 triggers debug launch

## Next Steps (Phase 5)

- Enemy bullets system
- Advanced sound effects
- Aggressive alien mode
- Two-player mode
- Attract mode


## Browser Validation Results (Automated via Playwright/Chromium)

**Tool:** Playwright 1.61.1  
**Browser/version:** Chromium 149.0.7827.55  
**URL:** http://localhost:8084/?test=1  
**Function keys delivered:** via `__galaxianTest` adapter API  
**Test adapter:** `src/test/testAdapter.js` (injected via `?test=1`)

### Engine Tests
- Unit tests: **2003/2003 passed** (Phase 1–4)
- Scenario tests: **62/62 passed** (Phase 4 deterministic scenarios)

### Browser Scenarios

| Scenario | Status |
|---|---|
| Flagship alone (slot 1, no escorts, return, slot freed) | PASS |
| One escort (slots 1+2, coordinated departure, return) | PASS |
| Two escorts (slots 1+2+3, coordinated 3-member group) | PASS |
| Escort destruction (slot freed, other members continue) | PASS |
| Flagship destruction (slot freed, shock, escorts continue) | PASS |
| Shock lifecycle (active, frozen inflight, decrement, clear) | PASS |
| Max capacity (flagship+escorts coexist with ordinary slots) | PASS |
| Game states (playerDying, gameOver, restart cleanup) | PASS |

### Error Counts

| Check | Count |
|---|---|
| Test failures | 0 |
| Unhandled exceptions | 0 |
| Failed JS imports | 0 |
| Failed HTTP requests / 404 | 0 |

### Screenshots
Screenshots saved to `__screenshots_phase4/` directory.

**Verdict:** COMPLETE — ZERO 404 • AUTOMATED AND BROWSER VALIDATION PASS

*Auto-generated by Playwright browser validation.*

## Pre-Publication Fix: Asset 404 Correction

**Issue:** During Phase 4 browser validation, the Playwright test server reported 1 HTTP 404 for `Arcade - Galaxian - Miscellaneous - General Sprites.png`.

**Root Cause:** `AssetLoader.js:19` declared an unused sprite sheet reference (`spriteSheet`) pointing to a PNG file with spaces in its name. The file existed on disk (4950 bytes at `assets/img/`), but the Playwright test server did not decode percent-encoded URL characters (`%20` → space). More critically, the loaded image was **never consumed** — no `getImage('spriteSheet')` call existed anywhere in the codebase. The engine renders all sprites via Canvas primitives, not from a sprite sheet.

**Fix:**
1. Removed the dead sprite sheet reference from `AssetLoader._doLoad()`.
2. Simplified `AssetLoader.js` to a stub (no asset loading needed).
3. Fixed the Playwright test server (`phase4_browser_validation.mjs`) to call `decodeURIComponent()` on request paths.
4. Added 404 regression assertion: `failedReqs.length` is now included in the `testFailures` counter, blocking publication on any 404.

**Verification:** Re-run browser validation shows **0 failed requests / 404**, verdict reads `"COMPLETE — ZERO 404"`.

| Check | Before | After |
|---|---|---|
| HTTP 404 responses | 1 | 0 |
| Engine tests | 2003/2003 | 2003/2003 |
| Scenario tests | 62/62 | 62/62 |
| Browser assertions | 43/43 | 43/43 |

**Result:** Publication no longer blocked by asset 404.

**Tool:** Playwright 1.61.1  
**Browser/version:** Chromium 149.0.7827.55  
**URL:** http://localhost:8084/?test=1  
**Function keys delivered:** via `__galaxianTest` adapter API  
**Test adapter:** `src/test/testAdapter.js` (injected via `?test=1`)

### Engine Tests
- Unit tests: **2003/2003 passed** (Phase 1–4)
- Scenario tests: **62/62 passed** (Phase 4 deterministic scenarios)

### Browser Scenarios

| Scenario | Status |
|---|---|
| Flagship alone (slot 1, no escorts, return, slot freed) | PASS |
| One escort (slots 1+2, coordinated departure, return) | PASS |
| Two escorts (slots 1+2+3, coordinated 3-member group) | PASS |
| Escort destruction (slot freed, other members continue) | PASS |
| Flagship destruction (slot freed, shock, escorts continue) | PASS |
| Shock lifecycle (active, frozen inflight, decrement, clear) | PASS |
| Max capacity (flagship+escorts coexist with ordinary slots) | PASS |
| Game states (playerDying, gameOver, restart cleanup) | PASS |

### Error Counts

| Check | Count |
|---|---|
| Test failures | 0 |
| Unhandled exceptions | 0 |
| Failed JS imports | 0 |
| Failed HTTP requests / 404 | 0 |

### Screenshots
Screenshots saved to `__screenshots_phase4/` directory.

**Verdict:** COMPLETE — ZERO 404 • AUTOMATED AND BROWSER VALIDATION PASS

*Auto-generated by Playwright browser validation.*
