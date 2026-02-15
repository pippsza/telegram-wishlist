import api from './axios';
import type { Wish } from '@/types';

interface WishesResponse {
  wishes: Wish[];
  total: number;
  page: number;
  limit: number;
}

export async function getMyWishes(params?: Record<string, string>): Promise<WishesResponse> {
  const { data } = await api.get<WishesResponse>('/wishes', { params });
  return data;
}

export async function getPartnerWishes(pairId: string): Promise<{ wishes: Wish[] }> {
  const { data } = await api.get<{ wishes: Wish[] }>(`/wishes/partner/${pairId}`);
  return data;
}

export async function getAllPartnerWishes(): Promise<{ wishes: Wish[] }> {
  const { data } = await api.get<{ wishes: Wish[] }>('/wishes/partners');
  return data;
}

export async function getArchive(): Promise<{ wishes: Wish[] }> {
  const { data } = await api.get<{ wishes: Wish[] }>('/wishes/archive');
  return data;
}

export async function getArchiveAll(): Promise<{ own: Wish[]; partners: Wish[] }> {
  const { data } = await api.get<{ own: Wish[]; partners: Wish[] }>('/wishes/archive/all');
  return data;
}

export async function createWish(formData: FormData): Promise<{ wish: Wish }> {
  const { data } = await api.post<{ wish: Wish }>('/wishes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateWish(id: string, formData: FormData): Promise<{ wish: Wish }> {
  const { data } = await api.put<{ wish: Wish }>(`/wishes/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteWish(id: string): Promise<void> {
  await api.delete(`/wishes/${id}`);
}

export async function markWishReceived(id: string): Promise<{ wish: Wish }> {
  const { data } = await api.patch<{ wish: Wish }>(`/wishes/${id}/receive`);
  return data;
}

export async function sendWishToChat(wishId: string): Promise<void> {
  await api.post(`/wishes/${wishId}/send-to-chat`);
}
