/** Tipos del dominio de Listflix (modelo de datos de la §5 de la especificación). */

export type MediaType = 'movie' | 'tv';
export type WatchStatus = 'pending' | 'watching' | 'watched' | 'dropped';
export const WATCH_STATUSES: readonly WatchStatus[] = ['pending', 'watching', 'watched', 'dropped'];

export type UiLanguage = 'es' | 'en';
export type MetadataLanguage = 'es-ES' | 'en-US';

export interface LibraryItem {
  key: string; // `${mediaType}:${tmdbId}` (PK)
  mediaType: MediaType;
  tmdbId: number;
  title: string; // en el idioma configurado al guardar
  originalTitle: string;
  year?: number;
  posterPath?: string;
  backdropPath?: string;
  genreIds: number[];
  voteAverage?: number;
  runtime?: number; // películas, en minutos
  numberOfSeasons?: number; // series
  status: WatchStatus;
  statusIsManual: boolean;
  addedAt: number;
  updatedAt: number;
  lastWatchedAt?: number;
  metadataFetchedAt: number;
  /** Idioma con el que se obtuvieron los metadatos (para refrescarlos si cambia). */
  metadataLanguage?: MetadataLanguage;
}

export interface EpisodeState {
  key: string; // `tv:${tmdbId}:s${season}e${episode}` (PK)
  seriesKey: string;
  season: number;
  episode: number;
  name?: string;
  airDate?: string;
  watched: boolean;
  watchedAt?: number;
}

export interface UserList {
  id: string;
  name: string;
  order: number;
  createdAt: number;
}

export interface ListItem {
  id: string; // `${listId}|${itemKey}`
  listId: string;
  itemKey: string;
  order: number;
  addedAt: number;
}

export interface SubtitleRef {
  lang?: string;
  label: string;
  handle: FileSystemFileHandle;
}

export interface LocalMedia {
  id: string;
  itemKey: string;
  episodeKey?: string;
  fileName: string;
  fileSize: number;
  /** Ausente si el registro viene de una importación y falta volver a vincular el archivo. */
  handle?: FileSystemFileHandle;
  subtitleHandles?: SubtitleRef[];
  linkedAt: number;
}

export interface PlaybackProgress {
  localMediaId: string;
  positionSec: number;
  durationSec: number;
  updatedAt: number;
}

export type WatchProviderType = 'flatrate' | 'rent' | 'buy' | 'free' | 'ads';
export const WATCH_PROVIDER_TYPES: readonly WatchProviderType[] = [
  'flatrate',
  'free',
  'ads',
  'rent',
  'buy',
];

export interface ProviderInfo {
  providerId: number;
  providerName: string;
  logoPath?: string;
  displayPriority?: number;
}

export interface WatchProvidersByType {
  flatrate: ProviderInfo[];
  rent: ProviderInfo[];
  buy: ProviderInfo[];
  free: ProviderInfo[];
  ads: ProviderInfo[];
  tmdbLink?: string;
}

export interface WatchProvidersCache {
  key: string; // `${itemKey}:${country}`
  data: WatchProvidersByType;
  fetchedAt: number;
}

export interface SubtitleStyle {
  /** Escala del texto (1 = 100 %). */
  scale: number;
  /** Opacidad del fondo (0–1). */
  backgroundOpacity: number;
}

export interface Settings {
  id: 'singleton';
  uiLanguage: UiLanguage;
  metadataLanguage: MetadataLanguage;
  country: string;
  myProviderIds: number[];
  schemaVersion: number;
  subtitleStyle?: SubtitleStyle;
  libraryView?: 'grid' | 'list';
}

export function itemKeyOf(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

export function parseItemKey(key: string): { mediaType: MediaType; tmdbId: number } | null {
  const match = /^(movie|tv):(\d+)$/.exec(key);
  if (!match) return null;
  return { mediaType: match[1] as MediaType, tmdbId: Number(match[2]) };
}

export function episodeKeyOf(seriesKey: string, season: number, episode: number): string {
  return `${seriesKey}:s${season}e${episode}`;
}

export function emptyProviders(): WatchProvidersByType {
  return { flatrate: [], rent: [], buy: [], free: [], ads: [] };
}
