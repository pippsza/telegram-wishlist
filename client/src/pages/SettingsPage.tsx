import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogOut, Shield } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { checkAdmin } from '@/api/admin';
import { useSettings, useT, type Locale, type Theme } from '@/i18n';

const languages: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'uk', label: 'Українська' },
];

const themes: { value: Theme; key: 'theme_light' | 'theme_dark' | 'theme_pink' | 'theme_green'; color: string }[] = [
  { value: 'light', key: 'theme_light', color: 'bg-white border' },
  { value: 'dark', key: 'theme_dark', color: 'bg-neutral-900' },
  { value: 'pink', key: 'theme_pink', color: 'bg-pink-300' },
  { value: 'green', key: 'theme_green', color: 'bg-green-400' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { locale, setLocale, theme, setTheme } = useSettings();
  const t = useT();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin().then((d) => setIsAdmin(d.isAdmin)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    toast.success(t('toast_logged_out'));
  };

  return (
    <>
      <Header title={t('settings')} />
      <div className="flex flex-col gap-4 p-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <Label>{t('settings_language')}</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <Label>{t('settings_theme')}</Label>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((th) => (
                <button
                  key={th.value}
                  onClick={() => setTheme(th.value)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                    theme === th.value
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent hover:border-border'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full ${th.color}`} />
                  <span className="text-sm font-medium">{t(th.key)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <Shield className="mr-2 h-4 w-4" />
            Admin Panel
          </Button>
        )}

        <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('logout')}
        </Button>
      </div>
    </>
  );
}
