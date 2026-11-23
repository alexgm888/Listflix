import { describe, expect, it, vi } from 'vitest';
import { handleRequest, type Deps, type Env } from '../src/handler';

function memoryCache() {
  const store = new Map<string, Response>();
  return {
    store,
    match: vi.fn(async (key: RequestInfo | URL) => store.get(String(key))?.clone()),
    put: vi.fn(async (key: RequestInfo | URL, res: Response) => {
      store.set(String(key), res);
    }),
  };
}

function setup(envOverrides: Partial<Env> = {}) {
  const cache = memoryCache();
  const pending: Promise<unknown>[] = [];
  const fetchMock = vi.fn(async () => Response.json({ results: [] }));
  const deps: Deps = {
    fetch: fetchMock as unknown as typeof fetch,
    cache: cache as unknown as Deps['cache'],
    waitUntil: (p) => pending.push(p),
  };
  const env: Env = {
    TMDB_TOKEN: 'test-token',
    ALLOWED_ORIGINS: 'chrome-extension://abc,chrome-extension://dev*',
    ...envOverrides,
  };
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await handleRequest(new Request(`https://api.example${path}`, init), env, deps);
    await Promise.all(pending);
    return res;
  };
  return { call, fetchMock, cache };
}

const ORIGIN = { headers: { Origin: 'chrome-extension://abc' } };

describe('handleRequest', () => {
  it('reenvía a TMDB con el token y los parámetros normalizados', async () => {
    const { call, fetchMock } = setup();
    const res = await call('/search/multi?query=dune&api_key=leak&language=es-ES', ORIGIN);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('chrome-extension://abc');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      'https://api.themoviedb.org/3/search/multi?include_adult=false&language=es-ES&query=dune',
    );
    expect(url).not.toContain('api_key');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it('sirve desde la caché la segunda vez, aunque cambie el orden', async () => {
    const { call, fetchMock } = setup();
    const a = await call('/movie/550?language=es-ES&append_to_response=credits', ORIGIN);
    const b = await call('/movie/550?append_to_response=credits&language=es-ES', ORIGIN);
    expect(a.headers.get('X-Listflix-Cache')).toBe('MISS');
    expect(b.headers.get('X-Listflix-Cache')).toBe('HIT');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(b.headers.get('Access-Control-Allow-Origin')).toBe('chrome-extension://abc');
  });

  it('guarda con el TTL de la ruta', async () => {
    const { call, cache } = setup();
    await call('/genre/movie/list?language=es-ES', ORIGIN);
    const stored = [...cache.store.values()][0]!;
    expect(stored.headers.get('Cache-Control')).toBe(`public, max-age=${30 * 24 * 3600}`);
  });

  it('devuelve 404 normalizado para rutas fuera de la lista blanca', async () => {
    const { call, fetchMock } = setup();
    const res = await call('/account', ORIGIN);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'not_found', message: expect.any(String) } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza orígenes no permitidos', async () => {
    const { call } = setup();
    const res = await call('/movie/550', { headers: { Origin: 'https://evil.example' } });
    expect(res.status).toBe(403);
  });

  it('admite comodines en ALLOWED_ORIGINS', async () => {
    const { call } = setup();
    const res = await call('/movie/550', { headers: { Origin: 'chrome-extension://devxyz' } });
    expect(res.status).toBe(200);
  });

  it('responde al preflight', async () => {
    const { call } = setup();
    const res = await call('/movie/550', { method: 'OPTIONS', ...ORIGIN });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('solo permite GET', async () => {
    const { call } = setup();
    const res = await call('/movie/550', { method: 'POST', ...ORIGIN });
    expect(res.status).toBe(405);
  });

  it('aplica el límite por IP', async () => {
    const limiter = { limit: vi.fn(async () => ({ success: false })) };
    const { call, fetchMock } = setup({ RATE_LIMITER: limiter as unknown as RateLimit });
    const res = await call('/movie/550', {
      headers: { Origin: 'chrome-extension://abc', 'CF-Connecting-IP': '1.2.3.4' },
    });
    expect(res.status).toBe(429);
    expect(limiter.limit).toHaveBeenCalledWith({ key: '1.2.3.4' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no cachea errores de TMDB y los normaliza', async () => {
    const { call, fetchMock, cache } = setup();
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    const res = await call('/movie/550', ORIGIN);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('upstream_error');
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('pasa los 404 de TMDB como 404', async () => {
    const { call, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    const res = await call('/movie/999999999', ORIGIN);
    expect(res.status).toBe(404);
  });
});
