# Galaxian Engine — Phase 2/5 Report

## Summary of Phase 0/1

- **Game loop**: `requestAnimationFrame` + fixed 60 Hz accumulator (`FIXED_STEP_MS = 1000/60`), decoupled update/render, max 5 frame skip limit.
- **State machine**: `Boot → Play → PlayerDying → GameOver → Play (loop)` with `enter/update/exit` hooks.
- **Formation**: Authentic 46-alien layout from ASM `ALIEN_SWARM_FLAGS` (`$4100`): 2 flagships, 6 red, 8 purple, 30 blue (10×3 rows). Each alien has stable `swarmIndex`, `row`, `col`, state machine (`inFormation|dying|dead`), persistent grid slots.
- **Swarm movement**: Group offset (`Swarm.offsetX/direction`), individual positions = `swarmOffset + localGridPosition`.
- **Player**: move/shoot/hit/recover, single active bullet, boundary clamping.
- **Collision**: AABB between `PlayerBullet` active and aliens in formation; persistent holes after kill.
- **HUD**: score (6-digit), hi-score, lives (ship icons, max 4), level (red bars).
- **Debug overlay**: `F2` toggle, shows state, tick, FPS, swarm dir/offset/alive counts, player coords/bullet/score, per-alien labels.
- **Tests**: 64/64 unit tests pass.
- **Browser validation**: 0 console errors, 0 failed requests, canvas 288×240, game loads offline, all interactions verified.

## Remote & Branch Strategy

| Branch | Remote | History | Content |
|--------|--------|---------|---------|
| `main` | `origin/main` | 1 commit (orphan) | 40 safe files only |
| `master` | (local only) | 4 commits | Full history incl. provenance-uncertain assets |

### What was pushed (safe)
- `galaxian_engine/src/`, `galaxian_engine/tests/`, `galaxian_engine/docs/`, `galaxian_engine/index.html`, `galaxian_engine/package.json`, `galaxian_engine/run_local.ps1`, `galaxian_engine/README.md`, `galaxian_engine/.eslintrc.json`
- `reports/` (3 files)
- `tools/` (4 files)
- Root: `.gitignore`, `README.md`, `start-galaxian-edu.cmd`, `start-galaxian-edu.ps1`,
  `GALAXIAN_BASIC_AS_FOUNDATION_AUDIT.md`, `GALAXIAN_ARCHITECTURE_ROADMAP.md`,
  `GALAXIAN_ENGINE_PHASE_0_1_REPORT.md`

### What was withheld (provenance uncertain)
- `app/` (34 files) — Construct 2 export, third-party tool output
- `org/` (34 files) — Construct 2 project backup
- `project/` (10 files) — ROM-derived sprites/sounds, third-party asm disassembly
- `galaxian_basic/` (25 files) — Biniek's 2010 game, no explicit license
- `galaxian.asm` (root) — duplicate of `project/galaxian.asm`
- `galaxian_engine/assets/` (9 files) — copies from `project/`

All withheld files remain **intact on disk** and in `master` branch history.
To restore local tracking: `git rm --cached` entries in `.gitignore`.

### Remote state
- **Origin**: `https://github.com/CozmoCyke/Galaxian-edu.git`
- **Pushed**: `main` (commit `979ec56`), tag `phase-0.1-complete`
- **Not pushed**: `master` branch (kept local with full history)

## Phase 2/5 — Next Steps

### Attack scheduling
- Alien dive-bomb state: transition `inFormation → diving → dying → dead`
- Dive selection logic (which alien, when)
- Attack arc — sinusoidal/parabolic trajectory toward player
- Bullet firing from diving aliens

### Inflight aliens
- Independent alien entities while diving (separate from swarm grid)
- Collision detection between player bullets and diving aliens
- Diving alien collision with player

### Arcade tables
- Convert more ASM lookup tables from `galaxian.asm`:
  - Alien movement speed/direction tables
  - Attack frequency / group size tables
  - Score values per enemy type

### Enemy bullets
- Bullet spawn from diving aliens
- Player-diving alien collision → player death

### Sound
- Integrate Web Audio API for sound effects
- Hook sounds to game events (shoot, hit, death, extra life, etc.)
- Sound assets in `galaxian_engine/assets/snd/` (not yet loaded)

### Asset loading
- Load sprite PNGs into render pipeline (procedural rendering currently in use)
- Asset manifest system from `AssetLoader.js`

### Recommended working branch
```powershell
git checkout main    # clean, pushable history
# or
git checkout master  # full local history if you need the ASM reference
```

## Verification

```powershell
cd galaxian_engine
node tests/engine_tests.mjs       # 64/64 pass
start http://localhost:8000        # (run_local.ps1 first)
```

## Tag

```powershell
git tag -l "phase-*"
# → phase-0.1-complete  (979ec56 on origin/main)
```
