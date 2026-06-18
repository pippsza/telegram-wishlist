import api from './axios';
import type { GiftIdea, GiftIdeaStatus } from '@/types';

export async function listGiftIdeas(params?: { pairId?: string; status?: GiftIdeaStatus }): Promise<{ ideas: GiftIdea[] }> {
  const { data } = await api.get<{ ideas: GiftIdea[] }>('/gift-ideas', { params });
  return data;
}

export async function getGiftIdea(id: string): Promise<{ idea: GiftIdea }> {
  const { data } = await api.get<{ idea: GiftIdea }>(`/gift-ideas/${id}`);
  return data;
}

export async function createGiftIdea(formData: FormData): Promise<{ idea: GiftIdea }> {
  const { data } = await api.post<{ idea: GiftIdea }>('/gift-ideas', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateGiftIdea(id: string, formData: FormData): Promise<{ idea: GiftIdea }> {
  const { data } = await api.put<{ idea: GiftIdea }>(`/gift-ideas/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function setGiftIdeaStatus(id: string, status: GiftIdeaStatus): Promise<{ idea: GiftIdea }> {
  const { data } = await api.patch<{ idea: GiftIdea }>(`/gift-ideas/${id}/status`, { status });
  return data;
}

export async function deleteGiftIdea(id: string): Promise<void> {
  await api.delete(`/gift-ideas/${id}`);
}
