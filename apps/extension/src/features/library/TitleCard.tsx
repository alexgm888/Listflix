import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Poster } from '../../components/Poster';
import { StatusBadge, StatusSelect } from '../../components/StatusSelect';
import { setItemStatus } from '../../db/library';
import type { LibraryItem } from '../../domain/types';
import { formatRating } from '../../lib/format';

export function titlePath(item: Pick<LibraryItem, 'mediaType' | 'tmdbId'>): string {
  return `/title/${item.mediaType}/${item.tmdbId}`;
}

export function TitleCard({ item, hasLocal }: { item: LibraryItem; hasLocal: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to={titlePath(item)} className="group block rounded-md">
      <div className="relative">
        <Poster
          path={item.posterPath}
          title={item.title}
          className="transition group-hover:ring-2 group-hover:ring-brand group-focus-visible:ring-2 group-focus-visible:ring-brand"
        />
        <div className="absolute left-1.5 top-1.5 flex gap-1">
          <StatusBadge status={item.status} />
        </div>
        {hasLocal && (
          <span
            className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs"
            title={t('library.hasLocal')}
          >
            ▶ <span className="sr-only">{t('library.hasLocal')}</span>
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 font-medium leading-tight">{item.title}</p>
      <p className="text-xs text-neutral-400">
        {[item.year, t(`mediaType.${item.mediaType}`)].filter(Boolean).join(' · ')}
      </p>
    </Link>
  );
}

export function TitleRow({ item, hasLocal }: { item: LibraryItem; hasLocal: boolean }) {
  const { t, i18n } = useTranslation();
  const rating = formatRating(item.voteAverage, i18n.language);
  return (
    <div className="flex items-center gap-4 rounded-md p-2 hover:bg-neutral-900">
      <Link to={titlePath(item)} className="flex min-w-0 flex-1 items-center gap-4">
        <Poster path={item.posterPath} title={item.title} size="w92" className="w-12 shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-medium">{item.title}</p>
          <p className="text-xs text-neutral-400">
            {[item.year, t(`mediaType.${item.mediaType}`), rating && `★ ${rating}`]
              .filter(Boolean)
              .join(' · ')}
            {hasLocal && ` · ▶ ${t('library.hasLocal')}`}
          </p>
        </div>
      </Link>
      <div className="w-40 shrink-0">
        <StatusSelect
          value={item.status}
          onChange={(s) => void setItemStatus(item.key, s)}
          label={t('title.statusOf', { title: item.title })}
          hideLabel
        />
      </div>
    </div>
  );
}
