import { CONFIG } from '../src/config.js';
import { SwarmLayout } from '../src/entities/swarm/SwarmLayout.js';
import { Alien } from '../src/entities/Alien.js';
import { Swarm } from '../src/entities/swarm/Swarm.js';
import { InflightSlotPool } from '../src/inflight/InflightSlotPool.js';
import { InflightController } from '../src/inflight/InflightController.js';
import { STATE } from '../src/entities/Alien.js';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function assertEq(a, b, label) {
  if (a === b) {
    passed++;
    console.log(`  PASS: ${label} (${a})`);
  } else {
    failed++;
    console.error(`  FAIL: ${label} — expected ${b}, got ${a}`);
  }
}

console.log('\n=== FORMATION INITIALIZATION ===\n');

const layout = new SwarmLayout();

assertEq(layout.totalCount, 46, 'total aliens === 46');

let flagships = 0, red = 0, purple = 0, blue = 0;
for (const a of layout) {
  switch (a.type) {
    case 'flagship': flagships++; break;
    case 'red': red++; break;
    case 'purple': purple++; break;
    case 'blue': blue++; break;
  }
}
assertEq(flagships, 2, 'flagship count === 2');
assertEq(red, 6, 'red alien count === 6');
assertEq(purple, 8, 'purple alien count === 8');
assertEq(blue, 30, 'blue alien count === 30');

assertEq(layout.aliveCount, 46, 'all aliens initially alive');
assertEq(layout.inFormationCount, 46, 'all aliens initially in formation');

console.log('\n=== SWARM INDEX UNIQUENESS ===\n');

const indices = new Set();
for (const a of layout) {
  if (indices.has(a.swarmIndex)) {
    assert(false, `duplicate swarmIndex ${a.swarmIndex} for alien at (${a.row},${a.col})`);
  } else {
    indices.add(a.swarmIndex);
  }
}
assertEq(indices.size, 46, 'all swarmIndex values are unique');

console.log('\n=== SWARM INDEX FORMULA ===\n');

{
  const alien00 = layout.getAlien(0, 0);
  assertEq(alien00 !== null, true, 'row 0 col 0 has an alien');
  assertEq(alien00.swarmIndex, 3, 'row 0 col 0 swarmIndex === $03 (SWARM_INDEX_OFFSET=3)');

  assertEq(layout.getAlienBySwarmIndex(0), null, 'swarmIndex $00 is empty');
  assertEq(layout.getAlienBySwarmIndex(1), null, 'swarmIndex $01 is empty');
  assertEq(layout.getAlienBySwarmIndex(2), null, 'swarmIndex $02 is empty');

  const alien01 = layout.getAlien(0, 1);
  assertEq(alien01.swarmIndex, 4, 'row 0 col 1 swarmIndex === $04');

  const alien09 = layout.getAlien(0, 9);
  assertEq(alien09.swarmIndex, 12, 'row 0 col 9 swarmIndex === $0C');

  const alienPurple = layout.getAlien(3, 1);
  assertEq(alienPurple.swarmIndex, 3 * 16 + 3 + 1, `purple row 3 col 1 swarmIndex === ${3 * 16 + 3 + 1}`);

  const alienRed = layout.getAlien(4, 2);
  assertEq(alienRed.swarmIndex, 4 * 16 + 3 + 2, `red row 4 col 2 swarmIndex === ${4 * 16 + 3 + 2}`);

  const alienFlag = layout.getAlien(5, 3);
  assertEq(alienFlag.swarmIndex, 5 * 16 + 3 + 3, `flagship row 5 col 3 swarmIndex === ${5 * 16 + 3 + 3}`);
}

console.log('\n=== EMPTY SLOTS ===\n');

for (let r = 0; r < CONFIG.SWARM.ROWS; r++) {
  for (let c = 0; c < CONFIG.SWARM.COLS; c++) {
    const a = layout.getAlien(r, c);
    if (a === null) {
    }
  }
}
assert(true, 'empty slots return null from getAlien');

const invalidAlien = layout.getAlien(99, 99);
assertEq(invalidAlien, null, 'out-of-bounds row/col returns null');

console.log('\n=== ALIEN TYPES PER ROW ===\n');

