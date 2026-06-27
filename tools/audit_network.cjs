const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const requests = new Map();
  
  page.on('request', request => {
    const url = request.url();
    if (!requests.has(url)) {
      requests.set(url, { status: null, headers: null, size: null });
    }
  });
  
  page.on('response', response => {
    const url = response.url();
    if (requests.has(url)) {
      const entry = requests.get(url);
      entry.status = response.status();
      entry.headers = response.headers();
      entry.size = parseInt(response.headers()['content-length'] || '0');
    }
  });
  
  console.log('Loading page...');
  await page.goto('https://studio2.org.uk/c2/Galaxians/', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  }).catch(e => console.log('Navigation error:', e.message));
  
  console.log('Page loaded. Waiting for game to initialize...');
  await page.waitForTimeout(3000);
  
  // Try to interact with the game
  const canvas = await page.$('canvas');
  if (canvas) {
    const box = await canvas.boundingBox();
    if (box) {
      console.log(`Canvas found at (${box.x}, ${box.y}), size ${box.width}x${box.height}`);
      
      // Click center to start
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(2000);
      
      // Press space/enter to trigger game start
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);
      
      // Move left
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(800);
      await page.keyboard.up('ArrowLeft');
      
      // Shoot
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
      
      // Move right and shoot
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(1000);
      await page.keyboard.up('ArrowRight');
      await page.keyboard.press('Space');
      await page.waitForTimeout(2000);
      await page.keyboard.press('Space');
      
      // Wait for more activity
      await page.waitForTimeout(3000);
    }
  }
  
  console.log('\n=== ALL NETWORK REQUESTS ===\n');
  const sorted = Array.from(requests.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  
  const domainCounts = {};
  
  for (const [url, info] of sorted) {
    const statusStr = info.status ? info.status.toString() : 'PENDING';
    const sizeStr = info.size ? (info.size / 1024).toFixed(1) + 'KB' : '?';
    console.log(`[${statusStr}] ${sizeStr} ${url}`);
    
    const domain = new URL(url).hostname;
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  }
  
  console.log(`\n=== DOMAIN SUMMARY ===\n`);
  for (const [domain, count] of Object.entries(domainCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`${domain}: ${count} requests`);
  }
  
  console.log(`\nTotal unique requests: ${sorted.length}`);
  
  // Check for any errors
  console.log('\n=== ERROR REQUESTS (4xx, 5xx) ===\n');
  let errors = 0;
  for (const [url, info] of sorted) {
    if (info.status && info.status >= 400) {
      console.log(`ERROR ${info.status}: ${url}`);
      errors++;
    }
  }
  if (errors === 0) console.log('None found');
  
  await browser.close();
})();
