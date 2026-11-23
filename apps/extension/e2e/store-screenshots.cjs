// Capturas de 1280×800 para la Chrome Web Store.
// Uso: node e2e/store-screenshots.cjs <ruta-extensión> <carpeta-salida> [es|en] [títulos…]
// Compila antes la extensión apuntando al Worker real para que se vean los pósters.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const [extPath, outDir, lang = 'es', ...queries] = process.argv.slice(2);
  const titles = queries.length
    ? queries
    : ['Dune', 'The Matrix', 'Breaking Bad', 'Arrival', 'Dark'];
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const ctx = await chromium.launchPersistentContext(
    path.join(outDir, `profile-shots-${Date.now()}`),
    {
      headless: true,
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${extPath}`,
        `--load-extension=${extPath}`,
        `--lang=${locale}`,
      ],
      locale,
      viewport: { width: 1280, height: 800 },
    },
  );
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const base = `chrome-extension://${new URL(sw.url()).host}/library.html`;
  const page = await ctx.newPage();

  for (const q of titles) {
    await page.goto(`${base}#/search?q=${encodeURIComponent(q)}`);
    const add = page.locator('main ul li button.btn-primary').first();
    await add.waitFor({ timeout: 15000 }).catch(() => {});
    if (await add.count()) await add.click();
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(3000); // metadatos y plataformas en segundo plano

  const shots = [
    ['1-biblioteca', '#/'],
    ['2-ficha', null],
    ['3-ajustes', '#/settings'],
  ];
  for (const [name, route] of shots) {
    if (route) await page.goto(`${base}${route}`);
    else await page.click('main ul li a >> nth=0');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outDir, `${lang}-${name}.png`) });
  }
  await ctx.close();
  console.log(`Capturas guardadas en ${outDir}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
