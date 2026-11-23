import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { getProvidersForCountry } from '../../db/watch-providers';
import type {
  EpisodeState,
  LibraryItem,
  LocalMedia,
  PlaybackProgress,
  UserList,
  WatchProvidersByType,
} from '../../domain/types';

export interface LibraryData {
  items: LibraryItem[];
  providersByKey: Map<string, WatchProvidersByType>;
  localKeys: Set<string>;
  localMedia: LocalMedia[];
  progress: PlaybackProgress[];
  episodesBySeries: Map<string, EpisodeState[]>;
  lists: UserList[];
  listItemKeys?: Set<string>;
}

/** Carga en vivo todo lo que necesita la pantalla de la biblioteca. */
export function useLibraryData(country: string, listId?: string): LibraryData | undefined {
  return useLiveQuery(async () => {
    const [items, localMedia, progress, providers, lists] = await Promise.all([
      db.items.toArray(),
      db.localMedia.toArray(),
      db.progress.toArray(),
      getProvidersForCountry(country),
      db.lists.orderBy('order').toArray(),
    ]);
    const watchingSeries = items
      .filter((i) => i.mediaType === 'tv' && i.status === 'watching')
      .map((i) => i.key);
    const episodes = watchingSeries.length
      ? await db.episodes.where('seriesKey').anyOf(watchingSeries).toArray()
      : [];
    const episodesBySeries = new Map<string, EpisodeState[]>();
    for (const e of episodes) {
      const list = episodesBySeries.get(e.seriesKey) ?? [];
      list.push(e);
      episodesBySeries.set(e.seriesKey, list);
    }
    const listItemKeys = listId
      ? new Set(
          (await db.listItems.where('listId').equals(listId).toArray()).map((li) => li.itemKey),
        )
      : undefined;
    return {
      items,
      providersByKey: new Map([...providers].map(([key, row]) => [key, row.data])),
      localKeys: new Set(localMedia.filter((m) => m.handle).map((m) => m.itemKey)),
      localMedia,
      progress,
      episodesBySeries,
      lists,
      listItemKeys,
    };
  }, [country, listId]);
}
