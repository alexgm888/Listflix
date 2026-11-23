# Listflix

Extensión de Chrome que funciona como **biblioteca personal de películas y series**: guarda
títulos, organízalos con estados y listas, mira en qué plataforma están disponibles y
reprodúcelos desde tus propios archivos con subtítulos externos.

- Datos del usuario **solo en local** (IndexedDB), con copia de seguridad en JSON.
- Metadatos de [TMDB](https://www.themoviedb.org) a través de un proxy propio en Cloudflare
  Workers (`apps/worker`). El bundle de la extensión no contiene ninguna clave.
- Interfaz en español e inglés.

Documentación:

- [Especificación](docs/especificacion.md)
- [Decisiones de implementación](docs/decisiones.md)
- [Política de privacidad](docs/privacidad.md)
- [Ficha de la Chrome Web Store](docs/tienda.md)

## Requisitos

- Node.js 22+ y pnpm 10+
- Chrome 122+ (File System Access API con permisos persistentes)
- Para el proxy: una cuenta de Cloudflare y un API Read Access Token (v4) de TMDB

## Estructura

```
apps/extension   Extensión (WXT + React + TypeScript + Tailwind + Dexie + TanStack Query)
apps/worker      Cloudflare Worker «listflix-api» (proxy de TMDB)
packages/shared  Tipos de la API y cliente tipado del Worker
docs/            Especificación, decisiones, privacidad y ficha de la tienda
```

## Desarrollo

```sh
pnpm install

# 1. Proxy en local (o usa la API simulada, ver más abajo)
cp apps/worker/.dev.vars.example apps/worker/.dev.vars   # pon tu token de TMDB
pnpm --filter @listflix/worker dev                       # http://localhost:8787

# 2. Extensión
cp apps/extension/.env.example apps/extension/.env       # WXT_API_BASE_URL
pnpm dev                                                 # abre Chrome con la extensión cargada
```

Para cargarla a mano: `pnpm build` y, en `chrome://extensions` (modo desarrollador), "Cargar
descomprimida" con `apps/extension/.output/chrome-mv3`.

**Sin token de TMDB:** `node apps/extension/e2e/mock-api.mjs` levanta una API simulada en
`http://localhost:8788` con unos pocos títulos de ejemplo (compila con
`WXT_API_BASE_URL=http://localhost:8788`).

### Comprobaciones

```sh
pnpm lint            # ESLint
pnpm format:check    # Prettier
pnpm typecheck       # tsc --noEmit en todos los paquetes
pnpm test            # Vitest (extensión, Worker y shared)
pnpm --filter @listflix/extension check:bundle   # el bundle no contiene claves de TMDB
```

Las pruebas E2E con Playwright (opcionales) están en [`apps/extension/e2e`](apps/extension/e2e).

## Despliegue

```sh
# Worker
cd apps/worker
pnpm wrangler secret put TMDB_TOKEN
pnpm deploy                     # anota la URL del Worker

# Extensión (zip para la Chrome Web Store)
cd ../extension
WXT_API_BASE_URL=https://<tu-worker>.workers.dev pnpm zip
pnpm check:bundle
```

Después de publicar, fija en `apps/worker/wrangler.toml` la variable `ALLOWED_ORIGINS` con
`chrome-extension://<ID publicado>` (y el ID de desarrollo) y vuelve a desplegar el Worker.
Antes de publicar, revisa la lista de [`docs/tienda.md`](docs/tienda.md). Dos tareas siguen
pendientes:

- verificar las URLs de búsqueda de cada plataforma;
- poner el logo oficial de TMDB.

## Estado por hitos

| Hito                    | Contenido                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 – Base               | Monorepo pnpm, WXT + React + TS + Tailwind, ESLint, Prettier, Vitest y CI. El icono abre la biblioteca o enfoca la pestaña existente.                                                                         |
| M1 – Worker             | Proxy con lista blanca de rutas y parámetros, caché en el edge con clave normalizada, CORS, límite por IP y errores normalizados. Cliente tipado en `packages/shared`.                                        |
| M2 – Datos              | Esquema Dexie versionado y repositorios: biblioteca, episodios, listas, archivos locales, progreso, caché de plataformas y ajustes.                                                                           |
| M3 – Buscar y guardar   | Búsqueda en TMDB con paginación, "Añadir" con estado inicial y ficha de detalle. Los metadatos se completan en segundo plano.                                                                                 |
| M4 – Biblioteca         | Cuadrícula o lista, filtros combinables guardados en la URL, búsqueda sin tildes, orden y fila "Continuar viendo".                                                                                            |
| M5 – Listas             | Crear, renombrar, borrar y reordenar listas. Orden propio dentro de cada lista y listas elegidas desde la ficha.                                                                                              |
| M6 – Series             | Temporadas y episodios, marcar vistos (por episodio o temporada), "Continuar" y estado calculado (o fijado a mano).                                                                                           |
| M7 – Dónde verlo        | `WatchLinkProvider` con URLs de búsqueda por plataforma (respaldo: página de TMDB), filtro por plataforma, plataformas contratadas y atribuciones.                                                            |
| M8 – Medios locales     | Parser de nombres de archivo, emparejamiento con TMDB y reproductor con reanudación, marca de visto al 90 %, subtítulos SRT/VTT (detección de windows-1252, desfase de ±0,5 s y estilo) y siguiente episodio. |
| M9 – Copia de seguridad | Exportar e importar en JSON (validado con zod), con fusión o reemplazo.                                                                                                                                       |
| M10 – Pulido            | i18n completa (test de claves), accesibilidad (axe sin violaciones), foco y títulos por pantalla, y diseño móvil.                                                                                             |
| M11 – Publicación       | Política de privacidad, textos de la tienda, justificación de permisos, comprobación del bundle, script de capturas y zip de producción.                                                                      |

## Atribuciones

Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica. Los datos de
disponibilidad los proporciona JustWatch. Los nombres y logotipos de las plataformas pertenecen
a sus propietarios.
