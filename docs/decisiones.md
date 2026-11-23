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

## Modelo de datos

- **`LibraryItem.metadataLanguage`** (campo añadido): idioma en que se obtuvieron los metadatos.
  Permite refrescar en segundo plano los títulos cuando cambia el idioma de los metadatos
  (§12).
- **`LocalMedia.handle` es opcional.** La exportación incluye los registros de `LocalMedia` sin
  el handle (`itemKey`, `episodeKey`, `fileName`, `fileSize`). Así el progreso exportado no se
  queda sin dueño, y los archivos quedan "pendientes de volver a vincular" tras importar.
- **`Settings`** añade `subtitleStyle` (tamaño y opacidad del fondo de los subtítulos) y
  `libraryView` (cuadrícula o lista).
- **Episodios:** se guarda un `EpisodeState` por episodio de cada serie de la biblioteca. Se
  sincronizan con TMDB al añadir la serie y al abrir su ficha si los datos tienen más de un día.
  Se conservan los episodios marcados como vistos. La **temporada 0 (especiales) no se sigue**.
- **Estado calculado de una serie:**
  - ningún episodio visto → `pending`;
  - todos los episodios ya emitidos vistos → `watched`;
  - en otro caso → `watching`;
  - `dropped` solo se fija a mano.

  Un episodio cuenta como emitido si su `airDate` es anterior o igual a hoy. Al cambiar el estado
  a mano, `statusIsManual = true`. La ficha ofrece la opción "Automático" para volver a
  calcularlo.

- **"Continuar":** el primer episodio emitido sin ver después del último visto; si no hay ninguno
  después, el primer episodio sin ver.
- **Al añadir una serie con un estado distinto de "Pendiente"**, el estado se considera fijado a
  mano (si no, los episodios lo devolverían a "Pendiente").
- **Revincular un archivo** al mismo destino (película o episodio) reutiliza el registro de
  `LocalMedia`. El progreso solo se conserva si coinciden el nombre y el tamaño del archivo.

## Dónde verlo (M7)

- **Filtro por plataforma:** un título cuenta como disponible en una plataforma si aparece en
  **suscripción, gratis o con anuncios**. El alquiler y la compra no cuentan. Las opciones del
  filtro son las plataformas presentes en la caché de los títulos de la biblioteca, con las
  contratadas primero; el atajo "Mis plataformas" selecciona las contratadas a la vez.
- **Caché de plataformas:** solo se guarda en IndexedDB para los títulos de la biblioteca (se
  borra en cascada al quitar el título). En la ficha de un título no guardado se consultan en
  vivo, sin guardarlas.
- **Título de búsqueda:** el de los detalles en el idioma de metadatos actual. Hay una opción por
  plataforma (`useOriginalTitle`) para usar el título original; de momento solo la tiene
  Crunchyroll.
- **URLs de búsqueda pendientes de verificar.** Desde el entorno de desarrollo no había acceso a
  las webs de las plataformas ni a TMDB, así que **ninguna** entrada del mapa
  (`src/providers/watch-links/search-urls.ts`) está verificada (`verified: false`). Antes de
  publicar, hay que comprobar a mano cada ID con `GET /watch/providers/movie?watch_region=ES` y
  cada URL en el navegador:

  | ID TMDB          | Plataforma                 | Plantilla                                             |
  | ---------------- | -------------------------- | ----------------------------------------------------- |
  | 8, 1796          | Netflix                    | `https://www.netflix.com/search?q={q}`                |
  | 119, 9, 10, 2100 | Prime Video / Amazon Video | `https://www.primevideo.com/search?phrase={q}`        |
  | 337              | Disney+                    | `https://www.disneyplus.com/search?q={q}`             |
  | 1899, 384        | HBO Max                    | `https://play.hbomax.com/search?q={q}`                |
  | 350, 2           | Apple TV+ / Apple TV       | `https://tv.apple.com/search?term={q}`                |
  | 149              | Movistar Plus+             | `https://www.movistarplus.es/buscar?q={q}`            |
  | 63               | Filmin                     | `https://www.filmin.es/buscador?q={q}`                |
  | 1773             | SkyShowtime                | `https://www.skyshowtime.com/es/search?q={q}`         |
  | 35               | Rakuten TV                 | `https://www.rakuten.tv/es/search?q={q}`              |
  | 3                | Google Play Películas      | `https://play.google.com/store/search?q={q}&c=movies` |
  | 192              | YouTube                    | `https://www.youtube.com/results?search_query={q}`    |
  | 283              | Crunchyroll                | `https://www.crunchyroll.com/search?q={q}`            |
  | 531              | Paramount+                 | `https://www.paramountplus.com/search/?q={q}`         |

  Si una URL no funciona, basta con quitarla del mapa: se usará el respaldo (enlace "dónde ver"
  de TMDB).