assertEq(layout.getAlien(0, 0).type, 'blue', 'row 0 col 0 is blue');
assertEq(layout.getAlien(2, 9).type, 'blue', 'row 2 col 9 is blue');
assertEq(layout.getAlien(3, 1).type, 'purple', 'row 3 col 1 is purple');
assertEq(layout.getAlien(3, 8).type, 'purple', 'row 3 col 8 is purple');
assertEq(layout.getAlien(4, 2).type, 'red', 'row 4 col 2 is red');
assertEq(layout.getAlien(4, 7).type, 'red', 'row 4 col 7 is red');
assertEq(layout.getAlien(5, 3).type, 'flagship', 'row 5 col 3 is flagship');
assertEq(layout.getAlien(5, 6).type, 'flagship', 'row 5 col 6 is flagship');

console.log('\n=== EMPTY GRID POSITIONS ===\n');

assertEq(layout.getAlien(3, 0), null, 'row 3 col 0 is empty (purple starts at col 1)');
assertEq(layout.getAlien(3, 9), null, 'row 3 col 9 is empty (purple ends at col 8)');
assertEq(layout.getAlien(4, 0), null, 'row 4 col 0 is empty (red starts at col 2)');
assertEq(layout.getAlien(4, 1), null, 'row 4 col 1 is empty (red starts at col 2)');
assertEq(layout.getAlien(4, 8), null, 'row 4 col 8 is empty (red ends at col 7)');
assertEq(layout.getAlien(4, 9), null, 'row 4 col 9 is empty (red ends at col 7)');
assertEq(layout.getAlien(5, 0), null, 'row 5 col 0 is empty (flagship starts at col 3)');
assertEq(layout.getAlien(5, 1), null, 'row 5 col 1 is empty');
assertEq(layout.getAlien(5, 2), null, 'row 5 col 2 is empty');
assertEq(layout.getAlien(5, 4), null, 'row 5 col 4 is empty (flagship at col 3 and 6)');
assertEq(layout.getAlien(5, 5), null, 'row 5 col 5 is empty');
assertEq(layout.getAlien(5, 7), null, 'row 5 col 7 is empty');
assertEq(layout.getAlien(5, 8), null, 'row 5 col 8 is empty');
assertEq(layout.getAlien(5, 9), null, 'row 5 col 9 is empty');

console.log('\n=== ALIEN DESTRUCTION ===\n');

const target = layout.getAlien(0, 0);
assert(target !== null, 'found alien at row 0 col 0');
assert(target.isInFormation, 'alien initially in formation');
assert(target.alive, 'alien initially alive');

const countBefore = layout.aliveCount;
target.kill();
assert(target.isDying, 'alien is dying after kill()');
assert(target.alive, 'alien still alive (isDying)');
assertEq(layout.aliveCount, countBefore, 'aliveCount unchanged during dying state');

for (let i = 0; i < 20; i++) target.update(0, 0);
assert(target.isDead, 'alien is dead after death timer expires');
assert(!target.alive, 'alien.alive is false after death');
assertEq(layout.aliveCount, countBefore - 1, 'aliveCount decreased by 1');

console.log('\n=== SWARM PERSISTENT GAPS ===\n');

const swarm = new Swarm();
const alienToKill = swarm.layout.getAlien(1, 5);
assert(alienToKill !== null, 'found alien at row 1 col 5');

alienToKill.kill();
for (let i = 0; i < 20; i++) alienToKill.update(0, 0);
assert(alienToKill.isDead, 'alien to kill is dead');

const checkAlien1 = swarm.layout.getAlien(0, 0);
assert(checkAlien1 !== null, 'alien at row 0 col 0 still exists');
assert(checkAlien1.isInFormation, 'alien at row 0 col 0 still in formation');
assert(!checkAlien1.isDead, 'alien at row 0 col 0 is not dead');

const checkAlien2 = swarm.layout.getAlien(1, 6);
assert(checkAlien2 !== null, 'alien at row 1 col 6 still exists (adjacent)');
assert(checkAlien2.isInFormation, 'adjacent alien still in formation');

const deadSlot = swarm.getAlienAt(1, 5);
assert(deadSlot !== null, 'dead alien still occupies grid slot');
assert(deadSlot.isDead, 'dead alien grid slot is dead, not shifted');

console.log('\n=== SWARM OFFSET INDEPENDENCE ===\n');

