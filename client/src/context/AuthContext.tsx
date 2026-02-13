import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loginWithTelegram } from '@/api/auth';
import { setAuthToken } from '@/api/axios';
import { initTelegramApp, getInitDataRaw } from '@/lib/telegram';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function authenticate() {
      initTelegramApp();
      const initDataRaw = getInitDataRaw();

      if (!initDataRaw) {
        // Dev mode — skip auth
        setLoading(false);
        setError('Running outside Telegram');
        return;
      }

      try {
        const result = await loginWithTelegram(initDataRaw);
        setAuthToken(result.token);
        setUser(result.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setLoading(false);
      }
    }

    authenticate();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
