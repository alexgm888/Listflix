import { ListflixApiClient } from '@listflix/shared';
import { TmdbMetadataProvider } from '../providers/metadata/tmdb';
import type { MetadataProvider } from '../providers/metadata/types';

export const API_BASE_URL: string =
  (import.meta.env.WXT_API_BASE_URL as string | undefined) || 'http://localhost:8787';

export const apiClient = new ListflixApiClient({ baseUrl: API_BASE_URL });

/** Proveedor de metadatos activo. Para cambiar de proveedor basta con sustituir esta instancia. */
export const metadataProvider: MetadataProvider = new TmdbMetadataProvider(apiClient);
