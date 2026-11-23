import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, ListflixApiClient } from './api';

describe('ListflixApiClient', () => {
  it('construye URLs sin parámetros vacíos y sin barra doble', async () => {
    const fetchMock = vi.fn(async (_url: string) => Response.json({ results: [] }));
    const client = new ListflixApiClient({ baseUrl: 'https://api.example/', fetch: fetchMock });
    await client.searchMovie('The Matrix', { language: 'es-ES', year: 1999 });
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://api.example/search/movie?query=The+Matrix&language=es-ES&primary_release_year=1999',
    );
    await client.movieDetails(603, { language: 'en-US' });
    expect(fetchMock.mock.calls[1]![0]).toBe('https://api.example/movie/603?language=en-US');
  });

  it('lanza ApiRequestError con el error normalizado del Worker', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ error: { code: 'rate_limited', message: 'Too many' } }, { status: 429 }),
    );
    const client = new ListflixApiClient({ baseUrl: 'https://api.example', fetch: fetchMock });
    await expect(client.tvDetails(1, { language: 'es-ES' })).rejects.toMatchObject({
      status: 429,
      code: 'rate_limited',
    });
  });

  it('convierte fallos de red en network_error', async () => {
    const client = new ListflixApiClient({
      baseUrl: 'https://api.example',
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    const err = await client.genres('movie', { language: 'es-ES' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect((err as ApiRequestError).code).toBe('network_error');
  });
});
