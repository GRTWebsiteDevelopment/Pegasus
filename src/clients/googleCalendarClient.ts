import fetch from 'node-fetch';
import { env } from '../config';
import { CalendarEvent } from '../types';
import { logger } from '../logger';
import { CalendarApiError } from '../errors/CalendarApiError';

function mapGoogleToCalendarEvent(googleEvent: any): CalendarEvent {
  return {
    id: googleEvent.id,
    title: googleEvent.summary,
    description: googleEvent.description,
    location: googleEvent.location,
    startTimeIso: googleEvent.start?.dateTime || googleEvent.start?.date,
    endTimeIso: googleEvent.end?.dateTime || googleEvent.end?.date,
    attendees: Array.isArray(googleEvent.attendees)
      ? googleEvent.attendees.map((a: any) => a?.email).filter(Boolean)
      : undefined,
    metadata: googleEvent.htmlLink ? { htmlLink: String(googleEvent.htmlLink) } : undefined,
  };
}

export const googleCalendarClient = {
  async createEvent(payload: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const calendarId = env.GOOGLE_CALENDAR_ID;
    const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all${env.GOOGLE_API_KEY ? `&key=${encodeURIComponent(env.GOOGLE_API_KEY)}` : ''}`;

    const body = {
      summary: payload.title,
      description: payload.description,
      location: payload.location,
      start: { dateTime: payload.startTimeIso },
      end: { dateTime: payload.endTimeIso },
      attendees: payload.attendees?.map((email) => ({ email })),
    } as any;

    logger.info({ endpoint, hasAttendees: !!payload.attendees?.length }, 'creating google calendar event');

    let res: any;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GOOGLE_OAUTH_TOKEN}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      logger.error({ err }, 'network error creating google calendar event');
      throw new CalendarApiError('Network error calling Google Calendar', { status: 0, details: err, endpoint });
    }

    if (!res.ok) {
      let details: any;
      try { details = await res.json(); } catch { details = await res.text(); }
      logger.error({ status: res.status, details }, 'google calendar api error');
      const code = typeof details?.error?.code === 'number' ? String(details.error.code) : details?.error?.status;
      throw new CalendarApiError('Google Calendar API error', { status: res.status, code, details, endpoint });
    }

    const data = await res.json();
    const event = mapGoogleToCalendarEvent(data);
    logger.info({ id: event.id }, 'google calendar event created');
    return event;
  },

  async getEvent(id: string): Promise<CalendarEvent> {
    const calendarId = env.GOOGLE_CALENDAR_ID;
    const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}${env.GOOGLE_API_KEY ? `?key=${encodeURIComponent(env.GOOGLE_API_KEY)}` : ''}`;
    let res: any;
    try {
      res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.GOOGLE_OAUTH_TOKEN}`,
        },
      });
    } catch (err: any) {
      logger.error({ err }, 'network error getting google calendar event');
      throw new CalendarApiError('Network error calling Google Calendar', { status: 0, details: err, endpoint });
    }
    if (!res.ok) {
      let details: any;
      try { details = await res.json(); } catch { details = await res.text(); }
      logger.error({ status: res.status, details }, 'google calendar api get error');
      const code = typeof details?.error?.code === 'number' ? String(details.error.code) : details?.error?.status;
      throw new CalendarApiError('Google Calendar API error', { status: res.status, code, details, endpoint });
    }
    const data = await res.json();
    return mapGoogleToCalendarEvent(data);
  },
};

export type GoogleCalendarClient = typeof googleCalendarClient;

