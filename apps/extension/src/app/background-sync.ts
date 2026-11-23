import { useEffect, useRef } from 'react';
import { db } from '../db/db';
import { metadataProvider } from '../lib/api';
import { refreshStaleItems } from '../sync/metadata-sync';
import { refreshStaleProviders } from '../sync/providers-sync';
import { useSettings } from './settings-context';

/**
 * Al abrir la biblioteca (y cuando cambian idioma o país) refresca en segundo plano
 * los metadatos incompletos o caducados y la caché de plataformas.
 */
export function useBackgroundSync(): void {
  const { metadataLanguage, country } = useSettings();
  const running = useRef<string | null>(null);

  useEffect(() => {
    const runKey = `${metadataLanguage}|${country}`;
    if (running.current === runKey) return;
    running.current = runKey;
    void (async () => {
      try {
        const items = await db.items.toArray();
        await refreshStaleItems(items, metadataProvider, metadataLanguage);
        await refreshStaleProviders(await db.items.toArray(), country, metadataProvider);
      } catch (err) {
        console.warn('[listflix] background sync failed', err);
      }
    })();
  }, [metadataLanguage, country]);
}
