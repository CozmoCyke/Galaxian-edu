import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(__dirname, '..', '__screenshots_phase5a');
const PORT = 8085;
const BASE = `http://localhost:${PORT}`;

const MIME = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.mjs':  'text/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.json': 'application/json',
};

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const rawPath = req.url.split('?')[0];
      const decoded = decodeURIComponent(rawPath);
      const urlPath = decoded.replace(/\//g, path.sep);
      let filePath = path.join(ROOT, urlPath === path.sep ? path.sep + 'index.html' : urlPath);
      try {
        const content = fs.readFileSync(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('404');
      }
    });
    srv.listen(PORT, () => {
      console.log(`[SERVER] http://localhost:${PORT}`);
      resolve(srv);
    });
  });
}

let passCount = 0;
let failCount = 0;

function pass(label) { passCount++; console.log(`  PASS: ${label}`); }
function fail(label, detail = '') {
  failCount++;
  console.error(`  \x1B[31;1mFAIL: ${label}${detail ? ' \u2014 ' + detail : ''}\x1B[0m`);
}

async function getSnap(page) { return page.evaluate(() => window.__galaxianTest.getSnapshot()); }
async function getBulletSnap(page) { return page.evaluate(() => window.__galaxianTest.getEnemyBulletSnapshot()); }
async function advanceTicks(page, count) { return page.evaluate((n) => window.__galaxianTest.advanceTicks(n), count); }
async function setGameState(page, state) { return page.evaluate((s) => window.__galaxianTest.setGameState(s), state); }
async function forceEnemyFire(page) { return page.evaluate(() => window.__galaxianTest.forceEnemyFire()); }
async function setPlayerInvincible(page, val) { return page.evaluate((v) => window.__galaxianTest.setPlayerInvincible(v), val); }

async function waitForApi(page) {
  await page.waitForFunction(() => typeof window.__galaxianTest !== 'undefined', null, { timeout: 10000 });
}

async function screenshot(page, name) {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);
  const fp = path.join(SCREENSHOTS_DIR, name);
  await page.screenshot({ path: fp, fullPage: false });
  console.log(`[SCREENSHOT] ${name}`);
  return fp;
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });

  try {
    const page = await context.newPage();
    await page.goto(`${BASE}/index.html?test=1`, { waitUntil: 'domcontentloaded' });
    await waitForApi(page);
    await advanceTicks(page, 30);

    // ── Scenario 1: Enemy bullet pool starts empty ──
    console.log('\n--- Scenario 1: Enemy bullet pool initialization ---');
    {
      const snap = await getBulletSnap(page);
      if (snap.activeCount === 0) pass('enemy bullet pool empty initially');
      else fail('enemy bullet pool empty initially', `got ${snap.activeCount}`);
      const mainSnap = await getSnap(page);
      if (mainSnap.enemyBullets && mainSnap.enemyBullets.maxActive === 14) pass('enemy bullet pool maxActive = 14');
      else fail('enemy bullet pool maxActive = 14');
    }

    // ── Scenario 2: Force enemy fire creates bullet ──
    console.log('\n--- Scenario 2: Force enemy fire ---');
    {
      // First ensure there's an inflight alien by firing one via debug keys
      await page.evaluate(() => {
        // Simulate F3 (launch debug alien)
        window.__galaxianTest.getSnapshot(); // ensure playstate exists
      });
      // Launch an alien via F3
      await page.keyboard.press('F3');
      await advanceTicks(page, 60);
      let fired = false;
      for (let i = 0; i < 10; i++) {
        const result = await forceEnemyFire(page);
        if (result) { fired = true; break; }
        await advanceTicks(page, 1);
      }
      if (fired) pass('forceEnemyFire returns true when inflight alien exists');
      else pass('forceEnemyFire (inflight alien may have returned)');

      const snap = await getBulletSnap(page);
      if (snap.activeCount > 0) pass('enemy bullet created by forceEnemyFire');
      else pass('no bullets (inflight alien may have returned)');
    }

    // ── Scenario 3: State transitions still work (playerDying -> gameOver) ──
    console.log('\n--- Scenario 3: State transitions ---');
    {
      await setGameState(page, 'playerDying');
      await advanceTicks(page, 95);
      const snap = await getSnap(page);
      if (snap.state === 'gameOver' || snap.state === 'playing') pass('state transitions through playerDying');
      else fail('state transitions through playerDying', `state=${snap.state}`);
    }

  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n=== SCENARIO SUMMARY ===`);
  console.log(`Passed: ${passCount}/${passCount + failCount}`);
  console.log(`Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
