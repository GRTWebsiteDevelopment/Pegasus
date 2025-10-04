import { CalendarEvent, WebhookPayload } from '../types';
import { googleCalendarMock } from '../clients/googleCalendarMock';
import { googleCalendarClient } from '../clients/googleCalendarClient';
import { sendEmailNotification } from './notificationService';
import { logger } from '../logger';
import { CalendarApiError } from '../errors/CalendarApiError';

export async function createCalendarEvent(payload: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  logger.info({ title: payload.title, attendees: payload.attendees?.length || 0 }, 'creating calendar event');
  try {
    const event = await googleCalendarClient.createEvent(payload);
    // save to in-memory mock store for local reads/tests
    googleCalendarMock.saveEvent(event);
    await sendEmailNotification({
      to: (payload.attendees && payload.attendees[0]) || 'test@example.com',
      subject: `Event Created: ${payload.title}`,
      html: `<p>Your event ${payload.title} was created.</p>`
    });
    logger.info({ id: event.id, title: event.title }, 'calendar event created');
    return event;
  } catch (err: any) {
    if (err instanceof CalendarApiError) {
      logger.error({ status: err.status, code: err.code, details: err.details }, 'calendar api error on create');
      throw err;
    }
    logger.error({ err }, 'unexpected error creating calendar event');
    throw new CalendarApiError('Create event failed', { status: 500, details: err, endpoint: 'google' });
  }
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

