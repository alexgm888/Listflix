import { browser } from 'wxt/browser';
import type { LocalMedia } from '../domain/types';
import { ensureReadPermission } from './file-access';

export type OpenPlayerResult = 'opened' | 'needs-relink' | 'denied';

export function playerUrl(localMediaId: string): string {
  return browser.runtime.getURL(`/player.html?media=${encodeURIComponent(localMediaId)}`);
}

/**
 * Abre el reproductor. Debe llamarse desde el gesto del usuario (clic en "Reproducir"),
 * porque puede pedir el permiso de lectura del archivo.
 */
export async function openPlayer(media: LocalMedia): Promise<OpenPlayerResult> {
  if (!media.handle) return 'needs-relink';
  const granted = await ensureReadPermission(media.handle, true);
  if (!granted) return 'denied';
  await browser.tabs.create({ url: playerUrl(media.id) });
  return 'opened';
}
