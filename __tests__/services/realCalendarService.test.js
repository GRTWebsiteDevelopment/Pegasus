const realCalendarService = require('../../src/services/realCalendarService');
const { GoogleCalendarClient } = require('../../src/services/googleCalendarClient');
const {
  CalendarError,
  AuthenticationError,
  EventNotFoundError,
  InvalidEventDataError,
  QuotaExceededError,
  PermissionError,
} = require('../../src/utils/errors');

// Mock the Google Calendar client
jest.mock('../../src/services/googleCalendarClient');

describe('Real Calendar Service with Google API', () => {
  let mockCalendarClient;
  let mockCreateEvent;
  let mockUpdateEvent;
  let mockGetEvent;
  let mockDeleteEvent;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Create mock functions
    mockCreateEvent = jest.fn();
    mockUpdateEvent = jest.fn();
    mockGetEvent = jest.fn();
    mockDeleteEvent = jest.fn();

    // Mock client instance
    mockCalendarClient = {
      initialize: jest.fn().mockResolvedValue(undefined),
      ensureInitialized: jest.fn(),
      createEvent: mockCreateEvent,
      updateEvent: mockUpdateEvent,
      getEvent: mockGetEvent,
      deleteEvent: mockDeleteEvent,
      initialized: true,
    };

    // Mock the module before requiring it
    jest.mock('../../src/services/googleCalendarClient', () => ({
      createGoogleCalendarClient: jest.fn(),
      GoogleCalendarClient: jest.fn(),
    }));

    // Get the mocked function and set its return value
    const googleCalendarClient = require('../../src/services/googleCalendarClient');
    googleCalendarClient.createGoogleCalendarClient.mockResolvedValue(mockCalendarClient);
  });

  describe('createCalendarEvent', () => {
    it('should create event successfully with Google Calendar API', async () => {
      const mockGoogleResponse = {
        id: 'google-event-123',
        summary: 'Product Launch',
        description: 'Launch event for new product',
        location: 'San Francisco Office',
        start: {
          dateTime: '2025-10-15T14:00:00Z',
          timeZone: 'UTC',
        },
        end: {
          dateTime: '2025-10-15T15:30:00Z',
          timeZone: 'UTC',
        },
        attendees: [
          { email: 'john@example.com', responseStatus: 'needsAction' },
          { email: 'jane@example.com', responseStatus: 'needsAction' },
        ],
        status: 'confirmed',
        created: '2025-10-04T12:00:00.000Z',
        updated: '2025-10-04T12:00:00.000Z',
        htmlLink: 'https://calendar.google.com/event?eid=...',
      };

      mockCreateEvent.mockResolvedValue(mockGoogleResponse);

      const eventDetails = {
        summary: 'Product Launch',
        description: 'Launch event for new product',
        startDateTime: '2025-10-15T14:00:00Z',
        endDateTime: '2025-10-15T15:30:00Z',
        location: 'San Francisco Office',
        timeZone: 'UTC',
        attendees: ['john@example.com', 'jane@example.com'],
      };

      const result = await realCalendarService.createCalendarEvent(eventDetails);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.event.id).toBe('google-event-123');
      expect(result.event.summary).toBe('Product Launch');
      expect(result.invitesSent).toBe(true);
      expect(result.metadata.attendeesNotified).toBe(2);

      // Verify API was called with correct parameters
      expect(mockCreateEvent).toHaveBeenCalledWith('primary', expect.objectContaining({
        summary: 'Product Launch',
        description: 'Launch event for new product',
        location: 'San Francisco Office',
        start: {
          dateTime: '2025-10-15T14:00:00Z',
          timeZone: 'UTC',
        },
        end: {
          dateTime: '2025-10-15T15:30:00Z',
          timeZone: 'UTC',
        },
        attendees: [
          { email: 'john@example.com', responseStatus: 'needsAction' },
          { email: 'jane@example.com', responseStatus: 'needsAction' },
        ],
      }));
    });

    it('should throw InvalidEventDataError when summary is missing', async () => {
      const eventDetails = {
        startDateTime: '2025-10-15T14:00:00Z',
        endDateTime: '2025-10-15T15:30:00Z',
      };

      await expect(
        realCalendarService.createCalendarEvent(eventDetails)
      ).rejects.toThrow(InvalidEventDataError);

      await expect(
        realCalendarService.createCalendarEvent(eventDetails)
      ).rejects.toThrow('Event summary is required');

      expect(mockCreateEvent).not.toHaveBeenCalled();
    });

    it('should throw InvalidEventDataError when start/end times are missing', async () => {
      const eventDetails = {
        summary: 'Test Event',
      };

      await expect(
        realCalendarService.createCalendarEvent(eventDetails)
      ).rejects.toThrow(InvalidEventDataError);

      await expect(
        realCalendarService.createCalendarEvent(eventDetails)
      ).rejects.toThrow('Event start and end times are required');
    });

    it('should handle AuthenticationError from Google API', async () => {
      const authError = new AuthenticationError('Invalid credentials', {
        statusCode: 401,
      });
      authError.isOperational = true;

      mockCreateEvent.mockRejectedValueOnce(authError);

      const eventDetails = {
        summary: 'Test Event',
        startDateTime: '2025-10-15T14:00:00Z',
        endDateTime: '2025-10-15T15:30:00Z',
      };

      await expect(
        realCalendarService.createCalendarEvent(eventDetails)
      ).rejects.toThrow(AuthenticationError);
    });

    it('should handle QuotaExceededError from Google API', async () => {
      const quotaError = new QuotaExceededError('Rate limit exceeded', {
        statusCode: 429,
      });
      quotaError.isOperational = true;

      mockCreateEvent.mockRejectedValueOnce(quotaError);

      const eventDetails = {
        summary: 'Test Event',
        startDateTime: '2025-10-15T14:00:00Z',
        endDateTime: '2025-10-15T15:30:00Z',
      };

      await expect(
        realCalendarService.createCalendarEvent(eventDetails)
      ).rejects.toThrow(QuotaExceededError);
    });

    it('should handle PermissionError from Google API', async () => {
      const permError = new PermissionError('Insufficient permissions', {
        statusCode: 403,
      });
      permError.isOperational = true;

      mockCreateEvent.mockRejectedValueOnce(permError);

      const eventDetails = {
        summary: 'Test Event',
        startDateTime: '2025-10-15T14:00:00Z',
        endDateTime: '2025-10-15T15:30:00Z',
      };

      await expect(
        realCalendarService.createCalendarEvent(eventDetails)
      ).rejects.toThrow(PermissionError);
    });

    it('should create event with default timezone when not specified', async () => {
      const mockResponse = {
        id: 'event-123',
        summary: 'Test Event',
        start: { dateTime: '2025-10-15T14:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2025-10-15T15:00:00Z', timeZone: 'UTC' },
        attendees: [],
      };

      mockCreateEvent.mockResolvedValueOnce(mockResponse);

      const eventDetails = {
        summary: 'Test Event',
        startDateTime: '2025-10-15T14:00:00Z',
        endDateTime: '2025-10-15T15:00:00Z',
      };

      const result = await realCalendarService.createCalendarEvent(eventDetails);

      expect(result.success).toBe(true);
      expect(mockCreateEvent).toHaveBeenCalled();
      const callArgs = mockCreateEvent.mock.calls[0];
      expect(callArgs[0]).toBe('primary');
      expect(callArgs[1].start.timeZone).toBe('UTC');
      expect(callArgs[1].end.timeZone).toBe('UTC');
    });

    it('should create event without attendees', async () => {
      const mockResponse = {
        id: 'event-123',
        summary: 'Solo Event',
        start: { dateTime: '2025-10-15T14:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2025-10-15T15:00:00Z', timeZone: 'UTC' },
      };

      mockCreateEvent.mockResolvedValueOnce(mockResponse);

      const eventDetails = {
        summary: 'Solo Event',
        startDateTime: '2025-10-15T14:00:00Z',
        endDateTime: '2025-10-15T15:00:00Z',
      };

      const result = await realCalendarService.createCalendarEvent(eventDetails);

      expect(result.success).toBe(true);
      expect(result.metadata.attendeesNotified).toBe(0);
    });

    it('should wrap unknown errors in CalendarError', async () => {
      const unknownError = new Error('Network timeout');
      mockCreateEvent.mockRejectedValueOnce(unknownError);

      const eventDetails = {
        summary: 'Test Event',
        startDateTime: '2025-10-15T14:00:00Z',
        endDateTime: '2025-10-15T15:00:00Z',
      };

      await expect(
        realCalendarService.createCalendarEvent(eventDetails)
      ).rejects.toThrow(CalendarError);
    });
  });

  describe('updateCalendarEvent', () => {
    it('should update event successfully', async () => {
      const mockResponse = {
        id: 'event-123',
        summary: 'Updated Event',
        description: 'Updated description',
        location: 'New Location',
        start: { dateTime: '2025-10-15T15:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2025-10-15T16:00:00Z', timeZone: 'UTC' },
        updated: '2025-10-04T12:05:00.000Z',
      };

      mockUpdateEvent.mockResolvedValue(mockResponse);

      const updates = {
        summary: 'Updated Event',
        description: 'Updated description',
        location: 'New Location',
      };

      const result = await realCalendarService.updateCalendarEvent('event-123', updates);

      expect(result.success).toBe(true);
      expect(result.event.summary).toBe('Updated Event');
      expect(result.metadata.updatedFields).toContain('summary');

      expect(mockUpdateEvent).toHaveBeenCalledWith('primary', 'event-123', expect.objectContaining({
        summary: 'Updated Event',
        description: 'Updated description',
        location: 'New Location',
      }));
    });

    it('should update event times', async () => {
      const mockResponse = {
        id: 'event-123',
        start: { dateTime: '2025-10-16T10:00:00Z', timeZone: 'America/New_York' },
        end: { dateTime: '2025-10-16T11:00:00Z', timeZone: 'America/New_York' },
      };

      mockUpdateEvent.mockResolvedValue(mockResponse);

      const updates = {
        startDateTime: '2025-10-16T10:00:00Z',
        endDateTime: '2025-10-16T11:00:00Z',
        timeZone: 'America/New_York',
      };

      await realCalendarService.updateCalendarEvent('event-123', updates);

      expect(mockUpdateEvent).toHaveBeenCalledWith('primary', 'event-123', expect.objectContaining({
        start: { dateTime: '2025-10-16T10:00:00Z', timeZone: 'America/New_York' },
        end: { dateTime: '2025-10-16T11:00:00Z', timeZone: 'America/New_York' },
      }));
    });

    it('should throw EventNotFoundError when event does not exist', async () => {
      const notFoundError = new EventNotFoundError('event-999', {
        statusCode: 404,
      });
      notFoundError.isOperational = true;

      mockUpdateEvent.mockRejectedValueOnce(notFoundError);

      await expect(
        realCalendarService.updateCalendarEvent('event-999', { summary: 'Test' })
      ).rejects.toThrow(EventNotFoundError);
    });

    it('should update attendees list', async () => {
      const mockResponse = {
        id: 'event-123',
        attendees: [
          { email: 'new@example.com', responseStatus: 'needsAction' },
        ],
      };

      mockUpdateEvent.mockResolvedValue(mockResponse);

      const updates = {
        attendees: ['new@example.com'],
      };

      await realCalendarService.updateCalendarEvent('event-123', updates);

      expect(mockUpdateEvent).toHaveBeenCalledWith('primary', 'event-123', expect.objectContaining({
        attendees: [{ email: 'new@example.com', responseStatus: 'needsAction' }],
      }));
    });
  });

  describe('getEventById', () => {
    it('should retrieve event successfully', async () => {
      const mockResponse = {
        id: 'event-123',
        summary: 'Test Event',
        description: 'Event description',
        start: { dateTime: '2025-10-15T14:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2025-10-15T15:00:00Z', timeZone: 'UTC' },
        status: 'confirmed',
      };

      mockGetEvent.mockResolvedValue(mockResponse);

      const result = await realCalendarService.getEventById('event-123');

      expect(result.success).toBe(true);
      expect(result.event.id).toBe('event-123');
      expect(result.event.summary).toBe('Test Event');

      expect(mockGetEvent).toHaveBeenCalledWith('primary', 'event-123');
    });

    it('should throw EventNotFoundError when event does not exist', async () => {
      const notFoundError = new EventNotFoundError('non-existent', {
        statusCode: 404,
      });
      notFoundError.isOperational = true;

      mockGetEvent.mockRejectedValueOnce(notFoundError);

      await expect(
        realCalendarService.getEventById('non-existent')
      ).rejects.toThrow(EventNotFoundError);
    });

    it('should handle permission errors', async () => {
      const permError = new PermissionError('No access to event', {
        statusCode: 403,
      });
      permError.isOperational = true;

      mockGetEvent.mockRejectedValueOnce(permError);

      await expect(
        realCalendarService.getEventById('event-123')
      ).rejects.toThrow(PermissionError);
    });
  });

  describe('handleCalendarWebhook', () => {
    it('should handle sync webhook for existing event', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Webhook Event',
        start: { dateTime: '2025-10-15T14:00:00Z' },
        end: { dateTime: '2025-10-15T15:00:00Z' },
      };

      mockGetEvent.mockResolvedValue(mockEvent);

      const webhookData = {
        channelToken: 'valid-token',
        channelId: 'channel-123',
        resourceId: 'resource-456',
        resourceState: 'exists',
        eventId: 'event-123',
      };

      const result = await realCalendarService.handleCalendarWebhook(webhookData);

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('synced');
      expect(result.result.event.id).toBe('event-123');
    });

    it('should handle sync notification without event ID', async () => {
      const webhookData = {
        channelToken: 'valid-token',
        channelId: 'channel-123',
        resourceId: 'resource-456',
        resourceState: 'sync',
      };

      const result = await realCalendarService.handleCalendarWebhook(webhookData);

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('sync_notification');
      expect(result.result.resourceId).toBe('resource-456');
    });

    it('should handle deleted event webhook', async () => {
      const webhookData = {
        channelToken: 'valid-token',
        channelId: 'channel-123',
        resourceId: 'resource-456',
        resourceState: 'not_exists',
        eventId: 'deleted-event',
      };

      const result = await realCalendarService.handleCalendarWebhook(webhookData);

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('deleted');
      expect(result.result.eventId).toBe('deleted-event');
    });

    it('should throw CalendarError when channel token is missing', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        resourceState: 'sync',
      };

      await expect(
        realCalendarService.handleCalendarWebhook(webhookData)
      ).rejects.toThrow(CalendarError);

      await expect(
        realCalendarService.handleCalendarWebhook(webhookData)
      ).rejects.toThrow('Missing channel token in webhook');
    });

    it('should handle unknown resource state', async () => {
      const webhookData = {
        channelToken: 'valid-token',
        resourceId: 'resource-456',
        resourceState: 'unknown_state',
      };

      const result = await realCalendarService.handleCalendarWebhook(webhookData);

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('unknown');
      expect(result.result.resourceState).toBe('unknown_state');
    });
  });

  describe('Error Context and Logging', () => {
    it('should include operation context in errors', async () => {
      const apiError = new InvalidEventDataError('Bad request', {
        statusCode: 400,
        field: 'startDateTime',
      });
      apiError.isOperational = true;

      mockCreateEvent.mockRejectedValue(apiError);

      const eventDetails = {
        summary: 'Test',
        startDateTime: 'invalid-date',
        endDateTime: '2025-10-15T15:00:00Z',
      };

      try {
        await realCalendarService.createCalendarEvent(eventDetails);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.name).toBe('InvalidEventDataError');
        expect(error.context).toBeDefined();
        expect(error.isOperational).toBe(true);
      }
    });

    it('should preserve error stack traces', async () => {
      const originalError = new Error('Original error');
      mockCreateEvent.mockRejectedValue(originalError);

      const eventDetails = {
        summary: 'Test',
        startDateTime: '2025-10-15T14:00:00Z',
        endDateTime: '2025-10-15T15:00:00Z',
      };

      try {
        await realCalendarService.createCalendarEvent(eventDetails);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.stack).toBeDefined();
        expect(error instanceof CalendarError).toBe(true);
      }
    });
  });
});

