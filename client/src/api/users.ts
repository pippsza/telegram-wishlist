import api from './axios';
import type { User } from '@/types';

export async function searchUsers(query: string): Promise<{ users: User[] }> {
  const { data } = await api.get<{ users: User[] }>('/users/search', { params: { q: query } });
  return data;
}
