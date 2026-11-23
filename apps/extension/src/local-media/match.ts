import { normalizeText } from '../features/library/filter';
import type { MetadataProvider, SearchResult } from '../providers/metadata/types';
import type { ParsedFilename } from './parse-filename';

export const MAX_CANDIDATES = 5;

function score(result: SearchResult, parsed: ParsedFilename, index: number): number {
  const q = normalizeText(parsed.title);
  const titles = [result.title, result.originalTitle].map(normalizeText);
  let s = -index; // conserva el orden de relevancia de TMDB como desempate
  if (titles.includes(q)) s += 50;
  else if (titles.some((t) => t.startsWith(q) || q.startsWith(t))) s += 15;
  if (parsed.year && result.year) {
    if (result.year === parsed.year) s += 40;
    else if (Math.abs(result.year - parsed.year) === 1) s += 15;
  }
  return s;
}

/** Ordena los resultados de TMDB por parecido con lo extraído del nombre del archivo. */
export function rankCandidates(parsed: ParsedFilename, results: SearchResult[]): SearchResult[] {
  return results
    .map((r, i) => ({ r, s: score(r, parsed, i) }))
    .sort((a, b) => b.s - a.s)
    .map(({ r }) => r)
    .slice(0, MAX_CANDIDATES);
}

/**
 * Busca en TMDB las fichas que mejor encajan con un archivo. Si el nombre tiene
 * `SxxEyy` se buscan series; si no, películas. Si no hay resultados con el año, se
 * reintenta sin él, y después con el otro tipo.
 */
export async function findCandidates(
  parsed: ParsedFilename,
  provider: MetadataProvider,
  language: string,
): Promise<SearchResult[]> {
  const primary = parsed.season !== undefined ? 'tv' : 'movie';
  const secondary = primary === 'tv' ? 'movie' : 'tv';
  const attempts: [typeof primary, number | undefined][] = [
    [primary, parsed.year],
    ...(parsed.year ? ([[primary, undefined]] as [typeof primary, undefined][]) : []),
    [secondary, undefined],
  ];
  for (const [type, year] of attempts) {
    const results = await provider.searchByType(type, parsed.title, { language, year });
    if (results.length > 0) return rankCandidates(parsed, results);
  }
  return [];
}
