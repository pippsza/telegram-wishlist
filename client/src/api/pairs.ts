import api from './axios';
import type { Pair, PendingRequest, PendingSent } from '@/types';

interface PairsResponse {
  pairs: Pair[];
  pendingReceived: PendingRequest[];
  pendingSent: PendingSent[];
}

export async function getPairs(): Promise<PairsResponse> {
  const { data } = await api.get<PairsResponse>('/pairs');
  return data;
}

export async function createInvite(): Promise<{ id: string; inviteCode: string }> {
  const { data } = await api.post<{ id: string; inviteCode: string }>('/pairs/invite');
  return data;
}

export async function acceptInvite(code: string): Promise<Pair> {
  const { data } = await api.post<Pair>(`/pairs/invite/${code}/accept`);
  return data;
}

export async function sendPairRequest(username: string): Promise<{ id: string; status: string }> {
  const { data } = await api.post<{ id: string; status: string }>('/pairs/request', { username });
  return data;
}

export async function respondToPair(id: string, action: 'accept' | 'decline'): Promise<void> {
  await api.patch(`/pairs/${id}/respond`, { action });
}

export async function deletePair(id: string): Promise<void> {
  await api.delete(`/pairs/${id}`);
}