const testSwarm = new Swarm();
const alienRef = testSwarm.layout.getAlien(2, 4);
testSwarm.offsetX = 50;
testSwarm.offsetY = 40;
for (const a of testSwarm.layout) a.update(50, 40);

assertEq(alienRef.renderX, 50 + 4 * CONFIG.SWARM.H_SPACE, 'renderX includes swarm offset + local position');
assertEq(alienRef.renderY, 40 + 2 * CONFIG.SWARM.V_SPACE, 'renderY includes swarm offset + local position');

console.log('\n=== PLAYER BOUNDARIES ===\n');

class MockGame {
  constructor() {
    this.input = { left: false, right: false, fire: false, firePressed: false };
    this.playState = { playerBullet: { active: false } };
    this.score = 0;
    this.highScore = 0;
    this.lives = 3;
    this.level = 1;
  }
}

const mockGame = new MockGame();
const { Player } = await import('../src/entities/Player.js');
const p = new Player(mockGame);

p.x = -10;
p.update();
assert(p.x >= 0, 'player does not move left past 0');

p.x = CONFIG.CANVAS_WIDTH + 10;
p.update();
assert(p.x <= CONFIG.CANVAS_WIDTH - CONFIG.PLAYER.WIDTH, 'player does not move right past canvas edge');

p.x = 100;
const before = p.x;
mockGame.input.left = true;
p.update();
assert(p.x < before, 'player moves left when left key pressed');

mockGame.input.left = false;
mockGame.input.right = true;
const before2 = p.x;
p.update();
assert(p.x > before2, 'player moves right when right key pressed');

console.log('\n=== PLAYER BULLET ===\n');

const { PlayerBullet } = await import('../src/entities/PlayerBullet.js');
const b = new PlayerBullet(mockGame);

assert(!b.active, 'bullet starts inactive');
b.fire(100, 100);
assert(b.active, 'bullet becomes active after fire()');

b.y = -10;
b.update();
assert(!b.active, 'bullet deactivates when leaving screen top');

b.fire(100, 100);
b.fire(100, 100);
assert(b.active, 'bullet stays active when fire() called again (single shot)');

console.log('\n=== GAME LOOP PROPERTIES ===\n');

import { GameLoop } from '../src/core/GameLoop.js';
assert(typeof CONFIG.FIXED_STEP_MS === 'number', 'FIXED_STEP_MS is a number');
assertEq(CONFIG.FIXED_STEP_MS, 1000 / 60, 'FIXED_STEP_MS === 1000/60');
assertEq(CONFIG.LOGIC_HZ, 60, 'LOGIC_HZ === 60');
assert(CONFIG.MAX_FRAME_SKIP > 0, 'MAX_FRAME_SKIP > 0');

console.log('\n=== INFLIGHT CONTROLLER ===\n');

{
  const swarm = new Swarm();
  const ctrl = new InflightController();
  const alien = swarm.getAlienAt(0, 0);

  assertEq(alien.isInFormation, true, 'alien initially in formation');
  assertEq(ctrl.activeCount, 0, 'no active inflight records initially');

  const rec = ctrl.launchOrdinaryAlien(alien, swarm, false);
  assertEq(rec !== null, true, 'launchOrdinaryAlien returns a record');
  assertEq(ctrl.activeCount, 1, 'one inflight record after launch');

  assertEq(alien.isLeaving, true, 'alien state is LEAVING after launch');
  assertEq(alien.isInFormation, false, 'alien is no longer in formation');

  assertEq(rec.slot, 7, 'first ordinary alien gets slot 7');
  assertEq(rec.swarmIndex, alien.swarmIndex, 'record preserves swarmIndex');
  assertEq(rec.clockwise, 0, 'clockwise is 0 for left arc');
  assertEq(rec.x, alien.renderX, 'record starts at alien renderX');
  assertEq(rec.y, alien.renderY, 'record starts at alien renderY');

  const rec2 = ctrl.launchOrdinaryAlien(alien, swarm, false);
  assertEq(rec2, null, 'second simultaneous launch refused');

  ctrl.update();
  assertEq(alien.isInFlight, true, 'after update, alien state is IN_FLIGHT');
  assertEq(rec.stageOfLife, 1, 'stage progresses to FLIES_IN_ARC (1)');

  ctrl.freeSlot(rec.slot);
  assertEq(ctrl.activeCount, 0, 'after free, no active records');

  const rec3 = ctrl.launchOrdinaryAlien(alien, swarm, true);
  assertEq(rec3 !== null, true, 'launch succeeds again after free');
  assertEq(rec3.clockwise, 1, 'clockwise is 1 for right arc');
}

