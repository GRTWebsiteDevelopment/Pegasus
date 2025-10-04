import { CalendarEvent, WebhookPayload } from '../types';
import { googleCalendarMock } from '../clients/googleCalendarMock';
import { googleCalendarClient } from '../clients/googleCalendarClient';
import { sendEmailNotification } from './notificationService';
import { logger } from '../logger';
import { CalendarApiError } from '../errors/CalendarApiError';
import * as idem from '../store/idempotency';

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
  logger.info({ payload }, 'webhook received');
  // basic validation
  if (!payload?.eventId || !payload?.action || !payload?.timestampIso) {
    logger.error('invalid webhook payload');
    return;
  }

  const key = idem.makeKey({ eventId: payload.eventId, action: payload.action, timestampIso: payload.timestampIso });
  if (idem.has(key)) {
    logger.info({ key }, 'webhook skipped (idempotent)');
    return;
  }
  logger.info({ key }, 'webhook validated');

  try {
    if (payload.action === 'deleted') {
      // For simplicity, mark idempotent and return; deletion not persisted in mock
      idem.add(key);
      logger.info({ eventId: payload.eventId }, 'webhook applied (deleted)');
      return;
    }

    // fetch latest from Google and upsert internal record
    const latest = await googleCalendarClient.getEvent(payload.eventId);
    let updated: CalendarEvent;
    try {
      updated = await updateCalendarEvent(latest.id, {
        title: latest.title,
        description: latest.description,
        location: latest.location,
        startTimeIso: latest.startTimeIso,
        endTimeIso: latest.endTimeIso,
        attendees: latest.attendees,
        metadata: latest.metadata,
      });
    } catch (updateErr: any) {
      // If internal record is missing, upsert by saving latest snapshot
      if (updateErr && typeof updateErr.message === 'string' && updateErr.message.includes('Event not found')) {
        logger.info({ id: latest.id }, 'internal event missing; upserting from webhook');
        googleCalendarMock.saveEvent(latest);
        updated = latest;
      } else {
        throw updateErr;
      }
    }

    // notify primary attendee on updates
    const primary = updated.attendees && updated.attendees[0];
    if (primary) {
      await sendEmailNotification({
        to: primary,
        subject: `Event ${payload.action}: ${updated.title}`,
        html: `<p>Your event ${updated.title} was ${payload.action}.</p>`
      });
    }

    idem.add(key);
    logger.info({ eventId: payload.eventId }, 'webhook applied (updated)');
  } catch (err: any) {
    if (err instanceof CalendarApiError) {
      logger.error({ status: err.status, code: err.code }, 'calendar api error processing webhook');
      throw err;
    }
    logger.error({ err }, 'unexpected webhook processing error');
    throw err;
  }
}

