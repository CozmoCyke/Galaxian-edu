import { Swarm } from '../src/entities/swarm/Swarm.js';
import { SwarmLayout } from '../src/entities/swarm/SwarmLayout.js';
import { Alien } from '../src/entities/Alien.js';
import { InflightSlotPool } from '../src/inflight/InflightSlotPool.js';
import { InflightController } from '../src/inflight/InflightController.js';
import { FlagshipAttackCounters } from '../src/flagship/FlagshipAttackCounters.js';
import { FlagshipAttackScheduler } from '../src/flagship/FlagshipAttackScheduler.js';
import { FlagshipAttackGroup } from '../src/flagship/FlagshipAttackGroup.js';
import { FlagshipScoreCalculator } from '../src/flagship/FlagshipScoreCalculator.js';
import { ShockController } from '../src/flagship/ShockController.js';
import { FlagshipSelector } from '../src/flagship/FlagshipSelector.js';
import { EscortSelector } from '../src/flagship/EscortSelector.js';
import { CONFIG } from '../src/config.js';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

function assertEq(a, b, label) {
  if (a === b) { passed++; console.log(`  PASS: ${label} (${b})`); }
  else { failed++; console.error(`  FAIL: ${label} — expected ${b}, got ${a}`); throw new Error(label); }
}

function countType(swarm, type) {
  return swarm.layout.aliens.filter(a => a.type === type).length;
}

function makeCustomSwarm(flagshipCols, redCols, blueCols, purpleCols) {
  const layout = new SwarmLayout();
  const aliens = [];
  let idx = 0;

  for (const col of (flagshipCols || [])) {
    aliens.push(new Alien(idx, 0, col, 'flagship')); idx++;
  }
  for (const col of (redCols || [])) {
    aliens.push(new Alien(idx, 3, col, 'red')); idx++;
  }
  for (const row of [0, 1, 2]) {
    for (const col of (blueCols || [])) {
      aliens.push(new Alien(idx, row, col, 'blue')); idx++;
    }
  }
  for (const col of (purpleCols || [])) {
    aliens.push(new Alien(idx, 4, col, 'purple')); idx++;
  }

  layout.aliens = aliens;

  const swarm = new Swarm();
  swarm.layout = layout;
  return swarm;
}

function makeDefaultSwarm() {
  return makeCustomSwarm([3, 6], [2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 5, 6, 7, 8]);
}

// === Scenario 1: Flagship alone (no escorts) ===
console.log(`\n--- Scenario 1: Flagship alone ---`);
{
  const swarm = makeCustomSwarm([0], [], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], []);
  assertEq(countType(swarm, 'flagship'), 1, '1 flagship in swarm');
  assertEq(countType(swarm, 'red'), 0, '0 reds in swarm');

  const selected = FlagshipSelector.selectFlagship(swarm, 'left');
  assert(selected !== null, 'flagship selectable');
  assertEq(selected.type, 'flagship', 'selected is flagship');

  const escorts = EscortSelector.selectEscorts(swarm, selected, 2);
  assertEq(escorts.length, 0, 'no escorts available');

  // Score: no escorts = factor 0, 200 points
  const score = FlagshipScoreCalculator.calculate({ originalEscortCount: 0, livingEscortCount: 0, escortsDestroyedBeforeFlagship: false });
  assertEq(score.factor, 0, 'score factor 0 for no escorts');
  assertEq(score.points, 200, '200 points for no escorts');
}

// === Scenario 2: Flagship w/ 2 escorts, both killed first ===
console.log(`\n--- Scenario 2: Flagship + 2 escorts, both killed before flagship ---`);
{
  const score = FlagshipScoreCalculator.calculate({ originalEscortCount: 2, livingEscortCount: 0, escortsDestroyedBeforeFlagship: true });
  assertEq(score.factor, 3, 'factor 3 for both escorts killed first');
  assertEq(score.points, 800, '800 points for both escorts killed first');
}

// === Scenario 3: Flagship w/ 2 escorts, both alive ===
console.log(`\n--- Scenario 3: Flagship + 2 escorts, both alive when flagship dies ---`);
{
  const score = FlagshipScoreCalculator.calculate({ originalEscortCount: 2, livingEscortCount: 2, escortsDestroyedBeforeFlagship: false });
  assertEq(score.factor, 1, 'factor 1 for both escorts alive');
  assertEq(score.points, 400, '400 points for both escorts alive');
}

// === Scenario 4: Flagship w/ 2 escorts, 1 killed first ===
console.log(`\n--- Scenario 4: Flagship + 2 escorts, 1 killed before flagship ---`);
{
  const score = FlagshipScoreCalculator.calculate({ originalEscortCount: 2, livingEscortCount: 1, escortsDestroyedBeforeFlagship: false });
  assertEq(score.factor, 2, 'factor 2 for 1 escort killed first');
  assertEq(score.points, 600, '600 points for 1 escort killed first');
}

