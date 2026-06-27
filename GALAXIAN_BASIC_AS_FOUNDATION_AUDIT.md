# Galaxian Basic as Foundation — Audit Report

> **Context:** Evaluating whether `galaxian_basic/` (Michal Biniek's 2010 Canvas remake) can serve as the starting point for a faithful recreation of Namco's 1979 Galaxian arcade game. Reference: `project/galaxian.asm` (full Z80 disassembly).

---

## Verdict

**Conditional YES — but ~60% of the JS code must be rewritten or significantly restructured.** The game loop, rendering system, and basic entity model are salvageable. The attack scheduling, alien lifecycle, trajectory system, collision, scoring progression, and audio are not.

---

## Structural Comparison

| Subsystem | galaxian_basic | Original Arcade (galaxian.asm) | Verdict |
|---|---|---|---|
| **Architecture** | Single inline HTML/JS (~1430 lines), procedural with constructor "classes" | NMI-driven state machine, script-based with jump tables (`SCRIPT_NUMBER`/`SCRIPT_STAGE`) | Keep: architecture is fine for JS. Rewrite: add formal state machine |
| **Game Loop** | `setInterval(draw, 10)` (~100Hz nominal), `GlobalClock` counter for sub-tick timing | NMI at 60Hz, single-pass update + render per frame | Keep: decoupled sim/render pattern can remain. Fix: lock sim to fixed timestep |
| **Object Model** | `linkedList` (doubly-linked list) for aliens/stars/bullets, singletons for ship/score/lives | `INFLIGHT_ALIENS` fixed pool (8 × 32 bytes), `ALIEN_SWARM_FLAGS` bitmap at `$4100`, OBJ RAM buffer | Rewrite: fixed-size pools > linked list for game entities |
| **Alien Formation** | 5×11 grid via `map[][]` array, rendered from `oAliens` linked list | 10-col × 6-row packed bitmap, unpacked per frame, with row/column scanning | Keep: 2D grid concept is fine. Rewrite: match 10×6, add row/col scanning for attack selection |
| **Alien Types** | 4 types (color codes 1-4), no flagship/escort distinction | 4 types: Flagship (yellow), Red, Purple, Blue. Flagship + 2 escorts attack as a unit | Rewrite: flagship/escort grouping is core to Galaxian gameplay |
| **Animation** | 3-frame mode cycle (`mode 1/2/3`), 1 color per type, pixel-drawn | Frame-perfect per alien type, multiple colors per sprite, hardware palette | Keep: pixel art approach can stay. Rewrite: match frame timing and sprite appearance |
| **Attack Scheduling** | `setTimeout` with `Math.random()*8000+2000` ms, picks random survivors, 1-4 attackers | Hierarchical counters: `DIFFICULTY_BASE_VALUE` + `DIFFICULTY_EXTRA_VALUE` drive 16 secondary attack timers, flank alternation | Rewrite: entirely different system — random timer vs. deterministic difficulty-driven counter system |
| **Attack Trajectory** | Cubic Bezier curves (3 control points, 200-step divider), computed per-attack | Precomputed `INFLIGHT_ALIEN_ARC_TABLE` (103 bytes of signed ∆X/∆Y pairs), plus loop-the-loop mode | Keep: Bezier is more flexible but needs tuning. Rewrite: add arc table lookup option for precision |
| **Inflight Alien Lifecycle** | None — single Bezier curve then return; no stage machine | 14 `StageOfLife` values (0-13): fly_in_arc, near_bottom, reached_bottom, full_speed_charge, loop_the_loop, complete_loop, return_to_swarm, dying_etc | Rewrite: the entire lifecycle state machine is missing |
| **Dive/Loop Mechanics** | Not present | Loop-the-loop state (`StageOfLife=9`) with arc table continuation | Rewrite: missing mechanic |
| **Collision** | AABB in `bullet.detect()` (player bullet→alien) and `attacker.setAttackingPos()` (alien→ship) | AABB + per-pixel or precise bounding checks | Keep: AABB is adequate. Refine: add proper explosion/dying states instead of instant delete |
| **Player Movement** | 1px per frame, arrow keys, boundary clamping | 1px per frame, joystick, boundary + cockpit flip support | Keep: functionally similar |
| **Player Shooting** | Single shot, `aFlags.bBullet` flag, 5.5px/frame upward | Single shot, `HAS_PLAYER_BULLET_BEEN_FIRED` flag, fixed speed | Keep: nearly identical |
| **Enemy Bullets** | Aliens shoot via `bullet` with `direction=1`, random color, 5.5px/frame downward | 14-slot `ENEMY_BULLETS` pool, diagonal aim at player position, `INFLIGHT_ALIEN_SHOOT_RANGE_MUL` trigger | Keep: concept works. Rewrite: add diagonal aiming, proper trigger timing |
| **Stars / Constellation** | 50 stars, random colors, scrolling downward, color-cycling every ~11 frames | Constellation lines + twinkling stars, script-controlled in attract mode | Rewrite: constellation lines are iconic Galaxian feature, currently absent |
| **Sprites / Rendering** | Procedural pixel art via `ctx.fillRect`, 2x canvas scale, ~20 inline drawing functions | Hardware OBJ RAM tiles, palette-based, 256×224 resolution | Keep: pixel drawing approach is fine for JS. Improve: add sprite sheet rendering option |
| **Score Display** | 6-digit pixel-drawn "1UP" and "HI", procedural letter drawing | 6-digit BCD, score command queue, tile-based display | Keep: functionally equivalent |
| **Score Values** | 30/40/50/60 per type, ×2 if attacking, caps at 300 | Flagship: 300/cycle, Red: 200/150, Purple: 100, Blue: 80; flagships score cycles on death | Rewrite: different scoring table |
| **Extra Life** | Every 5000 points | DIP-switch configurable (7000/10000/15000/20000) | Keep: concept, make configurable |
| **Difficulty Progression** | None — same attack speed forever | `DIFFICULTY_BASE_VALUE` (0-7, per level) + `DIFFICULTY_EXTRA_VALUE` (0-7, per-wave) → attack frequency increases | Rewrite: entire system absent |
| **Levels** | Simple counter displayed as red bars, resets on new game | `PLAYER_LEVEL` tracked per-player, feeds difficulty, no visual level display | Partial: keep visual counter, add difficulty integration |
| **Lives** | 3 default, pixel-drawn ship icons, max 4 displayed | 3 default (DIP), Galaxip icon, per-player tracking | Keep: functionally equivalent |
| **Sound** | None | 3-channel Namco WSG + noise, complex melody + flag-triggered SFX, `COMPLEX_SOUND_POINTER` note tables | Rewrite: entire system missing |
| **Attract Mode** | None | Script-driven: scrolling text "WE ARE THE GALAXIANS", convoy charger scrolling, demo gameplay with `ATTRACT_MODE_FAKE_CONTROLLER` | Rewrite: entire system missing |
| **Cocktail Mode** | Not supported | Screen flip, per-player state save/restore | Future: not needed initially |
| **Two-Player** | Not supported | Per-player score/swarm/difficulty state at `$4180-$41B7` | Future: not needed initially |
| **Input** | Keyboard (arrows + space), no fire button held detection | Joystick + fire button, `$4013` input read, attract mode fake controller | Keep: keyboard is fine for browser game. Add: held-fire detection |
| **Sound Assets** | N/A | 7 MP3s in `project/snd/` (Credit, Start, Shoot, Fighter Loss, Extra Life, Flying, Hit Enemy) | Use: reference MP3s map directly to game events |

---

## Code Salvageability

### Keep As-Is (~15%)
- Input handler (`press`/`release`) — minimal change needed
- `points.draw()` and `lives.draw()` — pixel-perfect rendering works
- `level.draw()` — acceptable visual for level indicator
- Canvas setup, scaling, clear pattern

### Keep With Moderate Changes (~25%)
- `myship` class — movement, shooting, hit/recover/reset logic
- `bullet` class — basic movement and AABB collision (needs bound checks improved)
- `draw()` main loop structure — alien/ship/bullet iteration pattern
- `gamesLogic` — prepare/reset/nextLevel structure (replace attack internals)

### Rewrite (~60%)
- **Attack scheduling** → counter-driven hierarchical system
- **Inflight alien lifecycle** → 14-stage state machine with arc table
- **Alien formation** → 10×6 bitmap with row/column scanning
- **Trajectory system** → precomputed arc table + loop-the-loop
- **Difficulty progression** → base/extra value system
- **Scoring** → original Galaxian values + flagship cycle
- **Stars** → constellation lines + twinkle
- **Sound** → Web Audio API with reference MP3s
- **Attract mode** → full script sequence
- **Rendering** → add sprite sheet render path option
- **Animation** → match original frame timing and colors
- **Collision** → add proper explosion/death states

---

## Subsystem Criticality for Faithful Recreation

| Priority | Subsystem | Why |
|---|---|---|
| **P0 — Must match exactly** | Attack scheduling/counters | Defines the game's rhythm and difficulty |
| **P0 — Must match exactly** | Inflight alien lifecycle (StageOfLife) | Controls all alien behavior during attack |
| **P0 — Must match exactly** | Trajectory system (arc table) | Defines the iconic dive/loop patterns |
| **P0 — Must match exactly** | Alien formation (10×6) | Core visual and gameplay structure |
| **P1 — Should match closely** | Flagship/escort grouping | Iconic multi-entity attack waves |
| **P1 — Should match closely** | Difficulty progression | Ensures game scales authentically |
| **P1 — Should match closely** | Scoring tables | Affects player strategy and pacing |
| **P1 — Should match closely** | Sound triggers and timing | Major immersion factor |
| **P2 — Nice to match** | Animations/colors | Visual, not mechanical |
| **P2 — Nice to match** | Attract mode sequence | Authenticity, not core gameplay |
| **P2 — Nice to match** | Constellation/starfield | Visual atmosphere |
| **P3 — Can differ** | Exact sprite pixel art | Procedural drawings acceptable |
| **P3 — Can differ** | Cocktail/two-player | Not needed for initial implementation |

---

## Starting Point Recommendation

**Start from the `draw()` function structure (`lines 1240-1327`) and the entity model (`myship`, `bullet`, `attacker` patterns), but clear all attack/inflight logic and rebuild from the arc table and counter system documented in `galaxian.asm`.**

The `galaxian_basic` codebase gives you:
- ✅ Working Canvas pipeline (setup, clear, scale, draw iteration)
- ✅ Input handling (keyboard → direction flag mapping)
- ✅ Entity base pattern (constructor + `setPos`/`draw` methods)
- ✅ Score/lives/level display rendering

You must provide:
- ❌ NMI-driven fixed-timestep game loop → implement `requestAnimationFrame` + fixed accumulator
- ❌ Attack counter hierarchy → port the 16-secondary-counter system
- ❌ Inflight alien struct and state machine → 32-byte struct → JS class with `stageOfLife`
- ❌ Arc trajectory tables → encode `$1E00` table as JS array
- ❌ Formation bitmap → `Uint8Array(128)` with pack/unpack or 2D boolean array
- ❌ Sound engine → Web Audio API with reference MP3 assets
- ❌ Attract mode → script sequence with fake controller
