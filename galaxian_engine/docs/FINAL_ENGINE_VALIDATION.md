# Final Engine Validation

## Validation Layers

### Layer 1: Unit Tests (2,114 assertions)

`tests/engine_tests.mjs` — Covers all subsystems:
- Swarm formation, movement, gaps
- Player movement, firing, recovery
- Alien lifecycle (formation → leaving → inflight → dying → dead)
- Inflight slot pool (allocation, freeing, flagship/escort/reserved)
- Ordinary attack scheduler (counters, timing, difficulty, side-switching)
- Flagship attack scheduler (counters, group lifecycle, score calculation)
- Enemy bullet pool (allocate, free, update, iterator, reset)
- Enemy bullet controller (fire from attacking aliens, shock suppression, state gating)
- Audio event bus (emit, subscribe, clear, reset, circular buffer)
- Audio manager (init, mute, volume, reset, destroy)
- Formation hum controller (start, update, stop)
- Attack sound controller (active count, reset)
- Music sequence player (play, stop, cleanup)
- OfflineAudioContext waveform validation (6 sounds)

### Layer 2: Scenario Tests

`tests/scenarios_phase4.mjs` (62 assertions):
- Flagship selection, escort selection, score calculation, group lifecycle
- Attack counter cycles, shock lifecycle, max capacity coexistence, red fallback
- Full scheduler cycle with swarm

`tests/scenarios_phase5c.mjs` (37 assertions):
- Max combat load (high difficulty, 2000 ticks)
- Simultaneous destructions (kill inflight aliens, verify score)
- Player death under load (single PLAYER_DESTROYED emission)
- Complete restart (clean state after gameOver)
- Determinism (same seed → identical hash)
- Shock + projectiles (destroy flagship while inflight exist)
- Game over under load (single GAME_OVER emission)
- All aliens destroyed (kill 46, tick 30 frames, verify zero alive)

### Layer 3: Soak Tests

`tests/phase5c_soak_test.mjs` (2 × 100,000 ticks):
- Full state machine cycling (playerDying → gameOver → playing)
- Invariant checks every 1,000 ticks
- Determinism verification (identical hash across two runs)
- Max inflight: 6, max bullets: 14, restarts: ~49 per run
- Zero invariant failures

### Layer 4: Browser Validation

`tests/phase5c_browser_validation.mjs` (8 scenarios, Playwright + Chromium):
- Full Load (both schedulers, 2000 ticks)
- State Transitions (playerDying → gameOver → playing)
- Invariant Check (NaN, aliveCount, slots, bullets)
- Audio (getAudioManagerState, mute toggle)
- Enemy Bullets (fire under load, valid coordinates)
- Flagship Group (launch via scheduler, verify group structure)
- Score (non-negative, non-decreasing)
- Long Sequence (5000 ticks with periodic deaths)

All scenarios verified: 0 console errors, 0 page errors, 0 request failures.

### Layer 5: Chromium Soak

`tests/phase5c_chromium_soak.mjs` (10,000 ticks in Chromium):
- Invariant checks every 1,000 ticks
- Final: AudioManager accessible, audio events bounded (<50K), 0 errors

### Layer 6: Audio Validation

`tests/phase5b_offline_audio.mjs`:
- 6 sound effects rendered through OfflineAudioContext
- Validate length, peak amplitude, tail silence

## Metrics

| Metric | Value |
|---|---|
| Node assertions | 2,220 |
| Browser assertions | 127 |
| **Total test assertions** | **2,347** |
| Total test files | 10 |
| Soak ticks (Node) | 200,000 (2 × 100K) |
| Soak ticks (Chromium) | 10,000 |
| Invariant failures | 0 |
| Determinism | Verified (same seed → same hash) |
| Console errors | 0 |
| Page errors | 0 |
| HTTP failures | 0 |

## Architecture Compliance

| Requirement | Status |
|---|---|
| No unbounded growth | AudioEventBus circular buffer (1024 entries) |
| Clean restart | PlayState.exit() resets all subsystems |
| No stale references | All controllers have reset/clear methods |
| Event dedup at PlayState level | `_emitOnce` prevents duplicate events per frame |
| Audio self-cleaning | Formation hum stops, music clears timeouts, dive sounds auto-disconnect |
