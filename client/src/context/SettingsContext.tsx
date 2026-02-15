import { useState, useEffect, type ReactNode } from 'react';
import { SettingsContext, type Locale, type Theme } from '@/i18n';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('locale');
    if (saved && ['en', 'ru', 'uk'].includes(saved)) return saved as Locale;
    const lang = navigator.language?.slice(0, 2);
    if (lang === 'ru') return 'ru';
    if (lang === 'uk') return 'uk';
    return 'en';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'pink', 'green');
    root.classList.add(theme);
  }, [theme]);

  return (
    <SettingsContext.Provider value={{ locale, setLocale, theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}
