import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../db/db';
import { findLocalMedia, unlinkLocalFile } from '../../db/local-media';
import type { LibraryItem } from '../../domain/types';
import { isFilePickerSupported } from '../../local-media/file-access';
import { parseFilename } from '../../local-media/parse-filename';
import { CompatibilityNotice } from './CompatibilityNotice';
import { linkPicked, pickVideo, type PickedFile } from './link-actions';
import { PlayButton } from './PlayButton';

function MovieLocalMedia({ item }: { item: LibraryItem }) {
  const { t } = useTranslation();
  const media = useLiveQuery(async () => (await findLocalMedia(item.key)) ?? null, [item.key]);
  const [error, setError] = useState(false);

  const onLink = async () => {
    setError(false);
    try {
      const picked = await pickVideo();
      if (picked) await linkPicked(picked, item.key);
    } catch {
      setError(true);
    }
  };

  if (media === undefined) return null;
  return (
    <div className="flex flex-col gap-3">
      {media ? (
        <>
          <p className="text-sm text-neutral-300">
            {media.handle ? t('local.linkedFile') : t('local.pendingRelink')}:{' '}
            <span className="font-mono text-neutral-100">{media.fileName}</span>
          </p>
          {media.handle && <CompatibilityNotice fileName={media.fileName} />}
          <div className="flex flex-wrap gap-2">
            {media.handle && <PlayButton media={media} />}
            <button type="button" className="btn-secondary" onClick={() => void onLink()}>
              {media.handle ? t('local.changeFile') : t('local.relink')}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void unlinkLocalFile(media.id)}
            >
              {t('local.unlink')}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary" onClick={() => void onLink()}>
            {t('local.linkFile')}
          </button>
          <span className="text-sm text-neutral-400">{t('local.linkHint')}</span>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {t('errors.generic')}
        </p>
      )}
    </div>
  );
}

function SeriesLocalMedia({ item }: { item: LibraryItem }) {
  const { t } = useTranslation();
  const linked = useLiveQuery(
    () => db.localMedia.where('itemKey').equals(item.key).count(),
    [item.key],
  );
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  const onPick = async () => {
    const file = await pickVideo();
    if (!file) return;
    const parsed = parseFilename(file.fileName);
    setSeason(parsed.season ?? 1);
    setEpisode(parsed.episode ?? 1);
    setPicked(file);
  };

  const onConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!picked) return;
    await linkPicked(picked, item.key, { season, episode });
    setPicked(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-400">{t('local.seriesHint', { count: linked ?? 0 })}</p>
      {!picked ? (
        <button type="button" className="btn-secondary self-start" onClick={() => void onPick()}>
          {t('local.linkEpisodeFile')}
        </button>
      ) : (
        <form
          onSubmit={(e) => void onConfirm(e)}
          className="flex flex-col gap-3 rounded-md bg-neutral-900 p-3"
        >
          <p className="text-sm">
            <span className="font-mono">{picked.fileName}</span>
          </p>
          <CompatibilityNotice fileName={picked.fileName} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-400">{t('local.seasonNumber')}</span>
              <input
                type="number"
                min={1}
                className="input w-24"
                value={season}
                onChange={(e) => setSeason(Math.max(1, Number(e.target.value)))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-400">{t('local.episodeNumber')}</span>
              <input
                type="number"
                min={1}
                className="input w-24"
                value={episode}
                onChange={(e) => setEpisode(Math.max(1, Number(e.target.value)))}
              />
            </label>
            <button type="submit" className="btn-primary">
              {t('local.confirmLink')}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPicked(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function LocalMediaSection({ item }: { item: LibraryItem }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="local-title">
      <h2 id="local-title" className="section-title">
        {t('local.title')}
      </h2>
      {!isFilePickerSupported() ? (
        <p className="text-sm text-neutral-400">{t('local.unsupportedBrowser')}</p>
      ) : item.mediaType === 'movie' ? (
        <MovieLocalMedia item={item} />
      ) : (
        <SeriesLocalMedia item={item} />
      )}
    </section>
  );
}
