import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useLibraryItem, useTitleDetails } from '../../app/hooks';
import { useSettings } from '../../app/settings-context';
import { AddToLibrary } from '../../components/AddToLibrary';
import { ErrorMessage, Spinner } from '../../components/Feedback';
import { Poster } from '../../components/Poster';
import { StatusSelect } from '../../components/StatusSelect';
import { resetSeriesStatusToAutomatic } from '../../db/episodes';
import { needsMetadataRefresh, removeItem, setItemStatus } from '../../db/library';
import { itemKeyOf, type MediaType } from '../../domain/types';
import { metadataProvider } from '../../lib/api';
import { formatRating, formatRuntime } from '../../lib/format';
import { tmdbImage } from '../../lib/images';
import { needsEpisodeSync, refreshItem } from '../../sync/metadata-sync';

export function TitlePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const mediaType: MediaType = params.type === 'tv' ? 'tv' : 'movie';
  const tmdbId = Number(params.id);
  const key = itemKeyOf(mediaType, tmdbId);
  const { metadataLanguage } = useSettings();
  const details = useTitleDetails(mediaType, tmdbId);
  const item = useLibraryItem(key);

  // Si el título está guardado, aprovecha los detalles recién descargados para
  // refrescar sus metadatos (y episodios) cuando estén caducados.
  const refreshing = useRef(false);
  useEffect(() => {
    if (!details.data || !item || refreshing.current) return;
    if (needsMetadataRefresh(item, metadataLanguage) || needsEpisodeSync(item)) {
      refreshing.current = true;
      refreshItem(key, metadataProvider, metadataLanguage, details.data)
        .catch(() => {})
        .finally(() => {
          refreshing.current = false;
        });
    }
  }, [details.data, item, key, metadataLanguage]);

  if (details.isPending) return <Spinner />;
  if (details.isError) {
    return <ErrorMessage error={details.error} onRetry={() => void details.refetch()} />;
  }

  const d = details.data;
  const backdrop = tmdbImage(d.backdropPath, 'w1280');
  const locale = i18n.language;
  const facts = [
    d.year,
    t(`mediaType.${d.mediaType}`),
    d.mediaType === 'movie' ? formatRuntime(d.runtime, locale) : undefined,
    d.mediaType === 'tv' && d.numberOfSeasons
      ? t('title.seasonsCount', { count: d.numberOfSeasons })
      : undefined,
  ].filter(Boolean);
  const rating = formatRating(d.voteAverage, locale);

  const onRemove = async () => {
    if (!window.confirm(t('title.removeConfirm', { title: d.title }))) return;
    await removeItem(key);
  };

  return (
    <article className="flex flex-col gap-8">
      <header className="relative -mx-4 -mt-6 overflow-hidden px-4 pb-6 pt-10">
        {backdrop && (
          <div aria-hidden className="absolute inset-0 -z-10">
            <img src={backdrop} alt="" className="h-full w-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/30" />
          </div>
        )}
        <button type="button" className="btn-ghost mb-4" onClick={() => navigate(-1)}>
          ← {t('common.back')}
        </button>
        <div className="flex flex-col gap-6 md:flex-row">
          <Poster
            path={d.posterPath}
            title={d.title}
            size="w500"
            className="w-48 shrink-0 md:w-64"
          />
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold">{d.title}</h1>
            {d.originalTitle !== d.title && (
              <p className="text-neutral-400">
                {t('title.originalTitle')}: {d.originalTitle}
              </p>
            )}
            <p className="text-neutral-300">{facts.join(' · ')}</p>
            {d.genres.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label={t('title.genres')}>
                {d.genres.map((g) => (
                  <li key={g.id} className="chip">
                    {g.name}
                  </li>
                ))}
              </ul>
            )}
            {rating && (
              <p className="text-sm text-neutral-300">
                <span aria-hidden>★ </span>
                {t('title.tmdbRating', { rating })}
              </p>
            )}
            {d.overview && (
              <p className="max-w-3xl leading-relaxed text-neutral-200">{d.overview}</p>
            )}

            <div className="mt-2 flex flex-wrap items-end gap-3">
              {item === undefined && <AddToLibrary input={d} saved={false} />}
              {item && (
                <>
                  <StatusSelect
                    label={t('title.status')}
                    value={item.status}
                    onChange={(s) => void setItemStatus(key, s)}
                    onAutomatic={
                      item.mediaType === 'tv'
                        ? () => void resetSeriesStatusToAutomatic(key)
                        : undefined
                    }
                    isManual={item.statusIsManual}
                  />
                  <button type="button" className="btn-ghost" onClick={() => void onRemove()}>
                    {t('title.remove')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {d.cast.length > 0 && (
        <section aria-labelledby="cast-title">
          <h2 id="cast-title" className="section-title">
            {t('title.cast')}
          </h2>
          <ul className="flex gap-4 overflow-x-auto pb-2">
            {d.cast.map((c) => (
              <li key={c.id} className="w-28 shrink-0 text-sm">
                <div className="aspect-[2/3] overflow-hidden rounded-md bg-neutral-800">
                  {c.profilePath && (
                    <img
                      src={tmdbImage(c.profilePath, 'w185')}
                      alt={c.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-1 font-medium leading-tight">{c.name}</p>
                {c.character && <p className="text-xs text-neutral-400">{c.character}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
