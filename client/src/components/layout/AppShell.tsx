import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { EdgeSwipeBack } from '@/components/shared/EdgeSwipeBack';

const ROOT_ROUTES = new Set(['/', '/notes', '/gift-ideas', '/pairs']);

// Pages where the bottom navigation steals editing space. /notes/:id (the
// rich-text editor) needs the full viewport to keep the active line visible
// above the on-screen keyboard.
const NAV_HIDDEN_PATTERNS: RegExp[] = [/^\/notes\/[^/]+$/];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = ROOT_ROUTES.has(location.pathname);
  const navHidden = NAV_HIDDEN_PATTERNS.some((re) => re.test(location.pathname));

  return (
    <div className="flex min-h-screen flex-col">
      <EdgeSwipeBack enabled={!isRoot} onBack={() => navigate(-1)} />
      <main
        className="flex-1"
        style={{
          paddingBottom: navHidden
            ? 'env(safe-area-inset-bottom, 0px)'
            : 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        }}
      >
        <Outlet />
      </main>
      {!navHidden && <BottomNav />}
    </div>
  );
}
