import { NavLink } from 'react-router-dom';
import { Star, Users, Archive } from 'lucide-react';

const tabs = [
  { to: '/', icon: Star, label: 'Wishes' },
  { to: '/pairs', icon: Users, label: 'Pairs' },
  { to: '/archive', icon: Archive, label: 'Archive' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex h-16 items-center justify-around">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
