# Galaxian Engine

A deterministic, modular JavaScript engine for a faithful recreation of
Namco's 1979 Galaxian arcade game.

## Difference from `galaxian_basic/`

| Aspect | `galaxian_basic/` (prototype) | `galaxian_engine/` (this) |
|---|---|---|
| Architecture | Single 1430-line inline HTML/JS | Modular ES modules, clear separation |
| Game loop | `setInterval(10)` — no fixed timestep | `requestAnimationFrame` + fixed 60Hz accumulator |
| Alien formation | 5×11 grid, `linkedList`, 4 types | 6×10 grid, `SwarmLayout` array, 4 types (flagship/red/purple/blue) |
| Swarm movement | Per-alien position with independent direction | Group offset via `Swarm.offsetX/direction` |
| Death handling | Immediate deletion from linked list | State machine: `dying → dead`, persistent grid slot |
| Debug tools | None | `F2` overlay with tick counter, FPS, swarm/player state |
| Tests | None | Automated test suite (`tests/engine_tests.mjs`) |

## Architecture

```
src/
  main.js                 — Entry point, canvas setup, key bindings
  config.js               — All game constants centralised
  core/
    Game.js               — Top-level orchestrator
    GameLoop.js           — Fixed-timestep rAF loop (60Hz logic)
    InputManager.js       — Keyboard input (pressed/justPressed/justReleased)
    StateMachine.js       — Generic state machine with enter/update/exit
  entities/
    Player.js             — Player ship (move, shoot, recover)
    PlayerBullet.js       — Player projectile (single active shot)
    Alien.js              — Individual alien with state machine
    swarm/
      Swarm.js            — Swarm group (offset, direction, renders all aliens)
      SwarmLayout.js      — Formation definition (46 aliens, ASM-authentic layout)
  rendering/
    Renderer.js           — Canvas clear and basic rendering
    AssetLoader.js        — Image/audio asset loading
  states/
    BootState.js          — Asset loading → transitions to playing
    PlayState.js          — Main gameplay (player + swarm + collision + HUD)
    PlayerDyingState.js   — Death animation + life decrement
    GameOverState.js      — Final score display + restart
  debug/
    DebugOverlay.js       — F2 toggleable debug HUD
```

## Run

```powershell
.\run_local.ps1
```

Opens `http://127.0.0.1:8080/` in the default browser. Requires Python 3
(for a simple HTTP server; ES modules need `http://` not `file://`).

## Controls

| Key | Action |
|---|---|
| `←` / `a` | Move left |
| `→` / `d` | Move right |
| `Space` | Fire |
| `F2` | Toggle debug overlay |
| `N` | Restart (on game over screen) |

## Debug Mode

Press `F2` (or `D`) to enable. Shows:

- Current game state
- Logic tick count
- Display FPS
- Swarm direction, offsetX, offsetY
- Alive/in-formation/total alien counts
- Player coordinates and state
- Bullet active/inactive
- Score
- Scheduler state (enabled/disabled, counters, difficulty)
- Flagship scheduler state (counters, active group, refusal reason)
- Inflight aliens (slot, stage, trajectory, return target)
- Shock state (active, counter)
- Audio diagnostics (initialized, muted, locked, bus count)
- Attack voice counts (formation hum, dive sounds, music)
- Invariant status (if validator loaded)
- Invincibility indicator
- Restart count
- Per-alien labels (swarmIndex, type initial)

## Authentic Mechanics

- **Alien formation** — 46 aliens in original layout: 2 flagships, 6 red,
  8 purple, 30 blue (10×3 rows). Matches `ALIEN_SWARM_FLAGS` at `$4100`.
- **Persistent gaps** — Destroyed aliens leave permanent holes in the
  formation; adjacent aliens do not shift.
- **Group movement** — Swarm moves as a unit; individual positions are
  `swarmOffset + localGridPosition`.
- **Fixed-timestep loop** — 60Hz logic updates decoupled from display
  framerate, enabling deterministic replay.
- **Single shot** — Player cannot fire again while a bullet is active
  (matches original hardware).

## Implemented Features

- **Ordinary attack scheduler** — Counter-based alien launch system (`$424A–$425A`)
- **Flagship attack scheduler** — ASM-authentic counter cycle, flagship/escort grouping, red fallback
- **Inflight alien pool** — 8 slots (slot 1 flagship, 2–3 escorts, 4–7 ordinary), 8-stage lifecycle
- **Arc trajectory tables** — ASM-derived ∆X/∆Y data for dive patterns
- **Flagship + escort group behavior** — Group lifecycle, return tracking, completion, scoring
- **Diagonal enemy bullets** — Fired from attacking inflight aliens, suppressed during shock
- **Sound system** — Web Audio API with formation hum, dive sounds, music sequences, 6 event-triggered SFX
- **AudioEventBus** — Circular buffer (1024 entries), subscription, event dedup per frame
- **Engine invariant validator** — Runtime checks for aliens, slots, groups, projectiles, audio, state
- **Debug overlay** — F2/D toggle, full diagnostics panel
- **Lifecycle hardening** — Clean state transitions, proper exit() cleanup
- **Deterministic engine** — Verified 200K+ soak ticks, identical hash across runs
- **Comprehensive tests** — 2,396 validations (2,220 Node + 176 browser) across 10 test files

## Controls

| Key | Action |
|---|---|
| `←` / `a` | Move left |
| `→` / `d` | Move right |
| `Space` | Fire |
| `F2` / `D` | Toggle debug overlay |
| `N` | Restart (on game over screen) |
| `M` | Toggle mute |
| `F3` | Launch debug alien (Shift+F3 for clockwise) |
| `F4` | Toggle ordinary scheduler |
| `F5` | Increase difficulty (Shift+F5 to reset) |
| `F6` | Toggle flagship scheduler (Ctrl+F6 for debug launch) |

## Test Suite

```powershell
node tests\engine_tests.mjs           # 2,114 unit tests
node tests\scenarios_phase4.mjs       # 62 flagship/group/score tests
node tests\scenarios_phase5c.mjs      # 37 combined combat scenarios
node tests\phase5c_soak_test.mjs      # 2×100,000 tick soak (deterministic)
node tests\phase5b_offline_audio.mjs  # 6 offline audio waveform validations
```

Browser tests (requires Playwright):

```powershell
node tests\phase5c_browser_validation.mjs   # 8 scenarios in Chromium
node tests\phase5c_chromium_soak.mjs        # 10,000 ticks in Chromium
```
