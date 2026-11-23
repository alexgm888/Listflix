/**
 * Tipos de las respuestas de TMDB que devuelve el Worker `listflix-api`.
 * Se definen a mano y solo con los campos que usa Listflix.
 * El Worker reenvía las respuestas de TMDB v3 sin transformarlas.
 */

export type TmdbMediaType = 'movie' | 'tv';

export interface TmdbPaged<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbTitleBase {
  id: number;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
}

export interface TmdbMovieResult extends TmdbTitleBase {
  media_type?: 'movie';
  title: string;
  original_title: string;
  release_date?: string;
}

export interface TmdbTvResult extends TmdbTitleBase {
  media_type?: 'tv';
  name: string;
  original_name: string;
  first_air_date?: string;
}

export interface TmdbPersonResult {
  id: number;
  media_type: 'person';
  name: string;
}

export type TmdbMultiResult =
  | (TmdbMovieResult & { media_type: 'movie' })
  | (TmdbTvResult & { media_type: 'tv' })
  | TmdbPersonResult;

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
}

export interface TmdbExternalIds {
  imdb_id?: string | null;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview?: string;
  release_date?: string;
  runtime?: number | null;
  genres: TmdbGenre[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  credits?: TmdbCredits;
  external_ids?: TmdbExternalIds;
}

export interface TmdbSeasonSummary {
  season_number: number;
  episode_count: number;
  name: string;
  air_date?: string | null;
  poster_path?: string | null;
}

export interface TmdbEpisodeSummary {
  season_number: number;
  episode_number: number;
  name?: string;
  air_date?: string | null;
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  original_name: string;
  overview?: string;
  first_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  seasons: TmdbSeasonSummary[];
  genres: TmdbGenre[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  status?: string;
  last_episode_to_air?: TmdbEpisodeSummary | null;
  next_episode_to_air?: TmdbEpisodeSummary | null;
  credits?: TmdbCredits;
  external_ids?: TmdbExternalIds;
}

export interface TmdbEpisode {
  season_number: number;
  episode_number: number;
  name?: string;
  overview?: string;
  air_date?: string | null;
  runtime?: number | null;
  still_path?: string | null;
}

export interface TmdbSeasonDetails {
  season_number: number;
  name: string;
  episodes: TmdbEpisode[];
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
  display_priority?: number;
}

export interface TmdbWatchProviderRegion {
  link?: string;
  flatrate?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
}

export interface TmdbWatchProvidersResponse {
  id: number;
  results: Record<string, TmdbWatchProviderRegion>;
}

export interface TmdbProviderCatalogResponse {
  results: TmdbWatchProvider[];
}

export interface TmdbGenreListResponse {
  genres: TmdbGenre[];
}
