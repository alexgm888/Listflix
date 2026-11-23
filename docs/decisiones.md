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

## Worker `listflix-api`

- **Rate limiting:** binding `[[ratelimits]]` de `wrangler.toml` (`name`, `namespace_id`,
  `simple = { limit, period }`; `period` solo admite 10 o 60 s). Se aplica solo a las peticiones
  que no salen de la caché, con la IP de `CF-Connecting-IP` como clave. Límite inicial: 60/min.
- **Peticiones sin cabecera `Origin`** (curl, etc.): se permiten. El filtro de origen no es
  seguridad real y bloquearlas no protege nada; la protección es la caché y el límite por IP.
  Con `Origin` no permitido se responde `403`.
- **`ALLOWED_ORIGINS`** admite comodín final (`chrome-extension://*`), que es el valor por defecto
  para desarrollo. En producción hay que fijar los IDs concretos.
- **`include_adult=false`** se fuerza solo en las búsquedas (en el resto de rutas TMDB no lo usa y
  solo ensuciaría la clave de caché).
- **Validación de valores:** además de filtrar nombres, se validan los valores (`page` 1–500,
  `language` tipo `es-ES`, regiones ISO en mayúsculas, años de 4 cifras, `query` ≤ 200
  caracteres). Un valor inválido devuelve `400`.
- **Errores de TMDB:** no se cachean. `404` se mantiene, `429` se mantiene y el resto se
  devuelve como `502 upstream_error`.
- **Ruta `/configuration`:** queda en la lista blanca, pero la extensión usa tamaños de imagen
  fijos (`w92`, `w185`, `w342`, `w780`, `w1280`), que TMDB mantiene estables, para ahorrar una
  petición.
