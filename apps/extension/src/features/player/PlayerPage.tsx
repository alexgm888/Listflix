import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { browser } from 'wxt/browser';
import { useSettings } from '../../app/settings-context';
import { db } from '../../db/db';
import { setEpisodesWatched } from '../../db/episodes';
import { markMovieWatched, markPlaybackStarted, touchItemWatched } from '../../db/library';
import { addSubtitleToMedia, getProgress, saveProgress } from '../../db/local-media';
import { updateSettings } from '../../db/settings';
import type { EpisodeState, LibraryItem, LocalMedia, SubtitleRef } from '../../domain/types';
import {
  checkCompatibility,
  ensureReadPermission,
  FileGoneError,
  pickSubtitleFile,
  readLinkedFile,
  type Compatibility,
} from '../../local-media/file-access';
import { findNextLocalEpisode } from '../../local-media/next-episode';
import { playerUrl } from '../../local-media/play';
import { formatDuration } from '../../lib/format';
import { parseCues, type SubtitleCue } from '../../subtitles/convert';
import { decodeSubtitleBytes } from '../../subtitles/decode';
import { applyCuesToTrack, guessSubtitleLanguage } from '../../subtitles/track';
import { WATCHED_THRESHOLD } from '../library/continue-watching';

const SAVE_INTERVAL_MS = 5000;
const OFFSET_STEP = 0.5;

type Phase =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'needs-relink' }
  | { kind: 'needs-permission' }
  | { kind: 'gone' }
  | { kind: 'ready'; url: string; compatibility: Compatibility };

interface LoadedSubtitle {
  id: string;
  label: string;
  cues: SubtitleCue[];
  track: TextTrack;
}

interface Context {
  media: LocalMedia;
  item?: LibraryItem;
  episode?: EpisodeState;
}

function titlePagePath(ctx: Context): string {
  const [type, id] = ctx.media.itemKey.split(':');
  const hash = ctx.media.episodeKey ? '#episodes' : '';
  return browser.runtime.getURL(`/library.html#/title/${type}/${id}${hash}`);
}

