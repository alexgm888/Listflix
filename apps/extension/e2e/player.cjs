const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [extPath, outDir] = process.argv.slice(2);
  const video = fs
    .readFileSync(path.join(outDir, 'media/The.Matrix.1999.1080p.webm'))
    .toString('base64');
  const srt = fs.readFileSync(path.join(outDir, 'media/matrix.es.srt')).toString('base64');
  const ctx = await chromium.launchPersistentContext(path.join(outDir, 'profile-' + Date.now()), {
    headless: true,
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
    locale: 'es-ES',
    viewport: { width: 1280, height: 860 },
  });
  // Simula el selector de archivos devolviendo handles reales de OPFS.
  await ctx.addInitScript(() => {
    window.showOpenFilePicker = async (opts) => {
      const root = await navigator.storage.getDirectory();
      const exts = Object.values(opts?.types?.[0]?.accept ?? {}).flat();
      const name = exts.includes('.srt') ? 'matrix.es.srt' : 'The.Matrix.1999.1080p.webm';
      return [await root.getFileHandle(name)];
    };
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  const base = `chrome-extension://${extId}`;
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`${base}/library.html#/`);
  await page.evaluate(
    async ({ video, srt }) => {
      const root = await navigator.storage.getDirectory();
      const write = async (name, b64) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const h = await root.getFileHandle(name, { create: true });
        const w = await h.createWritable();
        await w.write(bytes);
        await w.close();
      };
      await write('The.Matrix.1999.1080p.webm', video);
      await write('matrix.es.srt', srt);
    },
    { video, srt },
  );

  // 1. Flujo de vinculación
  await page.goto(`${base}/library.html#/link`);
  await page.click('text=Elegir archivo de vídeo');
  await page.waitForSelector('text=¿Qué título es?');
  const first = await page.textContent('fieldset ul li:first-child p.font-medium');
  console.log('first candidate:', first);
  await page.screenshot({ path: path.join(outDir, 'link.png'), fullPage: true });
  await page.click('fieldset ul li:first-child label');
  await page.click('button:has-text("Vincular")');
  await page.waitForSelector('h1:has-text("Matrix")');
  console.log('navigated to', page.url().split('#')[1]);

  // 2. Reproducir
  const [player] = await Promise.all([
    ctx.waitForEvent('page'),
    page.click('button:has-text("Reproducir")'),
  ]);
  player.on('pageerror', (e) => console.log('[player pageerror]', e.message));
  await player.waitForSelector('video');
  await player.waitForFunction(() => document.querySelector('video').readyState >= 1);
  console.log('player title:', await player.title());
  await player.click('text=Cargar .srt / .vtt');
  await player.waitForFunction(() => document.querySelector('video').textTracks.length > 0);
  const cue = await player.evaluate(() => {
    const track = document.querySelector('video').textTracks[0];
    return { mode: track.mode, first: track.cues?.[0]?.text, start: track.cues?.[0]?.startTime };
  });
  console.log('subtitle cue:', cue);
  await player.click('button[aria-label^="Retrasar"]');
  const shifted = await player.evaluate(
    () => document.querySelector('video').textTracks[0].cues[0].startTime,
  );
  console.log('cue start after +0.5s:', shifted);
  await player.evaluate(async () => {
    const v = document.querySelector('video');
    v.muted = true;
    v.currentTime = 30;
    await v.play();
  });
  await player.waitForTimeout(6500);
  const posBeforeClose = await player.evaluate(() => document.querySelector('video').currentTime);
  console.log('position before close:', posBeforeClose.toFixed(1));
  await player.screenshot({ path: path.join(outDir, 'player.png') });
  await player.close();

  // 3. Reanudar
  await page.waitForSelector('button:has-text("Continuar desde")');
  console.log('button:', await page.textContent('button:has-text("Continuar desde")'));
  const [player2] = await Promise.all([
    ctx.waitForEvent('page'),
    page.click('button:has-text("Continuar desde")'),
  ]);
  await player2.waitForFunction(() => document.querySelector('video')?.readyState >= 1);
  await player2.waitForTimeout(500);
  const resumed = await player2.evaluate(() => document.querySelector('video').currentTime);
  console.log(
    'resumed at:',
    resumed.toFixed(1),
    'tracks auto-loaded:',
    await player2.evaluate(() => document.querySelector('video').textTracks.length),
  );
  // 4. Al pasar del 90 % se marca como vista
  await player2.evaluate(async () => {
    const v = document.querySelector('video');
    v.muted = true;
    v.currentTime = v.duration * 0.92;
    await v.play();
  });
  await player2.waitForTimeout(1500);
  await player2.close();
  await page.waitForTimeout(500);
  console.log('status:', await page.$eval('select', (s) => s.options[s.selectedIndex].text));
  await ctx.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
