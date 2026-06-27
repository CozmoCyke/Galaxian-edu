# Flagship & Escort Attack System (Phase 4)

## Memory Map

| Address | Label | Default | Purpose |
| ------- | ----- | ------- | ------- |
| $4196 | `PLAYER_ONE_FLAGSHIP_SURVIVOR_COUNT` | 0 | Flagships surviving P1's previous level |
| $41B6 | `PLAYER_TWO_FLAGSHIP_SURVIVOR_COUNT` | 0 | Flagships surviving P2's previous level |
| $421C | `PLAYER_LEVEL` | 0 | Current level (0-indexed) |
| $421E | `FLAGSHIP_SURVIVOR_COUNT` | 0 | Shared survivor count for current player |
| $4221 | `HAVE_NO_BLUE_OR_PURPLE_ALIENS` | 0 | Set when all blue/purple gone or inflight |
| $4224 | `HAVE_AGGRESSIVE_ALIENS` | 0 | Inflight aliens don't return (Phase 5) |
| $4226 | `HAVE_NO_INFLIGHT_ALIENS` | 0 | No aliens currently in flight |
| $4228 | `CAN_ALIEN_ATTACK` | 0 | Ordinary alien attack flag (Phase 3) |
| **$4229** | `CAN_FLAGSHIP_OR_RED_ALIENS_ATTACK` | 0 | Flagship/red attack flag |
| **$422A** | `FLAGSHIP_ESCORT_COUNT` | 0 | Number of red escorts (0-2) |
| **$422B** | `IS_FLAGSHIP_HIT` | 0 | 1 when player shot an inflight flagship |
| **$422C** | `ALIENS_IN_SHOCK_COUNTER` | $F0=240 | Shock duration counter |
| **$422D** | `FLAGSHIP_SCORE_FACTOR` | 0 | Determines points when flagship killed |
| **$422E** | `ENABLE_FLAGSHIP_ATTACK_SECONDARY_COUNTER` | 0 | 1 allows secondary counter to decrement |
| **$422F** | `FLAGSHIP_ATTACK_SECONDARY_COUNTER` | varies | Counts down; at zero sets CAN_FLAGSHIP_ATTACK |
| $4245 | `FLAGSHIP_ATTACK_MASTER_COUNTER_1` | $40=64 | Master timer 1 |
| $4246 | `FLAGSHIP_ATTACK_MASTER_COUNTER_2` | $06=6 | Master timer 2 |

## Slot Layout

| Slot | Usage | INFLIGHT_ALIENS address |
| ---- | ----- | ----------------------- |
| 0 | (auxiliary/explosion) | $42B0 |
| **1** | **Flagship** | **$42D0** |
| **2** | **Escort 1** | **$42F0** |
| **3** | **Escort 2** | **$4310** |
| 4-7 | Ordinary aliens | $4330-$4390 |

## Per-Frame Cadence (main game loop at $0661)

```
0682: HANDLE_FLAGSHIP_ATTACK       ← flagship launch (if CAN_FLAGSHIP_ATTACK)
0685: HANDLE_SINGLE_ALIEN_ATTACK   ← ordinary launch (if CAN_ALIEN_ATTACK) [Phase 3]
0688: SET_ALIEN_ATTACK_FLANK       ← set $4215 from scroll + RNG
068B: HANDLE_LEVEL_DIFFICULTY      ← increment EXTRA if timers expire
0697: CHECK_IF_ALIEN_CAN_ATTACK    ← ordinary master/secondary counters [Phase 3]
069A: UPDATE_ATTACK_COUNTERS       ← flagship master counters, set secondary
069D: CHECK_IF_FLAGSHIP_CAN_ATTACK ← flagship secondary counter → CAN_FLAGSHIP_ATTACK
06AC: HANDLE_SHOCKED_SWARM         ← decrement shock counter, clear IS_FLAGSHIP_HIT
```

IMPORTANT: Flagship launch happens BEFORE ordinary launch each frame.

## UPDATE_ATTACK_COUNTERS ($1555)

### Guard conditions (must all pass):
1. `HAS_PLAYER_SPAWNED` ($4200) — player exists
2. `HAVE_ALIENS_IN_TOP_ROW` ($41EF) — flagships exist in swarm
3. `IS_FLAGSHIP_HIT` ($422B) == 0 — not in shock
4. `IS_GAME_IN_PLAY` ($4006) — game actively playing

### Master counter 1 ($4245):
- Decremented every frame.
- When zero: reload to $3C (60 = ~1 second).
- Continue to master counter 2.

