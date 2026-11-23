import { tmdbImage, type PosterSize } from '../lib/images';

interface PosterProps {
  path?: string;
  title: string;
  size?: PosterSize;
  className?: string;
}

export function Poster({ path, title, size = 'w342', className = '' }: PosterProps) {
  const src = tmdbImage(path, size);
  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-md bg-neutral-800 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={title}
          className="flex h-full w-full items-center justify-center p-2 text-center text-sm text-neutral-400"
        >
          {title}
        </div>
      )}
    </div>
  );
}
