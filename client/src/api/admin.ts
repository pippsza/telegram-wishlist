import api from './axios';
import type { User, Wish } from '@/types';

interface AdminStats {
  userCount: number;
  pairCount: number;
  wishCount: number;
  activeWishCount: number;
  receivedWishCount: number;
  noteCount: number;
  noteDocCount: number;
  noteFolderCount: number;
  eventCount: number;
  sharedEventCount: number;
  giftIdeaCount: number;
  attachmentCount: number;
}

export interface RecentItem {
  kind: 'user' | 'wish' | 'note' | 'event' | 'gift' | 'pair' | 'attachment';
  at: string;
  data: Record<string, unknown>;
}

interface AdminPair {
  _id: string;
  userA: User;
  userB: User | null;
  status: string;
  inviteMethod: string;
  createdAt: string;
}

export async function checkAdmin(): Promise<{ isAdmin: boolean }> {
  const { data } = await api.get<{ isAdmin: boolean }>('/admin/check');
  return data;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>('/admin/stats');
  return data;
}

export async function getAdminUsers(): Promise<{ users: (User & { _id: string; createdAt: string; languageCode?: string })[] }> {
  const { data } = await api.get('/admin/users');
  return data;
}

export async function getAdminPairs(): Promise<{ pairs: AdminPair[] }> {
  const { data } = await api.get('/admin/pairs');
  return data;
}

export async function getAdminWishes(): Promise<{ wishes: (Wish & { owner: User })[] }> {
  const { data } = await api.get('/admin/wishes');
  return data;
}

export async function deleteAdminUser(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

export async function deleteAdminPair(id: string): Promise<void> {
  await api.delete(`/admin/pairs/${id}`);
}

export async function deleteAdminWish(id: string): Promise<void> {
  await api.delete(`/admin/wishes/${id}`);
}

export async function getAdminRecent(limit = 30): Promise<{ items: RecentItem[] }> {
  const { data } = await api.get<{ items: RecentItem[] }>('/admin/recent', { params: { limit } });
  return data;
}
