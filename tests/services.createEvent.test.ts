import { createCalendarEvent } from '../src/services/calendarService';
import * as googleClient from '../src/clients/googleCalendarClient';
import { CalendarApiError } from '../src/errors/CalendarApiError';

jest.mock('../src/clients/googleCalendarClient');

const basePayload = {
  title: 'Design Review',
  startTimeIso: new Date().toISOString(),
  endTimeIso: new Date(Date.now() + 3600000).toISOString(),
  attendees: ['x@example.com']
} as any;

describe('createCalendarEvent (Google API)', () => {
  it('creates event via Google API and returns mapped event', async () => {
    (googleClient.googleCalendarClient.createEvent as jest.Mock).mockResolvedValue({
      id: 'evt_123',
      title: basePayload.title,
      startTimeIso: basePayload.startTimeIso,
      endTimeIso: basePayload.endTimeIso,
      attendees: basePayload.attendees,
    });

    const result = await createCalendarEvent(basePayload);
    expect(result.id).toBe('evt_123');
    expect(googleClient.googleCalendarClient.createEvent).toHaveBeenCalled();
  });

  it('throws CalendarApiError on Google API failure', async () => {
    (googleClient.googleCalendarClient.createEvent as jest.Mock).mockRejectedValue(
      new CalendarApiError('bad request', { status: 400, code: 'INVALID_ARGUMENT' })
    );

    await expect(createCalendarEvent(basePayload)).rejects.toBeInstanceOf(CalendarApiError);
  });
});

