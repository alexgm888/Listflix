export interface ParsedFilename {
  /** Título limpio, listo para buscar. */
  title: string;
  year?: number;
  season?: number;
  episode?: number;
  /** Título del episodio si aparece después de `SxxEyy`. */
  episodeTitle?: string;
}

export const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'webm', 'mkv', 'mov', 'ogv', 'avi', 'wmv', 'ts'];

/** Etiquetas técnicas que marcan el final del título. */
const JUNK_TOKENS = [
  '2160p',
  '1080p',
  '1080i',
  '720p',
  '576p',
  '480p',
  '360p',
  '4k',
  'uhd',
  'hd',
  'fhd',
  'sd',
  'x264',
  'x265',
  'h264',
  'h265',
  'h 264',
  'h 265',
  'hevc',
  'avc',
  'xvid',
  'divx',
  'av1',
  'vp9',
  'web-dl',
  'webdl',
  'web-rip',
  'webrip',
  'web',
  'bluray',
  'blu-ray',
  'bdrip',
  'brrip',
  'bdremux',
  'remux',
  'dvdrip',
  'dvdscr',
  'dvd',
  'hdtv',
  'hdrip',
  'hdcam',
  'cam',
  'ts',
  'tc',
  'screener',
  'aac',
  'aac2',
  'ac3',
  'eac3',
  'dts',
  'dts-hd',
  'truehd',
  'atmos',
  'ddp',
  'ddp5',
  'dd5',
  'dd2',
  'flac',
  'mp3',
  'opus',
  '10bit',
  '8bit',
  'hdr',
  'hdr10',
  'dv',
  'sdr',
  'imax',
  'proper',
  'repack',
  'extended',
  'unrated',
  'uncut',
  'remastered',
  'directors cut',
  'limited',
  'internal',
  'multi',
  'dual',
  'subs',
  'subbed',
  'dubbed',
  'castellano',
  'spanish',
  'español',
  'latino',
  'english',
  'vose',
  'vos',
  'nf',
  'amzn',
  'dsnp',
  'hmax',
  'atvp',
  'max',
];

const junkRegex = new RegExp(
  `(?:^|\\s)(?:${JUNK_TOKENS.map((t) => t.replace(/[-\s]/g, '[-\\s]?')).join('|')})(?=\\s|$)`,
  'i',
);

const EPISODE_PATTERNS: RegExp[] = [
  // S01E02, s01.e02, S01 E02, S01_E02, S1E2
  /(?:^|[\s._\-[(])s(\d{1,2})[\s._-]*e(\d{1,3})(?=$|[\s._\-\])e])/i,
  // 1x02
  /(?:^|[\s._\-[(])(\d{1,2})x(\d{2,3})(?=$|[\s._\-\])])/i,
  // Season 1 Episode 2 / Temporada 1 Capitulo 2
  /(?:season|temporada)[\s._-]*(\d{1,2})[\s._-]*(?:episode|episodio|cap[ií]tulo|cap)[\s._-]*(\d{1,3})/i,
];

function stripExtension(name: string): string {
  const match = /\.([a-z0-9]{2,4})$/i.exec(name);
  if (match && VIDEO_EXTENSIONS.includes(match[1]!.toLowerCase())) {
    return name.slice(0, -match[0].length);
  }
  return name;
}

function cleanSeparators(text: string): string {
  return text
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:,]+|[\s\-–—:,(]+$/g, '')
    .trim();
}

function cutAtJunk(text: string): string {
  const match = junkRegex.exec(text);
  return match ? text.slice(0, match.index) : text;
}

/** Extrae título, año, temporada y episodio de un nombre de archivo de vídeo. */
export function parseFilename(fileName: string): ParsedFilename {
  let base = stripExtension(fileName.split(/[\\/]/).pop() ?? fileName);

  // Grupos entre corchetes o llaves: [Group], [720p], {tag}.
  base = base.replace(/\[[^\]]*\]|\{[^}]*\}/g, ' ');

  // Año entre paréntesis: el indicador más fiable.
  let year: number | undefined;
  const parenYear = /\((19\d{2}|20\d{2})\)/.exec(base);
  if (parenYear) {
    year = Number(parenYear[1]);
  }

  // Temporada y episodio.
  let season: number | undefined;
  let episode: number | undefined;
  let episodeTitle: string | undefined;
  let titlePart = base;
  for (const pattern of EPISODE_PATTERNS) {
    const match = pattern.exec(base);
    if (match) {
      season = Number(match[1]);
      episode = Number(match[2]);
      titlePart = base.slice(0, match.index);
      const rest = cleanSeparators(
        cutAtJunk(cleanSeparators(base.slice(match.index + match[0].length))),
      );
      const restClean = rest.replace(/\((?:19|20)\d{2}\)/g, '').trim();
      if (restClean) episodeTitle = restClean;
      break;
    }
  }

  // Quita el resto de paréntesis (después de haber leído el año).
  titlePart = titlePart.replace(/\([^)]*\)/g, ' ');
  let text = cleanSeparators(titlePart);

  // Año suelto: el último que no esté al principio (para "1917 2019" o "2001 A Space Odyssey 1968").
  if (year === undefined || season !== undefined) {
    const years = [...text.matchAll(/(?:^|\s)((?:19|20)\d{2})(?=\s|$)/g)];
    const candidate = [...years].reverse().find((m) => (m.index ?? 0) + m[0].indexOf(m[1]!) > 0);
    if (candidate) {
      year ??= Number(candidate[1]);
      const index = (candidate.index ?? 0) + candidate[0].indexOf(candidate[1]!);
      text = text.slice(0, index);
    }
  } else {
    const years = [...text.matchAll(/(?:^|\s)((?:19|20)\d{2})(?=\s|$)/g)];
    const same = years.find((m) => Number(m[1]) === year && (m.index ?? 0) > 0);
    if (same) text = text.slice(0, same.index);
  }

  text = cleanSeparators(cutAtJunk(text));
  // Guiones que separan el título de un nombre de grupo al final: "Title - Group".
  text = text.replace(/\s+-\s*$/, '').trim();

  return {
    title: text || cleanSeparators(stripExtension(fileName)),
    ...(year !== undefined ? { year } : {}),
    ...(season !== undefined ? { season, episode } : {}),
    ...(episodeTitle ? { episodeTitle } : {}),
  };
}
