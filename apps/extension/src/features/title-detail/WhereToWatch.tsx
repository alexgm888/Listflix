import { ProviderLogo } from '../../components/ProviderLogo';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useSettings } from '../../app/settings-context';
import { ErrorMessage, Spinner } from '../../components/Feedback';
import { JustWatchAttribution } from '../../components/TmdbAttribution';
import { WATCH_PROVIDER_TYPES } from '../../domain/types';
import { countryName } from '../../lib/format';
import { liveWatchLinkProvider, savedWatchLinkProvider } from '../../lib/watch-links';
import type { WatchLinkItem } from '../../providers/watch-links/types';

export function WhereToWatch({ item, saved }: { item: WatchLinkItem; saved: boolean }) {
  const { t, i18n } = useTranslation();
  const { country, myProviderIds } = useSettings();
  const links = useQuery({
    queryKey: ['watch-links', item.key, country, saved, item.title],
    queryFn: () => (saved ? savedWatchLinkProvider : liveWatchLinkProvider).getLinks(item, country),
    staleTime: 60 * 60 * 1000,
  });
  const mine = new Set(myProviderIds);

  return (
    <section aria-labelledby="where-title">
      <h2 id="where-title" className="section-title">
        {t('watch.title', { country: countryName(country, i18n.language) })}
      </h2>
      {links.isPending && <Spinner />}
      {links.isError && <ErrorMessage error={links.error} onRetry={() => void links.refetch()} />}
      {links.isSuccess && links.data.length === 0 && (
        <p className="text-neutral-400">
          {t('watch.none')}{' '}
          <Link to="/settings" className="underline">
            {t('watch.changeCountry')}
          </Link>
        </p>
      )}
      {links.isSuccess && links.data.length > 0 && (
        <div className="flex flex-col gap-4">
          {WATCH_PROVIDER_TYPES.map((type) => {
            const group = links.data
              .filter((l) => l.type === type)
              .sort((a, b) => Number(mine.has(b.providerId)) - Number(mine.has(a.providerId)));
            if (group.length === 0) return null;
            return (
              <div key={type}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {t(`watch.type_${type}`)}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {group.map((link) => {
                    const subscribed = mine.has(link.providerId);
                    return (
                      <li key={`${type}-${link.providerId}`}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition hover:bg-neutral-800 ${
                            subscribed ? 'border-brand bg-brand/10' : 'border-neutral-700'
                          }`}
                        >
                          <ProviderLogo path={link.logoPath} />
                          <span>{t('watch.watchOn', { provider: link.providerName })}</span>
                          {subscribed && (
                            <span className="rounded bg-brand px-1.5 text-xs text-white">
                              {t('watch.subscribed')}
                            </span>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <p className="text-xs text-neutral-400">{t('watch.searchNotice')}</p>
        </div>
      )}
      <div className="mt-3">
        <JustWatchAttribution />
      </div>
    </section>
  );
}
