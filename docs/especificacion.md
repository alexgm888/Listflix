# Listflix — Especificación del proyecto

> Documento de referencia para desarrollar Listflix con Claude Code.
> Contiene la idea, el alcance de la v1, la arquitectura, el modelo de datos y el plan de trabajo.
> Si algo no está definido aquí, pregunta antes de decidir, sobre todo si afecta a la arquitectura o a los datos.

---

## 1. Concepto

Listflix es una **extensión de Chrome** que funciona como una **biblioteca personal de películas y series**.

El usuario guarda los títulos que le interesan, los organiza con estados, listas y filtros, y desde la biblioteca:

- **abre el título en la plataforma de streaming** donde está disponible (Netflix, Prime Video, Disney+…), o
- **lo reproduce desde un archivo local** de su equipo, con subtítulos externos.

### Caso de uso principal

1. El usuario quiere ver algo y hace clic en el icono de Listflix en Chrome.
2. Se abre una **pestaña** con su biblioteca.
3. Filtra o entra en una de sus listas y elige un título.
4. Pulsa "Ver en Netflix" (u otra plataforma), o "Reproducir" si tiene un archivo local vinculado.
5. Se abre la plataforma con el título buscado, o arranca el reproductor propio de Listflix.

### Decisiones tomadas

| Tema                          | Decisión                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Destino                       | Publicación en la Chrome Web Store, uso gratuito. **Sin monetización** por ahora                                                                            |
| Datos del usuario             | **Solo en local** (IndexedDB). Sin cuentas ni backend de usuarios. Copia de seguridad con exportar e importar en JSON                                       |
| Enlaces a plataformas         | **v1: abrir la búsqueda de la plataforma** con el título. Diseño desacoplado para pasar después a enlaces directos (Watchmode o Streaming Availability API) |
| Series                        | Seguimiento **por episodio**                                                                                                                                |
| Idiomas                       | **Español e inglés** desde la v1 (interfaz y metadatos de TMDB)                                                                                             |
| Fuente de metadatos           | **TMDB**, a través de un proxy propio en Cloudflare Workers                                                                                                 |
| Disponibilidad en plataformas | Endpoint `watch/providers` de TMDB (datos de JustWatch)                                                                                                     |
| Interfaz                      | Página propia de la extensión, que se abre en una pestaña al pulsar el icono. Sin popup                                                                     |

---

## 2. Alcance

### 2.1 Incluido en la v1 (MVP)

**Buscar y guardar**

- Búsqueda en TMDB (`search/multi`) con resultados de películas y series: póster, título, año y tipo.
- Añadir a la biblioteca con un clic, eligiendo un estado inicial (por defecto, "Pendiente").
- Ficha de detalle: póster, fondo, sinopsis, géneros, duración o temporadas, reparto principal, nota de TMDB y plataformas disponibles.

**Biblioteca**

- Vista en cuadrícula de pósters, con alternativa en lista.
- Filtros combinables:
  - tipo (película o serie);
  - estado;
  - género;
  - plataforma disponible en el país configurado;
  - "disponible en local";
  - lista personal.
- Búsqueda de texto dentro de la biblioteca.
- Orden por fecha de añadido, título, año o nota.

**Estados**

- Películas: `pendiente`, `viendo`, `vista`, `abandonada`.
- Series: estado global con los mismos valores, más un seguimiento por episodio:
  - marcar episodios o temporadas completas como vistos;
  - "Continuar": muestra el siguiente episodio sin ver;
  - el estado global se calcula a partir de los episodios. Si el usuario lo cambia a mano, se respeta su elección.

**Listas personales**

- Crear, renombrar, borrar y reordenar listas.
- Un título puede estar en varias listas.

**Dónde verlo**

- Plataformas de suscripción, alquiler, compra y gratuitas, según el país configurado (por defecto, `ES`).
- Logos de las plataformas obtenidos de TMDB.
- Botón por plataforma: abre una pestaña nueva con la URL de búsqueda de esa plataforma (ver §6).
- Atribución obligatoria a JustWatch y TMDB (ver §11).

**Medios locales**

