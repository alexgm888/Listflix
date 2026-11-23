# Ficha de la Chrome Web Store

## Datos básicos

- **Nombre:** Listflix
- **Categoría:** Ocio / Entretenimiento
- **Idiomas:** español (predeterminado) e inglés
- **Precio:** gratis
- **Política de privacidad:** URL pública de `docs/privacidad.md` (por ejemplo, la vista del
  archivo en GitHub o una página de GitHub Pages).

## Descripción corta (máx. 132 caracteres)

- **es:** Tu biblioteca personal de películas y series: organiza, encuentra dónde verlas y
  reprodúcelas desde tus archivos.
- **en:** Your personal movie and TV library: organize titles, find where to watch them and play
  your own files.

(Son los textos de `public/_locales/*/messages.json`.)

## Descripción larga (es)

Listflix es tu biblioteca personal de películas y series, directamente en Chrome.

• Busca cualquier película o serie y guárdala con un clic.
• Organízala con estados (pendiente, viendo, vista, abandonada) y listas propias.
• Filtra por tipo, género, estado, plataforma o lista, y ordena como quieras.
• Series con seguimiento por episodio y botón «Continuar» con el siguiente capítulo.
• Mira en qué plataformas está disponible en tu país (suscripción, alquiler, compra o gratis) y
ábrela con un clic.
• Reproduce tus propios archivos de vídeo con subtítulos .srt o .vtt, ajuste de desfase y
reanudación automática.
• Tus datos se quedan en tu navegador: sin cuentas, sin analítica y con copia de seguridad en
JSON.

Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica. Datos de
disponibilidad proporcionados por JustWatch.

## Long description (en)

Listflix is your personal movie and TV library, right in Chrome.

• Search any movie or TV show and save it with one click.
• Organize titles by status (pending, watching, watched, dropped) and with your own lists.
• Filter by type, genre, status, platform or list, and sort the way you like.
• Per-episode tracking for TV shows and an “Up next” button.
• See where each title is available in your country (subscription, rent, buy or free) and open
it with one click.
• Play your own video files with .srt or .vtt subtitles, offset adjustment and automatic resume.
• Your data stays in your browser: no accounts, no analytics, and JSON backups.

This product uses the TMDB API but is not endorsed or certified by TMDB. Availability data
provided by JustWatch.

## Propósito único

Gestionar una biblioteca personal de películas y series: guardarlas y organizarlas, ver dónde
están disponibles y reproducir los archivos locales del usuario.

## Justificación de permisos

| Permiso                   | Justificación                                                                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unlimitedStorage`        | La biblioteca, el progreso y las referencias a archivos locales se guardan en IndexedDB. Sin este permiso, Chrome podría borrarlos si falta espacio en disco, y el usuario perdería su biblioteca. |
| Host `https://<worker>/*` | Única conexión de la extensión: el proxy propio que consulta la API de TMDB (metadatos y plataformas). El proxy guarda la clave de TMDB para que no esté en la extensión.                          |

No se usan scripts de contenido, `tabs`, `<all_urls>`, acceso a `file://` ni código remoto.

## Divulgación de uso de datos (formulario de la tienda)

- No se recogen datos personales, de salud, financieros, de autenticación, de comunicaciones,
  de ubicación, de historial web ni de actividad del usuario.
- Contenido del sitio web: no.
- Se certifica que no se venden ni transfieren datos a terceros, que no se usan para fines
  ajenos al propósito único y que no se usan para evaluar solvencia.

## Capturas (1280 × 800)

Generarlas con datos reales (con el Worker desplegado), en español y en inglés:

1. Biblioteca en cuadrícula con la fila «Continuar viendo».
2. Ficha de una película con «Dónde verlo».
3. Serie con temporadas y episodios.
4. Reproductor con subtítulos.
5. Ajustes (plataformas contratadas y copia de seguridad).

`apps/extension/e2e/store-screenshots.cjs` añade títulos de ejemplo y hace las capturas
automáticamente.

## Lista de comprobación antes de publicar

- [ ] Desplegar el Worker y fijar `ALLOWED_ORIGINS` con el ID publicado (y el de desarrollo).
- [ ] Compilar con `WXT_API_BASE_URL=https://<worker> pnpm --filter @listflix/extension zip`.
- [ ] Sustituir el texto "TMDB" de la atribución por el logo oficial.
- [ ] Verificar a mano los IDs y las URLs de búsqueda de `search-urls.ts` (ver
      `docs/decisiones.md`).
- [ ] Comprobar que ninguna petición del bundle lleva la clave de TMDB (`pnpm check:bundle`).
- [ ] Publicar la política de privacidad en una URL pública.
- [ ] Subir la versión en `apps/extension/package.json`.
