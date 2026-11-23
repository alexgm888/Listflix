import { describe, expect, it } from 'vitest';
import { parseFilename } from './parse-filename';

describe('parseFilename', () => {
  it.each([
    ['The.Matrix.1999.1080p.BluRay.x264.mkv', { title: 'The Matrix', year: 1999 }],
    ['The.Matrix.1999.1080p.mkv', { title: 'The Matrix', year: 1999 }],
    [
      "Breaking Bad - 1x02 - Cat's in the Bag.mp4",
      { title: 'Breaking Bad', season: 1, episode: 2, episodeTitle: "Cat's in the Bag" },
    ],
    ['[Group] Serie S02E10 [720p].mkv', { title: 'Serie', season: 2, episode: 10 }],
    ['Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1.Atmos.mkv', { title: 'Dune Part Two', year: 2024 }],
    ['2001.A.Space.Odyssey.1968.mkv', { title: '2001 A Space Odyssey', year: 1968 }],
    ['1917.2019.1080p.mkv', { title: '1917', year: 2019 }],
    ['Blade Runner 2049 (2017).mp4', { title: 'Blade Runner 2049', year: 2017 }],
    ['Blade.Runner.2049.2017.720p.mkv', { title: 'Blade Runner 2049', year: 2017 }],
    ['the_office_s03.e05_720p.mp4', { title: 'the office', season: 3, episode: 5 }],
    ['Movie Without Year.webm', { title: 'Movie Without Year' }],
    [
      'Dark.S01E01.Secrets.1080p.NF.WEB-DL.mkv',
      { title: 'Dark', season: 1, episode: 1, episodeTitle: 'Secrets' },
    ],
    ['Show.Name.2019.S01E03.mkv', { title: 'Show Name', year: 2019, season: 1, episode: 3 }],
    ['Amélie (2001) [1080p] [Castellano].mkv', { title: 'Amélie', year: 2001 }],
    ['La.Casa.de.Papel.S1.E3.mp4', { title: 'La Casa de Papel', season: 1, episode: 3 }],
    ['Los Simpson Temporada 4 Capitulo 12.avi', { title: 'Los Simpson', season: 4, episode: 12 }],
    ['Inception_2010_HEVC_10bit.mov', { title: 'Inception', year: 2010 }],
    ['C:\\Videos\\Up.2009.m4v', { title: 'Up', year: 2009 }],
    ['/home/user/Her (2013).mp4', { title: 'Her', year: 2013 }],
    ['S01E01.mkv', { title: 'S01E01', season: 1, episode: 1 }],
  ])('%s', (fileName, expected) => {
    expect(parseFilename(fileName)).toEqual(expected);
  });
});
