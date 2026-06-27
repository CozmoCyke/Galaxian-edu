# Inflight Alien Lifecycle

Source: `project/galaxian.asm` by Scott Tunstall (2019/2023)

## INFLIGHT_ALIEN Structure

Address `$42B0`–`$43AF` (256 bytes, 8 slots × 32 bytes each).

| Offset | Size | Field | Purpose |
|-------:|-----:|-------|---------|
| 0 | 1 | IsActive | 1 = process this slot |
| 1 | 1 | IsDying | 1 = explosion in progress |
| 2 | 1 | StageOfLife | See state table below |
| 3 | 1 | X | Current X coordinate |
| 4 | 1 | Y | Current Y coordinate |
| 5 | 1 | AnimationFrame | Current sprite frame |
| 6 | 1 | ArcClockwise | 0=left arc, 1=right arc |
| 7 | 1 | IndexInSwarm | Index into ALIEN_SWARM_FLAGS |
| 8 | 1 | *(unused)* | |
| 9 | 1 | PivotYValue | Base Y for attack positioning |
| A–E | 5 | *(unused)* | |
| F | 1 | AnimFrameStartCode | Base sprite code added to frame |
| 10 | 1 | TempCounter1 | Animation timing delay |
| 11 | 1 | TempCounter2 | Total animation frames count |
| 12 | 1 | DeathAnimCode | Sprite code for death animation |
| 13 | 1 | ArcTableLsb | LSB of pointer into ARC_TABLE |
| 14–15 | 2 | *(unused)* | |
| 16 | 1 | Colour | Sprite colour attribute |
| 17 | 1 | SortieCount | Times reached bottom this flight |
| 18 | 1 | Speed | 0–3, higher = faster |
| 19 | 1 | PivotYValueAdd | Signed Y delta added to PivotYValue |
| 1A–1F | 6 | *(unused)* | |

## Slot Allocation

| Slot | Address | Purpose |
|-----:|--------:|---------|
| 0 | $42B0 | Auxiliary/explosion display |
| 1 | $42D0 | Flagship |
| 2 | $42F0 | Escort 1 (red alien) |
| 3 | $4310 | Escort 2 (red alien) |
| 4 | $4330 | Ordinary attacking alien |
| 5 | $4350 | Ordinary attacking alien |
| 6 | $4370 | Ordinary attacking alien |
| 7 | $4390 | Ordinary attacking alien |

Scan order: slot 7 → 4 (lastmost free slot wins). Slots 0–3 are reserved.

## StageOfLife States

| Value | Label | Behaviour | Next |
|-----:|-------|-----------|------|
| 0 | PACKS_BAGS | Initialises slot: clear SortieCount, set start position, queue DELETE_ALIEN_COMMAND, set colour/speed/animation params, set ArcTableLsb=0 | → 1 |
| 1 | FLIES_IN_ARC | Consumes ARC_TABLE pairs (X delta, Y delta). Increments ArcTableLsb by 2 each tick. Animates rotation. When all frames done | → 2 |
| 2 | READY_TO_ATTACK | Increments X, reads PLAYER_Y, computes flight path via signed Y distance. Sets PivotYValue, PivotYValueAdd, temp counters | → 3 |
| 3 | ATTACKING_PLAYER | Moves toward player using Y delta algorithm (`UPDATE_INFLIGHT_ALIEN_YADD`). Checks bottom/side bounds | → 4 or 5 |
| 4 | NEAR_BOTTOM_OF_SCREEN | X near bottom detection | → 5 |
| 5 | REACHED_BOTTOM_OF_SCREEN | X=8, increments SortieCount. Decides: return to swarm (→6) or continue attacking (→7), based on game flags | → 6 or 7 |
| 6 | RETURNING_TO_SWARM | Calls SET_INFLIGHT_ALIEN_START_POSITION to compute target (current swarm position + local grid). Moves toward it. When <25px: animate rotation. At exact target: clear IsActive, mark swarm flag, queue DRAW_ALIEN_COMMAND | → (done) |
| 7 | CONTINUING_ATTACK_RUN_FROM_TOP_OF_SCREEN | Flies from top for TempCounter1 pixels, gravitates toward player | → 8 |
| 8 | FULL_SPEED_CHARGE | Zigzags toward player at speed 3, may loop the loop if centred | → 3 or A |
| 9 | ATTACKING_PLAYER_AGGRESSIVELY | Continuous attack with shooting, checks SortieCount (every 4 sorties moves closer to player) | → (loop) |
| A | LOOP_THE_LOOP | 360° loop using ARC_TABLE (same as state 1 but full circle) | → B |
| B | COMPLETE_LOOP | Post-loop handling | → C or done |
| C–F | *(attract mode)* | Used in attract/demo mode | — |

## Arc Table

`$1E00`–`$1E66` (103 bytes / ~51 coordinate pairs).

Format: signed X delta (byte 0), unsigned Y delta (byte 1).

ArcTableLsb starts at 0 and advances by 2 per pair consumed.

The first 103 bytes represent a 90° arc. The same table is reused for loop-the-loop (360° = 4 × 90° arcs).

```hex
FF 00  FF 00  FF 00  FF 01  FF 00  FF 00  FF 01  FF 00
FF 01  FF 00  00 01  FF 00  FF 01  00 01  FF 00  00 01
FF 01  00 01  FF 01  00 01  00 01  FF 01  00 01  00 01
00 01  00 01  00 01  00 01  01 01  00 01  00 01  01 01
00 01  01 01  00 01  01 00  00 01  01 01  01 00  00 01
01 00  01 01  01 00  01 01  01 00  01 00  01 01  01 00
01 00  01 00  01 00  01
```

