import type { LibraryItem, WatchProviderType } from '../../domain/types';

export interface WatchLink {
  providerId: number; // ID de proveedor de TMDB
  providerName: string;
  logoPath?: string;
  type: WatchProviderType;
  url: string; // URL que se abre
  isDirect: boolean; // v1: false (búsqueda); futuro: true (deep link)
}

export type WatchLinkItem = Pick<
  LibraryItem,
  'key' | 'mediaType' | 'tmdbId' | 'title' | 'originalTitle'
>;

export interface WatchLinkProvider {
  getLinks(item: WatchLinkItem, country: string): Promise<WatchLink[]>;
}
