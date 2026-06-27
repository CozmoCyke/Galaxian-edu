# ASM Mapping — galaxian.engine ↔ galaxian.asm

This document maps each concept from the original Galaxian Z80 disassembly
(`project/galaxian.asm`) to its equivalent JavaScript implementation in
`galaxian_engine`.

## Formation & Swarm

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| `ALIEN_SWARM_FLAGS` | `$4100–$417F` (128 bytes) | `SwarmLayout._grid` (6×10 slot array + `Alien` objects) | ✅ Implemented |
| Swarm row flags (presence per row) | `HAVE_ALIENS_IN_6TH_ROW` etc. `$41EA–$41EF` | `SwarmLayout.getAliveInRow(row).length > 0` | ✅ Implicit |
| Swarm column flags | `ALIEN_IN_COLUMN_FLAGS` `$41F0–$41FF` | `SwarmLayout.getAliveInCol(col).length > 0` | ✅ Implicit |
| `SWARM_DIRECTION` | `$420D` (0=left, 1=right) | `Swarm.direction` (-1=left, 1=right) | ✅ Implemented |
| `SWARM_SCROLL_VALUE` | `$420E` (16-bit scroll offset) | `Swarm.offsetX` | ✅ Implemented |
| `SWARM_SCROLL_MAX_EXTENTS` | `$4210` | `CONFIG.SWARM.LIMIT_LEFT` / `LIMIT_RIGHT` | ✅ Implemented |
| `HAVE_NO_ALIENS_IN_SWARM` | `$4220` | `Swarm.aliveCount === 0` | ✅ Implicit |
| `HAVE_NO_BLUE_OR_PURPLE_ALIENS` | `$4221` | `getAliveInRow(0).length + getAliveInRow(1).length + getAliveInRow(2).length + getAliveInRow(3).length === 0` | 🔲 Future |
| `LEVEL_COMPLETE` | `$4222` | `aliveCount === 0` → level transition | ✅ Implemented |

## Inflight Aliens

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| `INFLIGHT_ALIENS` pool | `$42B0–$43AF` (8×32 bytes) | `inflightAliens[]` (planned `InflightAlienPool`) | 🔲 Future |
| `StageOfLife` (0–13) | field in struct | `InflightAlien.stage` (enum) | 🔲 Future |
| Slot 0 = flagship | reserved | `InflightAlien.isFlagship` | 🔲 Future |
| Slots 1–2 = escorts | reserved | `InflightAlien.isEscort` | 🔲 Future |
| Slots 3–7 = singles | reserved | standard `InflightAlien` | 🔲 Future |
| `INFLIGHT_ALIEN_ARC_TABLE` | `$1E00` (103 bytes) | `arcTable[]` (∆X, ∆Y pairs) | 🔲 Future |

## Alien Attack System

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| Master attack counter | `$424A` | `AlienAttackCounters.master` | ✅ Implemented |
| Secondary attack counters | `$424B–$425A` | `AlienAttackCounters.counters[1..15]` | ✅ Implemented |
| `ALIENS_ATTACK_FROM_RIGHT_FLANK` | `$4215` | `OrdinaryAttackScheduler._side` | ✅ Implemented |
| `CAN_ALIEN_ATTACK` | `$4228` | `AlienAttackCounters._canAttack` | ✅ Implemented |

