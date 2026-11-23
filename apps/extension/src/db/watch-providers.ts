import type { WatchProvidersByType, WatchProvidersCache } from '../domain/types';
import { db } from './db';

export const WATCH_PROVIDERS_TTL_MS = 24 * 60 * 60 * 1000;

export function providersCacheKey(itemKey: string, country: string): string {
  return `${itemKey}:${country}`;
}

export function isProvidersCacheFresh(
  entry: WatchProvidersCache | undefined,
  now = Date.now(),
): entry is WatchProvidersCache {
  return !!entry && now - entry.fetchedAt < WATCH_PROVIDERS_TTL_MS;
}

export async function getCachedProviders(
  itemKey: string,
  country: string,
): Promise<WatchProvidersCache | undefined> {
  return db.watchProviders.get(providersCacheKey(itemKey, country));
}

export async function putCachedProviders(
  itemKey: string,
  country: string,
  data: WatchProvidersByType,
  now = Date.now(),
): Promise<void> {
  await db.watchProviders.put({ key: providersCacheKey(itemKey, country), data, fetchedAt: now });
}

/** Caché de plataformas de todos los títulos para un país (clave: itemKey). */
export async function getProvidersForCountry(
  country: string,
): Promise<Map<string, WatchProvidersCache>> {
  const suffix = `:${country}`;
  const rows = await db.watchProviders.filter((row) => row.key.endsWith(suffix)).toArray();
  return new Map(rows.map((row) => [row.key.slice(0, -suffix.length), row]));
}
