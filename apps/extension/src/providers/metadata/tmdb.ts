import type {
  ListflixApiClient,
  TmdbMovieDetails,
  TmdbMovieResult,
  TmdbMultiResult,
  TmdbTvDetails,
  TmdbTvResult,
  TmdbWatchProvider,
  TmdbWatchProviderRegion,
} from '@listflix/shared';
import type { MediaType, ProviderInfo, WatchProvidersByType } from '../../domain/types';
import type {
  Genre,
  MetadataProvider,
  SearchOptions,
  SearchPage,
  SearchResult,
  SeasonDetails,
  TitleDetails,
} from './types';

function yearOf(date?: string | null): number | undefined {
  if (!date) return undefined;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : undefined;
}

const orUndef = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

export function mapMovieResult(r: TmdbMovieResult): SearchResult {
  return {
    mediaType: 'movie',
    tmdbId: r.id,
    title: r.title,
    originalTitle: r.original_title,
    year: yearOf(r.release_date),
    posterPath: orUndef(r.poster_path),
    backdropPath: orUndef(r.backdrop_path),
    overview: r.overview || undefined,
    genreIds: r.genre_ids ?? [],
    voteAverage: r.vote_average,
  };
}

export function mapTvResult(r: TmdbTvResult): SearchResult {
  return {
    mediaType: 'tv',
    tmdbId: r.id,
    title: r.name,
    originalTitle: r.original_name,
    year: yearOf(r.first_air_date),
    posterPath: orUndef(r.poster_path),
    backdropPath: orUndef(r.backdrop_path),
    overview: r.overview || undefined,
    genreIds: r.genre_ids ?? [],
    voteAverage: r.vote_average,
  };
}

export function mapMultiResult(r: TmdbMultiResult): SearchResult | null {
  if (r.media_type === 'movie') return mapMovieResult(r);
  if (r.media_type === 'tv') return mapTvResult(r);
  return null;
}

function mapCast(d: TmdbMovieDetails | TmdbTvDetails) {
  return (d.credits?.cast ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 12)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character || undefined,
      profilePath: orUndef(c.profile_path),
    }));
}

export function mapMovieDetails(d: TmdbMovieDetails): TitleDetails {
  return {
    mediaType: 'movie',
    tmdbId: d.id,
    title: d.title,
    originalTitle: d.original_title,
    year: yearOf(d.release_date),
    posterPath: orUndef(d.poster_path),
    backdropPath: orUndef(d.backdrop_path),
    overview: d.overview || undefined,
    genreIds: d.genres.map((g) => g.id),
    genres: d.genres,
    voteAverage: d.vote_average,
    runtime: d.runtime || undefined,
    cast: mapCast(d),
    imdbId: orUndef(d.external_ids?.imdb_id),
  };
}

export function mapTvDetails(d: TmdbTvDetails): TitleDetails {
  return {
    mediaType: 'tv',
    tmdbId: d.id,
    title: d.name,
    originalTitle: d.original_name,
    year: yearOf(d.first_air_date),
    posterPath: orUndef(d.poster_path),
    backdropPath: orUndef(d.backdrop_path),
    overview: d.overview || undefined,
    genreIds: d.genres.map((g) => g.id),
    genres: d.genres,
    voteAverage: d.vote_average,
    runtime: d.episode_run_time?.[0],
    numberOfSeasons: d.number_of_seasons,
    numberOfEpisodes: d.number_of_episodes,
    seasons: d.seasons.map((s) => ({
      seasonNumber: s.season_number,
      episodeCount: s.episode_count,
      name: s.name,
      airDate: orUndef(s.air_date),
      posterPath: orUndef(s.poster_path),
    })),
    cast: mapCast(d),
    imdbId: orUndef(d.external_ids?.imdb_id),
  };
}

function mapProvider(p: TmdbWatchProvider): ProviderInfo {
  return {
    providerId: p.provider_id,
    providerName: p.provider_name,
    logoPath: orUndef(p.logo_path),
    displayPriority: p.display_priority,
  };
}

