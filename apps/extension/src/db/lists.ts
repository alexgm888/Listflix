import type { ListItem, UserList } from '../domain/types';
import { db } from './db';

export function listItemId(listId: string, itemKey: string): string {
  return `${listId}|${itemKey}`;
}

export async function getLists(): Promise<UserList[]> {
  return db.lists.orderBy('order').toArray();
}

export async function createList(name: string, now = Date.now()): Promise<UserList> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('List name is required');
  return db.transaction('rw', db.lists, async () => {
    const last = await db.lists.orderBy('order').last();
    const list: UserList = {
      id: crypto.randomUUID(),
      name: trimmed,
      order: (last?.order ?? -1) + 1,
      createdAt: now,
    };
    await db.lists.add(list);
    return list;
  });
}

export async function renameList(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('List name is required');
  await db.lists.update(id, { name: trimmed });
}

export async function deleteList(id: string): Promise<void> {
  await db.transaction('rw', db.lists, db.listItems, async () => {
    await db.listItems.where('listId').equals(id).delete();
    await db.lists.delete(id);
  });
}

/** Reordena las listas según el orden de los IDs recibidos. */
export async function reorderLists(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.lists, async () => {
    await Promise.all(orderedIds.map((id, order) => db.lists.update(id, { order })));
  });
}

/** Mueve un elemento una posición arriba (-1) o abajo (+1) y devuelve el nuevo orden. */
export function moveInArray<T>(arr: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= arr.length || target < 0 || target >= arr.length) return arr;
  const copy = [...arr];
  const [moved] = copy.splice(index, 1);
  copy.splice(target, 0, moved as T);
  return copy;
}

export async function getListItems(listId: string): Promise<ListItem[]> {
  const rows = await db.listItems.where('listId').equals(listId).toArray();
  return rows.sort((a, b) => a.order - b.order);
}

export async function addToList(listId: string, itemKey: string, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.listItems, async () => {
    const id = listItemId(listId, itemKey);
    if (await db.listItems.get(id)) return;
    const existing = await db.listItems.where('listId').equals(listId).toArray();
    const maxOrder = existing.reduce((max, li) => Math.max(max, li.order), -1);
    await db.listItems.add({ id, listId, itemKey, order: maxOrder + 1, addedAt: now });
  });
}

export async function removeFromList(listId: string, itemKey: string): Promise<void> {
  await db.listItems.delete(listItemId(listId, itemKey));
}

export async function reorderListItems(listId: string, orderedItemKeys: string[]): Promise<void> {
  await db.transaction('rw', db.listItems, async () => {
    await Promise.all(
      orderedItemKeys.map((itemKey, order) =>
        db.listItems.update(listItemId(listId, itemKey), { order }),
      ),
    );
  });
}

/** Listas en las que está un título. */
export async function getListIdsForItem(itemKey: string): Promise<string[]> {
  const rows = await db.listItems.where('itemKey').equals(itemKey).toArray();
  return rows.map((r) => r.listId);
}

export async function setItemInList(
  listId: string,
  itemKey: string,
  included: boolean,
): Promise<void> {
  if (included) await addToList(listId, itemKey);
  else await removeFromList(listId, itemKey);
}
