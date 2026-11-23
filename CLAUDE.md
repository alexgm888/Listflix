# CLAUDE.md — Convenciones de Listflix

Listflix es una extensión de Chrome (MV3) que funciona como biblioteca personal de películas y
series. La especificación completa está en `docs/especificacion.md`; las decisiones que se apartan
de ella o la concretan, en `docs/decisiones.md`.

## Estructura

- `apps/extension`: extensión (WXT + React + TypeScript + Tailwind v4).
  - `entrypoints/`: `background.ts`, `library/` (SPA principal, hash routing) y `player/`.
  - `src/domain`: tipos del modelo de datos.
  - `src/db`: esquema Dexie y repositorios (lógica de datos, sin React).
  - `src/providers/metadata`: `MetadataProvider` + implementación TMDB (vía Worker).
  - `src/providers/watch-links`: `WatchLinkProvider` + `SearchUrlWatchLinkProvider` y mapa de URLs.
  - `src/local-media`, `src/subtitles`, `src/backup`: lógica pura y testeada.
  - `src/features/*`: pantallas React (finas; la lógica va en los módulos anteriores).
  - `src/i18n`: recursos `es.json` y `en.json` (i18next).
- `apps/worker`: Cloudflare Worker `listflix-api` (proxy de TMDB con lista blanca y caché).
- `packages/shared`: tipos de la API (DTOs de TMDB) y cliente tipado del Worker.

## Comandos

```sh
pnpm install
pnpm dev            # extensión en modo desarrollo (WXT)
pnpm test           # Vitest en todos los paquetes
pnpm typecheck      # tsc --noEmit en todos los paquetes
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm --filter @listflix/worker dev   # Worker en local (necesita .dev.vars con TMDB_TOKEN)
```

## Reglas

- TypeScript `strict`, sin `any` implícitos. Los tipos de TMDB se definen a mano en
  `packages/shared`, solo con los campos que se usan.
- La lógica de negocio no depende de React y se testea con Vitest. Los componentes son finos.
- Ninguna clave ni secreto en el repositorio. Variables en `.env.example` / `.dev.vars.example`.
- Commits pequeños por hito o funcionalidad, con mensajes en español.
- Textos de interfaz siempre con i18next (`t('...')`), en `es.json` y `en.json` a la vez.
- Antes de añadir un permiso al manifest, una dependencia pesada o un servicio externo, consultar
  con el autor.
- Si algo de la especificación resulta incorrecto al implementarlo, verificarlo, corregirlo y
  anotarlo en `docs/decisiones.md`.
- Cada hito termina con tests en verde, `tsc` sin errores y lint limpio.
