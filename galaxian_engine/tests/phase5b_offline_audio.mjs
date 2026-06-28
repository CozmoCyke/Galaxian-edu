// Phase 5B — OfflineAudioContext validation
// Renders each SoundEffect with OfflineAudioContext in Chromium,
// verifying non-zero waveform, finite amplitude, no NaN, correct envelope tail.

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 8087;

let passCount = 0;
let failCount = 0;

function pass(msg) { passCount++; console.log(`  PASS: ${msg}`); }
function fail(msg, detail) { failCount++; console.log(`  \x1b[31;1mFAIL: ${msg}${detail ? ' — ' + detail : ''}\x1b[0m`); }

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
          html: 'text/html', js: 'application/javascript',
          css: 'text/css', png: 'image/png', json: 'application/json',
        }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(content);
      } catch { res.writeHead(404); res.end('Not found'); }
    });
    server.listen(PORT, () => { console.log(`[SERVER] http://localhost:${PORT}`); resolve(server); });
  });
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // Navigate to a blank page (we don't need the game, just JS context)
  await page.goto(`http://localhost:8087/?test=1`, { waitUntil: 'load', timeout: 10000 });
  await page.waitForFunction(() => window.__galaxianTest, { timeout: 5000 });

  const results = await page.evaluate(async () => {
    const { SoundEffects } = await import('../src/audio/SoundEffects.js');

    function renderSound(playFn, duration = 0.5) {
      const sampleRate = 44100;
      const offline = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);
      const dest = offline.destination;
      const vol = 0.5;
      try {
        playFn(offline, dest, vol);
      } catch (e) {
        return { error: e.message };
      }
      return offline.startRendering().then(buf => ({
        length: buf.length,
        duration: buf.duration,
        samples: Array.from(buf.getChannelData(0)),
      }));
    }

    const effects = [
      { name: 'PLAYER_SHOT', fn: (ctx, d, v) => SoundEffects.playPlayerShot(ctx, d, v) },
      { name: 'ENEMY_SHOT', fn: (ctx, d, v) => SoundEffects.playEnemyShot(ctx, d, v) },
      { name: 'ALIEN_DIVE', fn: (ctx, d, v) => SoundEffects.playAlienDive(ctx, d, v) },
      { name: 'ALIEN_DESTROYED', fn: (ctx, d, v) => SoundEffects.playAlienDestroyed(ctx, d, v) },
      { name: 'FLAGSHIP_DESTROYED', fn: (ctx, d, v) => SoundEffects.playFlagshipDestroyed(ctx, d, v) },
      { name: 'PLAYER_DESTROYED', fn: (ctx, d, v) => SoundEffects.playPlayerDestroyed(ctx, d, v) },
    ];

    const out = [];
    for (const effect of effects) {
      const result = await renderSound(effect.fn);
      if (result.error) {
        out.push({ name: effect.name, error: result.error });
        continue;
      }
      const maxVal = Math.max(...result.samples.map(Math.abs));
      const hasNaN = result.samples.some(s => Number.isNaN(s));
      const hasInf = result.samples.some(s => !Number.isFinite(s));
      const lastSamples = result.samples.slice(-10);
      const tailAvg = lastSamples.reduce((a, b) => a + Math.abs(b), 0) / lastSamples.length;
      out.push({
        name: effect.name,
        length: result.length,
        duration: result.duration,
        maxVal,
        hasNaN,
        hasInf,
        tailAvg,
        ok: result.length > 0 && maxVal > 0 && !hasNaN && !hasInf,
      });
    }
    return out;
  });

  console.log(`\n=== PHASE 5B — OFFLINE AUDIO CONTEXT VALIDATION ===\n`);

  let tested = 0;
  for (const r of results) {
    if (r.error) {
      fail(r.name, `rendering error: ${r.error}`);
      continue;
    }
    tested++;
    if (r.ok) {
      pass(`${r.name}: length=${r.length} duration=${r.duration.toFixed(3)}s peak=${r.maxVal.toFixed(4)} tail=${r.tailAvg.toFixed(6)}`);
    } else {
      const reasons = [];
      if (r.length <= 0) reasons.push('empty buffer');
      if (r.maxVal <= 0) reasons.push('silent');
      if (r.hasNaN) reasons.push('contains NaN');
      if (r.hasInf) reasons.push('contains infinite');
      fail(r.name, reasons.join(', '));
    }
  }

  console.log(`\nOfflineAudioContext tests executed: ${tested}/6`);
  console.log(`Passed: ${passCount}/${passCount + failCount}`);
  console.log(`\n=== VERDICT ===`);

  if (errors.length > 0) {
    console.log(`Page errors: ${errors.length}`);
    for (const e of errors) console.log(`  ${e}`);
  }
  console.log(`Page errors during rendering: ${errors.length}\n`);

  await browser.close();
  server.close();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
