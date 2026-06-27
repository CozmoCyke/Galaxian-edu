# Phase 2/5 — Single Ordinary Inflight Alien

**Verdict: COMPLETE**

The alien performs the full cycle: formation → arc ASM → dive → bottom exit → progressive return → same grid slot.

## Test Results

| Metric | Value |
|---|---|
| Tests before phase 2 | 64 |
| Phase 2 tests (swarmIndex + pool + controller + ArcRunner + lifecycle + destruction) | 470 |
| **Total tests** | **534** |
| Tests passing | **534/534** |
| Tests failing | **0** |

## Arc Table

| Field | Value |
|---|---|
| Address | `$1E00` |
| Raw size (file) | 103 bytes |
| Exact size consumed | **94 bytes** (47 pairs) |
| First byte consumed | Offset 0 |
| Last byte consumed | Offset 93 ($5D) |
| 103rd byte role | Unconsumed padding — allocated but not read by ordinary lifecycle. Termination is timer-driven (`TempCounter2`), not sentinel-based. |
| Source SHA-256 | `3FAB84A3F17C56703473A4142AFE5DED3FF69546E62CB0469FFEDCE59ACE2230` |

## Debug Alien (F3) — Deterministic

| Field | Value |
|---|---|
| Alien | Row 0, Col 0 (blue) |
| SwarmIndex | `$03` |
| Slot | 7 |
| Clockwise (F3) | 0 (left arc) |
| Clockwise (Shift+F3) | 1 (right arc) |
| Random | Eliminated — `Math.random()` removed |

## Lifecycle Sequence

| StageOfLife | Name | Transition Condition | ASM Address |
|---|---:|---|---|
| 0 | PACKS_BAGS | → 1 on first `update()` | `$0D35` |
| 1 | FLIES_IN_ARC | → 2 after 47 ticks OR → 5 if Y+7 < 14 | `$0D71` |
| 2 | READY_TO_ATTACK | → 3 after 1 tick (params init) | `$0DD1` |
| 3 | ATTACKING_PLAYER | → 4 when Y ≥ 200 | `$0FAF` |
| 4 | NEAR_BOTTOM | → 5 when Y ≥ 240 | `$0FFB` |
| 5 | REACHED_BOTTOM | → 6 after sortieCount++ | `$0E99` |
| 6 | RETURNING | → 7 when distance to target = 0 | `$0F07` |
| 7 | BACK_IN_SWARM | Record freed, alien in formation | `$0F2B` |

### Key Measurements

| Event | Ticks (approx) |
|---|---|
| Arc duration | 47 |
| Dive (ATTACKING_PLAYER + NEAR_BOTTOM) | ~190–210 |
| Return (RETURNING) | ~120–200 |
| Total cycle | ~360–460 |
| SortieCount | **1** (exactly one bottom pass) |
| Return to grid slot | Exact — `renderX`/`renderY` match computed swarm position |
| Return target | **Dynamic** — recalculated every tick from `swarm.offsetX/Y` + grid formula |

## Stage Transitions — ASM Fidelity

| Transition | ASM Match | Notes |
|---|---|---|
| READY_TO_ATTACK → ATTACKING_PLAYER | Approximate | In ASM, `$0DD1` computes player-relative flight path via `$0E1C` (zigzag). Our version uses linear descent (Y += 1/tick, X += 1/tick). Targeting policy is isolated as inline code, not a pluggable module. |
| Off-screen escape (Y+7 < 14) | Exact | Matches `$0D8B`–`$0D8F` logic. |
| REACHED_BOTTOM → RETURNING | Exact | `sortieCount` incremented, target computed via `computeSwarmTargetX/Y` which mirrors `SET_INFLIGHT_ALIEN_START_POSITION` (`$1147`). |
| RETURNING target recalculation | Exact | Computed every tick using `IndexInSwarm` → row/col → `$7C − row×6`, `swarmOffsetY + col×16 + 7`. Mirrors ASM `$1147`. |
| RETURNING distance check | Exact | Compares X difference only (ASM `$0F14`: `sub b`). Tolerance 25px for rotation, 0px for arrival. |

## Destruction Tests

| Scenario | Result |
|---|---|
| A. Destroy during FLIES_IN_ARC | Grid slot dead permanently, slot freed, no return |
| B. Destroy during ATTACKING_PLAYER | Same |
| C. Destroy during RETURNING | Same |
| Guard: double score | Score awarded once |
| Guard: double free | Second free returns `false` |
| Guard: late return | No transition after death |

## Browser Validation

| Check | Result |
|---|---|
| Console errors | None |
| Import errors | None |
| 404 | None |
| Offline operation | OK |
| F3 deterministic | Shift toggles clockwise |
| F2 overlay | Shows all required fields |
| Return line drawn | Yes, during RETURNING |

## Report Files

- `GALAXIAN_ENGINE_PHASE_2_OF_5_REPORT.md` — this file
- `docs/INFLIGHT_ALIEN_LIFECYCLE.md` — updated with arc table analysis
- `src/data/generated/ordinary-left-01.js` — arc table data with SHA-256 provenance
- `tools/extract_arc_tables.mjs` — deterministic arc extraction tool
- `src/inflight/ArcRunner.js` — deterministic arc pair interpreter
- `src/inflight/InflightController.js` — full lifecycle controller
- `src/states/PlayState.js` — F3 integration
- `src/debug/DebugOverlay.js` — comprehensive debug panel

## Arc Data Publication Review

| Field | Value |
|---|---|
| File | `src/data/generated/ordinary-left-01.js` |
| Verdict | **ACCEPTED** |
| Content | 52 numeric x/y delta pairs (94 bytes), derived coordinate data only |
| ASM source | Not included — cited as provenance only |
| Binary assets | None |
| Private paths | None |
| Regeneration | Documented: `node tools/extract_arc_tables.mjs --source <asm-path> --arc ordinary-left-01` |
| Disclaimer | "local ASM disassembly (NOT included in distribution)" |

## Next (Phase 3/5)

- Scheduler: automatic alien selection based on ASM rules
- Multiple simultaneous inflight aliens
- Enemy bullet firing
- SortieCount > 1 with aggressive behaviour
- Loop-the-loop taunt for aggressive aliens
- Player-relative targeting
- Dynamic `SortieCount` cap based on remaining aliens