## Launch Selection for Ordinary Aliens

`TRY_FIND_FLAGSHIP_OR_RED_ALIEN_TO_ATTACK_FROM_LEFT_FLANK` ($142E):
1. Scan slots $4179→$4176 (leftmost 4) in ALIEN_SWARM_FLAGS for a flagship
2. If no flagship, scan $416A→$4165 (leftmost 4) for red aliens
3. If red alien found → `TRY_INIT_INFLIGHT_ALIEN` ($1446)

`TRY_INIT_INFLIGHT_ALIEN` ($1446):
1. Start at IX = $4390 (slot 7), scan backwards through slots 7→4
2. If slot IsActive=0 AND IsDying=0, call `INIT_INFLIGHT_ALIEN`

`INIT_INFLIGHT_ALIEN` ($145C):
1. Clear flag at ALIEN_SWARM_FLAGS[IndexInSwarm]
2. Set IsActive=1, StageOfLife=0
3. Set ArcClockwise from input C (0=left, 1=right)
4. Set IndexInSwarm from HL
5. Queue DELETE_ALIEN_COMMAND

## SwarmIndex Formula

In the JS engine, `swarmIndex` is computed as:

```
swarmIndex = row * SWARM_ROW_SIZE + SWARM_INDEX_OFFSET + col
```

Where `SWARM_ROW_SIZE = 16` and `SWARM_INDEX_OFFSET = 3`.

This matches the ASM layout where each row occupies 16 bytes in `ALIEN_SWARM_FLAGS` ($4100), and the first visible alien in each row starts at column offset 3 (indices $00, $01, $02 are empty padding before the first alien column).

Example for blue alien at visual row 0, col 0:
```
swarmIndex = 0 × 16 + 3 + 0 = 3 = $03
```

SwarmIndices $00, $01, $02 are always empty (no alien exists at those positions).

## Start Position Calculation

`SET_INFLIGHT_ALIEN_START_POSITION` ($1147):
```
X = -(row * 1.5) + $7C
Y = (col * 16) + SWARM_SCROLL_VALUE + 7
```
Where `row = (IndexInSwarm & $70) >> 4`, `col = IndexInSwarm & $0F`.

This computes the alien's grid position in the moving swarm at the moment of departure, so the inflight alien starts at its exact visual position.

## Return to Swarm

`INFLIGHT_ALIEN_RETURNING_TO_SWARM` ($0F07):
1. Save current X in B
2. Call SET_INFLIGHT_ALIEN_START_POSITION (computes where the slot should be now)
3. Restore old X
4. Compute distance = target X - current X
5. If distance == 0 → INFLIGHT_ALIEN_BACK_IN_SWARM
6. If distance > $19 (25px) → exit (too far)
7. If distance is odd → exit (animate rotation only on even frames)
8. Rotate sprite (inc/dec AnimationFrame based on ArcClockwise)

`INFLIGHT_ALIEN_BACK_IN_SWARM` ($0F2B):
1. Set IsActive = 0
2. Set ALIEN_SWARM_FLAGS[IndexInSwarm] = 1 (occupied)
3. Queue DRAW_ALIEN_COMMAND

## Sortie Count

Incremented each time the alien reaches the bottom of the screen ($0E9D). Reset to 0 only when the alien packs bags ($0D06), NOT when it returns to swarm. So `SortieCount` tracks sorties within a single inflight episode. After 4+ continuous sorties, the alien moves closer to the player.

## Key Addresses

| Routine | Address | Purpose |
|---------|--------:|---------|
| TRY_FIND_FLAGSHIP_OR_RED_ALIEN_TO_ATTACK_FROM_LEFT_FLANK | $142E | Scan for flagships or red aliens |
| TRY_INIT_INFLIGHT_ALIEN | $1446 | Find free slot 7→4 |
| INIT_INFLIGHT_ALIEN | $145C | Clear swarm flag, init slot |
| INFLIGHT_ALIEN_PACKS_BAGS | $0D06 | Set start pos, colour, speed, arc |
| INFLIGHT_ALIEN_FLIES_IN_ARC | $0D71 | Consume arc table pairs |
| INFLIGHT_ALIEN_READY_TO_ATTACK | $0DD1 | Compute flight path toward player |
| INFLIGHT_ALIEN_REACHED_BOTTOM_OF_SCREEN | $0E99 | Bottom wrap, inc sortie |
| INFLIGHT_ALIEN_RETURNING_TO_SWARM | $0F07 | Move back to swarm grid |
| INFLIGHT_ALIEN_BACK_IN_SWARM | $0F2B | Reinsert into swarm |
| SET_INFLIGHT_ALIEN_START_POSITION | $1147 | Compute grid position |
| HANDLE_INFLIGHT_ALIEN_STAGE_OF_LIFE | $0CD6 | StageOfLife jump table |
| HANDLE_INFLIGHT_ALIENS | $0CC3 | Iterate all 8 slots, call StageOfLife |
| HANDLE_INFLIGHT_ALIEN_SPRITE_UPDATE | $0BBE | Project INFLIGHT_ALIEN → hardware sprite |
| INFLIGHT_ALIEN_ARC_TABLE | $1E00 | Arc trajectory data |
| INFLIGHT_ALIENS | $42B0 | Array base address |
| ALIEN_SWARM_FLAGS | $4100 | Swarm occupation flags |
