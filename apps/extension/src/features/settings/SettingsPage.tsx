import { ProviderLogo } from '../../components/ProviderLogo';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../app/settings-context';
import { useDocumentTitle } from '../../app/use-document-title';
import { ErrorMessage, Spinner } from '../../components/Feedback';
import { metadataLanguageFor, updateSettings } from '../../db/settings';
import type { MetadataLanguage, UiLanguage } from '../../domain/types';
import { metadataProvider } from '../../lib/api';
import { countryName } from '../../lib/format';
import { toggleInArray } from '../library/filter';
import { AboutSection } from './AboutSection';
import { BackupSection } from '../backup/BackupSection';
import { COUNTRIES } from './countries';

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-neutral-800 p-5">
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MyProviders() {
  const { t } = useTranslation();
  const { country, metadataLanguage, myProviderIds } = useSettings();
  const catalog = useQuery({
    queryKey: ['provider-catalog', country, metadataLanguage],
    queryFn: () => metadataProvider.getProviderCatalog(country, metadataLanguage),
    staleTime: 24 * 60 * 60 * 1000,
  });
  if (catalog.isPending) return <Spinner />;
  if (catalog.isError)
    return <ErrorMessage error={catalog.error} onRetry={() => void catalog.refetch()} />;
  const selected = new Set(myProviderIds);
  return (
    <fieldset>
      <legend className="mb-3 text-sm text-neutral-400">{t('settings.myProvidersHint')}</legend>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.data.slice(0, 60).map((p) => (
          <li key={p.providerId}>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-neutral-800 p-2 hover:bg-neutral-900">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand"
                checked={selected.has(p.providerId)}
                onChange={() =>
                  void updateSettings({ myProviderIds: toggleInArray(myProviderIds, p.providerId) })
                }
              />
              <ProviderLogo path={p.logoPath} className="h-7 w-7" />
              <span className="text-sm">{p.providerName}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  useDocumentTitle(t('settings.title'));
  const countries = [...COUNTRIES].sort((a, b) =>
    countryName(a, i18n.language).localeCompare(countryName(b, i18n.language), i18n.language),
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <Section id="settings-language" title={t('settings.language')}>
        <div className="flex flex-wrap gap-6">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-400">{t('settings.uiLanguage')}</span>
            <select
              className="input"
              value={settings.uiLanguage}
              onChange={(e) => {
                const uiLanguage = e.target.value as UiLanguage;
                // Por comodidad, el idioma de los metadatos sigue al de la interfaz.
                void updateSettings({
                  uiLanguage,
                  metadataLanguage: metadataLanguageFor(uiLanguage),
                });
              }}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-400">{t('settings.metadataLanguage')}</span>
            <select
              className="input"
              value={settings.metadataLanguage}
              onChange={(e) =>
                void updateSettings({ metadataLanguage: e.target.value as MetadataLanguage })
              }
            >
              <option value="es-ES">Español (es-ES)</option>
              <option value="en-US">English (en-US)</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-neutral-400">{t('settings.metadataRefreshNote')}</p>
      </Section>

      <Section id="settings-country" title={t('settings.country')}>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-400">{t('settings.countryHint')}</span>
          <select
            className="input max-w-xs"
            value={settings.country}
            onChange={(e) => void updateSettings({ country: e.target.value })}
          >
            {countries.map((code) => (
              <option key={code} value={code}>
                {countryName(code, i18n.language)}
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Section id="settings-providers" title={t('settings.myProviders')}>
        <MyProviders />
      </Section>

      <Section id="settings-backup" title={t('backup.title')}>
        <BackupSection />
      </Section>

      <Section id="settings-about" title={t('about.title')}>
        <AboutSection />
      </Section>
    </div>
  );
}
