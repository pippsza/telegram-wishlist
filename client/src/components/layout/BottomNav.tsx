import { NavLink } from 'react-router-dom';
import { Star, Users, Archive, Settings } from 'lucide-react';
import { useT } from '@/i18n';
import type { TranslationKey } from '@/i18n';

const tabs: { to: string; icon: typeof Star; key: TranslationKey }[] = [
  { to: '/', icon: Star, key: 'nav_wishes' },
  { to: '/pairs', icon: Users, key: 'nav_pairs' },
  { to: '/archive', icon: Archive, key: 'nav_archive' },
  { to: '/settings', icon: Settings, key: 'nav_settings' },
];

export function BottomNav() {
  const t = useT();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-around">
        {tabs.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -top-[1px] left-3 right-3 h-0.5 rounded-b bg-primary" />
                )}
                <Icon className="h-5 w-5" />
                <span>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
