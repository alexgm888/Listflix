import { beforeEach, describe, expect, it } from 'vitest';
import { movieDetails, searchResult, seasons, tvDetails } from '../test/fixtures';
import { clearAllData, db } from './db';
import {
  computeSeriesStatus,
  findNextEpisode,
  getSeriesEpisodes,
  resetSeriesStatusToAutomatic,
  setEpisodesWatched,
  setSeasonWatched,
  syncSeriesEpisodes,
} from './episodes';
import { addItem, getItem, needsMetadataRefresh, removeItem, setItemStatus } from './library';
import {
  addToList,
  createList,
  deleteList,
  getListIdsForItem,
  getListItems,
  getLists,
  moveInArray,
  renameList,
  reorderListItems,
  reorderLists,
} from './lists';
import { findLocalMedia, getProgress, linkLocalFile, saveProgress } from './local-media';
import { defaultSettings, detectUiLanguage, getSettings, updateSettings } from './settings';
import { getProvidersForCountry, putCachedProviders } from './watch-providers';

const fakeHandle = (name: string) => ({ kind: 'file', name }) as unknown as FileSystemFileHandle;

beforeEach(async () => {
  await clearAllData();
});

describe('ajustes', () => {
  it('detecta el idioma del navegador', () => {
    expect(detectUiLanguage(['es-MX', 'en'])).toBe('es');
    expect(detectUiLanguage(['fr-FR', 'en-GB'])).toBe('en');
    expect(detectUiLanguage(['de'])).toBe('en');
    expect(defaultSettings(['es-ES']).metadataLanguage).toBe('es-ES');
  });

  it('crea los valores por defecto y los actualiza', async () => {
    const s = await getSettings();
    expect(s.country).toBe('ES');
    await updateSettings({ country: 'MX', myProviderIds: [8] });
    expect(await getSettings()).toMatchObject({ country: 'MX', myProviderIds: [8] });
  });
});

describe('biblioteca', () => {
  it('añade un título sin duplicarlo y conserva el estado del usuario', async () => {
    await addItem(movieDetails(), { language: 'es-ES', now: 1 });
    await setItemStatus('movie:438631', 'watched', 2);
    await addItem(movieDetails({ title: 'Dune (2021)' }), { language: 'es-ES', now: 3 });
    const item = await getItem('movie:438631');
    expect(item).toMatchObject({
      title: 'Dune (2021)',
      status: 'watched',
      addedAt: 1,
      runtime: 155,
    });
    expect(await db.items.count()).toBe(1);
  });

  it('marca para refresco los títulos añadidos desde la búsqueda', async () => {
    const item = await addItem(searchResult(), { language: 'es-ES', now: 10 });
    expect(item.metadataFetchedAt).toBe(0);
    expect(needsMetadataRefresh(item, 'es-ES', 10)).toBe(true);
    const full = await addItem(movieDetails(), { language: 'es-ES', now: 10 });
    expect(needsMetadataRefresh(full, 'es-ES', 11)).toBe(false);
    expect(needsMetadataRefresh(full, 'en-US', 11)).toBe(true);
  });

  it('borra en cascada', async () => {
    await addItem(tvDetails(), { language: 'es-ES' });
    await syncSeriesEpisodes('tv:1396', seasons());
    const list = await createList('Favoritas');
    await addToList(list.id, 'tv:1396');
    const media = await linkLocalFile({
      itemKey: 'tv:1396',
      episodeKey: 'tv:1396:s1e1',
      handle: fakeHandle('a.mp4'),
      fileName: 'a.mp4',
      fileSize: 1,
    });
    await saveProgress(media.id, 10, 100);
    await putCachedProviders('tv:1396', 'ES', {
      flatrate: [],
      rent: [],
      buy: [],
      free: [],
      ads: [],
    });
    await removeItem('tv:1396');
    expect(await db.items.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);
    expect(await db.listItems.count()).toBe(0);
    expect(await db.localMedia.count()).toBe(0);
    expect(await db.progress.count()).toBe(0);
    expect(await db.watchProviders.count()).toBe(0);
    expect(await db.lists.count()).toBe(1);
  });
});

