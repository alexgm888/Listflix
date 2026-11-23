/**
 * Plantillas de búsqueda por plataforma (ID de proveedor de TMDB → URL).
 * `{q}` = título codificado con encodeURIComponent.
 *
 * IMPORTANTE: cada ID y cada URL hay que comprobarlos a mano antes de darlos por buenos
 * (los IDs se obtienen de GET /watch/providers/movie?watch_region=ES). Las entradas con
 * `verified: false` están pendientes de verificar (ver docs/decisiones.md). Si una URL no
 * funciona, se puede quitar del mapa: se usará el respaldo (la página "dónde ver" de TMDB).
 */
export interface SearchUrlTemplate {
  template: string;
  /** Buscar por el título original en lugar del título en el idioma de los metadatos. */
  useOriginalTitle?: boolean;
  verified: boolean;
}

const NETFLIX: SearchUrlTemplate = {
  template: 'https://www.netflix.com/search?q={q}',
  verified: false,
};
const PRIME_VIDEO: SearchUrlTemplate = {
  template: 'https://www.primevideo.com/search?phrase={q}',
  verified: false,
};
const APPLE_TV: SearchUrlTemplate = {
  template: 'https://tv.apple.com/search?term={q}',
  verified: false,
};
const HBO_MAX: SearchUrlTemplate = {
  template: 'https://play.hbomax.com/search?q={q}',
  verified: false,
};

export const SEARCH_URLS: Record<number, SearchUrlTemplate> = {
  8: NETFLIX, // Netflix
  1796: NETFLIX, // Netflix Standard with Ads
  119: PRIME_VIDEO, // Amazon Prime Video
  9: PRIME_VIDEO, // Amazon Prime Video (otras regiones)
  10: PRIME_VIDEO, // Amazon Video (alquiler y compra)
  2100: PRIME_VIDEO, // Amazon Prime Video with Ads
  337: { template: 'https://www.disneyplus.com/search?q={q}', verified: false }, // Disney Plus
  1899: HBO_MAX, // Max / HBO Max
  384: HBO_MAX, // HBO Max (ID antiguo)
  350: APPLE_TV, // Apple TV+
  2: APPLE_TV, // Apple TV (tienda)
  149: { template: 'https://www.movistarplus.es/buscar?q={q}', verified: false }, // Movistar Plus+
  63: { template: 'https://www.filmin.es/buscador?q={q}', verified: false }, // Filmin
  1773: { template: 'https://www.skyshowtime.com/es/search?q={q}', verified: false }, // SkyShowtime
  35: { template: 'https://www.rakuten.tv/es/search?q={q}', verified: false }, // Rakuten TV
  3: { template: 'https://play.google.com/store/search?q={q}&c=movies', verified: false }, // Google Play
  192: { template: 'https://www.youtube.com/results?search_query={q}', verified: false }, // YouTube
  283: {
    template: 'https://www.crunchyroll.com/search?q={q}',
    useOriginalTitle: true,
    verified: false,
  }, // Crunchyroll
  531: { template: 'https://www.paramountplus.com/search/?q={q}', verified: false }, // Paramount+
};

export function buildSearchUrl(
  entry: SearchUrlTemplate,
  title: string,
  originalTitle: string,
): string {
  const query = entry.useOriginalTitle && originalTitle ? originalTitle : title;
  return entry.template.replace('{q}', encodeURIComponent(query));
}
