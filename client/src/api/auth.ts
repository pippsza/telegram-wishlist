import api from './axios';
import type { User } from '@/types';

interface AuthResponse {
  token: string;
  user: User;
}

export async function loginWithTelegram(initData: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/telegram', { initData });
  return data;
}