export function PlayerPage() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const mediaId = new URLSearchParams(window.location.search).get('media') ?? '';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [videoError, setVideoError] = useState(false);
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  const [subtitles, setSubtitles] = useState<LoadedSubtitle[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [pendingSubtitles, setPendingSubtitles] = useState<SubtitleRef[]>([]);
  const [nextMedia, setNextMedia] = useState<LocalMedia | undefined>();
  const markedWatched = useRef(false);
  const startedRef = useRef(false);

  // 1. Carga el registro y comprueba el permiso (sin pedirlo: aquí no hay gesto).
  const load = useCallback(
    async (requestPermission: boolean) => {
      const media = await db.localMedia.get(mediaId);
      if (!media) return setPhase({ kind: 'not-found' });
      const item = await db.items.get(media.itemKey);
      const episode = media.episodeKey ? await db.episodes.get(media.episodeKey) : undefined;
      setCtx({ media, item, episode });
      setNextMedia(await findNextLocalEpisode(media));
      if (!media.handle) return setPhase({ kind: 'needs-relink' });
      if (!(await ensureReadPermission(media.handle, requestPermission))) {
        return setPhase({ kind: 'needs-permission' });
      }
      try {
        const file = await readLinkedFile(media.handle);
        const compatibility = checkCompatibility(media.fileName, (mime) =>
          document.createElement('video').canPlayType(mime),
        );
        setPhase({ kind: 'ready', url: URL.createObjectURL(file), compatibility });
      } catch (err) {
        if (err instanceof FileGoneError) setPhase({ kind: 'gone' });
        else throw err;
      }
    },
    [mediaId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // Revoca la URL del archivo al salir o al cambiar de vídeo.
  useEffect(() => {
    if (phase.kind !== 'ready') return;
    const url = phase.url;
    return () => URL.revokeObjectURL(url);
  }, [phase]);

  useEffect(() => {
    if (!ctx) return;
    const name = ctx.item?.title ?? ctx.media.fileName;
    const ep = ctx.episode
      ? ` · ${t('episodes.code', { season: ctx.episode.season, episode: ctx.episode.episode })}`
      : '';
    document.title = `${name}${ep} — Listflix`;
  }, [ctx, t]);

  // 2. Guardado del progreso: cada ~5 s mientras se reproduce, al pausar y al cerrar.
  const persistProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !ctx || !Number.isFinite(video.duration) || video.duration <= 0) return;
    void saveProgress(ctx.media.id, video.currentTime, video.duration);
  }, [ctx]);

  useEffect(() => {
    if (phase.kind !== 'ready') return;
    const interval = window.setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) persistProgress();
    }, SAVE_INTERVAL_MS);
    const onHide = () => persistProgress();
    const onVisibility = () => document.visibilityState === 'hidden' && persistProgress();
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase.kind, persistProgress]);

  // 3. Subtítulos guardados: se cargan solos si el permiso sigue concedido.
  const loadSubtitle = useCallback(
    async (ref: SubtitleRef, requestPermission: boolean): Promise<boolean> => {
      const video = videoRef.current;
      if (!video) return false;
      if (!(await ensureReadPermission(ref.handle, requestPermission))) return false;
      try {
        const file = await ref.handle.getFile();
        const text = decodeSubtitleBytes(await file.arrayBuffer());
        const cues = parseCues(text);
        const track = video.addTextTrack('subtitles', ref.label, ref.lang ?? '');
        const id = `${ref.label}-${Date.now()}`;
        setSubtitles((prev) => {
          for (const s of prev) s.track.mode = 'disabled';
          return [
            ...prev.filter((s) => s.label !== ref.label),
            { id, label: ref.label, cues, track },
          ];
        });
        applyCuesToTrack(track, cues, offset);
        track.mode = 'showing';
        setActiveSubtitle(id);
        return true;
      } catch {
        return false;
      }
    },
    [offset],
  );

  const onLoadedMetadata = async () => {
    const video = videoRef.current;
    if (!video || !ctx) return;
    const progress = await getProgress(ctx.media.id);
    if (
      progress &&
      progress.positionSec > 5 &&
      progress.positionSec < video.duration * WATCHED_THRESHOLD
    ) {
      video.currentTime = progress.positionSec;
      setResumedAt(progress.positionSec);
    }
    const pending: SubtitleRef[] = [];
    for (const ref of ctx.media.subtitleHandles ?? []) {
      if (!(await loadSubtitle(ref, false))) pending.push(ref);
    }
    setPendingSubtitles(pending);
  };

  const onPlay = () => {
    if (!ctx || startedRef.current) return;
    startedRef.current = true;
    void markPlaybackStarted(ctx.media.itemKey);
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !ctx || markedWatched.current || !video.duration) return;
    if (video.currentTime / video.duration >= WATCHED_THRESHOLD) {
      markedWatched.current = true;
      persistProgress();
      if (ctx.media.episodeKey) {
        void setEpisodesWatched(ctx.media.itemKey, [ctx.media.episodeKey], true);
        void touchItemWatched(ctx.media.itemKey);
      } else {
        void markMovieWatched(ctx.media.itemKey);
      }
    }
  };

  // 4. Controles de subtítulos.
  const onPickSubtitle = async () => {
    if (!ctx) return;
    const handle = await pickSubtitleFile(t('player.subtitleFiles'));
    if (!handle) return;
    const ref: SubtitleRef = {
      handle,
      label: handle.name,
      lang: guessSubtitleLanguage(handle.name),
    };
    if (await loadSubtitle(ref, true)) await addSubtitleToMedia(ctx.media.id, ref);
  };

  const selectSubtitle = (id: string | null) => {
    for (const s of subtitles) s.track.mode = s.id === id ? 'showing' : 'disabled';
    setActiveSubtitle(id);
  };

  const changeOffset = (delta: number) => {
    const next = Math.round((offset + delta) * 10) / 10;
    setOffset(next);
    for (const s of subtitles) applyCuesToTrack(s.track, s.cues, next);
  };

  const goNext = async () => {
    if (!nextMedia?.handle) return;
    persistProgress();
    // El clic es un gesto del usuario: se puede pedir el permiso del siguiente archivo.
    await ensureReadPermission(nextMedia.handle, true);
    window.location.href = playerUrl(nextMedia.id);
  };

  const style = settings.subtitleStyle ?? { scale: 1, backgroundOpacity: 0.6 };
  const setStyle = (patch: Partial<typeof style>) =>
    void updateSettings({ subtitleStyle: { ...style, ...patch } });

  const heading = ctx ? (
    <div className="min-w-0">
      <p className="truncate font-semibold">{ctx.item?.title ?? ctx.media.fileName}</p>
      {ctx.episode && (
        <p className="truncate text-sm text-neutral-400">
          {t('episodes.code', { season: ctx.episode.season, episode: ctx.episode.episode })}
          {ctx.episode.name && ` · ${ctx.episode.name}`}
        </p>
      )}
    </div>
  ) : null;

  return (
    <div className="flex h-screen flex-col bg-black">
      <style>{`video::cue { font-size: ${Math.round(style.scale * 100)}%; background-color: rgba(0,0,0,${style.backgroundOpacity}); }`}</style>
      <header className="flex items-center gap-4 px-4 py-2">
        {ctx && (
          <a href={titlePagePath(ctx)} className="btn-ghost shrink-0" onClick={persistProgress}>
            ← {t('player.backToTitle')}
          </a>
        )}
        {heading}
        {nextMedia && phase.kind === 'ready' && (
          <button
            type="button"
            className="btn-primary ml-auto shrink-0"
            onClick={() => void goNext()}
          >
            {t('player.nextEpisode')} ⏭
          </button>
        )}
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center">
        {phase.kind === 'loading' && <p className="text-neutral-400">{t('common.loading')}</p>}
        {phase.kind === 'not-found' && <Notice title={t('player.notFound')} />}
        {phase.kind === 'needs-relink' && ctx && (
          <Notice title={t('player.needsRelink', { file: ctx.media.fileName })}>
            <a href={titlePagePath(ctx)} className="btn-primary">
              {t('player.goRelink')}
            </a>
          </Notice>
        )}
        {phase.kind === 'gone' && ctx && (
          <Notice title={t('player.fileGone', { file: ctx.media.fileName })}>
            <a href={titlePagePath(ctx)} className="btn-primary">
              {t('player.goRelink')}
            </a>
          </Notice>
        )}
        {phase.kind === 'needs-permission' && (
          <Notice title={t('player.permissionNeeded')}>
            <button type="button" className="btn-primary" onClick={() => void load(true)}>
              {t('player.grantAccess')}
            </button>
          </Notice>
        )}
        {phase.kind === 'ready' && (
          <>
            {/* Los subtítulos se añaden con addTextTrack (no hay <track>). */}
            <video
              ref={videoRef}
              src={phase.url}
              controls
              autoPlay
              className="max-h-full w-full"
              onLoadedMetadata={() => void onLoadedMetadata()}
              onPlay={onPlay}
              onPause={persistProgress}
              onTimeUpdate={onTimeUpdate}
              onEnded={persistProgress}
              onError={() => setVideoError(true)}
            />
            {(videoError || phase.compatibility !== 'supported') && (
              <div
                role={videoError ? 'alert' : 'status'}
                className={`absolute inset-x-4 top-4 rounded-md p-3 text-sm ${
                  videoError ? 'bg-red-950/90 text-red-100' : 'bg-amber-950/90 text-amber-100'
                }`}
              >
                {videoError
                  ? t('player.unsupported')
                  : phase.compatibility === 'unsupported'
                    ? t('player.unsupported')
                    : t('player.mayNotPlay')}
              </div>
            )}
            {resumedAt !== null && (
              <div className="absolute bottom-24 left-4 flex items-center gap-3 rounded-md bg-neutral-900/90 px-3 py-2 text-sm">
                {t('player.resumedAt', { time: formatDuration(resumedAt) })}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = 0;
                    setResumedAt(null);
                  }}
                >
                  {t('player.startOver')}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  aria-label={t('common.close')}
                  onClick={() => setResumedAt(null)}
                >
                  ✕
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {phase.kind === 'ready' && (
        <footer
          aria-label={t('player.subtitles')}
          className="flex flex-wrap items-center gap-3 border-t border-neutral-900 px-4 py-2 text-sm"
        >
          <span className="font-medium text-neutral-300">{t('player.subtitles')}</span>
          <button type="button" className="btn-secondary" onClick={() => void onPickSubtitle()}>
            {t('player.loadSubtitles')}
          </button>
          {pendingSubtitles.map((ref) => (
            <button
              key={ref.label}
              type="button"
              className="btn-ghost"
              onClick={() =>
                void loadSubtitle(ref, true).then(
                  (ok) => ok && setPendingSubtitles((p) => p.filter((r) => r !== ref)),
                )
              }
            >
              {t('player.loadSaved', { name: ref.label })}
            </button>
          ))}
          {subtitles.length > 0 && (
            <>
              <label className="flex items-center gap-2">
                <span className="sr-only">{t('player.track')}</span>
                <select
                  className="input py-1"
                  value={activeSubtitle ?? ''}
                  onChange={(e) => selectSubtitle(e.target.value || null)}
                >
                  <option value="">{t('player.off')}</option>
                  {subtitles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1" role="group" aria-label={t('player.offset')}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => changeOffset(-OFFSET_STEP)}
                  aria-label={t('player.earlier')}
                >
                  −{t('player.halfSecond')}
                </button>
                <span className="w-20 text-center tabular-nums" aria-live="polite">
                  {t('player.offsetValue', {
                    value: new Intl.NumberFormat(i18n.language, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                      signDisplay: 'exceptZero',
                    }).format(offset),
                  })}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => changeOffset(OFFSET_STEP)}
                  aria-label={t('player.later')}
                >
                  +{t('player.halfSecond')}
                </button>
              </div>
            </>
          )}
          <label className="ml-auto flex items-center gap-2">
            <span className="text-neutral-400">{t('player.size')}</span>
            <select
              className="input py-1"
              value={String(style.scale)}
              onChange={(e) => setStyle({ scale: Number(e.target.value) })}
            >
              {[0.75, 1, 1.25, 1.5, 2].map((v) => (
                <option key={v} value={v}>
                  {Math.round(v * 100)} %
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-neutral-400">{t('player.background')}</span>
            <select
              className="input py-1"
              value={String(style.backgroundOpacity)}
              onChange={(e) => setStyle({ backgroundOpacity: Number(e.target.value) })}
            >
              {[0, 0.4, 0.6, 0.8, 1].map((v) => (
                <option key={v} value={v}>
                  {Math.round(v * 100)} %
                </option>
              ))}
            </select>
          </label>
        </footer>
      )}
    </div>
  );
}

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="mx-4 max-w-lg rounded-lg bg-neutral-900 p-6 text-center">
      <p className="mb-4 text-lg">{title}</p>
      {children}
    </div>
  );
}