export function mapProviderRegion(region: TmdbWatchProviderRegion): WatchProvidersByType {
  return {
    flatrate: (region.flatrate ?? []).map(mapProvider),
    rent: (region.rent ?? []).map(mapProvider),
    buy: (region.buy ?? []).map(mapProvider),
    free: (region.free ?? []).map(mapProvider),
    ads: (region.ads ?? []).map(mapProvider),
    tmdbLink: region.link,
  };
}

export class TmdbMetadataProvider implements MetadataProvider {
  constructor(private readonly api: ListflixApiClient) {}

  async search(query: string, { language, page, signal }: SearchOptions): Promise<SearchPage> {
    const res = await this.api.searchMulti(query, { language, page }, signal);
    return {
      page: res.page,
      totalPages: res.total_pages,
      totalResults: res.total_results,
      results: res.results.map(mapMultiResult).filter((r): r is SearchResult => r !== null),
    };
  }

  async searchByType(
    mediaType: MediaType,
    query: string,
    { language, year, signal }: { language: string; year?: number; signal?: AbortSignal },
  ): Promise<SearchResult[]> {
    if (mediaType === 'movie') {
      const res = await this.api.searchMovie(query, { language, year }, signal);
      return res.results.map(mapMovieResult);
    }
    const res = await this.api.searchTv(query, { language, year }, signal);
    return res.results.map(mapTvResult);
  }

  async getDetails(mediaType: MediaType, tmdbId: number, language: string): Promise<TitleDetails> {
    const append = ['credits', 'external_ids'] as const;
    if (mediaType === 'movie') {
      return mapMovieDetails(
        await this.api.movieDetails(tmdbId, { language, append: [...append] }),
      );
    }
    return mapTvDetails(await this.api.tvDetails(tmdbId, { language, append: [...append] }));
  }

  async getSeason(tmdbId: number, seasonNumber: number, language: string): Promise<SeasonDetails> {
    const res = await this.api.season(tmdbId, seasonNumber, { language });
    return {
      seasonNumber: res.season_number,
      name: res.name,
      episodes: res.episodes.map((e) => ({
        season: e.season_number,
        episode: e.episode_number,
        name: e.name || undefined,
        overview: e.overview || undefined,
        airDate: orUndef(e.air_date),
        runtime: orUndef(e.runtime),
        stillPath: orUndef(e.still_path),
      })),
    };
  }

  async getWatchProviders(
    mediaType: MediaType,
    tmdbId: number,
  ): Promise<Record<string, WatchProvidersByType>> {
    const res = await this.api.watchProviders(mediaType, tmdbId);
    const out: Record<string, WatchProvidersByType> = {};
    for (const [country, region] of Object.entries(res.results ?? {})) {
      out[country] = mapProviderRegion(region);
    }
    return out;
  }

  async getProviderCatalog(country: string, language: string): Promise<ProviderInfo[]> {
    const [movie, tv] = await Promise.all([
      this.api.providerCatalog('movie', { region: country, language }),
      this.api.providerCatalog('tv', { region: country, language }),
    ]);
    const byId = new Map<number, ProviderInfo>();
    for (const p of [...movie.results, ...tv.results]) {
      if (!byId.has(p.provider_id)) byId.set(p.provider_id, mapProvider(p));
    }
    return [...byId.values()].sort(
      (a, b) =>
        (a.displayPriority ?? 999) - (b.displayPriority ?? 999) ||
        a.providerName.localeCompare(b.providerName),
    );
  }

  async getGenres(language: string): Promise<Genre[]> {
    const [movie, tv] = await Promise.all([
      this.api.genres('movie', { language }),
      this.api.genres('tv', { language }),
    ]);
    const byId = new Map<number, Genre>();
    for (const g of [...movie.genres, ...tv.genres]) if (!byId.has(g.id)) byId.set(g.id, g);
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, language));
  }
}
