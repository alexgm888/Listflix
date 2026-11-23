import { useTranslation } from 'react-i18next';
import type { EpisodeState, LocalMedia } from '../../domain/types';
import { isFilePickerSupported } from '../../local-media/file-access';
import { linkPicked, pickVideo } from './link-actions';
import { PlayButton } from './PlayButton';

interface Props {
  episode: EpisodeState;
  media?: LocalMedia;
}

/** Acciones de archivo local en la fila de un episodio: reproducir y vincular. */
export function EpisodeLocalActions({ episode, media }: Props) {
  const { t } = useTranslation();
  const code = t('episodes.code', { season: episode.season, episode: episode.episode });
  const onLink = async () => {
    const picked = await pickVideo();
    if (picked) {
      await linkPicked(picked, episode.seriesKey, {
        season: episode.season,
        episode: episode.episode,
      });
    }
  };
  return (
    <span className="flex items-center gap-1">
      {media?.handle && <PlayButton media={media} compact label={code} />}
      {media && !media.handle && (
        <span className="text-xs text-amber-300" title={media.fileName}>
          {t('local.pendingRelinkShort')}
        </span>
      )}
      {isFilePickerSupported() && (
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => void onLink()}
          aria-label={t('local.linkFileFor', { episode: code })}
          title={t('local.linkFileFor', { episode: code })}
        >
          {media ? '⇄' : '＋'}
          <span aria-hidden> {t('local.fileShort')}</span>
        </button>
      )}
    </span>
  );
}
