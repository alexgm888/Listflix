import { useState } from 'react';
import { tmdbImage, type PosterSize } from '../lib/images';

interface PosterProps {
  path?: string;
  title: string;
  size?: PosterSize;
  className?: string;
}

export function Poster({ path, title, size = 'w342', className = '' }: PosterProps) {
  const src = tmdbImage(path, size);
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = src && failed !== src;
  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-md bg-neutral-800 ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(src)}
        />
      ) : (
        <div
          role="img"
          aria-label={title}
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 p-3 text-center text-sm font-medium text-neutral-400"
        >
          {title}
        </div>
      )}
    </div>
  );
}
