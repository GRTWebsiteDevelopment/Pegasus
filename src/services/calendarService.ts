import { CalendarEvent, WebhookPayload } from '../types';
import { googleCalendarMock } from '../clients/googleCalendarMock';
import { sendEmailNotification } from './notificationService';

export async function createCalendarEvent(payload: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const event = await googleCalendarMock.createEvent(payload);
  await sendEmailNotification({
    to: (payload.attendees && payload.attendees[0]) || 'test@example.com',
    subject: `Event Created: ${payload.title}`,
    html: `<p>Your event ${payload.title} was created.</p>`
  });
  return event;
}

export async function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const updated = await googleCalendarMock.updateEvent(id, updates);
  if (!updated) throw new Error('Event not found');
  await sendEmailNotification({
    to: (updated.attendees && updated.attendees[0]) || 'test@example.com',
    subject: `Event Updated: ${updated.title}`,
    html: `<p>Your event ${updated.title} was updated.</p>`
  });
  return updated;
}

export async function getEventById(id: string): Promise<CalendarEvent | null> {
  return googleCalendarMock.getEvent(id);
}

export async function handleCalendarWebhook(payload: WebhookPayload): Promise<void> {
  // In a real implementation, verify signatures and process event
  if (payload.action === 'deleted') {
    // noop for mock
  }
}

