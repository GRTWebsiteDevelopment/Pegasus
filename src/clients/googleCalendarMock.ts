import { CalendarEvent } from '../types';
import { randomUUID } from 'crypto';

const events = new Map<string, CalendarEvent>();

export const googleCalendarMock = {
  async createEvent(payload: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const id = randomUUID();
    const event: CalendarEvent = { id, ...payload };
    events.set(id, event);
    return event;
  },

  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    const existing = events.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    events.set(id, updated);
    return updated;
  },

  async getEvent(id: string): Promise<CalendarEvent | null> {
    return events.get(id) || null;
  },

  async listEvents(): Promise<CalendarEvent[]> {
    return Array.from(events.values());
  },

  saveEvent(event: CalendarEvent): CalendarEvent {
    events.set(event.id, event);
    return event;
  },
};

export type GoogleCalendarMock = typeof googleCalendarMock;

