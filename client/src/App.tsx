import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { MyWishesPage } from '@/pages/MyWishesPage';
import { WishCreatePage } from '@/pages/WishCreatePage';
import { WishEditPage } from '@/pages/WishEditPage';
import { PairsPage } from '@/pages/PairsPage';
import { PairDetailPage } from '@/pages/PairDetailPage';
import { ArchivePage } from '@/pages/ArchivePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { InvitePage } from '@/pages/InvitePage';
import { AdminPage } from '@/pages/AdminPage';
import { getStartParam } from '@/lib/telegram';

const queryClient = new QueryClient();

function StartParamHandler() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Check URL query param (from bot's web_app button)
    const urlParams = new URLSearchParams(window.location.search);
    const inviteFromUrl = urlParams.get('invite');
    if (inviteFromUrl) {
      navigate(`/invite/${inviteFromUrl}`, { replace: true });
      return;
    }

    // Check Telegram startParam (from direct Mini App link)
    const startParam = getStartParam();
    if (startParam?.startsWith('invite_')) {
      const code = startParam.replace('invite_', '');
      navigate(`/invite/${code}`, { replace: true });
    }
  }, [user, navigate]);

  return null;
}

function AppRoutes() {
  const { loading, error, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-lg font-semibold">Wishlist</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please open this app from Telegram.
          </p>
          <p className="mt-4 text-xs text-destructive/70 font-mono break-all">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StartParamHandler />
      <Routes>
        <Route path="/invite/:code" element={<InvitePage />} />
        <Route element={<AppShell />}>
        <Route path="/" element={<MyWishesPage />} />
        <Route path="/wishes/new" element={<WishCreatePage />} />
        <Route path="/wishes/:id/edit" element={<WishEditPage />} />
        <Route path="/pairs" element={<PairsPage />} />
        <Route path="/pairs/:id" element={<PairDetailPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </SettingsProvider>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
