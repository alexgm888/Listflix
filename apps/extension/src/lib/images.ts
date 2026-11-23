const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w92' | 'w185' | 'w342' | 'w500' | 'w780';
export type BackdropSize = 'w780' | 'w1280' | 'original';
export type LogoSize = 'w45' | 'w92' | 'w154';
export type ProfileSize = 'w185';

/** Construye la URL de una imagen de TMDB (no necesita clave). */
export function tmdbImage(
  path: string | undefined,
  size: PosterSize | BackdropSize | LogoSize | ProfileSize,
): string | undefined {
  if (!path) return undefined;
  return `${IMAGE_BASE}/${size}${path.startsWith('/') ? path : `/${path}`}`;
}
