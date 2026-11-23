# Política de privacidad de Listflix

_Última actualización: 23 de noviembre de 2026_

Listflix es una extensión de Chrome que funciona como biblioteca personal de películas y series.

## Qué datos se guardan y dónde

- Tu biblioteca, estados, episodios vistos, listas, progreso de reproducción, ajustes y las
  referencias a los archivos locales que vinculas se guardan **solo en tu navegador**
  (IndexedDB).
- Listflix **no tiene cuentas de usuario ni servidores que guarden tus datos**, y no los envía a
  terceros.
- Los archivos de vídeo y subtítulos se leen directamente de tu equipo con la File System Access
  API y **nunca salen de él**.

## Qué se envía a internet

- Para buscar títulos y mostrar sus datos, Listflix consulta la API de TMDB a través de un
  servidor intermedio propio (Cloudflare Worker). Ese servidor recibe **solo la consulta**: el
  texto que buscas, los identificadores de los títulos, el idioma y el país configurados. No
  recibe ningún identificador tuyo.
- El servidor intermedio no guarda registros asociados a personas. Cloudflare puede procesar la
  dirección IP de la petición para aplicar límites de uso y proteger el servicio, según su propia
  política de privacidad.
- Las imágenes (pósters, fondos y logotipos) se cargan directamente desde `image.tmdb.org`.
- Al pulsar "Ver en…" se abre la web de la plataforma elegida, que aplica su propia política de
  privacidad.

## Analítica y publicidad

Listflix no usa analítica, cookies de seguimiento ni publicidad.

## Copias de seguridad

La exportación genera un archivo JSON que se descarga en tu equipo. Tú decides dónde guardarlo.

## Borrar tus datos

Desinstalar la extensión borra todos sus datos. También puedes borrarlos desde
`chrome://settings/content/all` buscando el ID de la extensión.

## Contacto

Para cualquier duda sobre esta política, abre una incidencia en el repositorio del proyecto.

---

# Listflix privacy policy

_Last updated: November 23, 2026_

Listflix is a Chrome extension that works as a personal movie and TV library.

## What data is stored and where

- Your library, statuses, watched episodes, lists, playback progress, settings and references to
  the local files you link are stored **only in your browser** (IndexedDB).
- Listflix **has no user accounts and no servers that store your data**, and does not share it
  with third parties.
- Video and subtitle files are read directly from your computer through the File System Access
  API and **never leave it**.

## What is sent over the internet

- To search titles and show their details, Listflix queries the TMDB API through its own proxy
  (a Cloudflare Worker). The proxy receives **only the query**: the text you search, title IDs,
  and the configured language and country. It receives no identifier about you.
- The proxy keeps no logs tied to people. Cloudflare may process the request's IP address to
  enforce rate limits and protect the service, under its own privacy policy.
- Images (posters, backdrops and logos) load directly from `image.tmdb.org`.
- “Watch on…” opens the chosen platform's website, which applies its own privacy policy.

## Analytics and advertising

Listflix uses no analytics, tracking cookies or advertising.

## Backups

Exporting creates a JSON file that is downloaded to your computer. You decide where to keep it.

## Deleting your data

Uninstalling the extension deletes all its data.

## Contact

For questions about this policy, open an issue in the project repository.
