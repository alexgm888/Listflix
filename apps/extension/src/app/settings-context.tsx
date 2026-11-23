import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { db } from '../db/db';
import { defaultSettings, SETTINGS_ID } from '../db/settings';
import type { Settings } from '../domain/types';
import { initI18n } from '../i18n';

const SettingsContext = createContext<Settings | null>(null);

/**
 * Carga los ajustes de IndexedDB (en vivo) y sincroniza el idioma de la interfaz.
 * `getSettings()` debe haberse llamado antes para crear la fila por defecto.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const stored = useLiveQuery(() => db.settings.get(SETTINGS_ID), []);
  const settings = stored ? { ...defaultSettings(), ...stored } : undefined;

  useEffect(() => {
    if (settings) initI18n(settings.uiLanguage);
  }, [settings?.uiLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!settings) return null;
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
