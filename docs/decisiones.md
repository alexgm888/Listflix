# Decisiones de implementación

Registro de decisiones que concretan o corrigen la especificación (`docs/especificacion.md`).

## Generales

- **Versiones (nov. 2026):** WXT 0.21, React 19, Tailwind CSS 4 (plugin de Vite, sin
  `tailwind.config`), Dexie 4, TanStack Query 5, React Router 8 (`HashRouter`), i18next 27,
  zod 4, Vitest 5, Wrangler 4.
- **TypeScript 6.0** en lugar de 7.0: `typescript-eslint` todavía no admite TS 7 (peer
  `<6.1.0`).
- **Enrutado:** React Router con `HashRouter`.

## Manifest y permisos

- **No se pide `storage`.** Los datos viven en IndexedDB, que no necesita ese permiso. La Chrome
  Web Store rechaza extensiones que piden permisos que no usan. Se mantiene `unlimitedStorage`.
- **Abrir o enfocar la biblioteca** con `chrome.runtime.getContexts` (Chrome 116+): devuelve las
  pestañas con páginas de la extensión sin el permiso `tabs`. `tabs.query({ url })` ignora el
  filtro de URL sin ese permiso.