// === Scenario 5: Flagship group lifecycle ===
console.log(`\n--- Scenario 5: Flagship group lifecycle ---`);
{
  const pool = new InflightSlotPool();
  const group = new FlagshipAttackGroup({
    flagship: { alienId: 0, slot: 1, col: 0, row: 0, side: 'left' },
    escorts: [
      { alienId: 24, slot: 2, col: 0, row: 3 },
      { alienId: 25, slot: 3, col: 1, row: 3 }
    ],
    side: 'left',
    flagshipsRemaining: 2,
  });

  // Initial state
  assertEq(group.livingEscortCount, 2, '2 living escorts initially');
  assertEq(group.stage, 'forming', 'stage = forming initially');
  assert(!group.isComplete, 'group not complete initially');

  // Mark flagship attacked via the proper API
  group.flagshipState = 'attacking';
  assert(!group.isComplete, 'group not complete while flagship attacking');

  // Key issue: the group uses `activeMemberCount` which is decremented by
  // onEscortReturned/onFlagshipReturned — setting escortStates directly doesn't affect it.
  // We need to use the proper API: onFlagshipReturned(), onEscortReturned(), onEscortDestroyed()

  // Escort 1 returns
  group.onEscortReturned(0);
  assertEq(group.livingEscortCount, 2, 'living escort count unchanged on return');

  // Escort 2 dies
  group.onEscortDestroyed(1);
  assertEq(group.livingEscortCount, 1, 'living escort count decremented on death');

  // Flagship returns
  group.onFlagshipReturned();
  assert(group.isComplete, 'group complete when flagship + remaining escorts returned');

  // Verify with both returned
  const group2 = new FlagshipAttackGroup({
    flagship: { alienId: 1, slot: 1, col: 0, row: 0, side: 'left' },
    escorts: [],
    side: 'left',
    flagshipsRemaining: 2,
  });
  assertEq(group2.livingEscortCount, 0, '0 living escorts initially');
  assert(!group2.isComplete, 'group not complete before flagship returns');
  group2.onFlagshipReturned();
  assert(group2.isComplete, 'group complete after flagship returns alone');
}

// === Scenario 6: Multiple attack rounds ===
console.log(`\n--- Scenario 6: Multiple attack rounds ---`);
{
  const counters = new FlagshipAttackCounters();

  // Fast-forward: force master1 to 1
  counters.master1 = 1;
  counters.master2 = 1;

  // Tick: both masters will wrap
  counters.updateAttackCounters({
    hasPlayerSpawned: true,
    haveFlagships: true,
    isFlagshipHit: false,
    isGameInPlay: true,
    difficultyBase: 2,
    difficultyExtra: 0,
  });
  assert(counters.secondaryEnabled, 'secondary enabled after master wrap');
  assert(counters.secondary > 0, 'secondary counter > 0 after master wrap');

  // Now fast-forward secondary to 1
  counters.secondary = 1;
  counters.checkCanAttack({ hasPlayerSpawned: true, haveFlagships: true });
  assert(counters.canAttack, 'canAttack true after secondary hits zero');
  counters.consumeAttack();
  assert(!counters.canAttack, 'canAttack false after consume');

  // Second round: master1 rolls again
  counters.master1 = 1;
  counters.master2 = 1;
  counters.updateAttackCounters({
    hasPlayerSpawned: true,
    haveFlagships: true,
    isFlagshipHit: false,
    isGameInPlay: true,
    difficultyBase: 2,
    difficultyExtra: 0,
  });
  assert(counters.secondaryEnabled, 'secondary re-enabled for round 2');
  counters.secondary = 1;
  counters.checkCanAttack({ hasPlayerSpawned: true, haveFlagships: true });
  assert(counters.canAttack, 'canAttack true for round 2');
  counters.consumeAttack();
  assert(!counters.canAttack, 'canAttack false after round 2 consume');
}

// === Scenario 7: Shock state lifecycle ===
console.log(`\n--- Scenario 7: Shock state lifecycle ---`);
{
  const shock = new ShockController();

  // Verify shock blocks canAttack
  shock.trigger();
  assert(shock.isActive, 'shock active after trigger');
  assertEq(shock.counter, 240, 'shock counter = 240');

  // Tick shock with inflight aliens active - counter stays
  shock.update({ noInflightAliens: false });
  assertEq(shock.counter, 240, 'shock counter frozen while inflight aliens active');

  // Tick shock with no inflight - counter decrements
  for (let i = 0; i < 60; i++) {
    shock.update({ noInflightAliens: true });
  }
  assertEq(shock.counter, 180, 'shock counter decremented to 180 after 60 ticks');

  // Reset shock
  shock.reset();
  assert(!shock.isActive, 'shock inactive after reset');
  assertEq(shock.counter, 0, 'shock counter = 0 after reset');
}

