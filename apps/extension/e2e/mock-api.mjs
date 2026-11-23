// API simulada del Worker para desarrollo sin token de TMDB, E2E y capturas.
// Uso: node e2e/mock-api.mjs [puerto]   (por defecto 8788)
import { createServer } from 'node:http';

const movies = {
  438631: {
    id: 438631,
    title: 'Dune',
    original_title: 'Dune',
    release_date: '2021-09-15',
    runtime: 155,
    vote_average: 7.8,
    overview:
      'Paul Atreides, un joven brillante y talentoso, debe viajar al planeta más peligroso del universo.',
    genres: [
      { id: 878, name: 'Ciencia ficción' },
      { id: 12, name: 'Aventura' },
    ],
    poster_path: '/dune.jpg',
    backdrop_path: '/dune-bg.jpg',
  },
  603: {
    id: 603,
    title: 'Matrix',
    original_title: 'The Matrix',
    release_date: '1999-03-30',
    runtime: 136,
    vote_average: 8.2,
    overview: 'Thomas Anderson descubre que el mundo es una simulación.',
    genres: [
      { id: 28, name: 'Acción' },
      { id: 878, name: 'Ciencia ficción' },
    ],
    poster_path: '/matrix.jpg',
  },
  604: {
    id: 604,
    title: 'Matrix Reloaded',
    original_title: 'The Matrix Reloaded',
    release_date: '2003-05-15',
    runtime: 138,
    vote_average: 7.0,
    overview: '',
    genres: [{ id: 28, name: 'Acción' }],
    poster_path: null,
  },
};
const shows = {
  1396: {
    id: 1396,
    name: 'Breaking Bad',
    original_name: 'Breaking Bad',
    first_air_date: '2008-01-20',
    number_of_seasons: 2,
    number_of_episodes: 5,
    vote_average: 8.9,
    overview: 'Un profesor de química con cáncer terminal se asocia con un exalumno.',
    genres: [
      { id: 18, name: 'Drama' },
      { id: 80, name: 'Crimen' },
    ],
    poster_path: '/bb.jpg',
    seasons: [
      { season_number: 0, episode_count: 1, name: 'Especiales' },
      { season_number: 1, episode_count: 3, name: 'Temporada 1', air_date: '2008-01-20' },
      { season_number: 2, episode_count: 2, name: 'Temporada 2', air_date: '2009-03-08' },
    ],
  },
};
const episodeNames = {
  '1-1': 'Piloto',
  '1-2': "Cat's in the Bag...",
  '1-3': "...And the Bag's in the River",
  '2-1': 'Seven Thirty-Seven',
  '2-2': 'Grilled',
};
const providers = {
  netflix: {
    provider_id: 8,
    provider_name: 'Netflix',
    logo_path: '/netflix.png',
    display_priority: 1,
  },
  prime: {
    provider_id: 119,
    provider_name: 'Amazon Prime Video',
    logo_path: '/prime.png',
    display_priority: 2,
  },
  disney: {
    provider_id: 337,
    provider_name: 'Disney Plus',
    logo_path: '/disney.png',
    display_priority: 3,
  },
  apple: {
    provider_id: 2,
    provider_name: 'Apple TV',
    logo_path: '/apple.png',
    display_priority: 4,
  },
};
const availability = {
  'movie/438631': {
    ES: {
      link: 'https://www.themoviedb.org/movie/438631/watch?locale=ES',
      flatrate: [providers.prime],
      rent: [providers.apple],
    },
  },
  'movie/603': {
    ES: {
      link: 'https://www.themoviedb.org/movie/603/watch?locale=ES',
      flatrate: [providers.netflix],
      buy: [providers.apple],
    },
  },
  'tv/1396': {
    ES: {
      link: 'https://www.themoviedb.org/tv/1396/watch?locale=ES',
      flatrate: [providers.netflix],
    },
  },
};

const asMovieResult = (m) => ({ ...m, media_type: 'movie', genre_ids: m.genres.map((g) => g.id) });
const asTvResult = (s) => ({ ...s, media_type: 'tv', genre_ids: s.genres.map((g) => g.id) });
const all = [...Object.values(movies).map(asMovieResult), ...Object.values(shows).map(asTvResult)];
const paged = (results) => ({ page: 1, total_pages: 1, total_results: results.length, results });
const match = (q, r) =>
  (r.title ?? r.name).toLowerCase().includes(q) ||
  (r.original_title ?? r.original_name).toLowerCase().includes(q);
const cast = {
  cast: [
    { id: 1, name: 'Actor Uno', character: 'Protagonista', order: 0 },
    { id: 2, name: 'Actriz Dos', character: 'Secundaria', order: 1 },
  ],
};

function route(path, params) {
  const q = (params.get('query') ?? '').toLowerCase();
  let m;
  if (path === '/search/multi') return paged(all.filter((r) => match(q, r)));
  if (path === '/search/movie')
    return paged(
      Object.values(movies)
        .map(asMovieResult)
        .filter((r) => match(q, r)),
    );
  if (path === '/search/tv')
    return paged(
      Object.values(shows)
        .map(asTvResult)
        .filter((r) => match(q, r)),
    );
  if ((m = /^\/movie\/(\d+)$/.exec(path)) && movies[m[1]])
    return { ...movies[m[1]], credits: cast, external_ids: {} };
  if ((m = /^\/tv\/(\d+)$/.exec(path)) && shows[m[1]])
    return { ...shows[m[1]], credits: cast, external_ids: {} };
  if ((m = /^\/tv\/(\d+)\/season\/(\d+)$/.exec(path)) && shows[m[1]]) {
    const season = shows[m[1]].seasons.find((s) => s.season_number === Number(m[2]));
    if (!season) return null;
    return {
      season_number: season.season_number,
      name: season.name,
      episodes: Array.from({ length: season.episode_count }, (_, i) => ({
        season_number: season.season_number,
        episode_number: i + 1,
        name: episodeNames[`${season.season_number}-${i + 1}`] ?? `Episodio ${i + 1}`,
        air_date:
          season.season_number === 0
            ? '2009-01-01'
            : `20${String(8 + season.season_number - 1).padStart(2, '0')}-0${i + 1}-20`,
        runtime: 47,
      })),
    };
  }
  if ((m = /^\/(movie|tv)\/(\d+)\/watch\/providers$/.exec(path)))
    return { id: Number(m[2]), results: availability[`${m[1]}/${m[2]}`] ?? {} };
  if (/^\/watch\/providers\/(movie|tv)$/.test(path)) return { results: Object.values(providers) };
  if (path === '/genre/movie/list')
    return {
      genres: [
        { id: 28, name: 'Acción' },
        { id: 12, name: 'Aventura' },
        { id: 878, name: 'Ciencia ficción' },
        { id: 18, name: 'Drama' },
      ],
    };
  if (path === '/genre/tv/list')
    return {
      genres: [
        { id: 18, name: 'Drama' },
        { id: 80, name: 'Crimen' },
      ],
    };
  return null;
}

const port = Number(process.argv[2] ?? 8788);
createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': req.headers.origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept',
  };
  if (req.method === 'OPTIONS') return res.writeHead(204, headers).end();
  const body = route(url.pathname.replace(/\/$/, ''), url.searchParams);
  if (!body)
    return res
      .writeHead(404, headers)
      .end(JSON.stringify({ error: { code: 'not_found', message: 'Not found' } }));
  res.writeHead(200, headers).end(JSON.stringify(body));
}).listen(port, () => console.log(`mock api on http://localhost:${port}`));
