import type { MetadataLanguage, Settings, UiLanguage } from '../domain/types';
import { db, SCHEMA_VERSION } from './db';

export const SETTINGS_ID = 'singleton' as const;

export function detectUiLanguage(languages: readonly string[] = navigatorLanguages()): UiLanguage {
  for (const lang of languages) {
    const base = lang.toLowerCase().split('-')[0];
    if (base === 'es') return 'es';
    if (base === 'en') return 'en';
  }
  return 'en';
}

function navigatorLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

export function metadataLanguageFor(ui: UiLanguage): MetadataLanguage {
  return ui === 'es' ? 'es-ES' : 'en-US';
}

export function defaultSettings(languages?: readonly string[]): Settings {
  const uiLanguage = detectUiLanguage(languages);
  return {
    id: SETTINGS_ID,
    uiLanguage,
    metadataLanguage: metadataLanguageFor(uiLanguage),
    country: 'ES',
    myProviderIds: [],
    schemaVersion: SCHEMA_VERSION,
    subtitleStyle: { scale: 1, backgroundOpacity: 0.6 },
    libraryView: 'grid',
  };
}

/** Devuelve los ajustes, creando los valores por defecto la primera vez. */
export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get(SETTINGS_ID);
  if (existing) return { ...defaultSettings(), ...existing };
  const settings = defaultSettings();
  await db.settings.put(settings);
  return settings;
}

export async function updateSettings(
  patch: Partial<Omit<Settings, 'id' | 'schemaVersion'>>,
): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const current = await getSettings();
    const next: Settings = { ...current, ...patch, id: SETTINGS_ID };
    await db.settings.put(next);
    return next;
  });
}
