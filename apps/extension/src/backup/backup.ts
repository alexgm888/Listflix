import { z } from 'zod';
import { clearAllData, db } from '../db/db';
import { recomputeSeriesStatus } from '../db/episodes';
import { SETTINGS_ID, defaultSettings } from '../db/settings';
import {
  WATCH_STATUSES,
  type EpisodeState,
  type LibraryItem,
  type ListItem,
  type LocalMedia,
  type PlaybackProgress,
  type Settings,
  type UserList,
} from '../domain/types';

export const FORMAT_VERSION = 1;

/* ------------------------------ Esquemas zod ------------------------------ */

const status = z.enum(WATCH_STATUSES as [string, ...string[]]);
const mediaType = z.enum(['movie', 'tv']);

const itemSchema = z.object({
  key: z.string().regex(/^(movie|tv):\d+$/),
  mediaType,
  tmdbId: z.number().int().positive(),
  title: z.string(),
  originalTitle: z.string(),
  year: z.number().int().optional(),
  posterPath: z.string().optional(),
  backdropPath: z.string().optional(),
  genreIds: z.array(z.number().int()),
  voteAverage: z.number().optional(),
  runtime: z.number().optional(),
  numberOfSeasons: z.number().int().optional(),
  status,
  statusIsManual: z.boolean(),
  addedAt: z.number(),
  updatedAt: z.number(),
  lastWatchedAt: z.number().optional(),
  metadataFetchedAt: z.number(),
  metadataLanguage: z.enum(['es-ES', 'en-US']).optional(),
});

const episodeSchema = z.object({
  key: z.string(),
  seriesKey: z.string(),
  season: z.number().int(),
  episode: z.number().int(),
  name: z.string().optional(),
  airDate: z.string().optional(),
  watched: z.boolean(),
  watchedAt: z.number().optional(),
});

const listSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
  createdAt: z.number(),
});

const listItemSchema = z.object({
  id: z.string(),
  listId: z.string(),
  itemKey: z.string(),
  order: z.number(),
  addedAt: z.number(),
});

const progressSchema = z.object({
  localMediaId: z.string(),
  positionSec: z.number().nonnegative(),
  durationSec: z.number().nonnegative(),
  updatedAt: z.number(),
});

const localMediaSchema = z.object({
  id: z.string(),
  itemKey: z.string(),
  episodeKey: z.string().optional(),
  fileName: z.string(),
  fileSize: z.number().nonnegative(),
  linkedAt: z.number(),
});

const settingsSchema = z
  .object({
    uiLanguage: z.enum(['es', 'en']),
    metadataLanguage: z.enum(['es-ES', 'en-US']),
    country: z.string().regex(/^[A-Z]{2}$/),
    myProviderIds: z.array(z.number().int()),
    subtitleStyle: z
      .object({ scale: z.number().positive(), backgroundOpacity: z.number().min(0).max(1) })
      .optional(),
    libraryView: z.enum(['grid', 'list']).optional(),
  })
  .partial();

export const backupSchema = z.object({
  app: z.literal('listflix'),
  formatVersion: z.literal(FORMAT_VERSION),
  exportedAt: z.string(),
  settings: settingsSchema.optional(),
  items: z.array(itemSchema),
  episodes: z.array(episodeSchema).default([]),
  lists: z.array(listSchema).default([]),
  listItems: z.array(listItemSchema).default([]),
  progress: z.array(progressSchema).default([]),
  localMedia: z.array(localMediaSchema).default([]),
});

export type BackupFile = z.infer<typeof backupSchema>;

/* -------------------------------- Exportar -------------------------------- */

/** Copia de seguridad completa. Los handles de archivos no se exportan. */
export async function createBackup(now = new Date()): Promise<BackupFile> {
  const [settings, items, episodes, lists, listItems, progress, localMedia] = await Promise.all([
    db.settings.get(SETTINGS_ID),
    db.items.toArray(),
    db.episodes.toArray(),
    db.lists.toArray(),
    db.listItems.toArray(),
    db.progress.toArray(),
    db.localMedia.toArray(),
  ]);
  const { id: _id, schemaVersion: _v, ...exportableSettings } = settings ?? defaultSettings();
  return {
    app: 'listflix',
    formatVersion: FORMAT_VERSION,
    exportedAt: now.toISOString(),
    settings: exportableSettings,
    items,
    episodes,
    lists,
    listItems,
    progress,
    localMedia: localMedia.map(({ id, itemKey, episodeKey, fileName, fileSize, linkedAt }) => ({
      id,
      itemKey,
      ...(episodeKey ? { episodeKey } : {}),
      fileName,
      fileSize,
      linkedAt,
    })),
  };
}