- Vincular un archivo de vídeo local a una película o a un episodio concreto.
- Flujo de vinculación:
  1. El usuario elige el archivo con `showOpenFilePicker`.
  2. Listflix analiza el nombre del archivo (título, año, `SxxEyy`).
  3. Propone la ficha de TMDB que coincide.
  4. El usuario confirma la ficha o elige otra.
- También se puede vincular desde la ficha de un título ya guardado.
- Reproductor propio en una página de la extensión:
  - `<video>` alimentado con `URL.createObjectURL(file)`;
  - subtítulos externos `.srt` o `.vtt`, cargados por el usuario (la conversión de SRT a VTT se hace en el cliente);
  - ajuste del desfase de los subtítulos (±0,5 s) con `TextTrack` y `VTTCue`;
  - **reanudar** desde la última posición (guardada cada ~5 s y al cerrar);
  - al pasar del 90 % de la duración, se marca como visto;
  - en series, botón "Siguiente episodio" si el siguiente también tiene archivo local.
- Si el formato no es compatible (por ejemplo, AVI o algunos MKV), se muestra un mensaje claro. No se transcodifica en la v1.

**Ajustes**

- Idioma de la interfaz y de los metadatos (`es-ES` o `en-US`).
- País para la disponibilidad en plataformas.
- Plataformas que tiene contratadas el usuario (para destacarlas y filtrarlas).
- Exportar e importar la biblioteca en JSON. Los handles de archivos locales no se exportan: hay que volver a vincular los archivos.

### 2.2 Fuera de la v1 (fases posteriores)

- Escaneo automático de carpetas con detección masiva de títulos.
- Enlaces directos al título dentro de la plataforma (Watchmode o Streaming Availability API).
- Sincronización entre equipos y cuentas de usuario.
- Transcodificación de formatos no compatibles (ffmpeg.wasm).
- Subtítulos `.ass`/`.ssa` con estilos y subtítulos incrustados en MKV.
- Recomendaciones, avisos de "llega a tu plataforma" y estadísticas.
- Side panel.

---

## 3. Arquitectura

```
┌───────────────────────────────── Extensión Chrome (MV3) ─────────────────────────────────┐
│                                                                                           │
│  background (service worker)        library page (pestaña)          player page (pestaña)│
│  - action.onClicked → abre/enfoca   - React SPA                      - <video> + subtítulos│
│    la pestaña de la biblioteca      - búsqueda, biblioteca, fichas   - lee File desde      │
│                                     - ajustes, import/export           FileSystemFileHandle│
│                                                                                           │
│                       IndexedDB (Dexie): biblioteca, episodios, listas,                   │
│                       handles de archivos, progreso, caché de metadatos                   │
└───────────────────────────────────────────┬───────────────────────────────────────────────┘
                                            │ HTTPS (fetch)
                                            ▼
                              Cloudflare Worker "listflix-api"
                              - guarda el token de TMDB (secreto)
                              - lista blanca de endpoints y parámetros
                              - caché en el edge
                                            │
                                            ▼
                                   api.themoviedb.org/3

  Las imágenes se cargan directamente de image.tmdb.org (no necesitan clave).
```

### Principios

- **Local primero:** todo lo del usuario vive en su navegador. El Worker solo hace de intermediario con TMDB y no guarda datos del usuario.
- **Proveedores desacoplados:** los metadatos (`MetadataProvider`) y los enlaces a plataformas (`WatchLinkProvider`) se definen como interfaces. Así se puede cambiar de proveedor (por ejemplo, a Watchmode) sin tocar la interfaz.
- **Sin clave en el cliente:** el bundle de la extensión nunca contiene credenciales.

---

## 4. Stack y estructura

### Stack

