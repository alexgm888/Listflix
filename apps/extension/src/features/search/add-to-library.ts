import { addItem } from '../../db/library';
import type { MetadataLanguage, WatchStatus } from '../../domain/types';
import type { MetadataProvider, SearchResult, TitleDetails } from '../../providers/metadata/types';
import { refreshItem } from '../../sync/metadata-sync';

/**
 * Añade un título y, en segundo plano, completa sus metadatos (duración, géneros…)
 * y, si es una serie, descarga sus episodios.
 */
export async function addToLibrary(
  input: SearchResult | TitleDetails,
  status: WatchStatus,
  language: MetadataLanguage,
  provider: MetadataProvider,
): Promise<void> {
  const item = await addItem(input, { status, language });
  const details = 'genres' in input ? input : undefined;
  refreshItem(item.key, provider, language, details).catch((err: unknown) => {
    console.warn('[listflix] could not complete metadata for', item.key, err);
  });
}