// === Scenario 8: Flagship group max capacity (7 ord + flagship group) ===
console.log(`\n--- Scenario 8: Max capacity coexistence ---`);
{
  const pool = new InflightSlotPool();

  // Fill all 4 ordinary slots (4-7)
  for (let i = 4; i <= 7; i++) {
    const slot = pool.allocate(i);
    assertEq(slot, i, `slot ${i} allocated`);
  }
  assertEq(pool.allocateNext(), null, 'no free ordinary slots');

  // Should still be able to allocate flagship group
  const group = pool.allocateFlagshipGroup();
  assert(group !== null, 'flagship group allocates when ordinary slots full');
  assertEq(group.flagshipSlot, 1, 'flagship uses slot 1');
  assertEq(group.escortSlots.length, 2, 'escorts use slots 2-3');

  // Release group
  pool.freeFlagshipGroup(group);
  assert(pool.hasFreeFlagshipSlot(), 'flagship slot free after group release');
  assert(pool.hasFreeEscortSlot(), 'escort slots free after group release');

  // Ordinary slots still occupied
  for (let i = 4; i <= 7; i++) {
    assert(!pool.canAllocate(i), `slot ${i} still occupied`);
  }
}

// === Scenario 9: Red fallback path ===
console.log(`\n--- Scenario 9: Red fallback path ---`);
{
  const swarm = makeCustomSwarm([], [2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], []);
  assertEq(countType(swarm, 'red'), 6, '6 red aliens');
  assertEq(countType(swarm, 'flagship'), 0, '0 flagships');

  // Select red fallback from left
  const redLeft = FlagshipSelector.selectRedFallback(swarm, 'left');
  assert(redLeft !== null, 'red fallback selects alien from left');
  assertEq(redLeft.type, 'red', 'red fallback selects red alien');

  // Select red fallback from right
  const redRight = FlagshipSelector.selectRedFallback(swarm, 'right');
  assert(redRight !== null, 'red fallback selects alien from right');
  assertEq(redRight.type, 'red', 'right red fallback is red');
  assert(redRight.col >= redLeft.col, 'right fallback is right of left fallback');
}

// === Scenario 10: Escort selection proximity ===
console.log(`\n--- Scenario 10: Escort selection proximity ---`);
{
  const swarm = makeCustomSwarm([3], [0, 2, 3, 5, 7], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], []);

  // Our flagship is at col 3
  const flagship = swarm.layout.aliens.find(a => a.type === 'flagship');
  assert(flagship !== null, 'flagship found');
  assertEq(flagship.col, 3, 'flagship at col 3');

  // Select escorts - should prefer nearest by column distance
  const escorts = EscortSelector.selectEscorts(swarm, flagship, 2);
  assertEq(escorts.length, 2, '2 escorts selected');
  // The nearest reds to col 3 are at cols 2, 3 (distance 1, 0), then col 5 (distance 2)
  const distances = escorts.map(e => Math.abs(e.col - flagship.col));
  assert(distances[0] <= 2, `first escort close to flagship (col dist ${distances[0]})`);
}

// === Scenario 11: Scheduler integration — full cycle with swarm ===
console.log(`\n--- Scenario 11: Full scheduler cycle with swarm ---`);
{
  const swarm = makeCustomSwarm([3], [2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], []);

  const ctrl = new InflightController();
  const scheduler = new FlagshipAttackScheduler();
  scheduler.setEnabled(true);

  // Force counters to attack state
  scheduler.counters.master1 = 1;
  scheduler.counters.master2 = 1;

  // Run update — should attempt flagship attack
  const result = scheduler.update(swarm, ctrl, { gameState: 'playing', attackSide: 'left', difficultyBase: 2, difficultyExtra: 0, isFlagshipHit: false });
  if (result) {
    assert(result.group !== undefined, 'scheduler returns group on success');
    assert(result.group.flagship !== undefined, 'group has flagship');
    assert(result.group.escorts.length <= 2, 'group has <= 2 escorts');
    assert(ctrl.getActiveCount() > 0, 'inflight controller has active aliens');
  } else {
    assert(scheduler.lastRefusalReason !== 'none', 'refusal provides reason');
    console.log(`  NOTE: scheduler refused: ${scheduler.lastRefusalReason}`);
  }
}

// === SUMMARY ===
console.log(`\n=== SCENARIO SUMMARY ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

process.exit(failed > 0 ? 1 : 0);
