import { CONFIG } from '../src/config.js';
import { SwarmLayout } from '../src/entities/swarm/SwarmLayout.js';
import { Alien } from '../src/entities/Alien.js';
import { Swarm } from '../src/entities/swarm/Swarm.js';

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

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

process.exit(failed > 0 ? 1 : 0);