### Fast path (no blue/purple aliens — $4221):
If `HAVE_NO_BLUE_OR_PURPLE_ALIENS`, skip master counter 2 entirely.
Jump to $15A3 which sets:
- A = 2
- secondary counter = $02 << 2 = $08
- ordinary master = $08 << 1 = $10
- enables secondary counter
Result: faster flagship attacks (fewer aliens remaining).

### Master counter 2 ($4246):
- Decremented every frame (only after master 1 hits zero).
- When zero: set to 1 (will hit zero next frame).

### Compute delay before secondary counter:
```
extraFlagships = ($4177 + $4178) & 3    // count 'extra' flagship slots occupied
difficulty = BASE + EXTRA
if difficulty == 0: return (no attack)
delay = ((difficulty / 4) & 3) ^ 0xFF  // complement
delay = delay + $0A - extraFlagships   // ensure $06-$09 range
```
This value becomes:
- `FLAGSHIP_ATTACK_MASTER_COUNTER_2` = delay
- `FLAGSHIP_ATTACK_SECONDARY_COUNTER` = delay << 2
- `ALIEN_ATTACK_MASTER_COUNTER` (ordinary) = delay << 3
- `ENABLE_FLAGSHIP_ATTACK_SECONDARY_COUNTER` = 1

### Game not in play path ($15A7):
When `IS_GAME_IN_PLAY` is false:
- Master 1 decrements, reloads $3C
- Master 2 decrements, reloads $05
- Secondary counter = $5A (90)
- Ordinary master = $2D (45)
- Enables secondary counter

## CHECK_IF_FLAGSHIP_CAN_ATTACK ($15C3)

### Guard conditions:
1. `ENABLE_FLAGSHIP_ATTACK_SECONDARY_COUNTER` ($422E) == 1
2. `FLAGSHIP_ATTACK_SECONDARY_COUNTER` ($422F) decrements; when zero:
3. Reset `ENABLE_FLAGSHIP_ATTACK_SECONDARY_COUNTER` to 0
4. `HAS_PLAYER_SPAWNED` ($4200)
5. `HAVE_ALIENS_IN_TOP_ROW` ($41EF) — flagships exist

### On success:
- Set `CAN_FLAGSHIP_OR_RED_ALIENS_ATTACK` ($4229) = 1

## HANDLE_FLAGSHIP_ATTACK ($140C)

### Guard conditions:
1. `HAVE_NO_ALIENS_IN_SWARM` ($4220) == 0
2. `HAS_PLAYER_SPAWNED` ($4200) == 1
3. `CAN_FLAGSHIP_OR_RED_ALIENS_ATTACK` ($4229) == 1
4. Flagship slot ($42D0) is free (not active, not dying)

### Flank selection:
Reads `ALIENS_ATTACK_FROM_RIGHT_FLANK` ($4215), set earlier by `SET_ALIEN_ATTACK_FLANK` ($13E1).

### Flagship scanning (left flank — $142E):
- Start at $4179 (leftmost flagship), scan 4 slots
- `bit 0,(hl)` test — first match found
- Scan decrements L (moves rightward)

### Flagship scanning (right flank — $14BE):
- Start at $4176 (rightmost flagship), scan 4 slots
- `bit 0,(hl)` test — first match found
- Scan increments L (moves leftward)

### Red alien fallback (no flagship available):
If no flagship found:
- Left flank: start at $416A, scan 4 red slots left-to-right
- Right flank: start at $4165, scan 4 red slots right-to-left
- First match calls `TRY_INIT_INFLIGHT_ALIEN` ($1446)
- Uses the **last inflight slot** ($4390, slot 7) — NOT the flagship slot
- Same initialization pattern as ordinary aliens

### INIT_FLAGSHIP_ATTACK (flagship found — $1472/$14D7):
1. `INIT_INFLIGHT_ALIEN` ($145C) removes flagship from swarm flags
2. Flagship goes to **slot 1** ($42D0 — IX = $42D0)
3. `ArcClockwise` from `ALIENS_ATTACK_FROM_RIGHT_FLANK` ($4215)
4. Sets `INFLIGHT_ALIEN.IndexInSwarm` = HL (swarm position)

### Escort scanning (left flank — $1479):
- After flagship initialized: HL adjusted by `sub $0F` (jumps to red row area)
- Scan 3 entries, max 2 escorts (C=$02)
- For each red alien present: `TRY_INIT_ESCORT_INFLIGHT_ALIEN` ($149B)
- Escorts go to slots 2 and 3 (IY = $42F0, $4310)
- Shares flagship's `ArcClockwise`
- Aligns `IndexInSwarm` to own position
- Decrements C each successful escort

