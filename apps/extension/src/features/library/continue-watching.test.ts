import { describe, expect, it } from 'vitest';
import type { EpisodeState, LibraryItem } from '../../domain/types';
import { buildContinueWatching } from './continue-watching';

const base: LibraryItem = {
  key: 'tv:1',
  mediaType: 'tv',
  tmdbId: 1,
  title: 'Serie',
  originalTitle: 'Serie',
  genreIds: [],
  status: 'watching',
  statusIsManual: false,
  addedAt: 0,
  updatedAt: 0,
  metadataFetchedAt: 1,
  lastWatchedAt: 100,
};

const ep = (season: number, episode: number, watched: boolean): EpisodeState => ({
  key: `tv:1:s${season}e${episode}`,
  seriesKey: 'tv:1',
  season,
  episode,
  watched,
  airDate: '2020-01-01',
});

describe('buildContinueWatching', () => {
  it('incluye series en curso con su siguiente episodio y películas a medias', () => {
    const movie: LibraryItem = {
      ...base,
      key: 'movie:2',
      mediaType: 'movie',
      tmdbId: 2,
      status: 'pending',
    };
    const finished: LibraryItem = {
      ...base,
      key: 'movie:3',
      mediaType: 'movie',
      tmdbId: 3,
      status: 'pending',
    };
    const entries = buildContinueWatching(
      [base, movie, finished],
      new Map([['tv:1', [ep(1, 1, true), ep(1, 2, false)]]]),
      [
        { id: 'm2', itemKey: 'movie:2', fileName: 'a.mp4', fileSize: 1, linkedAt: 0 },
        { id: 'm3', itemKey: 'movie:3', fileName: 'b.mp4', fileSize: 1, linkedAt: 0 },
      ],
      [
        { localMediaId: 'm2', positionSec: 600, durationSec: 6000, updatedAt: 500 },
        { localMediaId: 'm3', positionSec: 5900, durationSec: 6000, updatedAt: 600 },
      ],
      Date.parse('2026-11-23'),
    );
    expect(entries.map((e) => e.item.key)).toEqual(['movie:2', 'tv:1']);
    const tv = entries[1]!;
    expect(tv.kind === 'episode' && tv.episode.key).toBe('tv:1:s1e2');
  });
});
