import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllData, db } from '../db/db';
import { setEpisodesWatched, syncSeriesEpisodes } from '../db/episodes';
import { addItem, setItemStatus } from '../db/library';
import { addToList, createList } from '../db/lists';
import { linkLocalFile, saveProgress } from '../db/local-media';
import { updateSettings } from '../db/settings';
import { movieDetails, seasons, tvDetails } from '../test/fixtures';
import { createBackup, importBackup, parseBackup } from './backup';

const fakeHandle = { kind: 'file', name: 'm.mp4' } as unknown as FileSystemFileHandle;

async function seed() {
  await updateSettings({ country: 'MX', myProviderIds: [8, 337] });
  await addItem(movieDetails(), { language: 'es-ES', now: 100 });
  await addItem(tvDetails(), { language: 'es-ES', now: 200 });
  await syncSeriesEpisodes('tv:1396', seasons());
  await setEpisodesWatched('tv:1396', ['tv:1396:s1e1'], true, 300);
  await setItemStatus('movie:438631', 'watched', 400);
  const list = await createList('Favoritas', 500);
  await addToList(list.id, 'movie:438631', 600);
  const media = await linkLocalFile(
    { itemKey: 'movie:438631', handle: fakeHandle, fileName: 'm.mp4', fileSize: 42 },
    700,
  );
  await saveProgress(media.id, 120, 9000, 800);
  return media;
}

async function snapshot() {
  const [items, episodes, lists, listItems, progress, localMedia, settings] = await Promise.all([
    db.items.orderBy('key').toArray(),
    db.episodes.orderBy('key').toArray(),
    db.lists.toArray(),
    db.listItems.toArray(),
    db.progress.toArray(),
    db.localMedia.toArray(),
    db.settings.toArray(),
  ]);
  return { items, episodes, lists, listItems, progress, localMedia, settings };
}

beforeEach(() => clearAllData());

describe('copia de seguridad', () => {
  it('exporta sin handles de archivos', async () => {
    await seed();
    const backup = await createBackup(new Date('2026-11-16T10:00:00Z'));
    expect(backup).toMatchObject({
      app: 'listflix',
      formatVersion: 1,
      exportedAt: '2026-11-16T10:00:00.000Z',
    });
    expect(JSON.stringify(backup)).not.toContain('"handle"');
    expect(backup.localMedia[0]).toEqual({
      id: expect.any(String),
      itemKey: 'movie:438631',
      fileName: 'm.mp4',
      fileSize: 42,
      linkedAt: 700,
    });
  });

  it('exportar, borrar e importar deja la biblioteca idéntica (salvo los archivos, pendientes)', async () => {
    await seed();
    const before = await snapshot();
    const text = JSON.stringify(await createBackup());
    await clearAllData();
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await importBackup(parsed.backup, 'replace');
    const after = await snapshot();
    expect(after.items).toEqual(before.items);
    expect(after.episodes).toEqual(before.episodes);
    expect(after.lists).toEqual(before.lists);
    expect(after.listItems).toEqual(before.listItems);
    expect(after.progress).toEqual(before.progress);
    expect(after.settings).toEqual(before.settings);
    expect(after.localMedia).toEqual(
      before.localMedia.map(({ handle: _h, subtitleHandles: _s, ...rest }) => ({
        ...rest,
        handle: undefined,
        subtitleHandles: undefined,
      })),
    );
  });

  it('al reemplazar conserva el handle si el archivo sigue vinculado', async () => {
    const media = await seed();
    const backup = await createBackup();
    await importBackup(backup, 'replace');
    expect((await db.localMedia.get(media.id))?.handle).toBeDefined();
  });

  it('fusionar: gana el updatedAt más reciente y se conservan los datos locales', async () => {
    await seed();
    const backup = await createBackup();
    // Cambios locales posteriores a la copia
    await setItemStatus('movie:438631', 'dropped', 10_000);
    // La copia tiene un título nuevo y una versión antigua de Dune
    backup.items.push({
      ...backup.items[0]!,
      key: 'movie:603',
      tmdbId: 603,
      title: 'Matrix',
      updatedAt: 50,
    });
    backup.lists.push({ id: 'otra', name: 'Otra', order: 5, createdAt: 1 });
    await importBackup(backup, 'merge');
    expect((await db.items.get('movie:438631'))?.status).toBe('dropped');
    expect(await db.items.get('movie:603')).toBeDefined();
    expect(await db.lists.count()).toBe(2);
    expect((await db.settings.toArray())[0]?.country).toBe('MX');
  });

  it('rechaza archivos que no son de Listflix', () => {
    expect(parseBackup('no json')).toEqual({ ok: false, error: 'invalid-json' });
    expect(parseBackup('{"app":"otra"}')).toEqual({ ok: false, error: 'invalid-format' });
    expect(
      parseBackup(
        JSON.stringify({
          app: 'listflix',
          formatVersion: 1,
          exportedAt: 'x',
          items: [{ key: 'bad' }],
        }),
      ),
    ).toEqual({ ok: false, error: 'invalid-format' });
  });
});
