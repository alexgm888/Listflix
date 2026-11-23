import { ListflixApiClient } from '@listflix/shared';
import { describe, expect, it, vi } from 'vitest';
import { TmdbMetadataProvider } from './tmdb';

function providerWith(responses: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = new URL(url).pathname;
    if (!(path in responses)) return new Response('{}', { status: 404 });
    return Response.json(responses[path]);
  });
  const api = new ListflixApiClient({ baseUrl: 'https://api.test', fetch: fetchMock });
  return { provider: new TmdbMetadataProvider(api), fetchMock };
}

describe('TmdbMetadataProvider', () => {
  it('normaliza search/multi y descarta personas', async () => {
    const { provider } = providerWith({
      '/search/multi': {
        page: 1,
        total_pages: 1,
        total_results: 3,
        results: [
          {
            id: 438631,
            media_type: 'movie',
            title: 'Dune',
            original_title: 'Dune',
            release_date: '2021-09-15',
            poster_path: '/p.jpg',
            genre_ids: [878],
          },
          { id: 1, media_type: 'person', name: 'Zendaya' },
          {
            id: 90228,
            media_type: 'tv',
            name: 'Dune: La profecía',
            original_name: 'Dune: Prophecy',
            first_air_date: '2024-11-17',
            poster_path: null,
          },
        ],
      },
    });
    const page = await provider.search('dune', { language: 'es-ES' });
    expect(page.results).toEqual([
      expect.objectContaining({
        mediaType: 'movie',
        tmdbId: 438631,
        year: 2021,
        posterPath: '/p.jpg',
      }),
      expect.objectContaining({
        mediaType: 'tv',
        tmdbId: 90228,
        year: 2024,
        posterPath: undefined,
        originalTitle: 'Dune: Prophecy',
      }),
    ]);
  });

  it('mapea los detalles de una serie con reparto ordenado', async () => {
    const { provider, fetchMock } = providerWith({
      '/tv/1396': {
        id: 1396,
        name: 'Breaking Bad',
        original_name: 'Breaking Bad',
        first_air_date: '2008-01-20',
        number_of_seasons: 5,
        seasons: [{ season_number: 1, episode_count: 7, name: 'T1' }],
        genres: [{ id: 18, name: 'Drama' }],
        credits: {
          cast: [
            { id: 2, name: 'B', order: 1 },
            { id: 1, name: 'A', order: 0 },
          ],
        },
        external_ids: { imdb_id: 'tt0903747' },
      },
    });
    const d = await provider.getDetails('tv', 1396, 'es-ES');
    expect(d).toMatchObject({
      mediaType: 'tv',
      title: 'Breaking Bad',
      numberOfSeasons: 5,
      imdbId: 'tt0903747',
      genreIds: [18],
    });
    expect(d.cast.map((c) => c.name)).toEqual(['A', 'B']);
    expect(fetchMock.mock.calls[0]![0]).toContain('append_to_response=credits%2Cexternal_ids');
  });

  it('combina plataformas y géneros de películas y series sin duplicados', async () => {
    const { provider } = providerWith({
      '/watch/providers/movie': {
        results: [
          { provider_id: 8, provider_name: 'Netflix', display_priority: 1 },
          { provider_id: 119, provider_name: 'Prime Video', display_priority: 2 },
        ],
      },
      '/watch/providers/tv': {
        results: [
          { provider_id: 8, provider_name: 'Netflix', display_priority: 1 },
          { provider_id: 337, provider_name: 'Disney Plus', display_priority: 0 },
        ],
      },
      '/genre/movie/list': {
        genres: [
          { id: 18, name: 'Drama' },
          { id: 28, name: 'Acción' },
        ],
      },
      '/genre/tv/list': {
        genres: [
          { id: 18, name: 'Drama' },
          { id: 10765, name: 'Sci-Fi & Fantasy' },
        ],
      },
    });
    const catalog = await provider.getProviderCatalog('ES', 'es-ES');
    expect(catalog.map((p) => p.providerId)).toEqual([337, 8, 119]);
    const genres = await provider.getGenres('es-ES');
    expect(genres.map((g) => g.id).sort((a, b) => a - b)).toEqual([18, 28, 10765]);
  });

  it('agrupa las plataformas por país', async () => {
    const { provider } = providerWith({
      '/movie/550/watch/providers': {
        id: 550,
        results: {
          ES: {
            link: 'https://tmdb/where',
            flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }],
          },
        },
      },
    });
    const all = await provider.getWatchProviders('movie', 550);
    expect(all.ES).toEqual({
      flatrate: [
        { providerId: 8, providerName: 'Netflix', logoPath: '/n.png', displayPriority: undefined },
      ],
      rent: [],
      buy: [],
      free: [],
      ads: [],
      tmdbLink: 'https://tmdb/where',
    });
  });
});