| Área                   | Tecnología                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Framework de extensión | [WXT](https://wxt.dev) (Manifest V3, Vite)                                                                    |
| UI                     | React 18+ y TypeScript (`strict`)                                                                             |
| Estilos                | Tailwind CSS                                                                                                  |
| Estado del servidor    | TanStack Query (caché de las llamadas a TMDB)                                                                 |
| Persistencia           | Dexie (IndexedDB) y `dexie-react-hooks`                                                                       |
| Enrutado               | React Router, o TanStack Router con hash history                                                              |
| i18n                   | i18next con react-i18next. Los `_locales` de Chrome se usan solo para el nombre y la descripción del manifest |
| Tests                  | Vitest y Testing Library. Playwright opcional para E2E                                                        |
| Proxy                  | Cloudflare Workers, TypeScript, Wrangler                                                                      |
| Calidad                | ESLint, Prettier y `tsc --noEmit` en CI                                                                       |

> Comprueba las versiones actuales de cada librería al iniciar el proyecto. Si alguna decisión de esta tabla ya no tiene sentido (por ejemplo, una librería abandonada), coméntalo antes de sustituirla.

### Estructura propuesta (monorepo con pnpm workspaces)

```
listflix/
├─ apps/
│  ├─ extension/                 # WXT
│  │  ├─ entrypoints/
│  │  │  ├─ background.ts        # action.onClicked → abrir/enfocar library.html
│  │  │  ├─ library/             # página principal (React)
│  │  │  └─ player/              # reproductor (React)
│  │  ├─ src/
│  │  │  ├─ db/                  # esquema Dexie, migraciones, repositorios
│  │  │  ├─ providers/
│  │  │  │  ├─ metadata/         # MetadataProvider + TmdbMetadataProvider
│  │  │  │  └─ watch-links/      # WatchLinkProvider + SearchUrlWatchLinkProvider
│  │  │  ├─ local-media/         # file handles, permisos, parser de nombres
│  │  │  ├─ subtitles/           # srt→vtt, carga y desfase
│  │  │  ├─ features/            # search, library, title-detail, lists, settings, backup
│  │  │  ├─ components/
│  │  │  ├─ i18n/                # es.json, en.json
│  │  │  └─ lib/
│  │  ├─ public/_locales/{es,en}/messages.json
│  │  └─ wxt.config.ts
│  └─ worker/                    # Cloudflare Worker (proxy TMDB)
│     ├─ src/index.ts
│     └─ wrangler.toml
├─ packages/
│  └─ shared/                    # tipos compartidos (DTOs de la API del Worker)
├─ CLAUDE.md
└─ README.md
```

---

## 5. Modelo de datos (IndexedDB con Dexie)

Los IDs de TMDB se combinan con el tipo para evitar colisiones: `movie:550` o `tv:1399`.

```ts
type MediaType = 'movie' | 'tv';
type WatchStatus = 'pending' | 'watching' | 'watched' | 'dropped';

interface LibraryItem {
  key: string; // `${mediaType}:${tmdbId}` (PK)
  mediaType: MediaType;
  tmdbId: number;
  title: string; // en el idioma configurado al guardar
  originalTitle: string;
  year?: number;
  posterPath?: string; // ruta de TMDB; la URL se construye en el cliente
  backdropPath?: string;
  genreIds: number[];
  voteAverage?: number;
  runtime?: number; // películas, en minutos
  numberOfSeasons?: number; // series
  status: WatchStatus;
  statusIsManual: boolean; // true si el usuario fijó el estado a mano
  addedAt: number; // epoch ms
  updatedAt: number;
  lastWatchedAt?: number;
  metadataFetchedAt: number; // para refrescar los datos de TMDB cada cierto tiempo
}

interface EpisodeState {
  key: string; // `tv:${tmdbId}:s${season}e${episode}` (PK)
  seriesKey: string; // índice
  season: number;
  episode: number;
  name?: string;
  airDate?: string;
  watched: boolean;
  watchedAt?: number;
}

interface UserList {
  id: string; // uuid (PK)
  name: string;
  order: number;
  createdAt: number;
}

interface ListItem {
  id: string; // `${listId}|${itemKey}` (PK)
  listId: string; // índice
  itemKey: string; // índice
  order: number;
  addedAt: number;
}

interface LocalMedia {
  id: string; // uuid (PK)
  itemKey: string; // índice: `movie:…` o `tv:…`
  episodeKey?: string; // índice, solo para series
  fileName: string;
  fileSize: number;
  handle: FileSystemFileHandle; // se puede guardar en IndexedDB
  subtitleHandles?: { lang?: string; label: string; handle: FileSystemFileHandle }[];
  linkedAt: number;
}

interface PlaybackProgress {
  localMediaId: string; // PK
  positionSec: number;
  durationSec: number;
  updatedAt: number;
}

interface WatchProvidersCache {
  key: string; // `${itemKey}:${country}` (PK)
  data: WatchProvidersByType; // { flatrate, rent, buy, free, ads, tmdbLink }
  fetchedAt: number; // TTL: 24 h
}

interface Settings {
  id: 'singleton';
  uiLanguage: 'es' | 'en';
  metadataLanguage: 'es-ES' | 'en-US';
  country: string; // ISO 3166-1, por defecto 'ES'
  myProviderIds: number[]; // plataformas contratadas (IDs de proveedor de TMDB)
  schemaVersion: number;
}
```

- Índices clave: `status`, `mediaType`, `addedAt`, `*genreIds` (multi-entry), `lastWatchedAt`.
- El filtro por plataforma se calcula cruzando con `WatchProvidersCache`. Si un título no tiene caché o está caducada, se refresca en segundo plano con un límite de concurrencia.
- Las migraciones se versionan con Dexie desde el día 1.

### Formato de exportación (JSON)

```json
{
  "app": "listflix",
  "formatVersion": 1,
  "exportedAt": "2026-11-16T10:00:00Z",
  "settings": { "...": "..." },
  "items": [],
  "episodes": [],
  "lists": [],
  "listItems": [],
  "progress": []
}
```

- Se excluyen los `handle` de `LocalMedia`. Solo se exportan `fileName` y `fileSize`, como pista para volver a vincular.
- La importación valida el formato con zod y ofrece dos modos: **fusionar** (gana el `updatedAt` más reciente) o **reemplazar**.

---

## 6. Enlaces a plataformas

### Interfaz

```ts
interface WatchLink {
  providerId: number; // ID de proveedor de TMDB
  providerName: string;
  logoPath?: string;
  type: 'flatrate' | 'rent' | 'buy' | 'free' | 'ads';
  url: string; // URL que se abre
  isDirect: boolean; // v1: false (búsqueda); futuro: true (deep link)
}

interface WatchLinkProvider {
  getLinks(item: LibraryItem, country: string): Promise<WatchLink[]>;
}
```

### Implementación de la v1: `SearchUrlWatchLinkProvider`

1. Pide `/{type}/{id}/watch/providers` al Worker y se queda con el país configurado.
2. Para cada proveedor, construye la URL de búsqueda con un **mapa configurable** `providerId → plantilla de URL`, en un fichero como `watch-links/search-urls.ts`:

```ts
// {q} = título codificado con encodeURIComponent.
// IMPORTANTE: comprueba manualmente cada ID y cada URL antes de darlos por buenos.
// Los IDs se obtienen de GET /watch/providers/movie?watch_region=ES
export const SEARCH_URLS: Record<number, string> = {
  8: 'https://www.netflix.com/search?q={q}', // Netflix
  // Amazon Prime Video, Disney+, HBO Max, Apple TV+, Movistar Plus+, Filmin,
  // SkyShowtime, Rakuten TV… → completar y verificar
};
```

3. **Respaldo** si el proveedor no está en el mapa: el enlace `link` de la respuesta de TMDB (la página "dónde ver" de TMDB/JustWatch).
4. Título que se busca: el del idioma de los metadatos. Si la búsqueda falla con frecuencia en alguna plataforma, se puede usar el `originalTitle` (decisión por plataforma en el mapa).

### Futuro: `DirectWatchLinkProvider`

Implementación con Watchmode o Streaming Availability API, a través del mismo Worker, con su propia clave guardada como secreto. Se activa por configuración, sin cambios en la interfaz.

---

## 7. Proxy: Cloudflare Worker `listflix-api`

### Responsabilidades

- Guardar el **TMDB API Read Access Token (v4)** como secreto (`wrangler secret put TMDB_TOKEN`) y enviarlo como `Authorization: Bearer …`.
- Exponer solo una **lista blanca** de rutas y parámetros. Todo lo demás devuelve `404`.
- **Cachear** en el edge (Cache API) con una clave normalizada (parámetros ordenados).
- Responder con cabeceras CORS para los orígenes permitidos.

### Rutas permitidas (mismo path que TMDB v3)

| Ruta                                                          | Uso                                                               | TTL de caché |
| ------------------------------------------------------------- | ----------------------------------------------------------------- | ------------ |
| `GET /search/multi`, `/search/movie`, `/search/tv`            | Búsqueda                                                          | 1 día        |
| `GET /movie/{id}`                                             | Detalle (admite `append_to_response=credits,external_ids,videos`) | 7 días       |
| `GET /tv/{id}`                                                | Detalle de serie (mismos `append_to_response`)                    | 1 día        |
| `GET /tv/{id}/season/{n}`                                     | Episodios de una temporada                                        | 1 día        |
| `GET /movie/{id}/watch/providers`, `/tv/{id}/watch/providers` | Dónde verlo                                                       | 6 h          |
| `GET /watch/providers/movie`, `/watch/providers/tv`           | Catálogo de plataformas por región                                | 7 días       |
| `GET /genre/movie/list`, `/genre/tv/list`                     | Géneros                                                           | 30 días      |
| `GET /configuration`                                          | Tamaños de imagen                                                 | 30 días      |

- Parámetros permitidos: `query`, `page`, `language`, `region`, `watch_region`, `year`, `primary_release_year`, `first_air_date_year`, `include_adult` (forzado a `false`) y `append_to_response` (solo con valores de una lista blanca).
- Cualquier `api_key` que llegue del cliente se descarta.

### Seguridad y límites

- `ALLOWED_ORIGINS` (variable): `chrome-extension://<ID publicado>` y el ID de desarrollo.
- Ojo: la cabecera `Origin` se puede falsificar fuera del navegador, así que el filtro de origen **no es seguridad real**. Solo evita el uso desde otras webs.
- La protección real es la caché y un **límite por IP** (Rate Limiting binding de Cloudflare). Comprueba la sintaxis actual de `wrangler.toml` en la documentación de Cloudflare.
- Errores normalizados con forma `{ error: { code, message } }`.

### Despliegue

- `apps/worker`, con `wrangler dev` en local y `wrangler deploy` en producción.
- La URL del Worker se configura en la extensión con la variable de build `WXT_API_BASE_URL`.
- En `host_permissions` de la extensión se declara solo esa URL.

---

## 8. Medios locales: detalles técnicos

- **Selección:** `window.showOpenFilePicker({ types: [{ description: 'Vídeo', accept: { 'video/*': ['.mp4', '.m4v', '.webm', '.mkv', '.mov', '.ogv'] } }] })`. Para subtítulos se aceptan `.srt` y `.vtt`.
- Los selectores se abren **solo desde páginas de la extensión en pestaña** (nunca desde un popup).
- **Persistencia:** los `FileSystemFileHandle` se guardan en IndexedDB (`LocalMedia.handle`).
- **Permisos al reproducir:**
  1. `await handle.queryPermission({ mode: 'read' })`.
  2. Si no es `granted`, se llama a `requestPermission({ mode: 'read' })` **dentro del gesto del usuario** (el clic en "Reproducir").
  3. Si el archivo ya no existe (`NotFoundError`), se ofrece volver a vincularlo.
- **Reproducción:** `const file = await handle.getFile(); video.src = URL.createObjectURL(file);`. Se revoca la URL al salir.
- **Compatibilidad:** se comprueba con `video.canPlayType()` según la extensión del archivo, y se escucha el evento `error` del `<video>` para mostrar un aviso. Los formatos con soporte fiable son MP4 (H.264/AAC), WebM y Ogg. HEVC depende del hardware, y MKV funciona a veces.
- **Subtítulos:**
  - Conversión de SRT a VTT: añadir la cabecera `WEBVTT`, cambiar `,` por `.` en las marcas de tiempo y normalizar los saltos de línea. Hay que detectar la codificación: intentar UTF-8 y, si aparecen caracteres inválidos, usar `windows-1252` con `TextDecoder`.
  - Se cargan con `video.addTextTrack('subtitles', label, lang)` y `VTTCue`, para poder aplicar el desfase sin recargar.
  - El estilo se ajusta con `::cue` (tamaño y fondo) desde los ajustes del reproductor.
- **Parser de nombres de archivo** (`local-media/parse-filename.ts`, con tests exhaustivos):
  - extrae título, año, temporada y episodio (`S01E02`, `1x02`, `s01.e02`);
  - limpia etiquetas como `1080p`, `x264`, `WEB-DL`, `BluRay`, grupos entre corchetes, puntos y guiones bajos;
  - ejemplos de test: `The.Matrix.1999.1080p.BluRay.x264.mkv`, `Breaking Bad - 1x02 - Cat's in the Bag.mp4`, `[Group] Serie S02E10 [720p].mkv`.
- **Emparejamiento:** búsqueda en TMDB con el título y el año extraídos. Se proponen los 5 mejores resultados y el usuario confirma.

---

## 9. Pantallas y navegación

Página `library.html` (SPA con hash routing):

| Ruta                      | Pantalla                                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#/`                      | Biblioteca: cuadrícula, filtros laterales o en barra, buscador y orden. Fila superior "Continuar viendo" (series en curso y películas a medias en local) |
| `#/search?q=`             | Resultados de búsqueda en TMDB, con botón "Añadir" y estado si ya está guardado                                                                          |
| `#/title/:type/:id`       | Ficha: datos, estado, listas, dónde verlo, archivo local y, en series, temporadas y episodios                                                            |
| `#/lists` y `#/lists/:id` | Gestión de listas y contenido de cada una                                                                                                                |
| `#/settings`              | Idioma, país, plataformas contratadas, exportar/importar y "Acerca de" (con atribuciones)                                                                |

Página `player.html?media=<localMediaId>`: reproductor a pantalla completa con controles nativos, más estos controles propios:

- elegir y cargar subtítulos y ajustar su desfase;
- "Siguiente episodio";
- volver a la ficha.

Comportamiento del icono: `chrome.action.onClicked`. Si ya hay una pestaña de la biblioteca abierta, se enfoca. Si no, se crea.

Diseño: oscuro por defecto (contexto de cine en casa), protagonismo de los pósters y accesible (foco visible, navegación con teclado, `alt` en los pósters).

---

## 10. Manifest y permisos

Hay que pedir los **mínimos permisos posibles**, porque cada uno añade fricción en la revisión de la Chrome Web Store.

```jsonc
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "description": "__MSG_extDescription__",
  "default_locale": "es",
  "action": { "default_title": "Listflix" }, // sin default_popup
  "background": { "service_worker": "background.js" },
  "permissions": ["storage", "unlimitedStorage"],
  "host_permissions": ["https://<worker-url>/*"],
}
```

- `chrome.tabs.create` y `chrome.tabs.update` no necesitan el permiso `tabs`.
- No hacen falta `"<all_urls>"`, scripts de contenido ni acceso a URLs `file://`. Los archivos locales se leen con la File System Access API.
- `unlimitedStorage` evita que se borre la base de datos por presión de espacio. Justifícalo en la ficha de la tienda.

---

## 11. Requisitos legales y de la tienda

- **Atribución a TMDB** en "Acerca de" y en el pie de la página: logo aprobado de TMDB, menos prominente que la marca de Listflix, y el texto _"This product uses the TMDB API but is not endorsed or certified by TMDB."_ (también traducido).
- **Atribución a JustWatch** junto a los datos de "dónde verlo": "Datos de disponibilidad proporcionados por JustWatch".
- **Uso no comercial:** la API de TMDB es gratuita para uso no comercial. Si en el futuro se monetiza Listflix, habrá que conseguir una licencia comercial de TMDB.
- **Política de privacidad** (obligatoria en la tienda):
  - los datos se guardan solo en el navegador del usuario;
  - el Worker recibe únicamente las consultas a TMDB (títulos buscados e IDs), sin identificadores del usuario;
  - no hay analítica en la v1.
- No usar marcas ni logos de Netflix u otras plataformas como parte de la marca de Listflix. Los logos de proveedores se muestran solo como información, con las imágenes de TMDB.

---

## 12. Internacionalización

- Interfaz: `es` y `en` con i18next. Se detecta el idioma del navegador y el usuario puede cambiarlo en los ajustes.
- Metadatos: parámetro `language` de TMDB (`es-ES` / `en-US`).
- Si cambia el idioma de los metadatos, se refrescan los títulos guardados en segundo plano.
- Fechas y números con `Intl`.

---

## 13. Plan de trabajo (hitos)

Cada hito termina con tests en verde, `tsc` sin errores y una breve nota en el README.

1. **M0 – Base:** monorepo con pnpm, WXT, React, TS, Tailwind, ESLint, Prettier y Vitest. `CLAUDE.md` con convenciones. Icono que abre o enfoca la pestaña de la biblioteca (página vacía).
2. **M1 – Worker:** proxy con lista blanca, caché y CORS. Tests de la lista blanca y de la normalización de la clave de caché. Cliente tipado en `packages/shared`.
3. **M2 – Datos:** esquema Dexie, repositorios, ajustes y migración inicial.
4. **M3 – Buscar y guardar:** búsqueda, resultados, añadir y ficha de detalle básica.
5. **M4 – Biblioteca:** cuadrícula y lista, filtros, orden, búsqueda interna y estados.
6. **M5 – Listas personales.**
7. **M6 – Series:** temporadas, episodios, marcar vistos, "Continuar" y estado calculado.
8. **M7 – Dónde verlo:** `WatchLinkProvider`, mapa de URLs de búsqueda, filtro por plataforma, plataformas contratadas y atribuciones.
9. **M8 – Medios locales:** parser de nombres, vincular archivo, permisos y reproductor con progreso, subtítulos (SRT→VTT y desfase) y siguiente episodio.
10. **M9 – Copia de seguridad:** exportar e importar con fusión o reemplazo.
11. **M10 – i18n completa, accesibilidad y pulido visual.**
12. **M11 – Publicación:** política de privacidad, textos y capturas para la tienda, revisión de permisos y build de producción.

---

## 14. Criterios de aceptación clave

- [ ] Al pulsar el icono se abre la biblioteca en menos de 1 s. Si ya estaba abierta, se enfoca en lugar de duplicarse.
- [ ] Se puede buscar "Dune", añadir la película y verla en la biblioteca con su póster sin recargar.
- [ ] Al filtrar por "Netflix" (país ES) solo aparecen títulos con Netflix entre sus plataformas de suscripción.
- [ ] "Ver en Netflix" abre una pestaña con la búsqueda del título en Netflix.
- [ ] En una serie, marcar la T1 completa hace que "Continuar" muestre T2E1.
- [ ] Al vincular `The.Matrix.1999.1080p.mkv`, se propone "Matrix (1999)" como primera opción.
- [ ] Al reproducir un MP4 local, cerrar la pestaña y volver a abrirlo, se reanuda en la misma posición (±5 s).
- [ ] Un `.srt` en `windows-1252` con tildes se muestra correctamente.
- [ ] Al reiniciar Chrome y pulsar "Reproducir", el permiso de lectura se pide como mucho una vez.
- [ ] Exportar, borrar los datos e importar deja la biblioteca idéntica (salvo los archivos locales, que quedan pendientes de volver a vincular).
- [ ] Ninguna petición del bundle de la extensión contiene la clave de TMDB.

---

## 15. Convenciones para Claude Code

- TypeScript en modo `strict`, sin `any` implícitos. Los tipos de la API de TMDB se definen a mano, solo con los campos que se usan.
- La lógica de negocio va en `src/` sin depender de React, y se testea con Vitest. Los componentes son finos.
- Ninguna clave ni secreto en el repositorio. Hay un `.env.example` con las variables necesarias.
- Commits pequeños por hito o funcionalidad, con mensajes en español.
- Antes de añadir un permiso nuevo al manifest, una dependencia pesada o un servicio externo, consulta con el autor.
- Si un dato de esta especificación resulta incorrecto al implementarlo (una URL de plataforma, un endpoint, la sintaxis de una herramienta), verifícalo en la documentación oficial, corrígelo y anótalo en `docs/decisiones.md`.

---

## 16. Referencias

- Chrome Extensions – Manifest V3: https://developer.chrome.com/docs/extensions
- Permisos persistentes de la File System Access API: https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api
- TMDB API: https://developer.themoviedb.org/docs
- TMDB Watch Providers: https://developer.themoviedb.org/reference/tv-season-watch-providers
- WXT: https://wxt.dev
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Futuro: Watchmode (https://api.watchmode.com/docs) y Streaming Availability API (https://docs.movieofthenight.com)
