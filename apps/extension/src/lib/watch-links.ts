import { emptyProviders } from '../domain/types';
import { SearchUrlWatchLinkProvider } from '../providers/watch-links/search-url-provider';
import type { WatchLinkProvider } from '../providers/watch-links/types';
import { getProvidersCached } from '../sync/providers-sync';
import { metadataProvider } from './api';

/**
 * Enlaces para títulos guardados: usan la caché de IndexedDB (TTL 24 h), que también
 * alimenta el filtro por plataforma de la biblioteca.
 * Para cambiar a enlaces directos (Watchmode, Streaming Availability) basta con
 * sustituir estas instancias por otra implementación de `WatchLinkProvider`.
 */
export const savedWatchLinkProvider: WatchLinkProvider = new SearchUrlWatchLinkProvider(
  (item, country) => getProvidersCached(item, country, metadataProvider),
);

/** Enlaces para títulos que no están en la biblioteca (sin guardar nada en IndexedDB). */
export const liveWatchLinkProvider: WatchLinkProvider = new SearchUrlWatchLinkProvider(
  async (item, country) =>
    (await metadataProvider.getWatchProviders(item.mediaType, item.tmdbId))[country] ??
    emptyProviders(),
);
