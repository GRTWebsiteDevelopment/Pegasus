const calendarService = require('../../src/services/calendarService');
const { calendar } = require('../../src/utils/googleClient');
const {
  EventCreationError,
  EventUpdateError,
  EventRetrievalError,
} = require('../../src/utils/errors');
const emailService = require('../../src/services/emailService');
const idempotencyCache = require('../../src/utils/idempotencyCache');


jest.mock('../../src/utils/googleClient', () => ({
  calendar: {
    events: {
      insert: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('../../src/services/emailService');

const { createCalendarEvent, handleCalendarWebhook } = calendarService;

describe('calendarService.createCalendarEvent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a calendar event successfully', async () => {
    const eventData = {
      title: 'Team Meeting',
      description: 'Discuss project updates.',
      startTime: '2025-12-01T10:00:00Z',
      endTime: '2025-12-01T11:00:00Z',
      attendees: ['test@example.com'],
    };
    const mockResponse = {
      data: {
        id: '12345',
        htmlLink: 'https://calendar.google.com/event?id=12345',
      },
    };
    calendar.events.insert.mockResolvedValue(mockResponse);

    const result = await createCalendarEvent(eventData);

    expect(calendar.events.insert).toHaveBeenCalledTimes(1);
    expect(calendar.events.insert).toHaveBeenCalledWith({
      calendarId: undefined, // config.GOOGLE_CALENDAR_ID is not set in test env
      resource: expect.any(Object),
      sendNotifications: true,
      conferenceDataVersion: 1,
    });
    expect(result).toEqual(mockResponse.data);
  });

  it('should throw EventCreationError on API failure', async () => {
    const eventData = {
      title: 'Team Meeting',
      description: 'Discuss project updates.',
      startTime: '2025-12-01T10:00:00Z',
      endTime: '2025-12-01T11:00:00Z',
      attendees: ['test@example.com'],
    };
    const mockError = new Error('API Error');
    calendar.events.insert.mockRejectedValue(mockError);

    await expect(createCalendarEvent(eventData)).rejects.toThrow(EventCreationError);
  });
});

describe('calendarService.getEventById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve an event successfully', async () => {
    const mockEvent = { id: 'event-123', summary: 'Test Event' };
    calendar.events.get.mockResolvedValue({ data: mockEvent });

    const result = await calendarService.getEventById('event-123');
    expect(result).toEqual(mockEvent);
    expect(calendar.events.get).toHaveBeenCalledWith({
      calendarId: undefined,
      eventId: 'event-123',
    });
  });

  it('should throw EventRetrievalError on API failure', async () => {
    calendar.events.get.mockRejectedValue(new Error('API Error'));
    await expect(calendarService.getEventById('event-123')).rejects.toThrow(
      EventRetrievalError
    );
  });

  it('should retry on failure', async () => {
    calendar.events.get
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({ data: { id: 'event-123' } });

    await calendarService.getEventById('event-123');
    expect(calendar.events.get).toHaveBeenCalledTimes(2);
  });
});

describe('calendarService.updateCalendarEvent', () => {
  let getEventByIdSpy;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (getEventByIdSpy) {
      getEventByIdSpy.mockRestore();
    }
  });

  it('should update an event successfully', async () => {
    const existingEvent = { id: 'event-123', summary: 'Old Title' };
    const updatedEventData = { summary: 'New Title' };
    const expectedEvent = { ...existingEvent, ...updatedEventData };

    getEventByIdSpy = jest
      .spyOn(calendarService, 'getEventById')
      .mockResolvedValue(existingEvent);
    calendar.events.update.mockResolvedValue({ data: expectedEvent });

    const result = await calendarService.updateCalendarEvent('event-123', updatedEventData);
    expect(result).toEqual(expectedEvent);
    expect(calendar.events.update).toHaveBeenCalledWith({
      calendarId: undefined,
      eventId: 'event-123',
      resource: expectedEvent,
    });
  });

  it('should throw EventUpdateError on API failure', async () => {
    getEventByIdSpy = jest
      .spyOn(calendarService, 'getEventById')
      .mockResolvedValue({ id: 'event-123' });
    calendar.events.update.mockRejectedValue(new Error('API Error'));

    await expect(
      calendarService.updateCalendarEvent('event-123', { summary: 'New Title' })
    ).rejects.toThrow(EventUpdateError);
  });
});

describe('calendarService.handleCalendarWebhook', () => {
  beforeEach(() => {
    idempotencyCache.clearCache();
    jest.clearAllMocks();
  });

  it('should process a new webhook and send a notification for a declined event', async () => {
    const headers = { 'x-goog-message-number': '1', 'x-goog-resource-id': 'event-123' };
    const mockEvent = {
      summary: 'Test Event',
      organizer: { email: 'organizer@example.com' },
      attendees: [{ email: 'attendee@example.com', responseStatus: 'declined' }],
    };
    calendarService.getEventById = jest.fn().mockResolvedValue(mockEvent);

    await handleCalendarWebhook(headers, {});

    expect(calendarService.getEventById).toHaveBeenCalledWith('event-123');
    expect(emailService.sendEmailNotification).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmailNotification).toHaveBeenCalledWith(
      'organizer@example.com',
      'Attendee declined event: Test Event',
      'The following attendees have declined the event "Test Event": attendee@example.com'
    );
  });

  it('should not send a notification if no attendees have declined', async () => {
    const headers = { 'x-goog-message-number': '2', 'x-goog-resource-id': 'event-123' };
    const mockEvent = {
      summary: 'Test Event',
      organizer: { email: 'organizer@example.com' },
      attendees: [{ email: 'attendee@example.com', responseStatus: 'accepted' }],
    };
    calendarService.getEventById = jest.fn().mockResolvedValue(mockEvent);

    await handleCalendarWebhook(headers, {});

    expect(calendarService.getEventById).toHaveBeenCalledWith('event-123');
    expect(emailService.sendEmailNotification).not.toHaveBeenCalled();
  });

  it('should not process the same webhook message twice', async () => {
    const headers = { 'x-goog-message-number': '3', 'x-goog-resource-id': 'event-123' };
    const mockEvent = {
      summary: 'Test Event',
      organizer: { email: 'organizer@example.com' },
      attendees: [{ email: 'attendee@example.com', responseStatus: 'declined' }],
    };
    calendarService.getEventById = jest.fn().mockResolvedValue(mockEvent);

    await handleCalendarWebhook(headers, {});
    await handleCalendarWebhook(headers, {});

    expect(calendarService.getEventById).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmailNotification).toHaveBeenCalledTimes(1);
  });
});
