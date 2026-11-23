import type {
  TmdbGenreListResponse,
  TmdbMediaType,
  TmdbMovieDetails,
  TmdbMovieResult,
  TmdbMultiResult,
  TmdbPaged,
  TmdbProviderCatalogResponse,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbTvResult,
  TmdbWatchProvidersResponse,
} from './tmdb-types';

/** Forma normalizada de los errores que devuelve el Worker. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

export type ApiErrorCode =
  | 'not_found'
  | 'method_not_allowed'
  | 'bad_request'
  | 'rate_limited'
  | 'forbidden_origin'
  | 'upstream_error'
  | 'network_error'
  | 'internal_error';

/** Valores de `append_to_response` que admite el Worker. */
export const ALLOWED_APPENDS = ['credits', 'external_ids', 'videos'] as const;
export type AllowedAppend = (typeof ALLOWED_APPENDS)[number];

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type Params = Record<string, string | number | boolean | undefined>;

export interface ListflixApiClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
}

/**
 * Cliente tipado del Worker `listflix-api`.
 * Las rutas son las mismas que las de TMDB v3; el Worker añade el token.
 */
export class ListflixApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: ListflixApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  buildUrl(path: string, params: Params = {}): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '') continue;
      search.set(key, String(value));
    }
    const qs = search.toString();
    return `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
  }

  async get<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.buildUrl(path, params), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      throw new ApiRequestError(0, 'network_error', (err as Error)?.message ?? 'Network error');
    }
    if (!response.ok) {
      let code = 'upstream_error';
      let message = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as Partial<ApiErrorBody>;
        if (body.error) {
          code = body.error.code;
          message = body.error.message;
        }
      } catch {
        // cuerpo no JSON: se mantiene el mensaje genérico
      }
      throw new ApiRequestError(response.status, code, message);
    }
    return (await response.json()) as T;
  }

  searchMulti(query: string, opts: { language: string; page?: number }, signal?: AbortSignal) {
    return this.get<TmdbPaged<TmdbMultiResult>>(
      '/search/multi',
      { query, language: opts.language, page: opts.page },
      signal,
    );
  }

  searchMovie(query: string, opts: { language: string; year?: number }, signal?: AbortSignal) {
    return this.get<TmdbPaged<TmdbMovieResult>>(
      '/search/movie',
      { query, language: opts.language, primary_release_year: opts.year },
      signal,
    );
  }

  searchTv(query: string, opts: { language: string; year?: number }, signal?: AbortSignal) {
    return this.get<TmdbPaged<TmdbTvResult>>(
      '/search/tv',
      { query, language: opts.language, first_air_date_year: opts.year },
      signal,
    );
  }

  movieDetails(id: number, opts: { language: string; append?: AllowedAppend[] }) {
    return this.get<TmdbMovieDetails>(`/movie/${id}`, {
      language: opts.language,
      append_to_response: opts.append?.join(','),
    });
  }

  tvDetails(id: number, opts: { language: string; append?: AllowedAppend[] }) {
    return this.get<TmdbTvDetails>(`/tv/${id}`, {
      language: opts.language,
      append_to_response: opts.append?.join(','),
    });
  }

  season(tvId: number, seasonNumber: number, opts: { language: string }) {
    return this.get<TmdbSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`, {
      language: opts.language,
    });
  }

  watchProviders(type: TmdbMediaType, id: number) {
    return this.get<TmdbWatchProvidersResponse>(`/${type}/${id}/watch/providers`);
  }

  providerCatalog(type: TmdbMediaType, opts: { region: string; language: string }) {
    return this.get<TmdbProviderCatalogResponse>(`/watch/providers/${type}`, {
      watch_region: opts.region,
      language: opts.language,
    });
  }

  genres(type: TmdbMediaType, opts: { language: string }) {
    return this.get<TmdbGenreListResponse>(`/genre/${type}/list`, { language: opts.language });
  }
}
