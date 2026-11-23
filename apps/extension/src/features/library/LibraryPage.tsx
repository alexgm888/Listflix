import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { EmptyState } from '../../components/Feedback';
import { Poster } from '../../components/Poster';
import { StatusBadge } from '../../components/StatusSelect';
import { db } from '../../db/db';

export function LibraryPage() {
  const { t } = useTranslation();
  const items = useLiveQuery(() => db.items.orderBy('addedAt').reverse().toArray(), []);
  if (!items) return null;
  if (items.length === 0)
    return <EmptyState title={t('library.empty')}>{t('library.emptyHint')}</EmptyState>;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <li key={item.key}>
          <Link to={`/title/${item.mediaType}/${item.tmdbId}`}>
            <Poster path={item.posterPath} title={item.title} />
            <p className="mt-2 font-medium">{item.title}</p>
            <StatusBadge status={item.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
