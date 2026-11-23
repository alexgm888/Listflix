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
