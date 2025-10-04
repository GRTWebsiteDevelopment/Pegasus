import request from 'supertest';
import app from '../src/app';
import * as googleClient from '../src/clients/googleCalendarClient';

jest.mock('../src/clients/googleCalendarClient');

const baseEvent = {
  title: 'Team Sync',
  description: 'Weekly',
  startTimeIso: new Date().toISOString(),
  endTimeIso: new Date(Date.now() + 3600000).toISOString(),
  attendees: ['user@example.com']
};

describe('Events API', () => {
  it('creates and fetches an event', async () => {
    (googleClient.googleCalendarClient.createEvent as jest.Mock).mockResolvedValue({
      id: 'evt_abc',
      title: baseEvent.title,
      startTimeIso: baseEvent.startTimeIso,
      endTimeIso: baseEvent.endTimeIso,
      attendees: baseEvent.attendees,
    });
    const createRes = await request(app).post('/events').send(baseEvent);
    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeDefined();

    const id = createRes.body.id;
    const getRes = await request(app).get(`/events/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.title).toBe('Team Sync');
  });

  it('updates an event', async () => {
    (googleClient.googleCalendarClient.createEvent as jest.Mock).mockResolvedValue({
      id: 'evt_def',
      title: baseEvent.title,
      startTimeIso: baseEvent.startTimeIso,
      endTimeIso: baseEvent.endTimeIso,
      attendees: baseEvent.attendees,
    });
    const createRes = await request(app).post('/events').send(baseEvent);
    const id = createRes.body.id;

    const updateRes = await request(app).put(`/events/${id}`).send({ title: 'Updated' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Updated');
  });
});

