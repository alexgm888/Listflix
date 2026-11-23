import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../db/db';
import { addToList, createList, setItemInList } from '../../db/lists';

/** Casillas para incluir un título en las listas del usuario (desde la ficha). */
export function ItemListsEditor({ itemKey }: { itemKey: string }) {
  const { t } = useTranslation();
  const data = useLiveQuery(async () => {
    const [lists, memberships] = await Promise.all([
      db.lists.orderBy('order').toArray(),
      db.listItems.where('itemKey').equals(itemKey).toArray(),
    ]);
    return { lists, inLists: new Set(memberships.map((m) => m.listId)) };
  }, [itemKey]);
  const [newName, setNewName] = useState('');

  if (!data) return null;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const list = await createList(newName);
    await addToList(list.id, itemKey);
    setNewName('');
  };

  return (
    <section aria-labelledby="item-lists-title">
      <h2 id="item-lists-title" className="section-title">
        {t('lists.title')}
      </h2>
      {data.lists.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {data.lists.map((list) => (
            <li key={list.id}>
              <label className="chip cursor-pointer" aria-pressed={data.inLists.has(list.id)}>
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={data.inLists.has(list.id)}
                  onChange={(e) => void setItemInList(list.id, itemKey, e.target.checked)}
                />
                {list.name}
              </label>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onCreate(e)} className="flex max-w-md gap-2">
        <label htmlFor="item-new-list" className="sr-only">
          {t('lists.name')}
        </label>
        <input
          id="item-new-list"
          className="input flex-1"
          placeholder={t('lists.newAndAdd')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={80}
        />
        <button type="submit" className="btn-secondary" disabled={!newName.trim()}>
          {t('lists.create')}
        </button>
      </form>
    </section>
  );
}
