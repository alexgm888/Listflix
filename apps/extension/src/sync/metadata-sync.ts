import { syncSeriesEpisodes } from '../db/episodes';
import { getItem, needsMetadataRefresh, updateItemMetadata } from '../db/library';
import type { LibraryItem, MetadataLanguage } from '../domain/types';
import { mapWithConcurrency } from '../lib/concurrency';
import type { MetadataProvider, SeasonDetails, TitleDetails } from '../providers/metadata/types';

const EPISODES_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Descarga todas las temporadas (sin especiales) y sincroniza los episodios de la serie. */
export async function syncEpisodesFromDetails(
  details: TitleDetails,
  provider: MetadataProvider,
  language: MetadataLanguage,
): Promise<void> {
  if (details.mediaType !== 'tv') return;
  const seasonNumbers = (details.seasons ?? []).map((s) => s.seasonNumber).filter((n) => n > 0);
  const results = await mapWithConcurrency(seasonNumbers, 3, (n) =>
    provider.getSeason(details.tmdbId, n, language),
  );
  const seasons = results
    .filter((r): r is PromiseFulfilledResult<SeasonDetails> => r.status === 'fulfilled')
    .map((r) => r.value);
  if (seasons.length === 0 && seasonNumbers.length > 0) {
    throw new Error('Could not fetch any season');
  }
  await syncSeriesEpisodes(`tv:${details.tmdbId}`, seasons);
}

/**
 * Completa o refresca los metadatos de un título guardado (y sus episodios si es una serie).
 * Si se pasan `details` ya descargados, no se vuelven a pedir.
 */
export async function refreshItem(
  key: string,
  provider: MetadataProvider,
  language: MetadataLanguage,
  details?: TitleDetails,
): Promise<void> {
  const item = await getItem(key);
  if (!item) return;
  const fresh = details ?? (await provider.getDetails(item.mediaType, item.tmdbId, language));
  await updateItemMetadata(fresh, language);
  if (item.mediaType === 'tv') await syncEpisodesFromDetails(fresh, provider, language);
}

export function needsEpisodeSync(item: LibraryItem, now = Date.now()): boolean {
  return item.mediaType === 'tv' && now - item.metadataFetchedAt > EPISODES_MAX_AGE_MS;
}

/** Refresca en segundo plano los títulos con metadatos incompletos, caducados o en otro idioma. */
export async function refreshStaleItems(
  items: LibraryItem[],
  provider: MetadataProvider,
  language: MetadataLanguage,
  now = Date.now(),
): Promise<number> {
  const stale = items.filter((item) => needsMetadataRefresh(item, language, now));
  const results = await mapWithConcurrency(stale, 2, (item) =>
    refreshItem(item.key, provider, language),
  );
  return results.filter((r) => r.status === 'fulfilled').length;
}
