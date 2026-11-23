import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllData } from '../db/db';
import { putCachedProviders, WATCH_PROVIDERS_TTL_MS } from '../db/watch-providers';
import { emptyProviders, type LibraryItem } from '../domain/types';
import type { MetadataProvider } from '../providers/metadata/types';
import { getProvidersCached, refreshStaleProviders } from './providers-sync';

const netflixES = { ...emptyProviders(), flatrate: [{ providerId: 8, providerName: 'Netflix' }] };

function fakeProvider() {
  const getWatchProviders = vi.fn(async () => ({ ES: netflixES }));
  return { provider: { getWatchProviders } as unknown as MetadataProvider, getWatchProviders };
}

const item = (key: string, tmdbId: number) =>
  ({ key, mediaType: 'movie', tmdbId }) as unknown as LibraryItem;

beforeEach(() => clearAllData());

describe('caché de plataformas', () => {
  it('usa la caché mientras está fresca y la refresca al caducar', async () => {
    const { provider, getWatchProviders } = fakeProvider();
    const now = 1_000_000;
    expect(await getProvidersCached(item('movie:1', 1), 'ES', provider, now)).toEqual(netflixES);
    await getProvidersCached(item('movie:1', 1), 'ES', provider, now + 1000);
    expect(getWatchProviders).toHaveBeenCalledTimes(1);
    await getProvidersCached(item('movie:1', 1), 'ES', provider, now + WATCH_PROVIDERS_TTL_MS + 1);
    expect(getWatchProviders).toHaveBeenCalledTimes(2);
  });

  it('devuelve vacío si no hay datos para el país', async () => {
    const { provider } = fakeProvider();
    expect(await getProvidersCached(item('movie:1', 1), 'MX', provider)).toEqual(emptyProviders());
  });

  it('refresca solo los títulos sin caché o caducados', async () => {
    const { provider, getWatchProviders } = fakeProvider();
    const now = Date.now();
    await putCachedProviders('movie:1', 'ES', netflixES, now);
    await putCachedProviders('movie:2', 'ES', netflixES, now - WATCH_PROVIDERS_TTL_MS - 1);
    const refreshed = await refreshStaleProviders(
      [item('movie:1', 1), item('movie:2', 2), item('movie:3', 3)],
      'ES',
      provider,
      { now },
    );
    expect(refreshed).toBe(2);
    expect(getWatchProviders).toHaveBeenCalledTimes(2);
  });
});