- **Logo de TMDB:** por la misma falta de acceso, la atribución usa de momento el texto "TMDB"
  con los colores de la marca. Antes de publicar hay que poner el logo oficial
  (`TmdbAttribution.tsx`).

## Medios locales (M8)

- **Selección de episodio al vincular:** se propone la temporada y el episodio extraídos del
  nombre del archivo (`SxxEyy`, `1x02`, `s01.e02`, "Temporada 1 Capítulo 2") y el usuario
  puede corregirlos. La clave del episodio (`tv:id:sXeY`) se puede vincular aunque los episodios
  aún no estén sincronizados.
- **Emparejamiento:** se busca primero por el tipo deducido (serie si hay `SxxEyy`; si no,
  película) con el año, después sin el año y por último con el otro tipo. Los 5 primeros
  resultados se ordenan por coincidencia exacta de título (traducido u original) y año.
- **Al vincular desde `#/link` un título que no está en la biblioteca**, se añade como
  "Pendiente".
- **Permisos:** "Reproducir" pide el permiso de lectura en la página de la biblioteca, dentro del
  clic. Después se abre el reproductor en una pestaña nueva, que solo consulta el permiso. Si no
  lo tiene, muestra un botón "Permitir acceso al archivo" (otro gesto del usuario). Chrome 122+
  recuerda el permiso entre sesiones si el usuario elige "Permitir siempre".
- **Subtítulos:** las pistas se crean con `addTextTrack` y `VTTCue`. El desfase vuelve a crear
  las cues desplazadas, sin recargar el vídeo. Los subtítulos cargados se guardan en
  `LocalMedia.subtitleHandles` y se vuelven a cargar solos si el permiso sigue concedido (si no,
  aparece un botón para cargarlos). El tamaño y la opacidad del fondo (`::cue`) se guardan en
  los ajustes.
- **"Siguiente episodio":** solo aparece si el episodio inmediatamente siguiente (según los
  episodios sincronizados) tiene archivo local.
- **Al empezar a reproducir una película "Pendiente"**, pasa a "Viendo". Al pasar del 90 % se
  marca como vista (película) o se marca el episodio (serie, con recálculo del estado).
- **Compatibilidad:** MP4/M4V, WebM y Ogg se consideran fiables. AVI y WMV, no compatibles. MOV y
  MKV, "inciertos" según `canPlayType`. En todos los casos se intenta reproducir, y el evento
  `error` del `<video>` muestra el aviso definitivo.

## Copia de seguridad (M9)

- **Formato:** el de la §5, más `localMedia` (sin handles; ver "Modelo de datos"). No se exporta
  la caché de plataformas (se vuelve a descargar). En `settings` no van `id` ni
  `schemaVersion`.
- **Fusionar:**
  - títulos: gana el `updatedAt` más reciente;
  - episodios: gana el `watchedAt` más reciente;
  - progreso: gana el `updatedAt` más reciente;
  - listas, elementos de listas y archivos locales: se añaden los que no existen y no se tocan
    los que ya están (no tienen fecha de modificación);
  - se conservan los ajustes actuales;
  - al terminar se recalcula el estado de las series automáticas.
- **Reemplazar:** borra todo y restaura la copia, ajustes incluidos.
- **En los dos modos**, si un archivo local con el mismo ID, nombre y tamaño sigue vinculado en
  este navegador, se conserva su handle.