describe('series y episodios', () => {
  const today = '2026-11-23';
  const ep = (season: number, episode: number, watched = false, airDate = '2020-01-01') => ({
    key: `tv:1:s${season}e${episode}`,
    seriesKey: 'tv:1',
    season,
    episode,
    watched,
    airDate,
  });

  it('calcula el estado a partir de los episodios', () => {
    expect(computeSeriesStatus([ep(1, 1), ep(1, 2)], today)).toBe('pending');
    expect(computeSeriesStatus([ep(1, 1, true), ep(1, 2)], today)).toBe('watching');
    expect(computeSeriesStatus([ep(1, 1, true), ep(1, 2, true)], today)).toBe('watched');
    // un episodio futuro no impide que esté "vista"
    expect(computeSeriesStatus([ep(1, 1, true), ep(1, 2, false, '2099-01-01')], today)).toBe(
      'watched',
    );
  });

  it('busca el siguiente episodio sin ver', () => {
    expect(findNextEpisode([ep(1, 1), ep(1, 2)], today)?.key).toBe('tv:1:s1e1');
    expect(findNextEpisode([ep(1, 1, true), ep(1, 2), ep(2, 1)], today)?.key).toBe('tv:1:s1e2');
    expect(findNextEpisode([ep(1, 1), ep(1, 2, true), ep(1, 3)], today)?.key).toBe('tv:1:s1e3');
    expect(findNextEpisode([ep(1, 1), ep(1, 2, true)], today)?.key).toBe('tv:1:s1e1');
    expect(findNextEpisode([ep(1, 1, true), ep(1, 2, false, '2099-01-01')], today)).toBeUndefined();
  });

  it('marcar la T1 completa hace que "Continuar" muestre T2E1', async () => {
    await addItem(tvDetails(), { language: 'es-ES' });
    await syncSeriesEpisodes('tv:1396', seasons());
    const all = await getSeriesEpisodes('tv:1396');
    expect(all).toHaveLength(5); // sin especiales
    await setSeasonWatched('tv:1396', 1, true);
    const next = findNextEpisode(await getSeriesEpisodes('tv:1396'), today);
    expect(next).toMatchObject({ season: 2, episode: 1 });
    expect((await getItem('tv:1396'))?.status).toBe('watching');
    await setSeasonWatched('tv:1396', 2, true);
    expect((await getItem('tv:1396'))?.status).toBe('watched');
  });

  it('respeta el estado fijado a mano y puede volver a automático', async () => {
    await addItem(tvDetails(), { language: 'es-ES' });
    await syncSeriesEpisodes('tv:1396', seasons());
    await setItemStatus('tv:1396', 'dropped');
    await setEpisodesWatched('tv:1396', ['tv:1396:s1e1'], true);
    expect((await getItem('tv:1396'))?.status).toBe('dropped');
    await resetSeriesStatusToAutomatic('tv:1396');
    expect(await getItem('tv:1396')).toMatchObject({ status: 'watching', statusIsManual: false });
  });

  it('la sincronización conserva los episodios vistos', async () => {
    await addItem(tvDetails(), { language: 'es-ES' });
    await syncSeriesEpisodes('tv:1396', seasons());
    await setEpisodesWatched('tv:1396', ['tv:1396:s1e2'], true);
    await syncSeriesEpisodes('tv:1396', seasons());
    const e = await db.episodes.get('tv:1396:s1e2');
    expect(e?.watched).toBe(true);
  });
});

describe('listas', () => {
  it('crea, renombra, reordena y borra', async () => {
    const a = await createList('A');
    const b = await createList(' B ');
    expect(b.name).toBe('B');
    expect((await getLists()).map((l) => l.name)).toEqual(['A', 'B']);
    await reorderLists([b.id, a.id]);
    expect((await getLists()).map((l) => l.name)).toEqual(['B', 'A']);
    await renameList(a.id, 'Alfa');
    await addToList(a.id, 'movie:1');
    await addToList(b.id, 'movie:1');
    expect((await getListIdsForItem('movie:1')).sort()).toEqual([a.id, b.id].sort());
    await deleteList(a.id);
    expect(await getListIdsForItem('movie:1')).toEqual([b.id]);
    await expect(createList('   ')).rejects.toThrow();
  });

  it('ordena los títulos dentro de una lista', async () => {
    const l = await createList('L');
    await addToList(l.id, 'movie:1');
    await addToList(l.id, 'movie:2');
    await addToList(l.id, 'movie:1'); // duplicado ignorado
    expect((await getListItems(l.id)).map((i) => i.itemKey)).toEqual(['movie:1', 'movie:2']);
    await reorderListItems(l.id, ['movie:2', 'movie:1']);
    expect((await getListItems(l.id)).map((i) => i.itemKey)).toEqual(['movie:2', 'movie:1']);
  });

  it('moveInArray', () => {
    expect(moveInArray([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveInArray([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  });
});

describe('archivos locales y progreso', () => {
  it('reutiliza el registro al revincular y solo conserva el progreso si es el mismo archivo', async () => {
    const m1 = await linkLocalFile({
      itemKey: 'movie:603',
      handle: fakeHandle('m.mp4'),
      fileName: 'm.mp4',
      fileSize: 100,
    });
    await saveProgress(m1.id, 50, 100);
    const m2 = await linkLocalFile({
      itemKey: 'movie:603',
      handle: fakeHandle('m.mp4'),
      fileName: 'm.mp4',
      fileSize: 100,
    });
    expect(m2.id).toBe(m1.id);
    expect((await getProgress(m1.id))?.positionSec).toBe(50);
    await linkLocalFile({
      itemKey: 'movie:603',
      handle: fakeHandle('otro.mp4'),
      fileName: 'otro.mp4',
      fileSize: 200,
    });
    expect(await getProgress(m1.id)).toBeUndefined();
    expect(await findLocalMedia('movie:603')).toMatchObject({ fileName: 'otro.mp4' });
  });

  it('distingue película y episodio', async () => {
    await linkLocalFile({
      itemKey: 'tv:1',
      episodeKey: 'tv:1:s1e1',
      handle: fakeHandle('e.mp4'),
      fileName: 'e.mp4',
      fileSize: 1,
    });
    expect(await findLocalMedia('tv:1')).toBeUndefined();
    expect(await findLocalMedia('tv:1', 'tv:1:s1e1')).toBeDefined();
  });
});

describe('caché de plataformas', () => {
  it('agrupa por país', async () => {
    const data = { flatrate: [], rent: [], buy: [], free: [], ads: [] };
    await putCachedProviders('movie:1', 'ES', data);
    await putCachedProviders('movie:1', 'MX', data);
    await putCachedProviders('tv:2', 'ES', data);
    const map = await getProvidersForCountry('ES');
    expect([...map.keys()].sort()).toEqual(['movie:1', 'tv:2']);
  });
});
