import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useLibraryKeys } from '../../app/hooks';
import { useSettings } from '../../app/settings-context';
import { EmptyState, ErrorMessage, Spinner } from '../../components/Feedback';
import { Poster } from '../../components/Poster';
import { itemKeyOf, type MediaType } from '../../domain/types';
import { metadataProvider } from '../../lib/api';
import { isFilePickerSupported } from '../../local-media/file-access';
import { findCandidates, rankCandidates } from '../../local-media/match';
import { parseFilename, type ParsedFilename } from '../../local-media/parse-filename';
import type { SearchResult } from '../../providers/metadata/types';
import { addToLibrary } from '../search/add-to-library';
import { CompatibilityNotice } from './CompatibilityNotice';
import { linkPicked, pickVideo, type PickedFile } from './link-actions';

interface Query {
  title: string;
  year?: number;
  type: MediaType | 'auto';
}

/**
 * Flujo de vinculación: elegir archivo → analizar el nombre → proponer fichas de TMDB →
 * confirmar (y elegir episodio si es una serie).
 */
export function LinkFilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { metadataLanguage, country } = useSettings();
  const savedKeys = useLibraryKeys();
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [parsed, setParsed] = useState<ParsedFilename | null>(null);
  const [query, setQuery] = useState<Query | null>(null);
  const [draft, setDraft] = useState<Query>({ title: '', type: 'auto' });
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [saving, setSaving] = useState(false);

  const candidates = useQuery({
    queryKey: ['link-candidates', query, metadataLanguage],
    enabled: !!query && !!parsed,
    queryFn: async () => {
      const q = query!;
      const p: ParsedFilename = { ...parsed!, title: q.title, year: q.year };
      if (q.type === 'auto') return findCandidates(p, metadataProvider, metadataLanguage);
      const results = await metadataProvider.searchByType(q.type, q.title, {
        language: metadataLanguage,
        year: q.year,
      });
      return rankCandidates(p, results);
    },
  });

  if (!isFilePickerSupported()) {
    return <EmptyState title={t('local.unsupportedBrowser')} />;
  }

  const onPick = async () => {
    const file = await pickVideo();
    if (!file) return;
    const p = parseFilename(file.fileName);
    setPicked(file);
    setParsed(p);
    setSelected(null);
    setSeason(p.season ?? 1);
    setEpisode(p.episode ?? 1);
    const q: Query = { title: p.title, year: p.year, type: 'auto' };
    setDraft(q);
    setQuery(q);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setSelected(null);
    setQuery({ ...draft, title: draft.title.trim() });
  };

  const onConfirm = async () => {
    if (!picked || !selected) return;
    setSaving(true);
    try {
      const key = itemKeyOf(selected.mediaType, selected.tmdbId);
      if (!savedKeys.has(key)) {
        await addToLibrary(
          selected,
          'pending',
          { language: metadataLanguage, country },
          metadataProvider,
        );
      }
      await linkPicked(picked, key, selected.mediaType === 'tv' ? { season, episode } : undefined);
      navigate(`/title/${selected.mediaType}/${selected.tmdbId}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="link-title" className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 id="link-title" className="text-2xl font-bold">
          {t('local.linkPageTitle')}
        </h1>
        <p className="mt-1 text-neutral-400">{t('local.linkPageIntro')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={() => void onPick()}>
          {picked ? t('local.chooseAnother') : t('local.chooseVideo')}
        </button>
        {picked && <span className="font-mono text-sm">{picked.fileName}</span>}
      </div>

      {picked && parsed && (
        <>
          <CompatibilityNotice fileName={picked.fileName} />
          <form
            onSubmit={onSearch}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-800 p-4"
          >
            <p className="w-full text-sm text-neutral-400">{t('local.detected')}</p>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-neutral-400">{t('local.searchTitle')}</span>
              <input
                className="input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-400">{t('local.year')}</span>
              <input
                type="number"
                className="input w-24"
                value={draft.year ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, year: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-400">{t('filters.type')}</span>
              <select
                className="input"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as Query['type'] })}
              >
                <option value="auto">{t('local.typeAuto')}</option>
                <option value="movie">{t('mediaType.movie')}</option>
                <option value="tv">{t('mediaType.tv')}</option>
              </select>
            </label>
            <button type="submit" className="btn-secondary">
              {t('local.searchAgain')}
            </button>
          </form>

          {candidates.isPending && query && <Spinner />}
          {candidates.isError && (
            <ErrorMessage error={candidates.error} onRetry={() => void candidates.refetch()} />
          )}
          {candidates.isSuccess && candidates.data.length === 0 && (
            <EmptyState title={t('search.noResults')}>{t('local.noCandidates')}</EmptyState>
          )}
          {candidates.isSuccess && candidates.data.length > 0 && (
            <fieldset>
              <legend className="section-title">{t('local.chooseMatch')}</legend>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {candidates.data.map((c, index) => {
                  const isSelected =
                    selected?.tmdbId === c.tmdbId && selected.mediaType === c.mediaType;
                  return (
                    <li key={`${c.mediaType}-${c.tmdbId}`}>
                      <label
                        className={`block cursor-pointer rounded-md p-2 ${
                          isSelected ? 'bg-brand/20 ring-2 ring-brand' : 'hover:bg-neutral-900'
                        }`}
                      >
                        <input
                          type="radio"
                          name="candidate"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => setSelected(c)}
                        />
                        <Poster path={c.posterPath} title={c.title} size="w185" />
                        <p className="mt-2 text-sm font-medium leading-tight">
                          {c.title}
                          {c.year ? ` (${c.year})` : ''}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {t(`mediaType.${c.mediaType}`)}
                          {index === 0 && ` · ${t('local.bestMatch')}`}
                        </p>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}

          {selected && (
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-800 p-4">
              <p className="w-full">
                {t('local.willLink', { title: selected.title })}
                {!savedKeys.has(itemKeyOf(selected.mediaType, selected.tmdbId)) &&
                  ` ${t('local.willAdd')}`}
              </p>
              {selected.mediaType === 'tv' && (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-neutral-400">{t('local.seasonNumber')}</span>
                    <input
                      type="number"
                      min={1}
                      className="input w-24"
                      value={season}
                      onChange={(e) => setSeason(Math.max(1, Number(e.target.value)))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-neutral-400">{t('local.episodeNumber')}</span>
                    <input
                      type="number"
                      min={1}
                      className="input w-24"
                      value={episode}
                      onChange={(e) => setEpisode(Math.max(1, Number(e.target.value)))}
                    />
                  </label>
                </>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={() => void onConfirm()}
                disabled={saving}
              >
                {t('local.confirmLink')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
