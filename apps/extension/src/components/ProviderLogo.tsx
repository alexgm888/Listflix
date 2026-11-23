import { useState } from 'react';
import { tmdbImage } from '../lib/images';

/** Logo de una plataforma (imagen de TMDB, solo informativa). Se oculta si no carga. */
export function ProviderLogo({
  path,
  className = 'h-6 w-6',
}: {
  path?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = tmdbImage(path, 'w92');
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={`${className} shrink-0 rounded`}
      onError={() => setFailed(true)}
    />
  );
}