## Flagship Attack Scheduler (Phase 4)

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| `UPDATE_ATTACK_COUNTERS` | `$1555` | `FlagshipAttackCounters.updateAttackCounters()` | ✅ Implemented |
| `CHECK_IF_FLAGSHIP_CAN_ATTACK` | `$15C3` | `FlagshipAttackCounters.checkCanAttack()` | ✅ Implemented |
| `HANDLE_FLAGSHIP_ATTACK` | `$140C` | `FlagshipAttackScheduler.update()` | ✅ Implemented |
| `HANDLE_SHOCKED_SWARM` | `$1688` | `ShockController.update()` | ✅ Implemented |
| Flagship scoring routine | `$127C` | `FlagshipScoreCalculator.calculate()` | ✅ Implemented |
| Escort counting | `$0D58` | `EscortSelector.selectEscorts()` | ✅ Implemented |
| `FLAGSHIP_ATTACK_MASTER_COUNTER_1` | `$4245` (default $40=64) | `FlagshipAttackCounters.master1` | ✅ Implemented |
| `FLAGSHIP_ATTACK_MASTER_COUNTER_2` | `$4246` (default $06=6) | `FlagshipAttackCounters.master2` | ✅ Implemented |
| `ENABLE_FLAGSHIP_ATTACK_SECONDARY_COUNTER` | `$422E` | `FlagshipAttackCounters.secondaryEnabled` | ✅ Implemented |
| `FLAGSHIP_ATTACK_SECONDARY_COUNTER` | `$422F` | `FlagshipAttackCounters.secondary` | ✅ Implemented |
| `CAN_FLAGSHIP_OR_RED_ALIENS_ATTACK` | `$4229` | `FlagshipAttackCounters.canAttack` | ✅ Implemented |
| `FLAGSHIP_ESCORT_COUNT` | `$422A` (0–2) | `FlagshipAttackGroup.livingEscortCount` | ✅ Implemented |
| `IS_FLAGSHIP_HIT` | `$422B` | `ShockController.isActive` | ✅ Implemented |
| `ALIENS_IN_SHOCK_COUNTER` | `$422C` (default $F0=240) | `ShockController.counter` | ✅ Implemented |
| `FLAGSHIP_SCORE_FACTOR` | `$422D` | `FlagshipScoreCalculator.calculate().factor` | ✅ Implemented |
| Red fallback path (left) | `$416A` (scan 4 slots rightward) | `FlagshipSelector.selectRedFallback(swarm, 'left')` | ✅ Implemented |
| Red fallback path (right) | `$4165` (scan 4 slots leftward) | `FlagshipSelector.selectRedFallback(swarm, 'right')` | ✅ Implemented |
| Flagship scan (left flank) | `$4179` (scan 4 slots rightward) | `FlagshipSelector.selectFlagship(swarm, 'left')` | ✅ Implemented |
| Flagship scan (right flank) | `$4176` (scan 4 slots leftward) | `FlagshipSelector.selectFlagship(swarm, 'right')` | ✅ Implemented |
| Escort scan offset (left) | sub $0F from flagship position | `EscortSelector.selectEscorts()` proximity sort | ✅ Implemented |
| Escort scan offset (right) | sub $11 from flagship position | `EscortSelector.selectEscorts()` proximity sort | ✅ Implemented |
| No-blue-or-purple fast path | `$15A3` (A=2, secondary=$08) | `FlagshipAttackCounters.setNoBlueOrPurple(true)` | ✅ Implemented |
| Game-not-in-play path | `$15A7` | `updateAttackCounters({ isGameInPlay: false })` | ✅ Implemented |

## Difficulty System

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| `DIFFICULTY_COUNTER_1` | `$4218` | `difficulty.counter1` | 🔲 Future |
| `DIFFICULTY_COUNTER_2` | `$4219` | `difficulty.counter2` | 🔲 Future |
| `DIFFICULTY_EXTRA_VALUE` | `$421A` (0–7) | `difficulty.extraValue` | 🔲 Future |
| `DIFFICULTY_BASE_VALUE` | `$421B` (0–7) | `difficulty.baseValue` | 🔲 Future |
| `PLAYER_LEVEL` | `$421C` (starts at 0) | `Game.level` (starts at 1) | ✅ Partial |

## Player

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| `HAS_PLAYER_SPAWNED` | `$4200` | `Player.alive` | ✅ Implicit |
| `IS_PLAYER_DYING` | `$4201` | `PlayerDyingState` | ✅ Implemented |
| `PLAYER_Y` | `$4202` | `Player.y` (constant for now) | ✅ Partial |
| `IS_PLAYER_HIT` | `$4204` | `Player.hit()` → dying state | ✅ Implemented |
| `PLAYER_EXPLOSION_COUNTER` | `$4205` | `PlayerDyingState._timer` | ✅ Implemented |
| `HAS_PLAYER_BULLET_BEEN_FIRED` | `$4208` | `PlayerBullet.active` | ✅ Implemented |
| `PLAYER_BULLET_X` / `Y` | `$4209–$420A` | `PlayerBullet.x` / `y` | ✅ Implemented |
| `IS_PLAYER_BULLET_DONE` | `$420B` | `PlayerBullet.active === false` | ✅ Implicit |

## Sound

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| `PLAY_PLAYER_SHOOT_SOUND` | `$41CC` | `AudioManager.play('shoot')` | 🔲 Future |
| `IS_COMPLEX_SOUND_PLAYING` | `$41CD` | `AudioManager.isPlaying` | 🔲 Future |
| `PLAY_GAME_START_MELODY` | `$41D1` | `AudioManager.playMelody()` | 🔲 Future |
| `ALIEN_DEATH_SOUND` | `$41DF` | `AudioManager.play('explosion')` | 🔲 Future |
| `RESET_SWARM_SOUND_TEMPO` | `$41D0` | `AudioManager.resetTempo()` | 🔲 Future |
| Sound registers | `$6800–$6807` | Web Audio API oscillator nodes | 🔲 Future |

