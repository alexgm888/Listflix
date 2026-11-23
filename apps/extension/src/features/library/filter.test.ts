import { describe, expect, it } from 'vitest';
import { emptyProviders, type LibraryItem } from '../../domain/types';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  filterAndSortItems,
  filtersFromParams,
  filtersToParams,
  normalizeText,
  type FilterContext,
  type LibraryFilters,
} from './filter';

function item(overrides: Partial<LibraryItem>): LibraryItem {
  return {
    key: `movie:${overrides.tmdbId ?? 1}`,
    mediaType: 'movie',
    tmdbId: 1,
    title: 'T',
    originalTitle: 'T',
    genreIds: [],
    status: 'pending',
    statusIsManual: false,
    addedAt: 0,
    updatedAt: 0,
    metadataFetchedAt: 1,
    ...overrides,
  };
}

const items = [
  item({
    tmdbId: 1,
    key: 'movie:1',
    title: 'Dune',
    year: 2021,
    voteAverage: 7.8,
    genreIds: [878],
    addedAt: 3,
    status: 'watched',
  }),
  item({
    tmdbId: 2,
    key: 'movie:2',
    title: 'Ámelie',
    originalTitle: 'Le Fabuleux Destin',
    year: 2001,
    voteAverage: 7.9,
    genreIds: [35],
    addedAt: 1,
  }),
  item({
    tmdbId: 3,
    key: 'tv:3',
    mediaType: 'tv',
    title: 'Dark',
    year: 2017,
    voteAverage: 8.4,
    genreIds: [18, 878],
    addedAt: 2,
    status: 'watching',
  }),
];

const netflix = { providerId: 8, providerName: 'Netflix' };
const ctx: FilterContext = {
  providersByKey: new Map([
    ['tv:3', { ...emptyProviders(), flatrate: [netflix] }],
    ['movie:1', { ...emptyProviders(), rent: [netflix] }],
  ]),
  localKeys: new Set(['movie:2']),
  listItemKeys: new Set(['movie:1', 'tv:3']),
};

const run = (f: Partial<LibraryFilters>) =>
  filterAndSortItems(items, { ...DEFAULT_FILTERS, ...f }, ctx).map((i) => i.key);

describe('filtros de la biblioteca', () => {
  it('ordena por fecha de añadido (desc) por defecto', () => {
    expect(run({})).toEqual(['movie:1', 'tv:3', 'movie:2']);
  });

  it('filtra por tipo, estado y género', () => {
    expect(run({ mediaType: 'tv' })).toEqual(['tv:3']);
    expect(run({ statuses: ['pending', 'watched'] })).toEqual(['movie:1', 'movie:2']);
    expect(run({ genreIds: [878] })).toEqual(['movie:1', 'tv:3']);
  });

  it('el filtro de plataforma solo cuenta suscripción, gratis o anuncios', () => {
    expect(run({ providerIds: [8] })).toEqual(['tv:3']);
  });

  it('filtra por local y por lista', () => {
    expect(run({ localOnly: true })).toEqual(['movie:2']);
    expect(run({ listId: 'x' })).toEqual(['movie:1', 'tv:3']);
  });

  it('combina filtros', () => {
    expect(run({ genreIds: [878], statuses: ['watching'] })).toEqual(['tv:3']);
  });

  it('busca texto sin tildes ni mayúsculas, también en el título original', () => {
    expect(run({ text: 'amelie' })).toEqual(['movie:2']);
    expect(run({ text: 'FABULEUX' })).toEqual(['movie:2']);
    expect(normalizeText('  Ámelie ')).toBe('amelie');
  });

  it('ordena por título, año y nota', () => {
    expect(run({ sort: 'title', direction: 'asc' })).toEqual(['movie:2', 'tv:3', 'movie:1']);
    expect(run({ sort: 'year', direction: 'asc' })).toEqual(['movie:2', 'tv:3', 'movie:1']);
    expect(run({ sort: 'rating', direction: 'desc' })).toEqual(['tv:3', 'movie:2', 'movie:1']);
  });
});

describe('filtros en la URL', () => {
  it('ida y vuelta', () => {
    const f: LibraryFilters = {
      ...DEFAULT_FILTERS,
      mediaType: 'tv',
      statuses: ['watching'],
      genreIds: [18, 878],
      providerIds: [8],
      localOnly: true,
      listId: 'abc',
      text: 'dark',
      sort: 'title',
      direction: 'asc',
    };
    const params = filtersToParams(f);
    expect(params.get('dir')).toBeNull(); // asc es el orden por defecto del título
    expect(filtersFromParams(params)).toEqual(f);
    expect(activeFilterCount(f)).toBe(8);
  });

  it('ignora valores inválidos', () => {
    const f = filtersFromParams(
      new URLSearchParams('type=x&status=foo,watched&genre=a,12&sort=bad'),
    );
    expect(f).toMatchObject({
      mediaType: 'all',
      statuses: ['watched'],
      genreIds: [12],
      sort: 'addedAt',
    });
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('');
  });
});
