import type { SearchResult, SeasonDetails, TitleDetails } from '../providers/metadata/types';

export function movieDetails(overrides: Partial<TitleDetails> = {}): TitleDetails {
  return {
    mediaType: 'movie',
    tmdbId: 438631,
    title: 'Dune',
    originalTitle: 'Dune',
    year: 2021,
    posterPath: '/dune.jpg',
    backdropPath: '/dune-bg.jpg',
    overview: 'Paul Atreides…',
    genreIds: [878, 12],
    genres: [
      { id: 878, name: 'Ciencia ficción' },
      { id: 12, name: 'Aventura' },
    ],
    voteAverage: 7.8,
    runtime: 155,
    cast: [],
    ...overrides,
  };
}

export function tvDetails(overrides: Partial<TitleDetails> = {}): TitleDetails {
  return {
    mediaType: 'tv',
    tmdbId: 1396,
    title: 'Breaking Bad',
    originalTitle: 'Breaking Bad',
    year: 2008,
    posterPath: '/bb.jpg',
    genreIds: [18],
    genres: [{ id: 18, name: 'Drama' }],
    voteAverage: 8.9,
    numberOfSeasons: 2,
    seasons: [
      { seasonNumber: 0, episodeCount: 1, name: 'Especiales' },
      { seasonNumber: 1, episodeCount: 3, name: 'Temporada 1' },
      { seasonNumber: 2, episodeCount: 2, name: 'Temporada 2' },
    ],
    cast: [],
    ...overrides,
  };
}

export function searchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    mediaType: 'movie',
    tmdbId: 603,
    title: 'Matrix',
    originalTitle: 'The Matrix',
    year: 1999,
    posterPath: '/matrix.jpg',
    genreIds: [28, 878],
    voteAverage: 8.2,
    ...overrides,
  };
}

export function seasons(airDate = '2008-01-20'): SeasonDetails[] {
  const ep = (season: number, episode: number) => ({
    season,
    episode,
    name: `S${season}E${episode}`,
    airDate,
  });
  return [
    { seasonNumber: 0, name: 'Especiales', episodes: [ep(0, 1)] },
    { seasonNumber: 1, name: 'Temporada 1', episodes: [ep(1, 1), ep(1, 2), ep(1, 3)] },
    { seasonNumber: 2, name: 'Temporada 2', episodes: [ep(2, 1), ep(2, 2)] },
  ];
}
