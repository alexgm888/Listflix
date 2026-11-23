import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { EmptyState, Spinner } from '../../components/Feedback';
import { useDocumentTitle } from '../../app/use-document-title';
import { db } from '../../db/db';
import { createList, deleteList, moveInArray, renameList, reorderLists } from '../../db/lists';
import type { UserList } from '../../domain/types';

function ListRow({
  list,
  index,
  total,
  count,
  onMove,
}: {
  list: UserList;
  index: number;
  total: number;
  count: number;
  onMove: (index: number, delta: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);

  const onRename = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await renameList(list.id, name);
    setEditing(false);
  };

  const onDelete = async () => {
    if (window.confirm(t('lists.deleteConfirm', { name: list.name }))) await deleteList(list.id);
  };

  return (
    <li className="flex items-center gap-3 rounded-md bg-neutral-900 p-3">
      <div className="flex flex-col">
        <button
          type="button"
          className="btn-ghost px-1 py-0"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          aria-label={t('lists.moveUp', { name: list.name })}
        >
          ▲
        </button>
        <button
          type="button"
          className="btn-ghost px-1 py-0"
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          aria-label={t('lists.moveDown', { name: list.name })}
        >
          ▼
        </button>
      </div>
      {editing ? (
        <form onSubmit={(e) => void onRename(e)} className="flex flex-1 items-center gap-2">
          <label htmlFor={`rename-${list.id}`} className="sr-only">
            {t('lists.name')}
          </label>
          <input
            id={`rename-${list.id}`}
            className="input flex-1"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setName(list.name);
                setEditing(false);
              }
            }}
          />
          <button type="submit" className="btn-primary">
            {t('common.save')}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setName(list.name);
              setEditing(false);
            }}
          >
            {t('common.cancel')}
          </button>
        </form>
      ) : (
        <>
          <Link to={`/lists/${list.id}`} className="flex-1 font-medium hover:text-white">
            {list.name}{' '}
            <span className="text-sm font-normal text-neutral-400">
              {t('lists.itemsCount', { count })}
            </span>
          </Link>
          <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>
            {t('lists.rename')}
          </button>
          <button type="button" className="btn-ghost" onClick={() => void onDelete()}>
            {t('common.delete')}
          </button>
        </>
      )}
    </li>
  );
}

export function ListsPage() {
  const { t } = useTranslation();
  const data = useLiveQuery(async () => {
    const [lists, listItems] = await Promise.all([
      db.lists.orderBy('order').toArray(),
      db.listItems.toArray(),
    ]);
    const counts = new Map<string, number>();
    for (const li of listItems) counts.set(li.listId, (counts.get(li.listId) ?? 0) + 1);
    return { lists, counts };
  }, []);
  const [newName, setNewName] = useState('');
  useDocumentTitle(t('lists.title'));

  if (!data) return <Spinner />;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createList(newName);
    setNewName('');
  };

  const onMove = (index: number, delta: -1 | 1) => {
    void reorderLists(moveInArray(data.lists, index, delta).map((l) => l.id));
  };

  return (
    <section aria-labelledby="lists-title" className="mx-auto max-w-3xl">
      <h1 id="lists-title" className="mb-6 text-2xl font-bold">
        {t('lists.title')}
      </h1>
      <form onSubmit={(e) => void onCreate(e)} className="mb-6 flex gap-2">
        <label htmlFor="new-list" className="sr-only">
          {t('lists.name')}
        </label>
        <input
          id="new-list"
          className="input flex-1"
          placeholder={t('lists.newPlaceholder')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={80}
        />
        <button type="submit" className="btn-primary" disabled={!newName.trim()}>
          {t('lists.create')}
        </button>
      </form>
      {data.lists.length === 0 ? (
        <EmptyState title={t('lists.empty')}>{t('lists.emptyHint')}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.lists.map((list, index) => (
            <ListRow
              key={list.id}
              list={list}
              index={index}
              total={data.lists.length}
              count={data.counts.get(list.id) ?? 0}
              onMove={onMove}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
