import { handleCalendarWebhook } from '../src/services/calendarService';
import * as googleClient from '../src/clients/googleCalendarClient';
import { emailMock } from '../src/clients/emailMock';

jest.mock('../src/clients/googleCalendarClient');

describe('Webhook handling', () => {
  beforeEach(() => emailMock.clear());

  it('applies update from webhook and sends notification', async () => {
    (googleClient.googleCalendarClient.getEvent as jest.Mock).mockResolvedValue({
      id: 'evt_1',
      title: 'Webinar',
      startTimeIso: new Date().toISOString(),
      endTimeIso: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['notify@example.com']
    });
    (googleClient.googleCalendarClient.updateEvent as jest.Mock).mockResolvedValue({
      id: 'evt_1',
      title: 'Webinar',
      startTimeIso: new Date().toISOString(),
      endTimeIso: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['notify@example.com']
    });

    await handleCalendarWebhook({ eventId: 'evt_1', action: 'updated', timestampIso: new Date().toISOString() });

    expect(emailMock.getSent().length).toBe(1);
    expect(emailMock.getSent()[0].to).toBe('notify@example.com');
  });

  it('is idempotent (same payload processed once)', async () => {
    (googleClient.googleCalendarClient.getEvent as jest.Mock).mockResolvedValue({
      id: 'evt_2',
      title: 'Standup',
      startTimeIso: new Date().toISOString(),
      endTimeIso: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['dup@example.com']
    });
    (googleClient.googleCalendarClient.updateEvent as jest.Mock).mockResolvedValue({
      id: 'evt_2',
      title: 'Standup',
      startTimeIso: new Date().toISOString(),
      endTimeIso: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['dup@example.com']
    });
    const payload: { eventId: string; action: 'updated'; timestampIso: string } = { eventId: 'evt_2', action: 'updated', timestampIso: new Date().toISOString() };
    await handleCalendarWebhook(payload);
    await handleCalendarWebhook(payload);
    expect(emailMock.getSent().length).toBe(1);
  });
});

