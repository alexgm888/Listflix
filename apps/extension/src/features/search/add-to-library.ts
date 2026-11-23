import { addItem } from '../../db/library';
import type { MetadataLanguage, WatchStatus } from '../../domain/types';
import type { MetadataProvider, SearchResult, TitleDetails } from '../../providers/metadata/types';
import { refreshItem } from '../../sync/metadata-sync';
import { getProvidersCached } from '../../sync/providers-sync';

/**
 * Añade un título y, en segundo plano, completa sus metadatos (duración, géneros…)
 * y, si es una serie, descarga sus episodios. También descarga sus plataformas.
 */
export async function addToLibrary(
  input: SearchResult | TitleDetails,
  status: WatchStatus,
  { language, country }: { language: MetadataLanguage; country: string },
  provider: MetadataProvider,
): Promise<void> {
  const item = await addItem(input, { status, language });
  const details = 'genres' in input ? input : undefined;
  refreshItem(item.key, provider, language, details).catch((err: unknown) => {
    console.warn('[listflix] could not complete metadata for', item.key, err);
  });
  getProvidersCached(item, country, provider).catch((err: unknown) => {
    console.warn('[listflix] could not fetch watch providers for', item.key, err);
  });
}
