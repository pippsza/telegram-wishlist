import { createContext, useContext } from 'react';
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

export function useT() {
  const { locale } = useSettings();
  return (key: TranslationKey) => t(key, locale);
}

export type { TranslationKey };
