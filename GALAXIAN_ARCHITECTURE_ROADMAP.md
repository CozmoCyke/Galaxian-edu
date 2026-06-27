# Galaxian Architecture Roadmap — Phased Migration Plan

> **Goal:** Transform `galaxian_basic/` into a faithful Galaxian arcade recreation without losing the existing working foundation.

---

## Principles

1. **Never break the running game** — keep `index.html` as untouched reference, work in new files
2. **One subsystem at a time** — each phase produces a testable milestone
3. **Mechanical fidelity first, visual polish last** — cadence, trajectories, attack logic before rendering
4. **Fixed-pool entity model** — replace linked lists with typed arrays/Uint8 for performance and predictability
5. **Reference `galaxian.asm` directly** — port constants, tables, and state machines; don't reinvent

---

## Phase 0 — Project Foundation (estimated: 1 session)

**Goal:** Set up the build system, directory structure, and module architecture without touching game logic.

### Actions
- Create clean `src/` structure:
  ```
  src/
    core/       — game loop, state machine, timer
    entities/   — player, alien, bullet, inflight_alien
    systems/    — attack_scheduler, collision, sound, scoring
    render/     — sprites, effects, hud
    data/       — arc tables, difficulty tables, sound tables
  ```
- Set up ES module bundler (Vite or esbuild) with dev server
- Create `index.html` shell → loads `src/main.js`
- Implement `requestAnimationFrame`-based game loop with fixed-timestep accumulator (60Hz target)
- Copy `galaxian_basic/index.html` → `reference/` as immutable archive

### Deliverable
- `npm run dev` opens a black canvas with 60fps counter in console
- Reference `index.html` untouched in `reference/`

### Key Files Created
- `src/core/game_loop.js`
- `src/main.js`
- `package.json`, `vite.config.js`

---

## Phase 1 — Entity Model & Rendering Foundation (estimated: 2 sessions)

**Goal:** Port the rendering pipeline and entity patterns from `galaxian_basic` into the new module structure.

### Actions
- Port `myship` → `src/entities/player_ship.js` (movement, shoot, hit, recover)
- Port `bullet` → `src/entities/bullet.js` (both player and enemy)
- Port pixel-drawing functions → `src/render/sprites.js` (inline `fillRect` patterns)
- Port alien formation grid → `src/entities/alien_swarm.js` (5×11→10×6, `Uint8Array(128)` bitmap)
- Port star field → `src/entities/star_field.js` (constellation pattern from asm)
- Port HUD → `src/render/hud.js` (score, lives, level)
- Replace `linkedList` with entity pools (fixed-size arrays with active flags)

### Deliverable
- Aliens render in formation at top, player ship at bottom, stars scroll, HUD displays
- No attack logic yet — static display only

### Key Files Created
- `src/entities/player_ship.js`
- `src/entities/alien_swarm.js`
- `src/entities/bullet.js`
- `src/render/sprites.js`
- `src/render/hud.js`
- `src/data/arc_tables.js` (port of `$1E00` arc data)
- `src/data/difficulty_tables.js` (port of difficulty counters and caps)

---

## Phase 2 — Core Systems: NMI Script & State Machine (estimated: 2 sessions)

**Goal:** Implement the Galaxian script-driven state machine that drives all game modes.

### Actions
- Create `src/core/state_machine.js` — generic script/stage dispatcher
- Implement the 5 main scripts (mapped from `SCRIPT_NUMBER` 0-4):
  - `SCRIPT_0` — clear screen / init
  - `SCRIPT_1` — attract mode (scrolling text, convoy charger, demo play)
  - `SCRIPT_2` — credit / wait for start
  - `SCRIPT_3` — gameplay player 1
  - `SCRIPT_4` — gameplay player 2 (stub)
- Each script as a class with `stage` counter and `update()` method
- Port the script jump table (`rst $28` → dispatch switch)

### Deliverable
- State machine runs, switches between attract and gameplay on input
- Game states: Attract → Credit → Play → Game Over → Attract

### Key Files Created
- `src/core/state_machine.js`
- `src/systems/attract_mode.js`

---

## Phase 3 — Attack Scheduling System (estimated: 3 sessions)

**Goal:** Faithfully reproduce the hierarchical counter-based attack scheduling from `galaxian.asm`.

