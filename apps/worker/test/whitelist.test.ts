import { describe, expect, it } from 'vitest';
import { buildQueryString, normalizeRequest } from '../src/whitelist';

function norm(url: string) {
  const u = new URL(url, 'https://w.example');
  return normalizeRequest(u.pathname, u.searchParams);
}

describe('normalizeRequest: lista blanca de rutas', () => {
  it.each([
    '/search/multi?query=dune',
    '/search/movie?query=dune',
    '/search/tv?query=dark',
    '/movie/438631',
    '/tv/1399',
    '/tv/1399/season/1',
    '/movie/550/watch/providers',
    '/tv/1399/watch/providers',
    '/watch/providers/movie',
    '/watch/providers/tv',
    '/genre/movie/list',
    '/genre/tv/list',
    '/configuration',
  ])('permite %s', (url) => {
    expect(norm(url).ok).toBe(true);
  });

  it.each([
    '/',
    '/account',
    '/movie/550/rating',
    '/movie/abc',
    '/tv/1399/season/1/episode/1',
    '/person/287',
    '/authentication/token/new',
    '/movie/550/../../account',
    '/discover/movie',
  ])('rechaza %s con 404', (url) => {
    const result = norm(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it('acepta barra final', () => {
    expect(norm('/movie/550/').ok).toBe(true);
  });
});

describe('normalizeRequest: parámetros', () => {
  it('descarta api_key y parámetros desconocidos', () => {
    const r = norm('/movie/550?api_key=SECRET&language=es-ES&foo=bar');
    expect(r.ok && r.params).toEqual([['language', 'es-ES']]);
  });

  it('descarta parámetros válidos en otras rutas pero no en esta', () => {
    const r = norm('/movie/550?query=x&watch_region=ES');
    expect(r.ok && r.params).toEqual([]);
  });

  it('fuerza include_adult=false en las búsquedas', () => {
    const r = norm('/search/multi?query=dune&include_adult=true');
    expect(r.ok && Object.fromEntries(r.params)).toEqual({ include_adult: 'false', query: 'dune' });
  });

  it('filtra append_to_response con la lista blanca y lo ordena', () => {
    const r = norm('/movie/550?append_to_response=videos,images,credits,credits');
    expect(r.ok && Object.fromEntries(r.params)).toEqual({ append_to_response: 'credits,videos' });
  });

  it('no admite append_to_response fuera de los detalles', () => {
    const r = norm('/tv/1399/season/1?append_to_response=credits');
    expect(r.ok && r.params).toEqual([]);
  });

  it('exige query en las búsquedas', () => {
    const r = norm('/search/multi?page=1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it.each([
    '/search/multi?query=x&page=0',
    '/search/multi?query=x&page=abc',
    '/search/multi?query=x&page=501',
    '/search/multi?query=x&language=spanish',
    '/watch/providers/movie?watch_region=es',
    '/search/movie?query=x&primary_release_year=99',
    `/search/multi?query=${'a'.repeat(201)}`,
  ])('rechaza valores inválidos: %s', (url) => {
    const r = norm(url);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
});

describe('clave de caché normalizada', () => {
  it('es la misma con independencia del orden de los parámetros', () => {
    const a = norm('/search/multi?query=dune&language=es-ES&page=1');
    const b = norm('/search/multi?page=1&api_key=x&language=es-ES&query=dune');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(buildQueryString(a.params)).toBe(buildQueryString(b.params));
      expect(buildQueryString(a.params)).toBe(
        '?include_adult=false&language=es-ES&page=1&query=dune',
      );
    }
  });

  it('recorta espacios en query', () => {
    const a = norm('/search/multi?query=%20dune%20');
    expect(a.ok && Object.fromEntries(a.params).query).toBe('dune');
  });
});
