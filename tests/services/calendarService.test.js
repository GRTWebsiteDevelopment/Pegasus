const { createCalendarEvent } = require('../../src/services/calendarService');
const { calendar } = require('../../src/utils/googleClient');
const { EventCreationError } = require('../../src/utils/errors');

jest.mock('../../src/utils/googleClient', () => ({
  calendar: {
    events: {
      insert: jest.fn(),
    },
  },
}));

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
