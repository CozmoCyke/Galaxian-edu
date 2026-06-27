const { chromium } = require('C:/dev/galaxian-edu/tools/node_modules/playwright');
const { spawn } = require('child_process');
const path = require('path');

const ENGINE_DIR = path.resolve(__dirname, '..');

async function main() {
  console.log('Starting server...');
  const server = spawn('python', ['-m', 'http.server', '8082', '--bind', '127.0.0.1'], {
    cwd: ENGINE_DIR,
    stdio: 'pipe',
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const requests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('requestfailed', req => {
    requests.push({ url: req.url(), error: req.failure().errorText });
  });
  page.on('response', resp => {
    if (resp.status() >= 400) {
      requests.push({ url: resp.url(), status: resp.status() });
    }
  });

  try {
    await page.goto('http://127.0.0.1:8082/', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(ENGINE_DIR, 'tests', 'screenshot.png') });

    console.log(`URL: ${page.url()}`);
    console.log(`Title: ${await page.title()}`);

    const errorCount = errors.length;
    const requestErrors = requests.filter(r => r.status >= 400 || r.error).length;

    console.log(`Console errors: ${errorCount}`);
    console.log(`Failed requests: ${requestErrors}`);

    if (errors.length > 0) {
      console.log('Console errors:');
      errors.forEach(e => console.log(`  ${e}`));
    }
    if (requests.length > 0) {
      console.log('Request issues:');
      requests.forEach(r => console.log(`  ${r.url} — ${r.status || r.error}`));
    }

    const gameState = await page.evaluate(() => {
      return {
        hasGame: typeof window.Game !== 'undefined' || document.querySelector('canvas') !== null,
        canvasCount: document.querySelectorAll('canvas').length,
        canvasWidth: document.getElementById('gameCanvas')?.width,
        canvasHeight: document.getElementById('gameCanvas')?.height,
      };
    });
    console.log(`Canvas count: ${gameState.canvasCount}`);
    console.log(`Game canvas: ${gameState.canvasWidth}x${gameState.canvasHeight}`);

    await browser.close();

    const failed = errorCount > 0 || requestErrors > 0;
    process.exit(failed ? 1 : 0);

  } catch (err) {
    console.error('Test failed:', err.message);
    await browser.close();
    server.kill();
    process.exit(1);
  } finally {
    server.kill();
  }
}

main();