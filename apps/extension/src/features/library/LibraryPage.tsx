import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useSettings } from '../../app/settings-context';
import { useDocumentTitle } from '../../app/use-document-title';
import { EmptyState, Spinner } from '../../components/Feedback';
import { updateSettings } from '../../db/settings';
import { buildContinueWatching } from './continue-watching';
import { ContinueWatchingRow } from './ContinueWatching';
import {
  activeFilterCount,
  filterAndSortItems,
  filtersFromParams,
  filtersToParams,
  SORT_FIELDS,
  type LibraryFilters,
  type SortField,
} from './filter';
import { FilterPanel } from './FilterPanel';
import { TitleCard, TitleRow } from './TitleCard';
import { useLibraryData } from './use-library-data';

export function LibraryPage() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const data = useLibraryData(settings.country, filters.listId);
  const [showFilters, setShowFilters] = useState(false);
  const view = settings.libraryView ?? 'grid';
  useDocumentTitle(t('library.title'));

  const setFilters = (next: LibraryFilters) => setParams(filtersToParams(next), { replace: true });

  const visible = useMemo(
    () => (data ? filterAndSortItems(data.items, filters, data, i18n.language) : []),
    [data, filters, i18n.language],
  );
  const continueEntries = useMemo(
    () =>
      data
        ? buildContinueWatching(data.items, data.episodesBySeries, data.localMedia, data.progress)
        : [],
    [data],
  );

  if (!data) return <Spinner />;
  if (data.items.length === 0) {
    return <EmptyState title={t('library.empty')}>{t('library.emptyHint')}</EmptyState>;
  }

  const activeCount = activeFilterCount({ ...filters, text: '' });

  return (
    <div>
      <ContinueWatchingRow entries={continueEntries} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">
          {t('library.title')}{' '}
          <span className="text-base font-normal text-neutral-400">
            {t('library.count', { count: visible.length, total: data.items.length })}
          </span>
        </h1>
        <label className="sr-only" htmlFor="library-text">
          {t('library.searchInLibrary')}
        </label>
        <input
          id="library-text"
          type="search"
          className="input w-56"
          placeholder={t('library.searchInLibrary')}
          value={filters.text}
          onChange={(e) => setFilters({ ...filters, text: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <span className="text-neutral-400">{t('sort.label')}</span>
          <select
            className="input"
            value={filters.sort}
            onChange={(e) => {
              const sort = e.target.value as SortField;
              setFilters({ ...filters, sort, direction: sort === 'title' ? 'asc' : 'desc' });
            }}
          >
            {SORT_FIELDS.map((f) => (
              <option key={f} value={f}>
                {t(`sort.${f}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-ghost"
          onClick={() =>
            setFilters({ ...filters, direction: filters.direction === 'asc' ? 'desc' : 'asc' })
          }
          aria-label={filters.direction === 'asc' ? t('sort.ascending') : t('sort.descending')}
          title={filters.direction === 'asc' ? t('sort.ascending') : t('sort.descending')}
        >
          {filters.direction === 'asc' ? '↑' : '↓'}
        </button>
        <div
          role="group"
          aria-label={t('library.view')}
          className="flex rounded-md bg-neutral-900 p-0.5"
        >
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              className={`rounded px-3 py-1.5 text-sm ${view === v ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}
              onClick={() => void updateSettings({ libraryView: v })}
            >
              {t(`library.view_${v}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary lg:hidden"
          aria-expanded={showFilters}
          aria-controls="library-filters"
          onClick={() => setShowFilters((s) => !s)}
        >
          {t('filters.title')}
          {activeCount > 0 && ` (${activeCount})`}
        </button>
      </div>

      <div className="flex gap-8">
        <aside
          id="library-filters"
          aria-label={t('filters.title')}
          className={`${showFilters ? 'block' : 'hidden'} w-full shrink-0 lg:block lg:w-64`}
        >
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            items={data.items}
            providersByKey={data.providersByKey}
            lists={data.lists}
            myProviderIds={settings.myProviderIds}
          />
        </aside>

        <div className="min-w-0 flex-1">
          {visible.length === 0 ? (
            <EmptyState title={t('library.noMatches')} />
          ) : view === 'grid' ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {visible.map((item) => (
                <li key={item.key}>
                  <TitleCard item={item} hasLocal={data.localKeys.has(item.key)} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-900">
              {visible.map((item) => (
                <li key={item.key}>
                  <TitleRow item={item} hasLocal={data.localKeys.has(item.key)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