## Scoring

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| `PLAYER_ONE_SCORE` | `$40A2–$40A4` (3 BCD bytes) | `Game.score` (integer) | ✅ Implemented |
| `HI_SCORE` | `$40A8–$40AA` (3 BCD bytes) | `Game.highScore` (integer) | ✅ Implemented |
| `BONUS_GALIXIP` | `$40AC` (extra life threshold) | `CONFIG.SCORE.EXTRA_LIFE_INTERVAL` | ✅ Partially |
| `FLAGSHIP_SCORE_FACTOR` | `$422D` | `CONFIG.ALIEN_TYPES.FLAGSHIP.score` | ✅ Marked provisional |

## Attract Mode

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| `ATTRACT_MODE_FAKE_CONTROLLER` | `$423F` | `FakeController` class | 🔲 Future |
| `ATTRACT_MODE_SCROLL_ID` | `$4241` | Scrolling text system | 🔲 Future |
| Script ONE stages | `SCRIPT_ONE` | `AttractState` with sub-states | 🔲 Future |

## Game State / Script System

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| `SCRIPT_NUMBER` | `$4005` (0–4) | `StateMachine.currentName` | ✅ Mapped |
| `SCRIPT_STAGE` | `$400A` | State-specific stage/timer | ✅ Partial |
| Script 0 = Clear/Init | N/A | `BootState` | ✅ Implemented |
| Script 1 = Attract/Demo | N/A | `AttractState` | 🔲 Future |
| Script 2 = Credit/Wait | N/A | implicit `BootState` → `PlayState` transition | ✅ Partial |
| Script 3 = Gameplay P1 | N/A | `PlayState` | ✅ Implemented |
| Script 4 = Gameplay P2 | N/A | (two-player stub) | 🔲 Future |

## Ordinary Attack Scheduler (Phase 3)

| ASM Concept | Address/Symbol | JS Equivalent | Status |
|---|---|---|---|
| `CHECK_IF_ALIEN_CAN_ATTACK` | `$1515` | `AlienAttackCounters.tick()` | ✅ Implemented |
| `ALIEN_ATTACK_MASTER_COUNTER` | `$424A` | `AlienAttackCounters.counters[0]` | ✅ Implemented |
| `ALIEN_ATTACK_SECONDARY_COUNTERS` | `$424B–$4259` (15 bytes) | `AlienAttackCounters.counters[1..15]` | ✅ Implemented |
| Counter default values | `$15E3` (16-byte table) | `DEFAULT_VALUES` array | ✅ Implemented |
| `HANDLE_SINGLE_ALIEN_ATTACK` | `$1344` | `OrdinaryAttackScheduler.update()` | ✅ Implemented |
| `SET_ALIEN_ATTACK_FLANK` | `$13E1` | `_toggleFlank()` | ✅ Partial (alternation vs position-based) |
| `ALIENS_ATTACK_FROM_RIGHT_FLANK` | `$4215` | `OrdinaryAttackScheduler._side` | ✅ Implemented |
| `GENERATE_RANDOM_NUMBER` | `$003C` | `GalaxianRng.nextByte()` | ✅ Implemented |
| `RAND_NUMBER` state | `$401E` | `GalaxianRng._state` | ✅ Implemented |
| `HANDLE_LEVEL_DIFFICULTY` | `$14F3` | `setBaseDifficulty()` / `setExtraDifficulty()` | ✅ Implemented |
| `DIFFICULTY_EXTRA_VALUE` | `$421A` | `OrdinaryAttackScheduler._extraDifficulty` | ✅ Implemented |
| `DIFFICULTY_BASE_VALUE` | `$421B` | `OrdinaryAttackScheduler._baseDifficulty` | ✅ Implemented |
| Max inflight formula | `$1352–$135E` | `_computeMaxInflight()` | ✅ Implemented |
| Column scan (left flank) | `$137B–$1389` | `OrdinaryAlienSelector` | ✅ Implemented |
| Column scan (right flank) | `$13AB–$13BA` | Same | ✅ Implemented |
| Row scan (has flagships) | `$138F–$1394` | `_findAlienInColumn()` | ✅ Implemented |
| Row scan (no flagships) | `$13BD–$13C2` | Same | ✅ Implemented |
| `CAN_ALIEN_ATTACK` flag | `$4228` | `AlienAttackCounters._canAttack` | ✅ Implemented |
| `HAVE_ALIENS_IN_TOP_ROW` | `$41EF` | `OrdinaryAlienSelector.hasFlagships()` | ✅ Implemented |
| `ALIEN_IN_COLUMN_FLAGS` | `$41F0–$41FF` | `buildColumnFlags()` | ✅ Implemented |
| `HAVE_ALIENS_IN_ROW_FLAGS` | `$41E8–$41ED` | `buildRowFlags()` | ✅ Implicit |

---

## Legend

| Status | Meaning |
|---|---|
| ✅ Implemented | Feature exists and is functionally equivalent |
| ✅ Partial | Feature exists but needs tuning to match ASM exactly |
| ✅ Implicit | Feature is computed/derived, not explicitly stored |
| 🔲 Future | Not yet implemented; planned for later phases |