### Actions
- Implement `src/systems/attack_scheduler.js`:
  - Master attack counter (tick each frame)
  - 16 secondary alien attack counters (`$424B-$425A`)
  - 2 flagship master counters (`$4245-$4246`)
  - 1 flagship secondary counter (`$422F`)
- Implement flank alternation (`ALIENS_ATTACK_FROM_RIGHT_FLANK` at `$4215`)
- Implement formation scanning: right-to-left or left-to-right, find available alien in column
- Implement `CAN_FLAGSHIP_OR_RED_ALIENS_ATTACK` gates
- Port `WAKEUP_INFLIGHT_ALIEN` — remove alien from swarm bitmap, fill inflight struct
- Port difficulty integration: `DIFFICULTY_BASE_VALUE` + `DIFFICULTY_EXTRA_VALUE` modulate counter speeds

### Deliverable
- Aliens attack at authentic intervals
- Attack frequency increases with level and within-level performance
- Flank alternation visible (attacks come from left then right)

### Key Files Created
- `src/systems/attack_scheduler.js`
- `src/systems/difficulty.js`
- `src/systems/formation_scanner.js`

---

## Phase 4 — Inflight Alien Lifecycle & Trajectories (estimated: 4 sessions)

**Goal:** Implement the complete 14-stage inflight alien state machine and arc trajectory system.

### Actions
- Implement `src/entities/inflight_alien.js`:
  - Struct fields: `isActive`, `stageOfLife`, `x`, `y`, `animFrame`, `arcClockwise`, `indexInSwarm`, `pivotYValue`, `arcTableLsb`, `color`, `sortieCount`, `speed`, `tempCounter1/2`
  - Pool of 8 inflight slots (0=flagship, 1-2=escorts, 3-7=single attackers)
- Implement all `StageOfLife` states:
  - 0: Inactive/reset
  - 1: Attract mode scrolling charge
  - 2-3: Init arcs
  - 4: Near bottom of screen
  - 5: Reached bottom
  - 6-7: Attack transitions
  - 8: Full-speed charge at player
  - 9: Loop-the-loop
  - 10: Complete loop
  - 11: Fly in arc
  - 13: Return to formation
- Port `INFLIGHT_ALIEN_ARC_TABLE` from `$1E00` → `src/data/arc_tables.js`
  - 103 bytes of signed (∆X, ∆Y) pairs
  - Support both forward (clockwise) and reverse (counter-clockwise) traversal for left/right arcs
- Implement flagship + 2 escorts group lifecycle
- Implement return-to-swarm logic

### Deliverable
- Attacking aliens follow authentic arc trajectories (dive, bottom-sweep, loop-the-loop)
- Flagship + escorts fly together in formation
- Aliens return to correct position in swarm after attack

### Key Files Created
- `src/entities/inflight_alien.js`
- `src/data/arc_tables.js` (expanded with tables)

---

## Phase 5 — Collision, Scoring & Enemy Bullets (estimated: 2 sessions)

**Goal:** Port the remaining gameplay systems — collision handling, scoring tables, and enemy bullet system.

### Actions
- Implement collision in `src/systems/collision.js`:
  - Player bullet ↔ alien (any inflight or swarm)
  - Alien ↔ player ship
  - Enemy bullet ↔ player ship
  - Trigger explosion/dying states
- Implement scoring in `src/systems/scoring.js`:
  - Original scoring table: Flagship=300/cycle, Red=200/150, Purple=100, Blue=80
  - `FLAGSHIP_SCORE_FACTOR` for cycling score per flagship death
  - BCD-like display (6-digit)
  - Hi-score persistence (localStorage)
  - Extra life at DIP-configurable threshold
- Implement enemy bullet pool in `src/entities/enemy_bullet.js`:
  - 14-slot pool, 5 bytes per slot
  - Diagonal aiming based on player X position
  - `INFLIGHT_ALIEN_SHOOT_RANGE_MUL` trigger timing

### Deliverable
- Full scoring with authentic values
- Enemy bullets aim at player
- Aliens can kill player, player can kill aliens
- Game over → continue → attract mode cycle works

### Key Files Created
- `src/systems/collision.js`
- `src/systems/scoring.js`
- `src/entities/enemy_bullet.js`

---

## Phase 6 — Sound System (estimated: 2 sessions)

**Goal:** Add audio using reference MP3s from `project/snd/` and the Web Audio API.

