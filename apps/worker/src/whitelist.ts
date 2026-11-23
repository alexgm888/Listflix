import { ALLOWED_APPENDS } from '@listflix/shared';

const DAY = 24 * 60 * 60;
const HOUR = 60 * 60;

export interface RouteRule {
  /** Nombre para logs y tests. */
  name: string;
  pattern: RegExp;
  /** TTL de la caché en el edge, en segundos. */
  ttl: number;
  /** Parámetros admitidos en esta ruta (además de los globales). */
  params: readonly string[];
  /** Si admite `append_to_response`. */
  allowAppend?: boolean;
  /** Si se fuerza `include_adult=false`. */
  forceNoAdult?: boolean;
}

const SEARCH_PARAMS = ['query', 'page', 'language', 'region', 'include_adult'] as const;

export const ROUTES: readonly RouteRule[] = [
  {
    name: 'search-multi',
    pattern: /^\/search\/multi$/,
    ttl: DAY,
    params: SEARCH_PARAMS,
    forceNoAdult: true,
  },
  {
    name: 'search-movie',
    pattern: /^\/search\/movie$/,
    ttl: DAY,
    params: [...SEARCH_PARAMS, 'year', 'primary_release_year'],
    forceNoAdult: true,
  },
  {
    name: 'search-tv',
    pattern: /^\/search\/tv$/,
    ttl: DAY,
    params: [...SEARCH_PARAMS, 'year', 'first_air_date_year'],
    forceNoAdult: true,
  },
  {
    name: 'movie-details',
    pattern: /^\/movie\/\d{1,10}$/,
    ttl: 7 * DAY,
    params: ['language'],
    allowAppend: true,
  },
  {
    name: 'tv-details',
    pattern: /^\/tv\/\d{1,10}$/,
    ttl: DAY,
    params: ['language'],
    allowAppend: true,
  },
  {
    name: 'tv-season',
    pattern: /^\/tv\/\d{1,10}\/season\/\d{1,3}$/,
    ttl: DAY,
    params: ['language'],
  },
  {
    name: 'watch-providers',
    pattern: /^\/(movie|tv)\/\d{1,10}\/watch\/providers$/,
    ttl: 6 * HOUR,
    params: [],
  },
  {
    name: 'provider-catalog',
    pattern: /^\/watch\/providers\/(movie|tv)$/,
    ttl: 7 * DAY,
    params: ['language', 'watch_region'],
  },
  {
    name: 'genres',
    pattern: /^\/genre\/(movie|tv)\/list$/,
    ttl: 30 * DAY,
    params: ['language'],
  },
  {
    name: 'configuration',
    pattern: /^\/configuration$/,
    ttl: 30 * DAY,
    params: [],
  },
];

/** Validadores de valor por parámetro. Un valor inválido hace que la petición se rechace. */
const VALIDATORS: Record<string, (value: string) => boolean> = {
  query: (v) => v.trim().length > 0 && v.length <= 200,
  page: (v) => /^\d{1,3}$/.test(v) && Number(v) >= 1 && Number(v) <= 500,
  language: (v) => /^[a-z]{2}(-[A-Z]{2})?$/.test(v),
  region: (v) => /^[A-Z]{2}$/.test(v),
  watch_region: (v) => /^[A-Z]{2}$/.test(v),
  year: (v) => /^\d{4}$/.test(v),
  primary_release_year: (v) => /^\d{4}$/.test(v),
  first_air_date_year: (v) => /^\d{4}$/.test(v),
  include_adult: () => true, // siempre se sobrescribe con false
};

export type NormalizeResult =
  | { ok: true; route: RouteRule; path: string; params: [string, string][] }
  | { ok: false; status: 404 | 400; code: string; message: string };

/**
 * Comprueba la ruta y los parámetros contra la lista blanca y devuelve los
 * parámetros normalizados (filtrados, validados y ordenados por nombre).
 * Los parámetros desconocidos (incluido `api_key`) se descartan.
 */
export function normalizeRequest(pathname: string, search: URLSearchParams): NormalizeResult {
  const path = pathname.replace(/\/+$/, '') || '/';
  const route = ROUTES.find((r) => r.pattern.test(path));
  if (!route) {
    return { ok: false, status: 404, code: 'not_found', message: 'Route not allowed' };
  }

  const params = new Map<string, string>();
  for (const name of route.params) {
    const value = search.get(name);
    if (value === null || value === '') continue;
    const validate = VALIDATORS[name];
    if (validate && !validate(value)) {
      return {
        ok: false,
        status: 400,
        code: 'bad_request',
        message: `Invalid value for parameter "${name}"`,
      };
    }
    params.set(name, name === 'query' ? value.trim() : value);
  }

  if (route.allowAppend) {
    const raw = search.get('append_to_response');
    if (raw) {
      const allowed = new Set<string>(ALLOWED_APPENDS);
      const values = [...new Set(raw.split(',').map((v) => v.trim()))]
        .filter((v) => allowed.has(v))
        .sort();
      if (values.length > 0) params.set('append_to_response', values.join(','));
    }
  }

  if (route.forceNoAdult) params.set('include_adult', 'false');

  if (route.params.includes('query') && !params.has('query')) {
    return { ok: false, status: 400, code: 'bad_request', message: 'Missing parameter "query"' };
  }

  const sorted = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return { ok: true, route, path, params: sorted };
}

/** Construye la URL normalizada que se usa como clave de caché y para pedir a TMDB. */
export function buildQueryString(params: [string, string][]): string {
  const search = new URLSearchParams();
  for (const [k, v] of params) search.append(k, v);
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
