import { db } from '../db/db';
import { compareEpisodes } from '../db/episodes';
import type { LocalMedia } from '../domain/types';

/**
 * Archivo local del episodio inmediatamente siguiente, si existe y tiene handle.
 * Si los episodios aún no están sincronizados, se usa el orden de los archivos vinculados.
 */
export async function findNextLocalEpisode(current: LocalMedia): Promise<LocalMedia | undefined> {
  if (!current.episodeKey) return undefined;
  const episodes = (await db.episodes.where('seriesKey').equals(current.itemKey).toArray()).sort(
    compareEpisodes,
  );
  const media = await db.localMedia.where('itemKey').equals(current.itemKey).toArray();
  const byEpisode = new Map(media.filter((m) => m.episodeKey).map((m) => [m.episodeKey!, m]));
  const index = episodes.findIndex((e) => e.key === current.episodeKey);
  if (index >= 0) {
    const next = episodes[index + 1];
    const candidate = next ? byEpisode.get(next.key) : undefined;
    return candidate?.handle ? candidate : undefined;
  }
  return undefined;
}
