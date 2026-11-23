import type { ApiErrorBody } from '@listflix/shared';
import { corsHeaders, isOriginAllowed, parseAllowedOrigins } from './cors';
import { buildQueryString, normalizeRequest } from './whitelist';

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
/** Host ficticio para las claves de caché (la Cache API exige URLs absolutas). */
const CACHE_KEY_BASE = 'https://listflix-cache.internal';

export interface Env {
  TMDB_TOKEN: string;
  ALLOWED_ORIGINS?: string;
  RATE_LIMITER?: RateLimit;
}

export interface Deps {
  fetch: typeof fetch;
  cache: Pick<Cache, 'match' | 'put'> | null;
  waitUntil: (promise: Promise<unknown>) => void;
}

function jsonError(status: number, code: string, message: string, extra: HeadersInit = {}) {
  const body: ApiErrorBody = { error: { code, message } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
  const res = new Response(response.body, response);
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

/** Clave de caché normalizada: ruta + parámetros permitidos ordenados. */
export function cacheKeyFor(path: string, params: [string, string][]): string {
  return `${CACHE_KEY_BASE}${path}${buildQueryString(params)}`;
}

export async function handleRequest(request: Request, env: Env, deps: Deps): Promise<Response> {
  const origin = request.headers.get('Origin');
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  const originOk = origin === null || isOriginAllowed(origin, allowedOrigins);
  const cors = origin && originOk ? corsHeaders(origin) : {};

  if (!originOk) {
    return jsonError(403, 'forbidden_origin', 'Origin not allowed');
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'GET') {
    return jsonError(405, 'method_not_allowed', 'Only GET is allowed', {
      ...cors,
      Allow: 'GET, OPTIONS',
    });
  }

  const url = new URL(request.url);
  const normalized = normalizeRequest(url.pathname, url.searchParams);
  if (!normalized.ok) {
    return jsonError(normalized.status, normalized.code, normalized.message, cors);
  }

  const cacheKey = cacheKeyFor(normalized.path, normalized.params);
  const cached = deps.cache ? await deps.cache.match(cacheKey) : undefined;
  if (cached) {
    return withHeaders(cached, { ...cors, 'X-Listflix-Cache': 'HIT' });
  }

  // Límite por IP solo para las peticiones que llegan a TMDB.
  if (env.RATE_LIMITER) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) {
      return jsonError(429, 'rate_limited', 'Too many requests', { ...cors, 'Retry-After': '60' });
    }
  }

  if (!env.TMDB_TOKEN) {
    return jsonError(500, 'internal_error', 'Server is not configured', cors);
  }

  let upstream: Response;
  try {
    upstream = await deps.fetch(
      `${TMDB_BASE_URL}${normalized.path}${buildQueryString(normalized.params)}`,
      {
        headers: {
          Authorization: `Bearer ${env.TMDB_TOKEN}`,
          Accept: 'application/json',
        },
      },
    );
  } catch {
    return jsonError(502, 'upstream_error', 'TMDB is unreachable', cors);
  }

  if (!upstream.ok) {
    const status = upstream.status === 404 ? 404 : upstream.status === 429 ? 429 : 502;
    const code = status === 404 ? 'not_found' : status === 429 ? 'rate_limited' : 'upstream_error';
    return jsonError(status, code, `TMDB responded with ${upstream.status}`, cors);
  }

  const body = await upstream.text();
  const response = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${normalized.route.ttl}`,
    },
  });
  if (deps.cache) {
    deps.waitUntil(deps.cache.put(cacheKey, response.clone()));
  }
  return withHeaders(response, { ...cors, 'X-Listflix-Cache': 'MISS' });
}
