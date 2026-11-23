# Pruebas E2E (opcionales)

Scripts de Playwright que cargan la extensión compilada en Chromium y recorren los criterios de
aceptación principales contra la API simulada (`mock-api.mjs`). Playwright no es dependencia del
proyecto (es pesada): hay que tenerlo instalado aparte, con un Chromium que admita extensiones
(`channel: 'chromium'`).

```sh
node apps/extension/e2e/mock-api.mjs 8788 &
cd apps/extension && WXT_API_BASE_URL=http://localhost:8788 pnpm build && cd ../..

OUT=$(mktemp -d)   # perfiles temporales, capturas y medios de prueba
EXT=apps/extension/.output/chrome-mv3

node apps/extension/e2e/series.cjs      $EXT $OUT   # T1 completa → «Continuar» muestra T2E1
node apps/extension/e2e/watch-links.cjs $EXT $OUT   # filtro «Netflix» y «Ver en Netflix»

# Reproductor: necesita un vídeo y un .srt en windows-1252 en $OUT/media
mkdir -p $OUT/media
ffmpeg -f lavfi -i testsrc=duration=60:size=320x240:rate=10 -f lavfi -i sine=duration=60 \
  -c:v libvpx -b:v 80k -c:a libvorbis -shortest "$OUT/media/The.Matrix.1999.1080p.webm"
python3 -c "open('$OUT/media/matrix.es.srt','wb').write('1\r\n00:00:01,000 --> 00:00:20,000\r\nAcción: ¿dónde está Neo?\r\n'.encode('cp1252'))"
node apps/extension/e2e/player.cjs      $EXT $OUT   # vincular, reproducir, subtítulos, reanudar, 90 %

# Accesibilidad (axe-core instalado en $OUT/axe: cd $OUT/axe && npm i axe-core)
node apps/extension/e2e/a11y.cjs        $EXT $OUT
```

`player.cjs` sustituye `showOpenFilePicker` por handles reales del Origin Private File System,
así que prueba el flujo completo sin diálogos del sistema.
