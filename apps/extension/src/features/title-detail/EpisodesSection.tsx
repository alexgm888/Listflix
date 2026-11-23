import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { useSettings } from '../../app/settings-context';
import {
  findNextEpisode,
  getSeriesEpisodes,
  isAired,
  setEpisodesWatched,
  setSeasonWatched,
  todayIso,
} from '../../db/episodes';
import type { EpisodeState } from '../../domain/types';
import { metadataProvider } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { refreshItem } from '../../sync/metadata-sync';

export interface EpisodeActionsRender {
  (episode: EpisodeState): ReactNode;
}

interface Props {
  seriesKey: string;
  /** Acciones extra por episodio (p. ej. reproducir o vincular un archivo local). */
  renderEpisodeActions?: EpisodeActionsRender;
}

function groupBySeason(episodes: EpisodeState[]): Map<number, EpisodeState[]> {
  const map = new Map<number, EpisodeState[]>();
  for (const e of episodes) {
    const list = map.get(e.season) ?? [];
    list.push(e);
    map.set(e.season, list);
  }
  return map;
}

export function EpisodesSection({ seriesKey, renderEpisodeActions }: Props) {
  const { t, i18n } = useTranslation();
  const { metadataLanguage } = useSettings();
  const location = useLocation();
  const sectionRef = useRef<HTMLElement>(null);
  const episodes = useLiveQuery(() => getSeriesEpisodes(seriesKey), [seriesKey]);
  const today = todayIso();
  const next = episodes ? findNextEpisode(episodes, today) : undefined;
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  // Abre por defecto la temporada del siguiente episodio.
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current || !episodes || episodes.length === 0) return;
    initialised.current = true;
    setOpen(new Set([next?.season ?? episodes[0]!.season]));
  }, [episodes, next]);

  useEffect(() => {
    if (location.hash === '#episodes' && episodes) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, episodes]);

  if (!episodes) return null;

  const syncNow = async () => {
    setSyncing(true);
    setSyncError(false);
    try {
      await refreshItem(seriesKey, metadataProvider, metadataLanguage);
    } catch {
      setSyncError(true);
    } finally {
      setSyncing(false);
    }
  };

  const seasons = groupBySeason(episodes);
  const toggle = (season: number) =>
    setOpen((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(season)) nextSet.delete(season);
      else nextSet.add(season);
      return nextSet;
    });

  return (
    <section
      id="episodes"
      ref={sectionRef}
      aria-labelledby="episodes-title"
      className="scroll-mt-20"
    >
      <div className="mb-3 flex items-center gap-3">
        <h2 id="episodes-title" className="section-title mb-0 mr-auto">
          {t('episodes.title')}
        </h2>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => void syncNow()}
          disabled={syncing}
        >
          {syncing ? t('episodes.syncing') : t('episodes.sync')}
        </button>
      </div>
      {syncError && (
        <p role="alert" className="mb-3 text-sm text-red-300">
          {t('errors.generic')}
        </p>
      )}

      {episodes.length === 0 ? (
        <p className="text-neutral-400">{t('episodes.none')}</p>
      ) : (
        <>
          {next ? (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-4">
              <div className="mr-auto">
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                  {t('episodes.continue')}
                </p>
                <p className="text-lg font-semibold">
                  {t('episodes.code', { season: next.season, episode: next.episode })}
                  {next.name && (
                    <span className="font-normal text-neutral-300"> · {next.name}</span>
                  )}
                </p>
              </div>
              {renderEpisodeActions?.(next)}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void setEpisodesWatched(seriesKey, [next.key], true)}
              >
                ✓ {t('episodes.markWatched')}
              </button>
            </div>
          ) : (
            <p className="mb-4 rounded-md bg-emerald-950/50 p-3 text-sm text-emerald-200">
              {t('episodes.upToDate')}
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {[...seasons.entries()].map(([season, eps]) => {
              const watched = eps.filter((e) => e.watched).length;
              const aired = eps.filter((e) => isAired(e, today));
              const allAiredWatched = aired.length > 0 && aired.every((e) => e.watched);
              const isOpen = open.has(season);
              const panelId = `season-${season}-panel`;
              return (
                <li key={season} className="rounded-md bg-neutral-900">
                  <div className="flex items-center gap-3 p-3">
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-2 text-left font-medium"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(season)}
                    >
                      <span aria-hidden className="w-4 text-neutral-400">
                        {isOpen ? '▾' : '▸'}
                      </span>
                      {t('episodes.season', { number: season })}
                      <span className="text-sm font-normal text-neutral-400">
                        {t('episodes.progress', { watched, total: eps.length })}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => void setSeasonWatched(seriesKey, season, !allAiredWatched)}
                    >
                      {allAiredWatched
                        ? t('episodes.markSeasonUnwatched')
                        : t('episodes.markSeasonWatched')}
                    </button>
                  </div>
                  {isOpen && (
                    <ol id={panelId} className="border-t border-neutral-800">
                      {eps.map((e) => {
                        const airedYet = isAired(e, today);
                        const inputId = `ep-${e.key}`;
                        return (
                          <li
                            key={e.key}
                            className={`flex items-center gap-3 px-3 py-2 ${next?.key === e.key ? 'bg-neutral-800/60' : ''}`}
                          >
                            <input
                              id={inputId}
                              type="checkbox"
                              className="h-4 w-4 accent-brand"
                              checked={e.watched}
                              onChange={(ev) =>
                                void setEpisodesWatched(seriesKey, [e.key], ev.target.checked)
                              }
                            />
                            <label
                              htmlFor={inputId}
                              className="flex flex-1 flex-col sm:flex-row sm:gap-3"
                            >
                              <span className="w-16 shrink-0 text-sm text-neutral-400">
                                {t('episodes.code', { season: e.season, episode: e.episode })}
                              </span>
                              <span className={e.watched ? 'text-neutral-400' : ''}>
                                {e.name ?? t('episodes.episode', { number: e.episode })}
                              </span>
                              <span className="text-xs text-neutral-500 sm:ml-auto">
                                {airedYet
                                  ? formatDate(e.airDate, i18n.language)
                                  : t('episodes.upcoming', {
                                      date: formatDate(e.airDate, i18n.language) ?? '—',
                                    })}
                              </span>
                            </label>
                            {renderEpisodeActions?.(e)}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
