import { linkLocalFile } from '../../db/local-media';
import { episodeKeyOf, type LocalMedia } from '../../domain/types';
import { i18n } from '../../i18n';
import { pickVideoFile } from '../../local-media/file-access';

export interface PickedFile {
  handle: FileSystemFileHandle;
  fileName: string;
  fileSize: number;
}

/** Abre el selector de vídeo y devuelve el archivo elegido (o null si se cancela). */
export async function pickVideo(): Promise<PickedFile | null> {
  const handle = await pickVideoFile(i18n.t('local.videoFiles'));
  if (!handle) return null;
  const file = await handle.getFile();
  return { handle, fileName: file.name, fileSize: file.size };
}

export async function linkPicked(
  picked: PickedFile,
  itemKey: string,
  episode?: { season: number; episode: number },
): Promise<LocalMedia> {
  return linkLocalFile({
    itemKey,
    episodeKey: episode ? episodeKeyOf(itemKey, episode.season, episode.episode) : undefined,
    handle: picked.handle,
    fileName: picked.fileName,
    fileSize: picked.fileSize,
  });
}
