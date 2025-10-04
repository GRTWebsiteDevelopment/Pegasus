import { updateCalendarEvent, getEventById } from '../src/services/calendarService';
import * as googleClient from '../src/clients/googleCalendarClient';
import { CalendarApiError } from '../src/errors/CalendarApiError';

jest.mock('../src/clients/googleCalendarClient');

describe('updateCalendarEvent & getEventById with retries and logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates event via Google client and returns updated', async () => {
    (googleClient.googleCalendarClient.updateEvent as jest.Mock).mockResolvedValue({
      id: 'evt_u1',
      title: 'Updated Title',
      startTimeIso: new Date().toISOString(),
      endTimeIso: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['a@example.com']
    });
    const res = await updateCalendarEvent('evt_u1', { title: 'Updated Title' } as any);
    expect(res.title).toBe('Updated Title');
  });

  it('retries on transient update errors and succeeds', async () => {
    (googleClient.googleCalendarClient.updateEvent as jest.Mock)
      .mockRejectedValueOnce(new CalendarApiError('Network', { status: 0 }))
      .mockResolvedValueOnce({
        id: 'evt_u2',
        title: 'T2',
        startTimeIso: new Date().toISOString(),
        endTimeIso: new Date(Date.now() + 3600000).toISOString(),
        attendees: ['b@example.com']
      });
    const res = await updateCalendarEvent('evt_u2', { title: 'T2' } as any);
    expect(res.id).toBe('evt_u2');
  });

  it('returns local or remote event by id with fallback', async () => {
    (googleClient.googleCalendarClient.getEvent as jest.Mock).mockResolvedValue({
      id: 'evt_g1',
      title: 'Remote',
      startTimeIso: new Date().toISOString(),
      endTimeIso: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['c@example.com']
    });
    const res = await getEventById('evt_g1');
    expect(res?.id).toBe('evt_g1');
  });

  it('returns null on API error for getEventById', async () => {
    (googleClient.googleCalendarClient.getEvent as jest.Mock).mockRejectedValue(
      new CalendarApiError('Not found', { status: 404 })
    );
    const res = await getEventById('missing');
    expect(res).toBeNull();
  });
});

