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

Press `F2` to enable. Shows:

- Current game state
- Logic tick count
- Display FPS
- Swarm direction, offsetX, offsetY
- Alive/in-formation/total alien counts
- Player coordinates and state
- Bullet active/inactive
- Score
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

## Provisional Mechanics

- **Alien point values** — Hardcoded provisional scores (300/200/100/80).
  Final values depend on attack context (flagship cycling, escort status).
- **Difficulty** — No difficulty progression; attack scheduling not yet
  implemented.
- **Sound** — Not yet implemented (reference MP3s available in `project/snd/`).
- **Attract mode** — Not yet implemented.
- **Sprites** — Aliens are rendered with procedural pixel art (`ctx.fillRect`).
  Sprite-sheet rendering from `project/img/` is planned.

## Next Phase

Phase 2 will implement:

1. Alien attack scheduling (counter-based system from ASM `$424A–$425A`)
2. Inflight alien pool (8 slots, stage-of-life state machine)
3. Arc trajectory tables (`$1E00`)
4. Flagship + escort group behavior
5. Diagonal enemy bullets
6. Sound triggers with reference MP3s
