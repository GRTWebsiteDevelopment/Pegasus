import { createCalendarEvent, updateCalendarEvent, getEventById } from '../src/services/calendarService';
import { emailMock } from '../src/clients/emailMock';

describe('Services', () => {
  beforeEach(() => emailMock.clear());

  it('creates event and sends email', async () => {
    const event = await createCalendarEvent({
      title: 'Planning',
      startTimeIso: new Date().toISOString(),
      endTimeIso: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['a@example.com']
    } as any);
    expect(event.id).toBeDefined();
    expect(emailMock.getSent().length).toBe(1);
  });

  it('updates event and sends email', async () => {
    const created = await createCalendarEvent({
      title: 'Standup',
      startTimeIso: new Date().toISOString(),
      endTimeIso: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['b@example.com']
    } as any);
    const updated = await updateCalendarEvent(created.id, { title: 'Standup Updated' } as any);
    expect(updated.title).toBe('Standup Updated');
    expect(emailMock.getSent().length).toBe(2);
  });

  it('gets event by id', async () => {
    const created = await createCalendarEvent({
      title: 'Retro',
      startTimeIso: new Date().toISOString(),
      endTimeIso: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['c@example.com']
    } as any);
    const fetched = await getEventById(created.id);
    expect(fetched?.id).toBe(created.id);
  });
});

