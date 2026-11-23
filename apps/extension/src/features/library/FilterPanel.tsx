import { useTranslation } from 'react-i18next';
import { useGenres } from '../../app/hooks';
import {
  WATCH_STATUSES,
  type LibraryItem,
  type ProviderInfo,
  type UserList,
  type WatchProvidersByType,
} from '../../domain/types';
import { tmdbImage } from '../../lib/images';
import { DEFAULT_FILTERS, toggleInArray, type LibraryFilters } from './filter';

interface Props {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  items: LibraryItem[];
  providersByKey: Map<string, WatchProvidersByType>;
  lists: UserList[];
  myProviderIds: number[];
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

/** Plataformas presentes en la biblioteca (suscripción, gratis o anuncios), las del usuario primero. */
export function libraryProviders(
  providersByKey: Map<string, WatchProvidersByType>,
  myProviderIds: number[],
): ProviderInfo[] {
  const byId = new Map<number, ProviderInfo>();
  for (const data of providersByKey.values()) {
    for (const p of [...data.flatrate, ...data.free, ...data.ads]) {
      if (!byId.has(p.providerId)) byId.set(p.providerId, p);
    }
  }
  const mine = new Set(myProviderIds);
  return [...byId.values()].sort(
    (a, b) =>
      Number(mine.has(b.providerId)) - Number(mine.has(a.providerId)) ||
      (a.displayPriority ?? 999) - (b.displayPriority ?? 999) ||
      a.providerName.localeCompare(b.providerName),
  );
}

export function FilterPanel({
  filters,
  onChange,
  items,
  providersByKey,
  lists,
  myProviderIds,
}: Props) {
  const { t } = useTranslation();
  const genres = useGenres();
  const set = (patch: Partial<LibraryFilters>) => onChange({ ...filters, ...patch });

  const genreIds = [...new Set(items.flatMap((i) => i.genreIds))]
    .filter((id) => genres.has(id))
    .sort((a, b) => genres.get(a)!.name.localeCompare(genres.get(b)!.name));
  const providers = libraryProviders(providersByKey, myProviderIds);
  const mine = new Set(myProviderIds);
  const myAvailable = providers.filter((p) => mine.has(p.providerId)).map((p) => p.providerId);

  return (
    <div className="flex flex-col gap-6">
      <Group title={t('filters.type')}>
        {(['all', 'movie', 'tv'] as const).map((type) => (
          <Chip
            key={type}
            pressed={filters.mediaType === type}
            onClick={() => set({ mediaType: type })}
          >
            {type === 'all' ? t('filters.all') : t(`mediaType.${type}`)}
          </Chip>
        ))}
      </Group>

      <Group title={t('filters.status')}>
        {WATCH_STATUSES.map((s) => (
          <Chip
            key={s}
            pressed={filters.statuses.includes(s)}
            onClick={() => set({ statuses: toggleInArray(filters.statuses, s) })}
          >
            {t(`status.${s}`)}
          </Chip>
        ))}
      </Group>

      {providers.length > 0 && (
        <Group title={t('filters.platform')}>
          {myAvailable.length > 0 && (
            <Chip
              pressed={
                myAvailable.length > 0 &&
                myAvailable.every((id) => filters.providerIds.includes(id)) &&
                filters.providerIds.length === myAvailable.length
              }
              onClick={() => set({ providerIds: myAvailable })}
            >
              {t('filters.myPlatforms')}
            </Chip>
          )}
          {providers.map((p) => (
            <Chip
              key={p.providerId}
              pressed={filters.providerIds.includes(p.providerId)}
              onClick={() => set({ providerIds: toggleInArray(filters.providerIds, p.providerId) })}
            >
              {p.logoPath && (
                <img src={tmdbImage(p.logoPath, 'w45')} alt="" className="h-4 w-4 rounded-sm" />
              )}
              {p.providerName}
              {mine.has(p.providerId) && <span aria-label={t('filters.subscribed')}>★</span>}
            </Chip>
          ))}
        </Group>
      )}

      <Group title={t('filters.local')}>
        <Chip pressed={filters.localOnly} onClick={() => set({ localOnly: !filters.localOnly })}>
          {t('filters.localOnly')}
        </Chip>
      </Group>

      {lists.length > 0 && (
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {t('filters.list')}
          </span>
          <select
            className="input"
            value={filters.listId ?? ''}
            onChange={(e) => set({ listId: e.target.value || undefined })}
          >
            <option value="">{t('filters.allLists')}</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {genreIds.length > 0 && (
        <Group title={t('filters.genre')}>
          {genreIds.map((id) => (
            <Chip
              key={id}
              pressed={filters.genreIds.includes(id)}
              onClick={() => set({ genreIds: toggleInArray(filters.genreIds, id) })}
            >
              {genres.get(id)!.name}
            </Chip>
          ))}
        </Group>
      )}

      <button
        type="button"
        className="btn-ghost self-start"
        onClick={() =>
          onChange({ ...DEFAULT_FILTERS, sort: filters.sort, direction: filters.direction })
        }
      >
        {t('filters.clear')}
      </button>
    </div>
  );
}
