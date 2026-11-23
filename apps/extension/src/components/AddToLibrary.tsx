import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../app/settings-context';
import { WATCH_STATUSES, type WatchStatus } from '../domain/types';
import { addToLibrary } from '../features/search/add-to-library';
import { metadataProvider } from '../lib/api';
import type { SearchResult, TitleDetails } from '../providers/metadata/types';

interface Props {
  input: SearchResult | TitleDetails;
  saved: boolean;
  compact?: boolean;
}

/** Botón "Añadir" con selector del estado inicial (por defecto, Pendiente). */
export function AddToLibrary({ input, saved, compact }: Props) {
  const { t } = useTranslation();
  const { metadataLanguage } = useSettings();
  const [status, setStatus] = useState<WatchStatus>('pending');
  const [busy, setBusy] = useState(false);

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-900/60 px-2 py-1 text-xs font-medium text-emerald-200">
        ✓ {t('search.inLibrary')}
      </span>
    );
  }

  const onAdd = async () => {
    setBusy(true);
    try {
      await addToLibrary(input, status, metadataLanguage, metadataProvider);
    } finally {
      setBusy(false);
    }
  };

  const selectId = `status-${input.mediaType}-${input.tmdbId}`;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={compact ? 'btn-primary px-2 py-1 text-xs' : 'btn-primary'}
        onClick={() => void onAdd()}
        disabled={busy}
        aria-label={t('search.addTitle', { title: input.title })}
      >
        + {t('search.add')}
      </button>
      <label htmlFor={selectId} className="sr-only">
        {t('search.initialStatus')}
      </label>
      <select
        id={selectId}
        className={`input ${compact ? 'px-1 py-1 text-xs' : ''}`}
        value={status}
        onChange={(e) => setStatus(e.target.value as WatchStatus)}
      >
        {WATCH_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
