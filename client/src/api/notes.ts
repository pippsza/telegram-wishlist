import api from './axios';
import type { Note, NoteType } from '@/types';

export async function listNotes(params?: { scope?: 'private' | 'pair'; pairId?: string }): Promise<{ notes: Note[] }> {
  const { data } = await api.get<{ notes: Note[] }>('/notes', { params });
  return data;
}

export async function getNote(id: string): Promise<{ note: Note }> {
  const { data } = await api.get<{ note: Note }>(`/notes/${id}`);
  return data;
}

export interface NoteCreateInput {
  type: NoteType;
  title?: string;
  pairId?: string | null;
  parentId?: string | null;
}

export async function createNote(payload: NoteCreateInput): Promise<{ note: Note }> {
  const { data } = await api.post<{ note: Note }>('/notes', payload);
  return data;
}

export interface NotePatchInput {
  title?: string;
  parentId?: string | null;
  pairId?: string | null;
}

export async function updateNote(id: string, payload: NotePatchInput): Promise<{ note: Note }> {
  const { data } = await api.patch<{ note: Note }>(`/notes/${id}`, payload);
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  await api.delete(`/notes/${id}`);
}

export async function uploadNoteImage(id: string, file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append('image', file);
  const { data } = await api.post<{ url: string }>(`/notes/${id}/image`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
