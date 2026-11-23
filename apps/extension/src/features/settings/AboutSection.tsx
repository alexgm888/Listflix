import { useTranslation } from 'react-i18next';
import { browser } from 'wxt/browser';
import { JustWatchAttribution, TmdbAttribution } from '../../components/TmdbAttribution';

export function AboutSection() {
  const { t } = useTranslation();
  const version = browser.runtime?.getManifest?.().version ?? '';
  return (
    <div className="flex flex-col gap-3 text-sm text-neutral-300">
      <p>
        <strong className="text-brand">Listflix</strong> {version && `v${version}`} —{' '}
        {t('about.description')}
      </p>
      <p>{t('about.privacy')}</p>
      <TmdbAttribution />
      <JustWatchAttribution />
      <p className="text-xs text-neutral-500">{t('about.trademarks')}</p>
    </div>
  );
}
