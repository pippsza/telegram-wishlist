import api from './axios';
import type { AttachmentKind, EventAttachment } from '@/types';

export async function listEventAttachments(eventId: string): Promise<{ attachments: EventAttachment[] }> {
  const { data } = await api.get<{ attachments: EventAttachment[] }>(`/calendar/${eventId}/attachments`);
  return data;
}

export async function attachToEvent(eventId: string, kind: AttachmentKind, targetId: string): Promise<{ attachment: EventAttachment }> {
  const { data } = await api.post<{ attachment: EventAttachment }>(`/calendar/${eventId}/attachments`, { kind, targetId });
  return data;
}

export async function detachFromEvent(attachmentId: string): Promise<void> {
  await api.delete(`/calendar/attachments/${attachmentId}`);
}
