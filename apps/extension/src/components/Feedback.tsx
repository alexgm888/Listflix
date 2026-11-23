import { ApiRequestError } from '@listflix/shared';
import { useTranslation } from 'react-i18next';

export function Spinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-neutral-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-brand" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

export function errorMessageKey(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'network_error') return 'errors.network';
    if (error.status === 429) return 'errors.rateLimited';
    if (error.status === 404) return 'errors.notFound';
  }
  return 'errors.generic';
}

export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-4 text-red-200">
      <p>{t(errorMessageKey(error))}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-3">
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-700 p-10 text-center text-neutral-400">
      <p className="text-lg text-neutral-200">{title}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
