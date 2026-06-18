import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Star, Users, FileText, Gift } from 'lucide-react';
import { getPairs } from '@/api/pairs';
import { useT } from '@/i18n';
import type { TranslationKey } from '@/i18n';

const tabs: { to: string; icon: typeof Star; key: TranslationKey }[] = [
  { to: '/', icon: Star, key: 'nav_wishes' },
  { to: '/notes', icon: FileText, key: 'nav_notes' },
  { to: '/gift-ideas', icon: Gift, key: 'nav_gifts' },
  { to: '/pairs', icon: Users, key: 'nav_pairs' },
];

export function BottomNav() {
  const t = useT();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getPairs()
      .then((data) => setPendingCount(data.pendingReceived.length))
      .catch(() => {});
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
      <div className="flex h-16 items-stretch">
        {tabs.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors active:opacity-70 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -top-[1px] left-3 right-3 h-0.5 rounded-b bg-primary" />
                )}
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {to === '/pairs' && pendingCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
