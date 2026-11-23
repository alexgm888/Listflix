import {
  itemKeyOf,
  type LibraryItem,
  type MetadataLanguage,
  type WatchStatus,
} from '../domain/types';
import type { SearchResult, TitleDetails } from '../providers/metadata/types';
import { db } from './db';

function isDetails(input: SearchResult | TitleDetails): input is TitleDetails {
  return 'genres' in input;
}

/** Campos de metadatos de un título, sin los datos del usuario. */
export function metadataFields(
  input: SearchResult | TitleDetails,
  language: MetadataLanguage,
  now: number,
): Omit<LibraryItem, 'status' | 'statusIsManual' | 'addedAt' | 'updatedAt' | 'lastWatchedAt'> {
  const base = {
    key: itemKeyOf(input.mediaType, input.tmdbId),
    mediaType: input.mediaType,
    tmdbId: input.tmdbId,
    title: input.title,
    originalTitle: input.originalTitle,
    year: input.year,
    posterPath: input.posterPath,
    backdropPath: input.backdropPath,
    genreIds: input.genreIds,
    voteAverage: input.voteAverage,
    metadataLanguage: language,
    metadataFetchedAt: now,
  };
  if (!isDetails(input)) return { ...base, metadataFetchedAt: 0 };
  return {
    ...base,
    genreIds: input.genres.map((g) => g.id),
    runtime: input.runtime,
    numberOfSeasons: input.numberOfSeasons,
  };
}

export async function getItem(key: string): Promise<LibraryItem | undefined> {
  return db.items.get(key);
}

export interface AddItemOptions {
  status?: WatchStatus;
  language: MetadataLanguage;
  now?: number;
}

/**
 * Añade un título a la biblioteca. Si ya existía, no lo duplica: actualiza sus
 * metadatos y conserva los datos del usuario.
 * Con un `SearchResult` (sin detalles) `metadataFetchedAt` queda a 0 para que se
 * complete en segundo plano.
 */
export async function addItem(
  input: SearchResult | TitleDetails,
  { status = 'pending', language, now = Date.now() }: AddItemOptions,
): Promise<LibraryItem> {
  return db.transaction('rw', db.items, async () => {
    const key = itemKeyOf(input.mediaType, input.tmdbId);
    const existing = await db.items.get(key);
    if (existing) {
      const updated = { ...existing, ...metadataFields(input, language, now), updatedAt: now };
      await db.items.put(updated);
      return updated;
    }
    const item: LibraryItem = {
      ...metadataFields(input, language, now),
      status,
      statusIsManual: input.mediaType === 'tv' && status !== 'pending',
      addedAt: now,
      updatedAt: now,
    };
    await db.items.put(item);
    return item;
  });
}

/** Actualiza los metadatos de un título guardado sin tocar los datos del usuario. */
export async function updateItemMetadata(
  details: TitleDetails,
  language: MetadataLanguage,
  now = Date.now(),
): Promise<void> {
  const key = itemKeyOf(details.mediaType, details.tmdbId);
  await db.transaction('rw', db.items, async () => {
    const existing = await db.items.get(key);
    if (!existing) return;
    await db.items.put({ ...existing, ...metadataFields(details, language, now) });
  });
}

/** Fija el estado a mano. En series, deja de calcularse a partir de los episodios. */
export async function setItemStatus(
  key: string,
  status: WatchStatus,
  now = Date.now(),
): Promise<void> {
  await db.items.update(key, {
    status,
    statusIsManual: true,
    updatedAt: now,
    ...(status === 'watched' ? { lastWatchedAt: now } : {}),
  });
}

/** Elimina el título y todo lo que depende de él. */
export async function removeItem(key: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.items, db.episodes, db.listItems, db.localMedia, db.progress, db.watchProviders],
    async () => {
      const media = await db.localMedia.where('itemKey').equals(key).toArray();
      await db.progress.bulkDelete(media.map((m) => m.id));
      await db.localMedia.bulkDelete(media.map((m) => m.id));
      await db.episodes.where('seriesKey').equals(key).delete();
      await db.listItems.where('itemKey').equals(key).delete();
      await db.watchProviders.where('key').startsWith(`${key}:`).delete();
      await db.items.delete(key);
    },
  );
}

/** Registra actividad de visionado (para "Continuar viendo" y el orden). */
export async function touchItemWatched(key: string, now = Date.now()): Promise<void> {
  await db.items.update(key, { lastWatchedAt: now, updatedAt: now });
}

/** Títulos cuyos metadatos conviene refrescar (incompletos, caducados o en otro idioma). */
export function needsMetadataRefresh(
  item: LibraryItem,
  language: MetadataLanguage,
  now = Date.now(),
  maxAgeMs = 30 * 24 * 60 * 60 * 1000,
): boolean {
  return (
    item.metadataFetchedAt === 0 ||
    item.metadataLanguage !== language ||
    now - item.metadataFetchedAt > maxAgeMs
  );
}
