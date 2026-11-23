import {
  WATCH_STATUSES,
  type LibraryItem,
  type MediaType,
  type WatchProvidersByType,
  type WatchStatus,
} from '../../domain/types';

export type SortField = 'addedAt' | 'title' | 'year' | 'rating';
export type SortDirection = 'asc' | 'desc';

export interface LibraryFilters {
  mediaType: MediaType | 'all';
  statuses: WatchStatus[];
  genreIds: number[];
  providerIds: number[];
  localOnly: boolean;
  listId?: string;
  text: string;
  sort: SortField;
  direction: SortDirection;
}

export const DEFAULT_FILTERS: LibraryFilters = {
  mediaType: 'all',
  statuses: [],
  genreIds: [],
  providerIds: [],
  localOnly: false,
  text: '',
  sort: 'addedAt',
  direction: 'desc',
};

export const SORT_FIELDS: readonly SortField[] = ['addedAt', 'title', 'year', 'rating'];

export interface FilterContext {
  /** Plataformas por título (itemKey) para el país configurado. */
  providersByKey: Map<string, WatchProvidersByType>;
  /** Títulos con al menos un archivo local vinculado (y con handle). */
  localKeys: Set<string>;
  /** Títulos de la lista seleccionada (si hay `listId`). */
  listItemKeys?: Set<string>;
}

/** Normaliza texto para buscar sin distinguir mayúsculas ni tildes. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Plataformas que cuentan para el filtro: suscripción, gratis y con anuncios.
 * El alquiler y la compra no cuentan (ver docs/decisiones.md).
 */
export function availableProviderIds(data: WatchProvidersByType | undefined): Set<number> {
  if (!data) return new Set();
  return new Set([...data.flatrate, ...data.free, ...data.ads].map((p) => p.providerId));
}

export function matchesFilters(
  item: LibraryItem,
  filters: LibraryFilters,
  ctx: FilterContext,
): boolean {
  if (filters.mediaType !== 'all' && item.mediaType !== filters.mediaType) return false;
  if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) return false;
  if (filters.genreIds.length > 0 && !filters.genreIds.some((g) => item.genreIds.includes(g))) {
    return false;
  }
  if (filters.providerIds.length > 0) {
    const available = availableProviderIds(ctx.providersByKey.get(item.key));
    if (!filters.providerIds.some((id) => available.has(id))) return false;
  }
  if (filters.localOnly && !ctx.localKeys.has(item.key)) return false;
  if (filters.listId && !ctx.listItemKeys?.has(item.key)) return false;
  if (filters.text) {
    const q = normalizeText(filters.text);
    if (q && !normalizeText(`${item.title} ${item.originalTitle}`).includes(q)) return false;
  }
  return true;
}

function compareItems(a: LibraryItem, b: LibraryItem, field: SortField, locale: string): number {
  switch (field) {
    case 'title':
      return a.title.localeCompare(b.title, locale, { sensitivity: 'base', numeric: true });
    case 'year':
      return (a.year ?? 0) - (b.year ?? 0);
    case 'rating':
      return (a.voteAverage ?? 0) - (b.voteAverage ?? 0);
    case 'addedAt':
    default:
      return a.addedAt - b.addedAt;
  }
}

export function filterAndSortItems(
  items: LibraryItem[],
  filters: LibraryFilters,
  ctx: FilterContext,
  locale = 'es',
): LibraryItem[] {
  const dir = filters.direction === 'asc' ? 1 : -1;
  return items
    .filter((item) => matchesFilters(item, filters, ctx))
    .sort(
      (a, b) =>
        dir * compareItems(a, b, filters.sort, locale) ||
        a.title.localeCompare(b.title, locale) ||
        a.key.localeCompare(b.key),
    );
}

export function activeFilterCount(filters: LibraryFilters): number {
  return (
    (filters.mediaType !== 'all' ? 1 : 0) +
    filters.statuses.length +
    filters.genreIds.length +
    filters.providerIds.length +
    (filters.localOnly ? 1 : 0) +
    (filters.listId ? 1 : 0) +
    (filters.text.trim() ? 1 : 0)
  );
}

const numList = (value: string | null): number[] =>
  (value ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

/** Lee los filtros de los parámetros de la URL (`#/?type=tv&status=watching…`). */
export function filtersFromParams(params: URLSearchParams): LibraryFilters {
  const type = params.get('type');
  const sort = params.get('sort') as SortField | null;
  const statuses = (params.get('status') ?? '')
    .split(',')
    .filter((s): s is WatchStatus => (WATCH_STATUSES as readonly string[]).includes(s));
  return {
    mediaType: type === 'movie' || type === 'tv' ? type : 'all',
    statuses,
    genreIds: numList(params.get('genre')),
    providerIds: numList(params.get('provider')),
    localOnly: params.get('local') === '1',
    listId: params.get('list') || undefined,
    text: params.get('q') ?? '',
    sort: sort && SORT_FIELDS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
    direction:
      params.get('dir') === 'asc' || params.get('dir') === 'desc'
        ? (params.get('dir') as SortDirection)
        : sort === 'title'
          ? 'asc'
          : 'desc',
  };
}

export function filtersToParams(filters: LibraryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.mediaType !== 'all') params.set('type', filters.mediaType);
  if (filters.statuses.length) params.set('status', filters.statuses.join(','));
  if (filters.genreIds.length) params.set('genre', filters.genreIds.join(','));
  if (filters.providerIds.length) params.set('provider', filters.providerIds.join(','));
  if (filters.localOnly) params.set('local', '1');
  if (filters.listId) params.set('list', filters.listId);
  if (filters.text) params.set('q', filters.text);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  const defaultDir = filters.sort === 'title' ? 'asc' : 'desc';
  if (filters.direction !== defaultDir) params.set('dir', filters.direction);
  return params;
}

export function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}