### Escort scanning (right flank — $14DE):
- HL adjusted by `sub $11` (different offset for right flank)
- Otherwise same logic as left flank

### TRY_INIT_ESCORT_INFLIGHT_ALIEN ($149B):
- Checks IY slot IsActive and IsDying are clear
- Clears swarm flag at HL
- Sets IY slot active, StageOfLife=0
- Copies flagship's ArcClockwise
- Records IndexInSwarm
- Queues DELETE_ALIEN_COMMAND

## FLAGSHIP_ESCORT_COUNT calculation ($0D58):

After launch (in finalise routine), counts escorts:
```
A = 0
if escort1_active: A++
if escort2_active: A++
FLAGSHIP_ESCORT_COUNT = A
```

## Scoring ($127C)

### When flagship is shot:
```
1. IS_FLAGSHIP_HIT = 1
2. ALIENS_IN_SHOCK_COUNTER = $F0 (240 frames)
3. A = FLAGSHIP_ESCORT_COUNT
4. if A == 2: call ASSERT_BOTH_FLAGSHIP_ESCORTS_ARE_ALIVE
5. FLAGSHIP_SCORE_FACTOR = A
6. Score = A + E (where E is the base score value)
```

### ASSERT_BOTH_FLAGSHIP_ESCORTS_ARE_ALIVE ($1292):
If both escorts are alive: return with A unchanged.
If either/both dead: A++ (increases score factor).
Meaning: full points require killing escorts first, then flagship.

### FLAGSHIP_SCORE_FACTOR values:
- 0 = lowest score
- 1
- 2  
- 3 = full (800) points

The score display routine at $1131:
```
a = FLAGSHIP_SCORE_FACTOR + $20
INFLIGHT_ALIEN.DyingAnimFrameCode = a
```
This encodes the points to display.

## Shock State ($127C + $1688)

### Trigger:
When an inflight flagship is shot by the player.

### Initialization ($127C):
- `IS_FLAGSHIP_HIT` = 1 ($422B)
- `ALIENS_IN_SHOCK_COUNTER` = $F0 (240 frames) ($422C)
- `FLAGSHIP_SCORE_FACTOR` = calculated value ($422D)

### Per-frame handling ($1688 — HANDLE_SHOCKED_SWARM):
```
if IS_FLAGSHIP_HIT == 0: return
if HAVE_AGGRESSIVE_ALIENS: skip to decrement
if HAVE_NO_BLUE_OR_PURPLE_ALIENS: skip to decrement
if HAVE_NO_INFLIGHT_ALIENS == 0: return (aliens still fighting)
decrement ALIENS_IN_SHOCK_COUNTER
if counter == 0: clear IS_FLAGSHIP_HIT
```

The shock counter only decrements when NO inflight aliens remain.
This means: shock freeze lasts until the escort(s) return/die.
If escorts are fighting, the shock timer does NOT tick.

### Guards during shock:
- `CHECK_IF_ALIEN_CAN_ATTACK` ($1515) checks `IS_FLAGSHIP_HIT` — returns early
- `UPDATE_ATTACK_COUNTERS` ($1555) checks `IS_FLAGSHIP_HIT` — returns early
- Net effect: NO new attacks (ordinary or flagship) while in shock

### Existing flights continue:
- `HANDLE_INFLIGHT_ALIENS` ($0CC3) — continues processing active aliens
- Already inflight aliens finish their arcs, return, get destroyed normally

## Key Differences from Ordinary Scheduler

| Aspect | Ordinary (Phase 3) | Flagship (Phase 4) |
| ------ | ------------------ | ------------------ |
| Slot | 4-7 (scanned from last) | 1 (fixed) + 2-3 (escorts) |
| Counter system | 1 master + 15 secondary | 2 masters + 1 enable + 1 secondary |
| Tick timing | Every frame (in CHECK_IF_ALIEN_CAN_ATTACK) | Masters in UPDATE_ATTACK_COUNTERS, secondary in CHECK_IF_FLAGSHIP_CAN_ATTACK |
| Alien selection | Column flags → row scan | Direct flagship row scan → red fallback |
| Escorts | None | 0-2 red aliens |
| Fallback | N/A | Red alien if no flagship |
| Shock | N/A | Triggers on flagship kill |
| Score | Fixed per alien type | Contextual (escort count) |

## Phase 4 Exclusions

- Enemy bullets (Phase 5)
- Aggressive aliens / no-return mode (Phase 5)
- Advanced sound (Phase 5)
- Player-targeting (Phase 5)
- Two-player mode (Phase 5)
- Attract mode / demo (Phase 5)
