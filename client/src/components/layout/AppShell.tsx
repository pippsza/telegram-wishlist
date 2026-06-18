import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { EdgeSwipeBack } from '@/components/shared/EdgeSwipeBack';

const ROOT_ROUTES = new Set(['/', '/notes', '/gift-ideas', '/pairs']);

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  // No back to invoke on root tabs - hide the gesture there to avoid confusion.
  const isRoot = ROOT_ROUTES.has(location.pathname);

  return (
    <div className="flex min-h-screen flex-col">
      <EdgeSwipeBack enabled={!isRoot} onBack={() => navigate(-1)} />
      <main
        className="flex-1"
        // Reserve room for the fixed BottomNav (h-16 = 64px) plus the iOS
        // home-indicator safe area, otherwise the last row hugs the nav.
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
