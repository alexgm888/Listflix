/** Acceso a archivos locales con la File System Access API (solo en páginas de la extensión). */

export const VIDEO_ACCEPT: FilePickerAcceptType = {
  description: 'Vídeo',
  accept: { 'video/*': ['.mp4', '.m4v', '.webm', '.mkv', '.mov', '.ogv'] },
};

export const SUBTITLE_ACCEPT: FilePickerAcceptType = {
  description: 'Subtítulos',
  accept: { 'text/plain': ['.srt', '.vtt'] },
};

export function isFilePickerSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';
}

/** Abre el selector de archivos. Devuelve `null` si el usuario lo cancela. */
async function pickFile(
  type: FilePickerAcceptType,
  id: string,
): Promise<FileSystemFileHandle | null> {
  if (!window.showOpenFilePicker) throw new Error('File System Access API not supported');
  try {
    const [handle] = await window.showOpenFilePicker({ types: [type], multiple: false, id });
    return handle ?? null;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    throw err;
  }
}

export const pickVideoFile = () => pickFile(VIDEO_ACCEPT, 'listflix-video');
export const pickSubtitleFile = () => pickFile(SUBTITLE_ACCEPT, 'listflix-subtitles');

/**
 * Comprueba el permiso de lectura y, si `request` es true, lo pide.
 * `request` solo debe usarse dentro de un gesto del usuario (p. ej. el clic en "Reproducir").
 */
export async function ensureReadPermission(
  handle: FileSystemHandle,
  request: boolean,
): Promise<boolean> {
  if (!handle.queryPermission) return true; // navegadores sin permisos por handle
  const descriptor = { mode: 'read' } as const;
  if ((await handle.queryPermission(descriptor)) === 'granted') return true;
  if (!request || !handle.requestPermission) return false;
  return (await handle.requestPermission(descriptor)) === 'granted';
}

export class FileGoneError extends Error {
  constructor() {
    super('The linked file no longer exists');
    this.name = 'FileGoneError';
  }
}

/** Lee el archivo; lanza `FileGoneError` si se ha movido o borrado. */
export async function readLinkedFile(handle: FileSystemFileHandle): Promise<File> {
  try {
    return await handle.getFile();
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === 'NotFoundError' || err.name === 'NotReadableError')
    ) {
      throw new FileGoneError();
    }
    throw err;
  }
}

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
};

/** Formatos con soporte fiable en Chrome. */
const RELIABLE = new Set(['mp4', 'm4v', 'webm', 'ogv', 'ogg']);
/** Formatos que Chrome no reproduce. */
const UNSUPPORTED = new Set(['avi', 'wmv']);

export type Compatibility = 'supported' | 'uncertain' | 'unsupported';

export function fileExtension(fileName: string): string {
  return /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase() ?? '';
}

/**
 * Estima si Chrome puede reproducir el archivo. MP4 (H.264/AAC), WebM y Ogg son fiables;
 * MOV y MKV dependen de los códecs; HEVC depende del hardware.
 */
export function checkCompatibility(
  fileName: string,
  canPlayType?: (mime: string) => string,
): Compatibility {
  const ext = fileExtension(fileName);
  if (UNSUPPORTED.has(ext)) return 'unsupported';
  const mime = MIME_BY_EXTENSION[ext];
  if (!mime) return 'uncertain';
  if (RELIABLE.has(ext)) return 'supported';
  const answer = canPlayType?.(mime) ?? '';
  return answer === 'probably' ? 'supported' : 'uncertain';
}