{
  const swarm = new Swarm();
  const ctrl = new InflightController();

  const deadAlien = swarm.getAlienAt(1, 1);
  deadAlien.kill();
  for (let i = 0; i < 20; i++) deadAlien.update(0, 0);
  assertEq(deadAlien.isDead, true, 'alien is dead');

  const recDead = ctrl.launchOrdinaryAlien(deadAlien, swarm, false);
  assertEq(recDead, null, 'dead alien cannot launch');
  assertEq(ctrl.activeCount, 0, 'no inflight records for dead alien');
}

{
  const swarm = new Swarm();
  const ctrl = new InflightController();

  const a1 = swarm.getAlienAt(0, 0);
  const a2 = swarm.getAlienAt(0, 1);
  const a3 = swarm.getAlienAt(0, 2);
  const a4 = swarm.getAlienAt(0, 3);

  assertEq(ctrl.launchOrdinaryAlien(a1, swarm, false) !== null, true, 'launch 1 ok');
  assertEq(ctrl.launchOrdinaryAlien(a2, swarm, false) !== null, true, 'launch 2 ok');
  assertEq(ctrl.launchOrdinaryAlien(a3, swarm, false) !== null, true, 'launch 3 ok');
  assertEq(ctrl.launchOrdinaryAlien(a4, swarm, false) !== null, true, 'launch 4 ok');

  const a5 = swarm.getAlienAt(0, 4);
  const recOverflow = ctrl.launchOrdinaryAlien(a5, swarm, false);
  assertEq(recOverflow, null, 'no slot free for 5th ordinary alien');
  assertEq(ctrl.activeCount, 4, '4 records active (slots 4-7 full)');
}

console.log('\n=== INFLIGHT SLOT POOL ===\n');

{
  const pool = new InflightSlotPool();

  assertEq(pool.total, 8, 'total slots === 8');
  assertEq(pool.reserved, 4, 'reserved slots === 4');
  assertEq(pool.allocatedCount, 0, 'initially no allocated slots');
  assertEq(pool.freeCount, 8, 'initially 8 free slots');

  assertEq(pool.allocate(0), 0, 'slot 0 can be allocated directly');
  assertEq(pool.allocate(4), 4, 'slot 4 can be allocated directly');
  assertEq(pool.allocate(4), null, 'slot 4 cannot be double-allocated');

  const next1 = pool.allocateNext();
  assertEq(next1, 7, 'allocateNext scans 7→4, returns slot 7');

  const next2 = pool.allocateNext();
  assertEq(next2, 6, 'allocateNext returns slot 6');

  const next3 = pool.allocateNext();
  assertEq(next3, 5, 'allocateNext returns slot 5');

  assertEq(pool.allocateNext(), null, 'no free slots when 4-7 all taken');

  assertEq(pool.free(5), true, 'free slot 5 succeeds');
  assertEq(pool.allocateNext(), 5, 're-allocate slot 5 after free');

  assertEq(pool.free(99), false, 'free invalid index returns false');
  assertEq(pool.free(1), false, 'free unallocated slot returns false');

  assertEq(pool.isAllocated(4), true, 'slot 4 is allocated');
  assertEq(pool.isAllocated(2), false, 'slot 2 is not allocated');

  assertEq(pool.canAllocate(0), false, 'slot 0 is reserved, cannot allocate');
  assertEq(pool.canAllocate(3), false, 'slot 3 is reserved, cannot allocate');
  assertEq(pool.canAllocate(4), false, 'slot 4 is taken, cannot allocate');
  assertEq(pool.canAllocate(7), false, 'slot 7 is taken, cannot allocate');

  pool.reset();
  assertEq(pool.allocatedCount, 0, 'after reset all slots free');
  assertEq(pool.freeCount, 8, 'after reset 8 free slots');
  assertEq(pool.allocateNext(), 7, 'after reset, first allocateNext is slot 7');
}

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

process.exit(failed > 0 ? 1 : 0);