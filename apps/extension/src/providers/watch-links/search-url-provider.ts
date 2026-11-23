import {
  WATCH_PROVIDER_TYPES,
  type WatchProviderType,
  type WatchProvidersByType,
} from '../../domain/types';
import { buildSearchUrl, SEARCH_URLS, type SearchUrlTemplate } from './search-urls';
import type { WatchLink, WatchLinkItem, WatchLinkProvider } from './types';

export type ProvidersFetcher = (
  item: WatchLinkItem,
  country: string,
) => Promise<WatchProvidersByType>;

/**
 * Implementación de la v1: abre la búsqueda de cada plataforma con el título.
 * Si la plataforma no está en el mapa, usa el enlace "dónde ver" de TMDB/JustWatch.
 */
export class SearchUrlWatchLinkProvider implements WatchLinkProvider {
  constructor(
    private readonly fetchProviders: ProvidersFetcher,
    private readonly searchUrls: Record<number, SearchUrlTemplate> = SEARCH_URLS,
  ) {}

  async getLinks(item: WatchLinkItem, country: string): Promise<WatchLink[]> {
    const data = await this.fetchProviders(item, country);
    return linksFromProviders(item, data, this.searchUrls);
  }
}

export function linksFromProviders(
  item: WatchLinkItem,
  data: WatchProvidersByType,
  searchUrls: Record<number, SearchUrlTemplate> = SEARCH_URLS,
): WatchLink[] {
  const fallback =
    data.tmdbLink ?? `https://www.themoviedb.org/${item.mediaType}/${item.tmdbId}/watch`;
  const links: WatchLink[] = [];
  for (const type of WATCH_PROVIDER_TYPES as readonly WatchProviderType[]) {
    const sorted = [...data[type]].sort(
      (a, b) => (a.displayPriority ?? 999) - (b.displayPriority ?? 999),
    );
    for (const p of sorted) {
      const entry = searchUrls[p.providerId];
      links.push({
        providerId: p.providerId,
        providerName: p.providerName,
        logoPath: p.logoPath,
        type,
        url: entry ? buildSearchUrl(entry, item.title, item.originalTitle) : fallback,
        isDirect: false,
      });
    }
  }
  return links;
}
