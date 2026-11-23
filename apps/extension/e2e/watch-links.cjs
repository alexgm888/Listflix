const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [extPath, outDir] = process.argv.slice(2);
  const ctx = await chromium.launchPersistentContext(path.join(outDir, 'profile-' + Date.now()), {
    headless: true,
    channel: 'chromium',
    args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
    locale: 'es-ES',
    viewport: { width: 1300, height: 1000 },
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const base = `chrome-extension://${extId}/library.html`;
  for (const q of ['dune', 'matrix', 'breaking']) {
    await page.goto(`${base}#/search?q=${q}`);
    await page.waitForSelector('text=Resultados para');
    await page.waitForTimeout(300);
    for (const b of await page.$$('button[aria-label^="Añadir"]')) await b.click();
    await page.waitForTimeout(400);
  }
  await page.goto(`${base}#/`);
  await page.waitForSelector('button.chip:has-text("Netflix")');
  await page.click('button.chip:has-text("Netflix")');
  await page.waitForTimeout(300);
  const titles = await page.$$eval('main ul li p.font-medium', (els) =>
    els.map((e) => e.textContent),
  );
  console.log('filtered by Netflix:', titles, 'url:', page.url().split('#')[1]);
  await page.screenshot({ path: path.join(outDir, 'filter-netflix.png') });
  await page.goto(`${base}#/title/movie/603`);
  await page.waitForSelector('text=Ver en Netflix');
  const href = await page.getAttribute('a:has-text("Ver en Netflix")', 'href');
  const [newPage] = await Promise.all([
    ctx.waitForEvent('page'),
    page.click('a:has-text("Ver en Netflix")'),
  ]);
  console.log('href:', href, 'opened tab:', newPage.url());
  await page.screenshot({ path: path.join(outDir, 'where.png'), fullPage: true });
  await page.goto(`${base}#/settings`);
  await page.waitForSelector('text=Mis plataformas');
  await page.click('label:has-text("Netflix") input');
  await page.waitForFunction(() =>
    document.querySelector('#settings-providers')?.parentElement?.querySelector('input:checked'),
  );
  console.log('provider checkbox saved');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, 'settings.png'), fullPage: true });
  await ctx.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
