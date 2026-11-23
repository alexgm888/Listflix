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
  await page.goto(`chrome-extension://${extId}/library.html#/title/tv/1396`);
  await page.click('button[aria-label*="Breaking Bad"]');
  await page.waitForSelector('text=Continuar');
  console.log('next before:', await page.textContent('#episodes p.text-lg'));
  await page.click('text=Marcar temporada como vista');
  await page.waitForSelector('#episodes p.text-lg:has-text("T2E1")');
  console.log('next after:', await page.textContent('#episodes p.text-lg'));
  console.log('status select:', await page.$eval('select', (s) => s.options[s.selectedIndex].text));
  await page.screenshot({ path: path.join(outDir, 'series.png'), fullPage: true });
  await page.goto(`chrome-extension://${extId}/library.html#/`);
  await page.waitForSelector('text=Continuar viendo');
  console.log('continue row:', await page.textContent('#continue-title + ul'));
  await ctx.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
