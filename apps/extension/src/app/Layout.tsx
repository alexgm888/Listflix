import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import { TmdbAttribution } from '../components/TmdbAttribution';
import { useBackgroundSync } from './background-sync';

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-neutral-800 text-white' : 'text-neutral-300 hover:text-white'
  }`;
}

function HeaderSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const currentQuery = location.pathname === '/search' ? (params.get('q') ?? '') : '';
  const [value, setValue] = useState(currentQuery);

  useEffect(() => setValue(currentQuery), [currentQuery]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="order-last flex w-full justify-end md:order-none md:w-auto md:flex-1"
    >
      <label htmlFor="global-search" className="sr-only">
        {t('search.label')}
      </label>
      <input
        id="global-search"
        type="search"
        className="input w-full md:max-w-sm"
        placeholder={t('search.placeholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </form>
  );
}

export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const firstRender = useRef(true);
  useBackgroundSync();

  // Al navegar, lleva el foco al contenido principal (lectores de pantalla y teclado).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-neutral-800 focus:px-3 focus:py-2"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t('nav.skipToContent')}
      </a>
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" className="text-2xl font-black tracking-tight text-brand">
            Listflix
          </Link>
          <nav
            aria-label={t('nav.main')}
            className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto"
          >
            <NavLink to="/" end className={navClass}>
              {t('nav.library')}
            </NavLink>
            <NavLink to="/lists" className={navClass}>
              {t('nav.lists')}
            </NavLink>
            <NavLink to="/link" className={navClass}>
              {t('nav.linkFile')}
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              {t('nav.settings')}
            </NavLink>
          </nav>
          <HeaderSearch />
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 outline-none"
      >
        <Outlet />
      </main>
      <footer className="border-t border-neutral-800 px-4 py-4">
        <div className="mx-auto max-w-screen-2xl">
          <TmdbAttribution compact />
        </div>
      </footer>
    </div>
  );
}
