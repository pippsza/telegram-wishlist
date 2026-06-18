import api from './axios';
import type { CalendarEvent } from '@/types';

export interface CalendarEventInput {
  title: string;
  date: string;
  pairId?: string | null;
  isRecurringYearly?: boolean;
  remindDaysBefore?: number[];
  note?: string;
}

export async function listEvents(): Promise<{ events: CalendarEvent[] }> {
  const { data } = await api.get<{ events: CalendarEvent[] }>('/calendar');
  return data;
}

export async function upcomingEvents(days = 30): Promise<{ events: CalendarEvent[] }> {
  const { data } = await api.get<{ events: CalendarEvent[] }>('/calendar/upcoming', { params: { days } });
  return data;
}

export async function createEvent(payload: CalendarEventInput): Promise<{ event: CalendarEvent }> {
  const { data } = await api.post<{ event: CalendarEvent }>('/calendar', payload);
  return data;
}

export async function updateEvent(id: string, payload: Partial<CalendarEventInput>): Promise<{ event: CalendarEvent }> {
  const { data } = await api.put<{ event: CalendarEvent }>(`/calendar/${id}`, payload);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/calendar/${id}`);
}
