import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { UiLanguage } from '../domain/types';
import { detectUiLanguage } from '../db/settings';
import en from './en.json';
import es from './es.json';

export const resources = {
  es: { translation: es },
  en: { translation: en },
} as const;

export function initI18n(language: UiLanguage = detectUiLanguage()) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  } else if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  return i18n;
}

export { i18n };
