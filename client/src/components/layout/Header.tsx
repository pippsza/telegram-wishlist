import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROOT_ROUTES = new Set(['/', '/notes', '/gift-ideas', '/pairs']);

interface HeaderProps {
  title: string;
  showBack?: boolean;
  // Hide the Settings gear even on root pages (e.g. when a page already has
  // its own action area in the right slot).
  hideSettings?: boolean;
}

export function Header({ title, showBack, hideSettings }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = ROOT_ROUTES.has(location.pathname);

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-14 items-center gap-3 px-4">
        {(showBack || !isRoot) && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
        {isRoot && !hideSettings && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
