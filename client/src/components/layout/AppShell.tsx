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
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
