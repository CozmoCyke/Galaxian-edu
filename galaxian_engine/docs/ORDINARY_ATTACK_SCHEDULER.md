# Ordinary Attack Scheduler

## Concept

The Galaxian original uses a bank of 16 attack counters (1 master + 15 secondary)
to schedule ordinary alien attacks. When a secondary counter reaches zero, one
ordinary alien breaks off from the swarm and executes the dive-attack-return
lifecycle. The engine manages up to 4 ordinary inflight aliens simultaneously.

## Memory Map

| Address | Label | Size | Description |
| ------- | ----- | ---: | ----------- |
| `$41E8` | `HAVE_ALIENS_IN_ROW_FLAGS` | 6 | Row occupancy: 0=bottom blue → 5=flagship |
| `$41F0` | `ALIEN_IN_COLUMN_FLAGS` | 16 | Column occupancy ($41F3=rightmost, $41FC=leftmost) |
| `$4215` | `ALIENS_ATTACK_FROM_RIGHT_FLANK` | 1 | 0=left flank, 1=right flank |
| `$4218` | `DIFFICULTY_COUNTER_1` | 1 | Decrements every frame, resets to $3C (60) |
| `$4219` | `DIFFICULTY_COUNTER_2` | 1 | Decrements when counter_1=0, resets to $14 (20) |
| `$421A` | `DIFFICULTY_EXTRA_VALUE` | 1 | Ranges 0-7, increments during level play |
| `$421B` | `DIFFICULTY_BASE_VALUE` | 1 | Ranges 0-7, increments on level completion, starts at 2 |
| `$4220` | `HAVE_NO_ALIENS_IN_SWARM` | 1 | 1=swarm empty |
| `$4221` | `HAVE_NO_BLUE_OR_PURPLE_ALIENS` | 1 | 1=no blue/purple rows remain |
| `$4224` | `HAVE_AGGRESSIVE_ALIENS` | 1 | 1=≤3 aliens remain in swarm |
| `$4225` | `HAVE_NO_INFLIGHT_OR_DYING_ALIENS` | 1 | 1=no inflight/dying aliens |
| `$4228` | `CAN_ALIEN_ATTACK` | 1 | 1=secondary counter hit zero, launch ordinary alien |
| `$422B` | `IS_FLAGSHIP_HIT` | 1 | 1=player shot a flagship in flight |
| `$422C` | `ALIENS_IN_SHOCK_COUNTER` | 1 | Decrements during shock; at 0 clears IS_FLAGSHIP_HIT |
| `$424A` | `ALIEN_ATTACK_MASTER_COUNTER` | 1 | Master gateway counter |
| `$424B` | first secondary | 1 | Secondary counter 0 |
| ... | ... | ... | ... |
| `$4259` | last secondary | 1 | Secondary counter 14 |
| `$425F` | `TIMING_VARIABLE` | 1 | Free-running NMI decrementer |

**Correction to original disassembly comments:**
- `ALIEN_ATTACK_SECONDARY_COUNTERS` is labelled `$425B` but the actual array ends
  at `$4259`. The EQU should be `$424B` (first byte after master). Byte `$425A` is
  the first byte past the allocated range.

## Counter Default Values

Source address `$15E3` (16 bytes):

| Offset | Address | Value | Role |
| ------ | ------- | ----: | ---- |
| 0 | `$424A` | `$05` = 5 | Master counter (constant) |
| 1 | `$424B` | `$2F` = 47 | Secondary 0 |
| 2 | `$424C` | `$43` = 67 | Secondary 1 |
| 3 | `$424D` | `$77` = 119 | Secondary 2 |
| 4 | `$424E` | `$71` = 113 | Secondary 3 |
| 5 | `$424F` | `$6D` = 109 | Secondary 4 |
| 6 | `$4250` | `$67` = 103 | Secondary 5 |
| 7 | `$4251` | `$65` = 101 | Secondary 6 |
| 8 | `$4252` | `$4F` = 79 | Secondary 7 |
| 9 | `$4253` | `$49` = 73 | Secondary 8 |
| 10 | `$4254` | `$43` = 67 | Secondary 9 |
| 11 | `$4255` | `$3D` = 61 | Secondary 10 |
| 12 | `$4256` | `$3B` = 59 | Secondary 11 |
| 13 | `$4257` | `$35` = 53 | Secondary 12 |
| 14 | `$4258` | `$2B` = 43 | Secondary 13 |
| 15 | `$4259` | `$29` = 41 | Secondary 14 |

The default values are **static** — they never change during gameplay.

## Per-Frame Cadence (`$0661` main game loop)

```
HANDLE_INFLIGHT_ALIENS          ← movement & shooting
HANDLE_FLAGSHIP_ATTACK           ← launch flagship if flagged
HANDLE_SINGLE_ALIEN_ATTACK       ← launch ordinary if CAN_ALIEN_ATTACK
SET_ALIEN_ATTACK_FLANK           ← set $4215 from swarm scroll position
HANDLE_LEVEL_DIFFICULTY          ← increment EXTRA if timers expire
CHECK_IF_ALIEN_CAN_ATTACK        ← decrement counters, set CAN_ALIEN_ATTACK
UPDATE_ATTACK_COUNTERS           ← flagship attack timers
CHECK_IF_FLAGSHIP_CAN_ATTACK     ← may set flagship attack flag
```

## CHECK_IF_ALIEN_CAN_ATTACK (`$1515`)

### Guard conditions (must all pass):

1. `HAS_PLAYER_SPAWNED` — player exists
2. `HAVE_NO_ALIENS_IN_SWARM` — at least one alien in swarm
3. `IS_FLAGSHIP_HIT` — swarm not in shock

