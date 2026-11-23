const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [extPath, outDir] = process.argv.slice(2);
  const axe = fs.readFileSync(path.join(outDir, 'axe/node_modules/axe-core/axe.min.js'), 'utf8');
  const ctx = await chromium.launchPersistentContext(path.join(outDir, 'profile-' + Date.now()), {
    headless: true,
    channel: 'chromium',
    args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`, '--lang=en-US'],
    locale: 'en-US',
    viewport: { width: 1280, height: 900 },
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  const base = `chrome-extension://${extId}/library.html`;
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  for (const q of ['dune', 'matrix', 'breaking']) {
    await page.goto(`${base}#/search?q=${q}`);
    await page.waitForSelector('text=Results for');
    await page.waitForTimeout(300);
    for (const b of await page.$$('button[aria-label^="Add"]')) await b.click();
    await page.waitForTimeout(500);
  }
  await page.goto(`${base}#/lists`);
  await page.fill('#new-list', 'Weekend');
  await page.click('button:has-text("Create")');

  const routes = [
    '#/',
    '#/search?q=matrix',
    '#/title/tv/1396',
    '#/title/movie/438631',
    '#/lists',
    '#/settings',
    '#/link',
  ];
  for (const route of routes) {
    await page.goto(`${base}${route}`);
    await page.waitForTimeout(1200);
    await page.evaluate(axe);
    const result = await page.evaluate(async () => {
      const r = await axe.run(document, { resultTypes: ['violations'] });
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
      }));
    });
    console.log(route, 'title=', await page.title(), 'violations:', JSON.stringify(result));
    const name = route.replace(/[^a-z0-9]+/gi, '_') || 'home';
    await page.screenshot({ path: path.join(outDir, `en${name}.png`), fullPage: false });
  }
  // Ancho de móvil
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}#/`);
  await page.waitForTimeout(800);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  console.log('mobile horizontal overflow:', overflow);
  await page.screenshot({ path: path.join(outDir, 'mobile.png') });
  await ctx.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
