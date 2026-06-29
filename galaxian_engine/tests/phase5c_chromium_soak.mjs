// Phase 5C — Chromium Long-Run Soak Test
// Runs 10,000 ticks with periodic invariant checks every 1,000 ticks.
// Final verification includes console/page errors, request failures,
// AudioManager consistency, and no unbounded growth in audio events.

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 8081;
const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots');
const BASE_URL = `http://localhost:${PORT}`;

let passCount = 0;
let failCount = 0;

function pass(msg) { passCount++; console.log(`  PASS: ${msg}`); }
function fail(msg, detail) { failCount++; console.log(`  \x1b[31;1mFAIL: ${msg}${detail ? ' \u2014 ' + detail : ''}\x1b[0m`); }

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const rawPath = req.url.split('?')[0];
      const decoded = decodeURIComponent(rawPath);
      const urlPath = decoded.replace(/\//g, sep);
      let filePath = join(ROOT, urlPath === sep ? 'index.html' : urlPath);
      try {
        const content = readFileSync(filePath);
        const ext = filePath.split('.').pop();
        const mime = {
          html: 'text/html',
          js: 'application/javascript',
          css: 'text/css',
          png: 'image/png',
          json: 'application/json',
        }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(content);
      } catch (e) {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(PORT, () => {
      console.log(`[SERVER] http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

function hasNaN(obj, path = '') {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'number') {
    if (isNaN(obj)) return path;
    if (!isFinite(obj)) return path;
    return false;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const child = obj[key];
      if (typeof child === 'function') continue;
      const result = hasNaN(child, path ? `${path}.${key}` : key);
      if (result) return result;
    }
  }
  return false;
}

async function verifyInvariants(page, tickLabel) {
  const snap = await page.evaluate(() => window.__galaxianTest.getSnapshot());

  const nanPath = hasNaN(snap);
  if (nanPath === false) pass(`[${tickLabel}] no NaN/Infinity`);
  else fail(`[${tickLabel}] NaN/Infinity`, nanPath);

  if (snap.swarm.aliveCount >= 0) pass(`[${tickLabel}] swarm.aliveCount=${snap.swarm.aliveCount}`);
  else fail(`[${tickLabel}] swarm.aliveCount`, `${snap.swarm.aliveCount}`);

  if (snap.slots.allocated <= 7) pass(`[${tickLabel}] slots.allocated=${snap.slots.allocated}`);
  else fail(`[${tickLabel}] slots.allocated`, `${snap.slots.allocated}`);

  if (snap.enemyBullets.activeCount <= 14) pass(`[${tickLabel}] enemyBullets.activeCount=${snap.enemyBullets.activeCount}`);
  else fail(`[${tickLabel}] enemyBullets.activeCount`, `${snap.enemyBullets.activeCount}`);

  return snap;
}

async function main() {
  if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR);

  const server = await startServer();

  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 576, height: 480 },
  });

  context.on('page', (p) => {
    p.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    p.on('pageerror', (err) => pageErrors.push(err.message));
    p.on('response', (response) => {
      if (response.status() === 404) requestFailures.push(`404: ${response.url()}`);
    });
    p.on('requestfailed', (request) => {
      requestFailures.push(`${request.failure()?.errorText || 'failed'}: ${request.url()}`);
    });
  });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__galaxianTest, { timeout: 5000 });

  await page.waitForFunction(() => {
    const s = window.__galaxianTest.getSnapshot();
    return s.state === 'playing';
  }, { timeout: 5000 });

  // Enable schedulers for full load
  await page.evaluate(() => {
    const ps = window.__galaxianTest._getGame().playState;
    if (ps) {
      if (ps.flagshipScheduler) ps.flagshipScheduler.setEnabled(true);
      if (ps.scheduler) ps.scheduler.setEnabled(true);
    }
  });

  await page.evaluate(() => window.__galaxianTest.setPlayerInvincible(true));

  console.log(`\n=== PHASE 5C CHROMIUM SOAK TEST \u2014 10,000 Ticks ===\n`);

  const totalTicks = 10000;
  const checkInterval = 1000;

  for (let tick = checkInterval; tick <= totalTicks; tick += checkInterval) {
    await page.evaluate((n) => window.__galaxianTest.advanceTicks(n), checkInterval);
    console.log(`\n--- Checkpoint: ${tick} / ${totalTicks} ticks ---`);
    await verifyInvariants(page, `${tick}/${totalTicks}`);
  }

  console.log(`\n=== FINAL VERIFICATION ===\n`);

  // Check all errors
  if (consoleErrors.length === 0) pass('no console errors');
  else fail('console errors', consoleErrors.join('; '));

  if (pageErrors.length === 0) pass('no page errors');
  else fail('page errors', pageErrors.join('; '));

  if (requestFailures.length === 0) pass('no request failures');
  else fail('request failures', requestFailures.join('; '));

  // AudioManager consistency
  const audioState = await page.evaluate(() => window.__galaxianTest.getAudioManagerState());
  if (audioState) {
    pass('AudioManager state accessible');
    if (typeof audioState.initialized === 'boolean') pass(`AudioManager initialized=${audioState.initialized}`);
    else fail('AudioManager initialized type');
    if (typeof audioState.muted === 'boolean') pass(`AudioManager muted=${audioState.muted}`);
    else fail('AudioManager muted type');
    if (typeof audioState.audioLocked === 'boolean') pass(`AudioManager audioLocked=${audioState.audioLocked}`);
    else fail('AudioManager audioLocked type');
  } else {
    fail('AudioManager state accessible');
  }

  // No unbounded growth in audio events
  const audioEventCount = await page.evaluate(() => window.__galaxianTest.getAudioEvents().length);
  const snap = await page.evaluate(() => window.__galaxianTest.getSnapshot());
  const totalAudioCount = snap.audioEvents;

  if (typeof totalAudioCount === 'number' && isFinite(totalAudioCount) && totalAudioCount >= 0) {
    pass(`AudioEventBus count=${totalAudioCount} (finite, non-negative)`);
  } else {
    fail('AudioEventBus count', `count=${totalAudioCount}`);
  }

  if (typeof audioEventCount === 'number' && isFinite(audioEventCount) && audioEventCount >= 0) {
    if (audioEventCount < 50000) {
      pass(`AudioEventBus events array length=${audioEventCount} (within bound)`);
    } else {
      fail('AudioEventBus events array length', `${audioEventCount} >= 50000 bound`);
    }
  } else {
    fail('AudioEventBus events array', `length=${audioEventCount}`);
  }

  // Final snapshot invariants
  await verifyInvariants(page, 'final');

  console.log(`\n=== SOAK TEST SUMMARY ===`);
  console.log(`Passed: ${passCount}/${passCount + failCount}`);
  console.log(`Failed: ${failCount}\n`);

  const result = failCount === 0 ? 'COMPLETE' : 'INCOMPLETE';
  console.log(`Verdict: ${result}\n`);

  await browser.close();
  server.close();

  if (failCount > 0) {
    console.log(`${failCount} test(s) failed.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