### Actions
- Implement `src/systems/audio.js`:
  - Preload all 7 MP3s from `project/snd/`
  - Map to game events: credit, start, shoot, player_hit, extra_life, flying, enemy_hit
  - Flag-triggered system matching asm pattern (set flag → sound handler plays → clear flag)
  - Volume control per channel
- Implement complex sound sequences:
  - Game start melody (ported from `$1E68`)
  - Swarm tempo acceleration as aliens are killed (port `RESET_SWARM_SOUND_TEMPO` + `HANDLE_SWARM_SOUND`)
- Implement alien death sound per type (flagship vs regular)

### Deliverable
- All game events have appropriate audio
- Swarm hum tempo increases as formation thins
- Game start jingle plays

### Key Files Created
- `src/systems/audio.js`
- `src/data/sound_tables.js`

---

## Phase 7 — Difficulty Progression & Polish (estimated: 2 sessions)

**Goal:** Fine-tune the difficulty curve and add remaining visual authenticity.

### Actions
- Implement full difficulty system:
  - `DIFFICULTY_BASE_VALUE` increments per level completed (max 7)
  - `DIFFICULTY_EXTRA_VALUE` increments during level via cascading counters
  - Both values feed attack counter speeds and aggression
- Implement per-level persistence:
  - `FLAGSHIP_SURVIVOR_COUNT` carries surviving flagships between levels
- Add attract mode polish:
  - Scrolling "WE ARE THE GALAXIANS" text
  - Convoy charger score display
  - Demo AI play with `ATTRACT_MODE_FAKE_CONTROLLER`
- Add constellation lines (ported from asm star routine)
- Add screen flash and explosion effects

### Deliverable
- Game difficulty scales authentically level-to-level and within-level
- Attract mode shows full demo sequence
- Visual effects match original

---

## Phase 8 — Asset Integration & Rendering Options (estimated: 2 sessions)

**Goal:** Add sprite-sheet rendering path using reference assets from `project/img/`.

### Actions
- Add `src/render/sprite_sheet.js` — load `project/img/` PNGs and render sprites by tile index
- Keep `src/render/sprites.js` as fallback (procedural pixel art)
- Add runtime toggle between modes
- Implement original color palette from asm
- Match original resolution output options (256×224 crop vs 288×219 stretch)

### Deliverable
- Authentic sprite rendering available alongside procedural mode
- Toggle in settings/console

---

## Phase 9 — Cocktail & Two-Player (optional, estimated: 2 sessions)

**Goal:** Add two-player alternating mode and cocktail table flip support.

### Actions
- Per-player state save/restore (swarm, score, difficulty, level)
- `IS_COCKTAIL` flag → screen flip for P2
- P2 controls mapping

### Deliverable
- Two-player alternating mode works
- Cocktail mode screen flip (if hardware-style deployment)

---

## Summary Timeline

| Phase | Focus | Sessions | Dependencies |
|---|---|---|---|
| 0 | Project foundation | 1 | None |
| 1 | Entity model & rendering | 2 | Phase 0 |
| 2 | State machine | 2 | Phase 1 |
| 3 | Attack scheduling | 3 | Phase 2 |
| 4 | Inflight lifecycle & trajectories | 4 | Phase 3 |
| 5 | Collision, scoring, enemy bullets | 2 | Phase 4 |
| 6 | Sound | 2 | Phase 5 |
| 7 | Difficulty & polish | 2 | Phase 6 |
| 8 | Asset integration | 2 | Phase 7 (can parallelize) |
| 9 | Cocktail & 2-player | 2 | Phase 7 |

**Total: ~22 sessions** — caveat: sessions are approximate and assume focused work with asm reference open.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `galaxian.asm` is 10k lines — easy to misread a subsystem | Cross-reference multiple sections; build one subsystem at a time and test empirically |
| Bezier vs arc table divergence | Implement arc table lookup as default, keep Bezier as fallback. The asm table at `$1E00` is definitive |
| Attack scheduling feels off without original hardware timing | Use `galaxian.asm` counter values directly; tune per-frame tick rate to match 60Hz | 
| Sound MP3s may not match event timing | Trim/crop MP3s in Phase 6; fall back to synthesized tones |
| Browser Canvas vs CRT appearance | Accept visual differences; focus on mechanical fidelity |
