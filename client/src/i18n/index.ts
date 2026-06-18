import { createContext, useCallback, useContext } from 'react';
import { en, type TranslationKey } from './en';
import { ru } from './ru';
import { uk } from './uk';

export type Locale = 'en' | 'ru' | 'uk';
export type Theme = 'light' | 'dark' | 'pink' | 'green';

const translations: Record<Locale, Record<TranslationKey, string>> = { en, ru, uk };

export function t(key: TranslationKey, locale: Locale = 'en'): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

export interface SettingsContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const SettingsContext = createContext<SettingsContextType>({
  locale: 'en',
  setLocale: () => {},
  theme: 'light',
  setTheme: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

// Memoize so the returned function has a stable reference across renders -
// otherwise listing `t` in a useEffect dep array causes the effect to refire
// every render, which becomes a fetch loop in pages that load data on mount.
export function useT() {
  const { locale } = useSettings();
  return useCallback((key: TranslationKey) => t(key, locale), [locale]);
}

export type { TranslationKey };
