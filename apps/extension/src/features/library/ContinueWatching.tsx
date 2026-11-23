import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { tmdbImage } from '../../lib/images';
import { PlayButton } from '../local-media/PlayButton';
import type { ContinueEntry } from './continue-watching';
import { titlePath } from './TitleCard';

export function ContinueWatchingRow({ entries }: { entries: ContinueEntry[] }) {
  const { t } = useTranslation();
  if (entries.length === 0) return null;
  return (
    <section aria-labelledby="continue-title" className="mb-8">
      <h2 id="continue-title" className="section-title">
        {t('library.continueWatching')}
      </h2>
      <ul className="flex gap-4 overflow-x-auto pb-2">
        {entries.map((entry) => {
          const image = tmdbImage(entry.item.backdropPath ?? entry.item.posterPath, 'w780');
          const subtitle =
            entry.kind === 'episode'
              ? t('episodes.code', {
                  season: entry.episode.season,
                  episode: entry.episode.episode,
                }) + (entry.episode.name ? ` · ${entry.episode.name}` : '')
              : t('library.resumeMovie');
          const ratio =
            entry.kind === 'movie' ? entry.progress.positionSec / entry.progress.durationSec : 0;
          return (
            <li key={entry.item.key} className="w-72 shrink-0">
              <Link
                to={`${titlePath(entry.item)}${entry.kind === 'episode' ? '#episodes' : ''}`}
                className="group block overflow-hidden rounded-md bg-neutral-900"
              >
                <div className="relative aspect-video bg-neutral-800">
                  {image && (
                    <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  {ratio > 0 && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-neutral-700">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate font-medium group-hover:text-white">{entry.item.title}</p>
                  <p className="truncate text-sm text-neutral-400">{subtitle}</p>
                </div>
              </Link>
              {entry.kind === 'movie' && entry.media.handle && (
                <div className="mt-2">
                  <PlayButton media={entry.media} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
