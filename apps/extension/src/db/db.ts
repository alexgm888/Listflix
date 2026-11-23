import Dexie, { type EntityTable } from 'dexie';
import type {
  EpisodeState,
  LibraryItem,
  ListItem,
  LocalMedia,
  PlaybackProgress,
  Settings,
  UserList,
  WatchProvidersCache,
} from '../domain/types';

export const SCHEMA_VERSION = 1;

export class ListflixDB extends Dexie {
  items!: EntityTable<LibraryItem, 'key'>;
  episodes!: EntityTable<EpisodeState, 'key'>;
  lists!: EntityTable<UserList, 'id'>;
  listItems!: EntityTable<ListItem, 'id'>;
  localMedia!: EntityTable<LocalMedia, 'id'>;
  progress!: EntityTable<PlaybackProgress, 'localMediaId'>;
  watchProviders!: EntityTable<WatchProvidersCache, 'key'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'listflix') {
    super(name);
    // Versión 1 del esquema. Las migraciones futuras se añaden con
    // `this.version(2).stores({...}).upgrade(tx => ...)` sin tocar esta.
    this.version(1).stores({
      items:
        'key, mediaType, status, addedAt, title, year, voteAverage, *genreIds, lastWatchedAt, updatedAt',
      episodes: 'key, seriesKey, [seriesKey+season]',
      lists: 'id, order',
      listItems: 'id, listId, itemKey',
      localMedia: 'id, itemKey, episodeKey',
      progress: 'localMediaId, updatedAt',
      watchProviders: 'key, fetchedAt',
      settings: 'id',
    });
  }
}

export const db = new ListflixDB();

/** Borra todos los datos del usuario (usado por "reemplazar" al importar y en tests). */
export async function clearAllData(database: ListflixDB = db): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));
  });
}
