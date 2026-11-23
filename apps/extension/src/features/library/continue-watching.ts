import { findNextEpisode, todayIso } from '../../db/episodes';
import type { EpisodeState, LibraryItem, LocalMedia, PlaybackProgress } from '../../domain/types';

export const WATCHED_THRESHOLD = 0.9;
/** Por debajo de este porcentaje no se considera "a medias". */
const STARTED_THRESHOLD = 0.02;

export type ContinueEntry =
  | { kind: 'episode'; item: LibraryItem; episode: EpisodeState; sortKey: number }
  | {
      kind: 'movie';
      item: LibraryItem;
      media: LocalMedia;
      progress: PlaybackProgress;
      sortKey: number;
    };

/**
 * Fila "Continuar viendo": series en curso (con su siguiente episodio) y películas a
 * medias en local. Se ordena por la actividad más reciente.
 */
export function buildContinueWatching(
  items: LibraryItem[],
  episodesBySeries: Map<string, EpisodeState[]>,
  localMedia: LocalMedia[],
  progress: PlaybackProgress[],
  now = Date.now(),
): ContinueEntry[] {
  const today = todayIso(now);
  const entries: ContinueEntry[] = [];
  const itemsByKey = new Map(items.map((i) => [i.key, i]));

  for (const item of items) {
    if (item.mediaType !== 'tv' || item.status !== 'watching') continue;
    const next = findNextEpisode(episodesBySeries.get(item.key) ?? [], today);
    if (next) {
      entries.push({ kind: 'episode', item, episode: next, sortKey: item.lastWatchedAt ?? 0 });
    }
  }

  const progressById = new Map(progress.map((p) => [p.localMediaId, p]));
  for (const media of localMedia) {
    if (media.episodeKey) continue;
    const item = itemsByKey.get(media.itemKey);
    const p = progressById.get(media.id);
    if (!item || item.mediaType !== 'movie' || !p || p.durationSec <= 0) continue;
    if (item.status === 'watched' || item.status === 'dropped') continue;
    const ratio = p.positionSec / p.durationSec;
    if (ratio >= STARTED_THRESHOLD && ratio < WATCHED_THRESHOLD) {
      entries.push({ kind: 'movie', item, media, progress: p, sortKey: p.updatedAt });
    }
  }

  return entries.sort((a, b) => b.sortKey - a.sortKey);
}
