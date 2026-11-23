# Listflix

Extensión de Chrome que funciona como **biblioteca personal de películas y series**: guarda
títulos, organízalos con estados y listas, mira en qué plataforma están disponibles y
reprodúcelos desde tus propios archivos con subtítulos externos.

- Datos del usuario **solo en local** (IndexedDB).
- Metadatos de [TMDB](https://www.themoviedb.org) a través de un proxy propio en Cloudflare
  Workers (`apps/worker`). El bundle de la extensión no contiene ninguna clave.
- Interfaz en español e inglés.

Especificación: [`docs/especificacion.md`](docs/especificacion.md) ·
Decisiones: [`docs/decisiones.md`](docs/decisiones.md)

## Requisitos

- Node.js 22+ y pnpm 10+
- Chrome 122+ (File System Access API con permisos persistentes)

## Puesta en marcha

```sh
pnpm install
cp apps/extension/.env.example apps/extension/.env   # URL del Worker
pnpm dev                                             # abre Chrome con la extensión cargada
```

Para cargarla a mano: `pnpm build` y, en `chrome://extensions` (modo desarrollador), "Cargar
descomprimida" con `apps/extension/.output/chrome-mv3`.

## Estado por hitos

- **M0 – Base:** monorepo pnpm, WXT + React + TS + Tailwind, ESLint, Prettier, Vitest y CI. El
  icono abre la biblioteca o enfoca la pestaña si ya está abierta.
- **M1 – Worker:** proxy de TMDB en Cloudflare Workers con lista blanca de rutas y parámetros,
  caché en el edge con clave normalizada, CORS, límite por IP y errores normalizados. Cliente
  tipado en `packages/shared`.

## Worker (proxy de TMDB)

```sh
cd apps/worker
cp .dev.vars.example .dev.vars        # pon tu API Read Access Token (v4) de TMDB
pnpm dev                              # http://localhost:8787
pnpm wrangler secret put TMDB_TOKEN   # producción
pnpm deploy
```

Después del primer despliegue, ajusta `ALLOWED_ORIGINS` en `wrangler.toml` con el ID de la
extensión publicada y pon la URL del Worker en `WXT_API_BASE_URL` al compilar la extensión.

### Datos (M2)

Esquema Dexie versionado (`apps/extension/src/db/db.ts`) y repositorios para biblioteca,
episodios (con estado calculado de series), listas, archivos locales, progreso, caché de
plataformas y ajustes.

### Buscar y guardar (M3)

Búsqueda en TMDB (`search/multi`) con paginación, "Añadir" con estado inicial y ficha de detalle
(póster, fondo, sinopsis, géneros, duración o temporadas, reparto y nota). Al añadir un título se
completan sus metadatos en segundo plano. La interfaz está en español e inglés con i18next.

### Biblioteca (M4)

Cuadrícula o lista, filtros combinables (tipo, estado, género, plataforma, disponible en local y
lista), búsqueda de texto sin tildes, orden por fecha de añadido, título, año o nota, y fila
"Continuar viendo". Los filtros viven en la URL (`#/?type=tv&status=watching…`).

`node apps/extension/e2e/mock-api.mjs` levanta una API simulada en `http://localhost:8788` para
probar la extensión sin token de TMDB
(`WXT_API_BASE_URL=http://localhost:8788 pnpm build`).

### Listas personales (M5)

Crear, renombrar, borrar y reordenar listas (`#/lists`). Cada lista tiene su orden propio
(`#/lists/:id`). Un título puede estar en varias listas, que se eligen desde su ficha. La
biblioteca filtra por lista.

### Series (M6)

Temporadas y episodios en la ficha, con marca de visto por episodio o por temporada completa,
bloque "Continuar" con el siguiente episodio y estado global calculado (o fijado a mano, con
opción de volver a "Automático").

### Dónde verlo (M7)

Plataformas de suscripción, gratis, con anuncios, alquiler y compra según el país configurado,
con botón "Ver en …" que abre la búsqueda en esa plataforma (o la página de TMDB como respaldo).
Filtro por plataforma en la biblioteca, plataformas contratadas en Ajustes y atribuciones a TMDB
y JustWatch. **Las URLs de búsqueda están pendientes de verificar**: ver
[`docs/decisiones.md`](docs/decisiones.md).

### Medios locales (M8)

Vincula vídeos de tu equipo (`#/link` o desde la ficha): Listflix analiza el nombre del archivo
(título, año, `SxxEyy`), propone las 5 fichas que mejor coinciden y guarda el
`FileSystemFileHandle` en IndexedDB. El reproductor propio (`player.html`):

- reanuda desde la última posición;
- marca como visto al pasar del 90 %;
- carga subtítulos `.srt`/`.vtt` (con detección de windows-1252) y ajusta su desfase en pasos de
  ±0,5 s;
- ajusta el tamaño y el fondo de los subtítulos;
- ofrece "Siguiente episodio".

### Copia de seguridad (M9)

En Ajustes, "Exportar biblioteca" descarga un JSON y "Importar copia…" lo valida con zod y
permite **fusionar** (gana la versión más reciente) o **reemplazar**. Los archivos locales no se
exportan: quedan pendientes de volver a vincular.
