import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { LibraryItem, MediaType } from '../domain/types';
import { metadataProvider } from '../lib/api';
import type { Genre } from '../providers/metadata/types';
import { useSettings } from './settings-context';

export function useGenres(): Map<number, Genre> {
  const { metadataLanguage } = useSettings();
  const query = useQuery({
    queryKey: ['genres', metadataLanguage],
    queryFn: () => metadataProvider.getGenres(metadataLanguage),
    staleTime: 24 * 60 * 60 * 1000,
  });
  return new Map((query.data ?? []).map((g) => [g.id, g]));
}

export function useTitleDetails(mediaType: MediaType, tmdbId: number) {
  const { metadataLanguage } = useSettings();
  return useQuery({
    queryKey: ['details', mediaType, tmdbId, metadataLanguage],
    queryFn: () => metadataProvider.getDetails(mediaType, tmdbId, metadataLanguage),
    enabled: Number.isFinite(tmdbId) && tmdbId > 0,
  });
}

/** Claves de los títulos guardados (para marcar "En tu biblioteca"). */
export function useLibraryKeys(): Set<string> {
  const keys = useLiveQuery(() => db.items.toCollection().primaryKeys(), []);
  return new Set(keys ?? []);
}

export function useLibraryItem(key: string): LibraryItem | undefined | null {
  // null = cargando; undefined = no guardado
  const item = useLiveQuery(async () => (await db.items.get(key)) ?? null, [key]);
  return item === undefined ? null : (item ?? undefined);
}
