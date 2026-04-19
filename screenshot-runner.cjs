const { chromium } = require('playwright');
const BASE = 'http://localhost:5173';
const OUT = '/tmp/ff-screenshots';

(async () => {
  const { mkdirSync } = require('fs');
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  async function shot(name) {
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    console.log(`shot: ${name}`);
  }

  // ── Logged-out pages ─────────────────────────────────────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await shot('00-home-loggedout');

  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await shot('10-signin');

  await page.goto(`${BASE}/sign-up`, { waitUntil: 'networkidle' });
  await shot('11-signup');

  // ── Sign in ──────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'test@formulafantasy.dev');
  await page.fill('input[type="password"]', 'TestPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 8000 });
  await page.waitForTimeout(800);

  // ── Authenticated pages ───────────────────────────────────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await shot('20-home-loggedin');

  await page.goto(`${BASE}/results`, { waitUntil: 'networkidle' });
  await shot('21-results');

  await page.goto(`${BASE}/leagues`, { waitUntil: 'networkidle' });
  await shot('22-leagues');

  await page.goto(`${BASE}/leagues/create`, { waitUntil: 'networkidle' });
  await shot('23-create-league');

  await page.goto(`${BASE}/join`, { waitUntil: 'networkidle' });
  await shot('24-join');

  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
  await shot('25-profile');

  await browser.close();
  console.log('done — screenshots in', OUT);
})();
