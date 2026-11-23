import {
  getCachedProviders,
  getProvidersForCountry,
  isProvidersCacheFresh,
  putCachedProviders,
} from '../db/watch-providers';
import { emptyProviders, type LibraryItem, type WatchProvidersByType } from '../domain/types';
import { mapWithConcurrency } from '../lib/concurrency';
import type { MetadataProvider } from '../providers/metadata/types';

/** Plataformas de un título en un país, desde la caché (TTL 24 h) o desde la API. */
export async function getProvidersCached(
  item: Pick<LibraryItem, 'key' | 'mediaType' | 'tmdbId'>,
  country: string,
  provider: MetadataProvider,
  now = Date.now(),
): Promise<WatchProvidersByType> {
  const cached = await getCachedProviders(item.key, country);
  if (isProvidersCacheFresh(cached, now)) return cached.data;
  const all = await provider.getWatchProviders(item.mediaType, item.tmdbId);
  const data = all[country] ?? emptyProviders();
  await putCachedProviders(item.key, country, data, now);
  return data;
}

/** Refresca en segundo plano la caché de plataformas de los títulos sin datos o caducados. */
export async function refreshStaleProviders(
  items: LibraryItem[],
  country: string,
  provider: MetadataProvider,
  { concurrency = 3, now = Date.now() }: { concurrency?: number; now?: number } = {},
): Promise<number> {
  const cache = await getProvidersForCountry(country);
  const stale = items.filter((item) => !isProvidersCacheFresh(cache.get(item.key), now));
  const results = await mapWithConcurrency(stale, concurrency, (item) =>
    getProvidersCached(item, country, provider, now),
  );
  return results.filter((r) => r.status === 'fulfilled').length;
}
