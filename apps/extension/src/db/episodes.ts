import { episodeKeyOf, type EpisodeState, type WatchStatus } from '../domain/types';
import type { SeasonDetails } from '../providers/metadata/types';
import { db } from './db';

export function todayIso(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function isAired(ep: Pick<EpisodeState, 'airDate'>, today: string): boolean {
  return !!ep.airDate && ep.airDate <= today;
}

export function compareEpisodes(
  a: Pick<EpisodeState, 'season' | 'episode'>,
  b: Pick<EpisodeState, 'season' | 'episode'>,
): number {
  return a.season - b.season || a.episode - b.episode;
}

/**
 * Estado global de una serie calculado a partir de sus episodios:
 * - ningún episodio visto → `pending`;
 * - todos los episodios ya emitidos vistos → `watched`;
 * - en otro caso → `watching`.
 * `dropped` solo se fija a mano.
 */
export function computeSeriesStatus(episodes: EpisodeState[], today: string): WatchStatus {
  const watchedCount = episodes.filter((e) => e.watched).length;
  if (watchedCount === 0) return 'pending';
  const aired = episodes.filter((e) => isAired(e, today));
  if (aired.length > 0 && aired.every((e) => e.watched)) return 'watched';
  return 'watching';
}

/**
 * Siguiente episodio para "Continuar": el primero sin ver (ya emitido) después del
 * último visto; si no hay ninguno después, el primero sin ver de toda la serie.
 */
export function findNextEpisode(episodes: EpisodeState[], today: string): EpisodeState | undefined {
  const sorted = [...episodes].sort(compareEpisodes);
  const candidates = sorted.filter((e) => !e.watched && isAired(e, today));
  if (candidates.length === 0) return undefined;
  let lastWatched: EpisodeState | undefined;
  for (const e of sorted) if (e.watched) lastWatched = e;
  if (!lastWatched) return candidates[0];
  const after = candidates.find((e) => compareEpisodes(e, lastWatched) > 0);
  return after ?? candidates[0];
}

export async function getSeriesEpisodes(seriesKey: string): Promise<EpisodeState[]> {
  const episodes = await db.episodes.where('seriesKey').equals(seriesKey).toArray();
  return episodes.sort(compareEpisodes);
}

/**
 * Sincroniza la lista de episodios de una serie con los datos de TMDB.
 * Conserva lo que el usuario ya marcó como visto. La temporada 0 (especiales)
 * no se sigue.
 */
export async function syncSeriesEpisodes(
  seriesKey: string,
  seasons: SeasonDetails[],
  now = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.episodes, db.items, async () => {
    const existing = new Map(
      (await db.episodes.where('seriesKey').equals(seriesKey).toArray()).map((e) => [e.key, e]),
    );
    const rows: EpisodeState[] = [];
    for (const season of seasons) {
      if (season.seasonNumber === 0) continue;
      for (const ep of season.episodes) {
        const key = episodeKeyOf(seriesKey, ep.season, ep.episode);
        const prev = existing.get(key);
        rows.push({
          key,
          seriesKey,
          season: ep.season,
          episode: ep.episode,
          name: ep.name,
          airDate: ep.airDate,
          watched: prev?.watched ?? false,
          watchedAt: prev?.watchedAt,
        });
      }
    }
    await db.episodes.bulkPut(rows);
    await recomputeSeriesStatus(seriesKey, now);
  });
}

/** Recalcula el estado de la serie salvo que el usuario lo haya fijado a mano. */
export async function recomputeSeriesStatus(seriesKey: string, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.episodes, db.items, async () => {
    const item = await db.items.get(seriesKey);
    if (!item || item.statusIsManual) return;
    const episodes = await db.episodes.where('seriesKey').equals(seriesKey).toArray();
    const status = computeSeriesStatus(episodes, todayIso(now));
    if (status !== item.status) await db.items.update(seriesKey, { status, updatedAt: now });
  });
}

export async function setEpisodesWatched(
  seriesKey: string,
  episodeKeys: string[],
  watched: boolean,
  now = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.episodes, db.items, async () => {
    const rows = (await db.episodes.bulkGet(episodeKeys)).filter(
      (e): e is EpisodeState => e !== undefined,
    );
    await db.episodes.bulkPut(
      rows.map((e) => ({ ...e, watched, watchedAt: watched ? now : undefined })),
    );
    if (watched && rows.length > 0) {
      await db.items.update(seriesKey, { lastWatchedAt: now, updatedAt: now });
    }
    await recomputeSeriesStatus(seriesKey, now);
  });
}

export async function setSeasonWatched(
  seriesKey: string,
  season: number,
  watched: boolean,
  now = Date.now(),
): Promise<void> {
  const keys = await db.episodes
    .where('[seriesKey+season]')
    .equals([seriesKey, season])
    .primaryKeys();
  await setEpisodesWatched(seriesKey, keys, watched, now);
}

/** Vuelve a calcular el estado de la serie a partir de los episodios. */
export async function resetSeriesStatusToAutomatic(
  seriesKey: string,
  now = Date.now(),
): Promise<void> {
  await db.items.update(seriesKey, { statusIsManual: false, updatedAt: now });
  await recomputeSeriesStatus(seriesKey, now);
}
