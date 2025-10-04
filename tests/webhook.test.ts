import request from 'supertest';
import app from '../src/app';
import * as googleClient from '../src/clients/googleCalendarClient';

jest.mock('../src/clients/googleCalendarClient');

describe('POST /webhook', () => {
  it('accepts webhook payload', async () => {
    (googleClient.googleCalendarClient.getEvent as jest.Mock).mockResolvedValue({
      id: '123',
      title: 'New Event',
      startTimeIso: new Date().toISOString(),
      endTimeIso: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['x@example.com']
    });
    const res = await request(app)
      .post('/webhook')
      .send({ eventId: '123', action: 'created', timestampIso: new Date().toISOString() });
    expect(res.status).toBe(204);
  });
});