export function backupFileName(now = new Date()): string {
  return `listflix-backup-${now.toISOString().slice(0, 10)}.json`;
}

/* -------------------------------- Importar -------------------------------- */

export type ParseResult =
  { ok: true; backup: BackupFile } | { ok: false; error: 'invalid-json' | 'invalid-format' };

export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid-json' };
  }
  const result = backupSchema.safeParse(json);
  return result.success
    ? { ok: true, backup: result.data }
    : { ok: false, error: 'invalid-format' };
}

export type ImportMode = 'merge' | 'replace';

export interface ImportSummary {
  items: number;
  episodes: number;
  lists: number;
  localMedia: number;
}

function newerBy<T>(a: T | undefined, b: T, field: (x: T) => number): T {
  if (!a) return b;
  return field(b) > field(a) ? b : a;
}

/**
 * Importa una copia.
 * - `replace`: borra todo y deja exactamente lo de la copia.
 * - `merge`: combina con lo existente; en conflicto gana el `updatedAt` más reciente.
 * En ambos casos, si un archivo local con el mismo ID sigue vinculado en este navegador,
 * se conserva su handle; el resto queda pendiente de volver a vincular.
 */
export async function importBackup(backup: BackupFile, mode: ImportMode): Promise<ImportSummary> {
  const tables = [
    db.settings,
    db.items,
    db.episodes,
    db.lists,
    db.listItems,
    db.progress,
    db.localMedia,
    db.watchProviders,
  ];
  await db.transaction('rw', tables, async () => {
    const existingMedia = new Map((await db.localMedia.toArray()).map((m) => [m.id, m]));
    const currentSettings = (await db.settings.get(SETTINGS_ID)) ?? defaultSettings();

    const importedMedia: LocalMedia[] = backup.localMedia.map((m) => {
      const existing = existingMedia.get(m.id);
      const sameFile = existing?.fileName === m.fileName && existing?.fileSize === m.fileSize;
      return {
        ...m,
        handle: sameFile ? existing?.handle : undefined,
        subtitleHandles: sameFile ? existing?.subtitleHandles : undefined,
      };
    });

    if (mode === 'replace') {
      await clearAllData();
      const settings: Settings = {
        ...defaultSettings(),
        ...backup.settings,
        id: SETTINGS_ID,
        schemaVersion: currentSettings.schemaVersion,
      };
      await db.settings.put(settings);
      await db.items.bulkPut(backup.items as LibraryItem[]);
      await db.episodes.bulkPut(backup.episodes as EpisodeState[]);
      await db.lists.bulkPut(backup.lists as UserList[]);
      await db.listItems.bulkPut(backup.listItems as ListItem[]);
      await db.progress.bulkPut(backup.progress as PlaybackProgress[]);
      await db.localMedia.bulkPut(importedMedia);
      return;
    }

    // Fusionar
    const items = new Map((await db.items.toArray()).map((i) => [i.key, i]));
    for (const item of backup.items as LibraryItem[]) {
      items.set(
        item.key,
        newerBy(items.get(item.key), item, (x) => x.updatedAt),
      );
    }
    await db.items.bulkPut([...items.values()]);

    const episodes = new Map((await db.episodes.toArray()).map((e) => [e.key, e]));
    for (const ep of backup.episodes as EpisodeState[]) {
      episodes.set(
        ep.key,
        newerBy(episodes.get(ep.key), ep, (x) => x.watchedAt ?? 0),
      );
    }
    await db.episodes.bulkPut([...episodes.values()]);

    const listIds = new Set(await db.lists.toCollection().primaryKeys());
    await db.lists.bulkAdd((backup.lists as UserList[]).filter((l) => !listIds.has(l.id)));
    const listItemIds = new Set(await db.listItems.toCollection().primaryKeys());
    await db.listItems.bulkAdd(
      (backup.listItems as ListItem[]).filter((li) => !listItemIds.has(li.id)),
    );

    const progress = new Map((await db.progress.toArray()).map((p) => [p.localMediaId, p]));
    for (const p of backup.progress as PlaybackProgress[]) {
      progress.set(
        p.localMediaId,
        newerBy(progress.get(p.localMediaId), p, (x) => x.updatedAt),
      );
    }
    await db.progress.bulkPut([...progress.values()]);

    await db.localMedia.bulkAdd(importedMedia.filter((m) => !existingMedia.has(m.id)));
  });

  if (mode === 'merge') {
    const series = await db.items.where('mediaType').equals('tv').primaryKeys();
    for (const key of series) await recomputeSeriesStatus(key);
  }

  return {
    items: backup.items.length,
    episodes: backup.episodes.length,
    lists: backup.lists.length,
    localMedia: backup.localMedia.length,
  };
}
