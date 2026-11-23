import type { MediaType, ProviderInfo, WatchProvidersByType } from '../../domain/types';

/** Tipos normalizados de metadatos, independientes del proveedor (TMDB u otro). */

export interface Genre {
  id: number;
  name: string;
}

export interface SearchResult {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  originalTitle: string;
  year?: number;
  posterPath?: string;
  backdropPath?: string;
  overview?: string;
  genreIds: number[];
  voteAverage?: number;
}

export interface SearchPage {
  page: number;
  totalPages: number;
  totalResults: number;
  results: SearchResult[];
}

export interface CastMember {
  id: number;
  name: string;
  character?: string;
  profilePath?: string;
}

export interface SeasonSummary {
  seasonNumber: number;
  episodeCount: number;
  name: string;
  airDate?: string;
  posterPath?: string;
}

export interface TitleDetails extends SearchResult {
  genres: Genre[];
  runtime?: number;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  seasons?: SeasonSummary[];
  cast: CastMember[];
  imdbId?: string;
}

export interface EpisodeInfo {
  season: number;
  episode: number;
  name?: string;
  overview?: string;
  airDate?: string;
  runtime?: number;
  stillPath?: string;
}

export interface SeasonDetails {
  seasonNumber: number;
  name: string;
  episodes: EpisodeInfo[];
}

export interface SearchOptions {
  language: string;
  page?: number;
  signal?: AbortSignal;
}

export interface MetadataProvider {
  search(query: string, options: SearchOptions): Promise<SearchPage>;
  searchByType(
    mediaType: MediaType,
    query: string,
    options: { language: string; year?: number; signal?: AbortSignal },
  ): Promise<SearchResult[]>;
  getDetails(mediaType: MediaType, tmdbId: number, language: string): Promise<TitleDetails>;
  getSeason(tmdbId: number, seasonNumber: number, language: string): Promise<SeasonDetails>;
  /** Plataformas por país (código ISO 3166-1 → plataformas). */
  getWatchProviders(
    mediaType: MediaType,
    tmdbId: number,
  ): Promise<Record<string, WatchProvidersByType>>;
  /** Catálogo de plataformas de una región (películas y series combinadas). */
  getProviderCatalog(country: string, language: string): Promise<ProviderInfo[]>;
  /** Géneros de películas y series combinados (sin duplicados por ID). */
  getGenres(language: string): Promise<Genre[]>;
}
