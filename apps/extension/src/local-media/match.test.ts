import { describe, expect, it, vi } from 'vitest';
import type { MetadataProvider, SearchResult } from '../providers/metadata/types';
import { findCandidates, rankCandidates } from './match';
import { parseFilename } from './parse-filename';

const r = (tmdbId: number, title: string, year: number, originalTitle = title): SearchResult => ({
  mediaType: 'movie',
  tmdbId,
  title,
  originalTitle,
  year,
  genreIds: [],
});

describe('emparejamiento', () => {
  it('propone "Matrix (1999)" primero para The.Matrix.1999.1080p.mkv', async () => {
    const parsed = parseFilename('The.Matrix.1999.1080p.mkv');
    const searchByType = vi.fn(async () => [
      r(604, 'Matrix Reloaded', 2003, 'The Matrix Reloaded'),
      r(624860, 'Matrix Resurrections', 2021, 'The Matrix Resurrections'),
      r(603, 'Matrix', 1999, 'The Matrix'),
    ]);
    const provider = { searchByType } as unknown as MetadataProvider;
    const candidates = await findCandidates(parsed, provider, 'es-ES');
    expect(candidates[0]).toMatchObject({ tmdbId: 603, title: 'Matrix', year: 1999 });
    expect(searchByType).toHaveBeenCalledWith('movie', 'The Matrix', {
      language: 'es-ES',
      year: 1999,
    });
  });

  it('busca series si hay temporada y episodio, y reintenta sin año y con el otro tipo', async () => {
    const searchByType = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([r(1, 'Algo', 2019)]);
    const provider = { searchByType } as unknown as MetadataProvider;
    const res = await findCandidates(parseFilename('Show.2019.S01E02.mkv'), provider, 'es-ES');
    expect(searchByType.mock.calls.map((c) => [c[0], c[2].year])).toEqual([
      ['tv', 2019],
      ['tv', undefined],
      ['movie', undefined],
    ]);
    expect(res).toHaveLength(1);
  });

  it('limita a 5 candidatos', () => {
    const many = Array.from({ length: 10 }, (_, i) => r(i, `T${i}`, 2000));
    expect(rankCandidates({ title: 'x' }, many)).toHaveLength(5);
  });
});
