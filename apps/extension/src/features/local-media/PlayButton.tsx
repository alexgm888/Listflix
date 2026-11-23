import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getProgress } from '../../db/local-media';
import type { LocalMedia } from '../../domain/types';
import { formatDuration } from '../../lib/format';
import { openPlayer } from '../../local-media/play';
import { WATCHED_THRESHOLD } from '../library/continue-watching';

interface Props {
  media: LocalMedia;
  compact?: boolean;
  /** Texto accesible adicional (p. ej. el episodio). */
  label?: string;
}

/** Botón "Reproducir" / "Continuar desde…". Pide el permiso de lectura dentro del clic. */
export function PlayButton({ media, compact, label }: Props) {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const progress = useLiveQuery(() => getProgress(media.id), [media.id]);
  const resumable =
    progress &&
    progress.positionSec > 5 &&
    progress.positionSec < progress.durationSec * WATCHED_THRESHOLD;

  const onClick = async () => {
    setMessage(null);
    const result = await openPlayer(media);
    if (result === 'needs-relink') setMessage(t('local.needsRelink'));
    if (result === 'denied') setMessage(t('local.permissionDenied'));
  };

  const text = resumable
    ? t('local.resumeFrom', { time: formatDuration(progress.positionSec) })
    : t('local.play');

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={compact ? 'btn-ghost text-brand-strong' : 'btn-primary'}
        onClick={() => void onClick()}
        aria-label={label ? `${text}: ${label}` : undefined}
        title={compact ? text : undefined}
      >
        ▶ {compact ? <span className="sr-only">{text}</span> : text}
      </button>
      {message && (
        <span role="alert" className="mt-1 text-xs text-red-300">
          {message}
        </span>
      )}
    </span>
  );
}
