import { useTranslation } from 'react-i18next';
import { WATCH_STATUSES, type WatchStatus } from '../domain/types';

interface StatusSelectProps {
  value: WatchStatus;
  onChange: (status: WatchStatus) => void;
  id?: string;
  label?: string;
  /** Si se indica, añade la opción "Automático" (series). */
  onAutomatic?: () => void;
  isManual?: boolean;
}

const AUTO = '__auto__';

export function StatusSelect({
  value,
  onChange,
  id,
  label,
  onAutomatic,
  isManual,
}: StatusSelectProps) {
  const { t } = useTranslation();
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-neutral-400">{label}</span>}
      <select
        id={id}
        className="input"
        value={onAutomatic && !isManual ? AUTO : value}
        onChange={(e) => {
          if (e.target.value === AUTO) onAutomatic?.();
          else onChange(e.target.value as WatchStatus);
        }}
      >
        {onAutomatic && (
          <option value={AUTO}>{t('status.automatic', { status: t(`status.${value}`) })}</option>
        )}
        {WATCH_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

const STATUS_COLORS: Record<WatchStatus, string> = {
  pending: 'bg-neutral-700 text-neutral-100',
  watching: 'bg-sky-700 text-white',
  watched: 'bg-emerald-700 text-white',
  dropped: 'bg-neutral-800 text-neutral-400',
};

export function StatusBadge({ status }: { status: WatchStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {t(`status.${status}`)}
    </span>
  );
}
