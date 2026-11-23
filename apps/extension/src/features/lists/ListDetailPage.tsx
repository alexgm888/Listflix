import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { EmptyState, Spinner } from '../../components/Feedback';
import { Poster } from '../../components/Poster';
import { StatusBadge } from '../../components/StatusSelect';
import { useDocumentTitle } from '../../app/use-document-title';
import { db } from '../../db/db';
import { getListItems, moveInArray, removeFromList, reorderListItems } from '../../db/lists';
import type { LibraryItem } from '../../domain/types';
import { titlePath } from '../library/TitleCard';

export function ListDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const data = useLiveQuery(async () => {
    const list = await db.lists.get(id);
    if (!list) return { list: null, items: [] as LibraryItem[] };
    const listItems = await getListItems(id);
    const items = (await db.items.bulkGet(listItems.map((li) => li.itemKey))).filter(
      (i): i is LibraryItem => i !== undefined,
    );
    return { list, items };
  }, [id]);

  useDocumentTitle(data?.list?.name ?? t('lists.title'));

  if (!data) return <Spinner />;
  if (!data.list) return <EmptyState title={t('lists.notFound')} />;

  const { list, items } = data;
  const onMove = (index: number, delta: -1 | 1) => {
    void reorderListItems(
      list.id,
      moveInArray(items, index, delta).map((i) => i.key),
    );
  };

  return (
    <section aria-labelledby="list-title" className="mx-auto max-w-4xl">
      <Link to="/lists" className="btn-ghost mb-4">
        ← {t('lists.title')}
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 id="list-title" className="mr-auto text-2xl font-bold">
          {list.name}
        </h1>
        <Link to={`/?list=${encodeURIComponent(list.id)}`} className="btn-secondary">
          {t('lists.openInLibrary')}
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState title={t('lists.emptyList')}>{t('lists.emptyListHint')}</EmptyState>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={item.key} className="flex items-center gap-3 rounded-md bg-neutral-900 p-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  className="btn-ghost px-1 py-0"
                  disabled={index === 0}
                  onClick={() => onMove(index, -1)}
                  aria-label={t('lists.moveUp', { name: item.title })}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="btn-ghost px-1 py-0"
                  disabled={index === items.length - 1}
                  onClick={() => onMove(index, 1)}
                  aria-label={t('lists.moveDown', { name: item.title })}
                >
                  ▼
                </button>
              </div>
              <Link to={titlePath(item)} className="flex flex-1 items-center gap-3">
                <Poster path={item.posterPath} title={item.title} size="w92" className="w-12" />
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-neutral-400">
                    {[item.year, t(`mediaType.${item.mediaType}`)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>
              <StatusBadge status={item.status} />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void removeFromList(list.id, item.key)}
                aria-label={t('lists.removeItem', { title: item.title })}
              >
                {t('lists.remove')}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
