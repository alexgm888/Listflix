import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  backupFileName,
  createBackup,
  importBackup,
  parseBackup,
  type BackupFile,
  type ImportMode,
} from '../../backup/backup';

export function BackupSection() {
  const { t, i18n } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    const backup = await createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ kind: 'ok', text: t('backup.exported', { count: backup.items.length }) });
  };

  const onFile = async (file: File | undefined) => {
    setMessage(null);
    setPending(null);
    if (!file) return;
    const result = parseBackup(await file.text());
    if (!result.ok) {
      setMessage({ kind: 'error', text: t(`backup.error_${result.error}`) });
      return;
    }
    setPending(result.backup);
  };

  const onImport = async () => {
    if (!pending) return;
    if (mode === 'replace' && !window.confirm(t('backup.replaceConfirm'))) return;
    setBusy(true);
    try {
      const summary = await importBackup(pending, mode);
      setMessage({
        kind: 'ok',
        text: t('backup.imported', { items: summary.items, files: summary.localMedia }),
      });
      setPending(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch {
      setMessage({ kind: 'error', text: t('errors.generic') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-neutral-400">{t('backup.intro')}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" onClick={() => void onExport()}>
          {t('backup.export')}
        </button>
        <label className="btn-secondary cursor-pointer">
          {t('backup.import')}
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
      </div>

      {pending && (
        <div className="flex flex-col gap-3 rounded-md bg-neutral-900 p-4">
          <p>
            {t('backup.fileSummary', {
              items: pending.items.length,
              lists: pending.lists.length,
              date: new Intl.DateTimeFormat(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(pending.exportedAt)),
            })}
          </p>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-neutral-400">{t('backup.mode')}</legend>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="import-mode"
                className="mt-1 accent-brand"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
              />
              <span>
                <strong>{t('backup.merge')}</strong> — {t('backup.mergeHint')}
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="import-mode"
                className="mt-1 accent-brand"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              <span>
                <strong>{t('backup.replace')}</strong> — {t('backup.replaceHint')}
              </span>
            </label>
          </fieldset>
          <div className="flex gap-2">
            <button
              type="button"
              className={mode === 'replace' ? 'btn-danger' : 'btn-primary'}
              disabled={busy}
              onClick={() => void onImport()}
            >
              {t('backup.confirmImport')}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPending(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={message.kind === 'error' ? 'text-red-300' : 'text-emerald-300'}
        >
          {message.text}
        </p>
      )}
      <p className="text-xs text-neutral-500">{t('backup.filesNote')}</p>
    </div>
  );
}
