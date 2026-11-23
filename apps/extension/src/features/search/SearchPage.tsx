import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useLibraryKeys } from '../../app/hooks';
import { useSettings } from '../../app/settings-context';
import { AddToLibrary } from '../../components/AddToLibrary';
import { EmptyState, ErrorMessage, Spinner } from '../../components/Feedback';
import { Poster } from '../../components/Poster';
import { itemKeyOf } from '../../domain/types';
import { metadataProvider } from '../../lib/api';

export function SearchPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const query = (params.get('q') ?? '').trim();
  const { metadataLanguage } = useSettings();
  const savedKeys = useLibraryKeys();

  const search = useInfiniteQuery({
    queryKey: ['search', query, metadataLanguage],
    queryFn: ({ pageParam, signal }) =>
      metadataProvider.search(query, { language: metadataLanguage, page: pageParam, signal }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: query.length > 0,
  });

  if (!query) return <EmptyState title={t('search.empty')} />;

  const results = search.data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <section aria-labelledby="search-title">
      <h1 id="search-title" className="mb-4 text-2xl font-bold">
        {t('search.resultsFor', { query })}
      </h1>
      {search.isPending && <Spinner />}
      {search.isError && (
        <ErrorMessage error={search.error} onRetry={() => void search.refetch()} />
      )}
      {search.isSuccess && results.length === 0 && <EmptyState title={t('search.noResults')} />}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {results.map((r) => {
          const key = itemKeyOf(r.mediaType, r.tmdbId);
          return (
            <li key={key} className="flex flex-col gap-2">
              <Link to={`/title/${r.mediaType}/${r.tmdbId}`} className="group rounded-md">
                <Poster
                  path={r.posterPath}
                  title={r.title}
                  className="transition group-hover:ring-2 group-hover:ring-brand"
                />
                <p className="mt-2 line-clamp-2 font-medium leading-tight">{r.title}</p>
                <p className="text-xs text-neutral-400">
                  {[r.year, t(`mediaType.${r.mediaType}`)].filter(Boolean).join(' · ')}
                </p>
              </Link>
              <AddToLibrary input={r} saved={savedKeys.has(key)} compact />
            </li>
          );
        })}
      </ul>
      {search.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void search.fetchNextPage()}
            disabled={search.isFetchingNextPage}
          >
            {search.isFetchingNextPage ? t('common.loading') : t('search.loadMore')}
          </button>
        </div>
      )}
    </section>
  );
}
