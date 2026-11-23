import { useTranslation } from 'react-i18next';

/**
 * Atribución obligatoria a TMDB. Debe ser menos prominente que la marca de Listflix.
 * TODO(publicación): sustituir el texto "TMDB" por el logo oficial descargado de
 * https://www.themoviedb.org/about/logos-attribution (public/tmdb-logo.svg).
 */
export function TmdbAttribution({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <p className={`flex items-center gap-2 text-neutral-500 ${compact ? 'text-xs' : 'text-sm'}`}>
      <a
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noreferrer"
        className="rounded bg-gradient-to-r from-[#90cea1] to-[#01b4e4] bg-clip-text font-bold text-transparent"
      >
        TMDB
      </a>
      <span>{t('about.tmdbNotice')}</span>
    </p>
  );
}

export function JustWatchAttribution() {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-neutral-500">
      {t('watch.justwatch')}{' '}
      <a
        href="https://www.justwatch.com"
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-neutral-300"
      >
        JustWatch
      </a>
    </p>
  );
}
