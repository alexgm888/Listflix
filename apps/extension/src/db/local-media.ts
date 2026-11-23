import type { LocalMedia, PlaybackProgress, SubtitleRef } from '../domain/types';
import { db } from './db';

export interface LinkFileInput {
  itemKey: string;
  episodeKey?: string;
  handle: FileSystemFileHandle;
  fileName: string;
  fileSize: number;
}

/** Busca el archivo vinculado a una película (sin episodio) o a un episodio concreto. */
export async function findLocalMedia(
  itemKey: string,
  episodeKey?: string,
): Promise<LocalMedia | undefined> {
  if (episodeKey) return db.localMedia.where('episodeKey').equals(episodeKey).first();
  return db.localMedia
    .where('itemKey')
    .equals(itemKey)
    .filter((m) => !m.episodeKey)
    .first();
}

export async function getLocalMediaForItem(itemKey: string): Promise<LocalMedia[]> {
  return db.localMedia.where('itemKey').equals(itemKey).toArray();
}

/**
 * Vincula un archivo. Si ya había uno para el mismo destino se reutiliza el registro
 * (se mantiene el ID); el progreso solo se conserva si es el mismo archivo.
 */
export async function linkLocalFile(input: LinkFileInput, now = Date.now()): Promise<LocalMedia> {
  return db.transaction('rw', db.localMedia, db.progress, async () => {
    const existing = await findLocalMedia(input.itemKey, input.episodeKey);
    if (existing) {
      const sameFile = existing.fileName === input.fileName && existing.fileSize === input.fileSize;
      if (!sameFile) await db.progress.delete(existing.id);
      const updated: LocalMedia = {
        ...existing,
        handle: input.handle,
        fileName: input.fileName,
        fileSize: input.fileSize,
        subtitleHandles: sameFile ? existing.subtitleHandles : undefined,
        linkedAt: now,
      };
      await db.localMedia.put(updated);
      return updated;
    }
    const media: LocalMedia = {
      id: crypto.randomUUID(),
      itemKey: input.itemKey,
      episodeKey: input.episodeKey,
      handle: input.handle,
      fileName: input.fileName,
      fileSize: input.fileSize,
      linkedAt: now,
    };
    await db.localMedia.add(media);
    return media;
  });
}

export async function unlinkLocalFile(id: string): Promise<void> {
  await db.transaction('rw', db.localMedia, db.progress, async () => {
    await db.progress.delete(id);
    await db.localMedia.delete(id);
  });
}

export async function addSubtitleToMedia(id: string, ref: SubtitleRef): Promise<void> {
  await db.transaction('rw', db.localMedia, async () => {
    const media = await db.localMedia.get(id);
    if (!media) return;
    const others = (media.subtitleHandles ?? []).filter((s) => s.label !== ref.label);
    await db.localMedia.update(id, { subtitleHandles: [...others, ref] });
  });
}

export async function getProgress(localMediaId: string): Promise<PlaybackProgress | undefined> {
  return db.progress.get(localMediaId);
}

export async function saveProgress(
  localMediaId: string,
  positionSec: number,
  durationSec: number,
  now = Date.now(),
): Promise<void> {
  if (!Number.isFinite(positionSec) || !Number.isFinite(durationSec)) return;
  await db.progress.put({ localMediaId, positionSec, durationSec, updatedAt: now });
}