### Compute B (number of secondaries to decrement):

```
B = ((max(1, BASE) + EXTRA) & 15) + 1
```

- Level 1, early game: BASE=2, EXTRA=0 → B = (2+0)&15+1 = 3
- Level 1, late game: BASE=2, EXTRA=7 → B = (2+7)&15+1 = 10
- Max possible: BASE=7, EXTRA=7 → B = (7+7)&15+1 = 15

### Master counter:

- Decremented every frame from its current value.
- When it reaches zero: reload to `$05` (default[0]), then decrement B secondaries.
- If master > 0: skip secondary decrement, set CAN_ALIEN_ATTACK = 0.

### Secondary counter decrement loop:

```
for i = 0 to B-1:
    decrement counter[i]
    if counter[i] == 0:
        reload counter[i] from default[i+1]
        hitCount++
if hitCount > 0:
    CAN_ALIEN_ATTACK = 1
```

## SET_ALIEN_ATTACK_FLANK (`$13E1`)

Determined by swarm scroll position relative to screen edges:

| Swarm position | Flank |
| -------------- | ----- |
| Near left edge (scroll - max_extents ≤ $1C) | **LEFT** (0) |
| Near right edge (max_extents - scroll ≤ $1C) | **RIGHT** (1) |
| Middle (both differences > $1C) | **RANDOM** via RNG |

The flank value also sets `INFLIGHT_ALIEN.ArcClockwise`:
- LEFT flank (0) → ArcClockwise=0
- RIGHT flank (1) → ArcClockwise=1

## HANDLE_SINGLE_ALIEN_ATTACK (`$1344`)

### Prerequisites:

1. `CAN_ALIEN_ATTACK` == 1
2. `HAVE_NO_ALIENS_IN_SWARM` == 0

### Max inflight calculation:

```
maxSlots = ((BASE + EXTRA) / 2) + 1
if maxSlots > 3: maxSlots = 3 (so max inflight = 4)
```

The routine scans up to `maxSlots` inflight slots (starting from slot 7 downward)
for a free one.

### Column scanning:

**LEFT flank** — scan ALIEN_IN_COLUMN_FLAGS from `$41FC` (leftmost) downward to
`$41F3` (rightmost) using CPDR with BC=$000A. Find first occupied column
(bytes that are $01). If none found, return (no attack).

**RIGHT flank** — scan from `$41F3` (rightmost) upward to `$41FC` (leftmost)
using CPIR with BC=$000A. Find first occupied column.

### Row scanning (within selected column):

**If flagships exist** (`HAVE_ALIENS_IN_TOP_ROW` at $41EF bit 0):
- Scan from row $4150 (purple), 4 rows deep (purple + 3 blue rows)
- Excludes red row and flagship row

**If no flagships (`HAVE_ALIENS_IN_TOP_ROW` == 0)**:
- Scan from row $4160 (red), 5 rows deep (red + purple + 3 blue)
- Includes all ordinary alien rows

In either case, rows are scanned top-to-bottom (highest row first). The first
alien found in the selected column that is alive and in formation is launched.

**No RNG is involved in alien selection.** The selection is purely deterministic
based on the flank state and column/row occupancy.

## Difficulty System

### DIFFICULTY_BASE_VALUE (`$421B`)

- Starts at 2 (from `DEFAULT_PLAYER_STATE`)
- Incremented on level completion (capped at 7)
- Increases attack frequency over levels

### DIFFICULTY_EXTRA_VALUE (`$421A`)

- Starts at 0
- Increments every ~20 seconds of play (60 ticks × 20 cycles)
- Capped at 7
- Reset to 0 on level completion
- Blocked during IS_FLAGSHIP_HIT (swarm in shock)

### Effect on B:

```
B = ((max(1, BASE) + EXTRA) & 15) + 1
```

More secondaries decremented = more chances for one to hit zero = more attacks.

### Effect on max inflight slots:

```
maxInflight = ((BASE + EXTRA) >> 1) + 1
if maxInflight > 4: maxInflight = 4
```

## Deterministic Pseudo-RNG (`$003C`)

```
newState = (oldState * 5 + 1) & 0xFF
```

- 8-bit LCG: multiplier 5, increment 1, modulo 256
- State stored at `$401E` (`RAND_NUMBER`)
- Seeded by RAM test final write value (not explicitly set)
- Called from: flank selection (`$1403`), inflight AI, collision, sound
- The RNG does **not** affect which alien is selected — only which flank when
  swarm is in the centre of the screen

## Flags and State Guards

| Condition | Blocks |
| --------- | ------ |
| `HAVE_NO_ALIENS_IN_SWARM` | CHECK_IF_ALIEN_CAN_ATTACK, HANDLE_SINGLE_ALIEN_ATTACK |
| `IS_FLAGSHIP_HIT` | CHECK_IF_ALIEN_CAN_ATTACK, HANDLE_LEVEL_DIFFICULTY |
| `playerDying` | (inferred — no launch during death animation) |
| `gameOver` | (inferred — no launch during game over) |

## Key Differences from Phase 4/5 Reserved Features

| Feature | Phase |
| ------- | ----- |
| Flagship attack with red escorts | Phase 4 |
| Slots 1-3 (flagship + escorts) | Phase 4 |
| Enemy bullet firing | Phase 4 |
| Aggressive (loop-the-loop) behaviour | Phase 4 |
| Shock state on flagship kill | Phase 4 |
| Player-relative targeting | Phase 4 |
| Galaxian EDU mode | Phase 5 |
| Two-player / cocktail mode | Phase 5 |
| Advanced sound | Phase 5 |
