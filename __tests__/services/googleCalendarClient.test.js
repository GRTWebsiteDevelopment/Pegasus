const { google } = require('googleapis');
const { GoogleCalendarClient } = require('../../src/services/googleCalendarClient');
const {
  AuthenticationError,
  EventNotFoundError,
  InvalidEventDataError,
  QuotaExceededError,
  PermissionError,
  CalendarError,
} = require('../../src/utils/errors');

// Mock googleapis
jest.mock('googleapis');

describe('GoogleCalendarClient', () => {
  let mockCalendar;
  let mockOAuth2Client;
  let mockEventsInsert;
  let mockEventsPatch;
  let mockEventsGet;
  let mockEventsDelete;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock events API methods
    mockEventsInsert = jest.fn();
    mockEventsPatch = jest.fn();
    mockEventsGet = jest.fn();
    mockEventsDelete = jest.fn();

    // Mock calendar instance
    mockCalendar = {
      events: {
        insert: mockEventsInsert,
        patch: mockEventsPatch,
        get: mockEventsGet,
        delete: mockEventsDelete,
      },
    };

    // Mock OAuth2 client
    mockOAuth2Client = {
      setCredentials: jest.fn(),
    };

    // Mock google.auth.OAuth2
    google.auth = {
      OAuth2: jest.fn().mockImplementation(() => mockOAuth2Client),
    };

    // Mock google.calendar
    google.calendar = jest.fn().mockReturnValue(mockCalendar);
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
        refreshToken: 'test-refresh-token',
      };

      const client = new GoogleCalendarClient(credentials);
      await client.initialize();

      expect(client.initialized).toBe(true);
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'http://localhost:3000/callback'
      );
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: 'test-refresh-token',
      });
      expect(google.calendar).toHaveBeenCalledWith({
        version: 'v3',
        auth: mockOAuth2Client,
      });
    });

    it('should throw AuthenticationError when clientId is missing', async () => {
      const credentials = {
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      };

      const client = new GoogleCalendarClient(credentials);

      await expect(client.initialize()).rejects.toThrow(AuthenticationError);
      await expect(client.initialize()).rejects.toThrow('Missing Google Calendar API credentials');
    });

    it('should throw AuthenticationError when clientSecret is missing', async () => {
      const credentials = {
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback',
      };

      const client = new GoogleCalendarClient(credentials);

      await expect(client.initialize()).rejects.toThrow(AuthenticationError);
    });

    it('should initialize without refresh token', async () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      };

      const client = new GoogleCalendarClient(credentials);
      await client.initialize();

      expect(client.initialized).toBe(true);
      expect(mockOAuth2Client.setCredentials).not.toHaveBeenCalled();
    });
  });

  describe('createEvent', () => {
    let client;

    beforeEach(async () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      };
      client = new GoogleCalendarClient(credentials);
      await client.initialize();
    });

    it('should create event successfully', async () => {
      const mockResponse = {
        data: {
          id: 'event-123',
          summary: 'Test Meeting',
          start: { dateTime: '2025-10-15T14:00:00Z' },
          end: { dateTime: '2025-10-15T15:00:00Z' },
          status: 'confirmed',
        },
      };

      mockEventsInsert.mockResolvedValue(mockResponse);

      const eventData = {
        summary: 'Test Meeting',
        start: { dateTime: '2025-10-15T14:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2025-10-15T15:00:00Z', timeZone: 'UTC' },
      };

      const result = await client.createEvent('primary', eventData);

      expect(result.id).toBe('event-123');
      expect(result.summary).toBe('Test Meeting');
      expect(mockEventsInsert).toHaveBeenCalledWith({
        calendarId: 'primary',
        resource: eventData,
        sendUpdates: 'all',
      });
    });

    it('should throw InvalidEventDataError when summary is missing', async () => {
      const eventData = {
        start: { dateTime: '2025-10-15T14:00:00Z' },
        end: { dateTime: '2025-10-15T15:00:00Z' },
      };

      await expect(
        client.createEvent('primary', eventData)
      ).rejects.toThrow(InvalidEventDataError);
    });

    it('should throw InvalidEventDataError when start is missing', async () => {
      const eventData = {
        summary: 'Test Meeting',
        end: { dateTime: '2025-10-15T15:00:00Z' },
      };

      await expect(
        client.createEvent('primary', eventData)
      ).rejects.toThrow(InvalidEventDataError);
    });

    it('should throw AuthenticationError on 401 response', async () => {
      const apiError = new Error('Invalid credentials');
      apiError.code = 401;

      mockEventsInsert.mockRejectedValue(apiError);

      const eventData = {
        summary: 'Test Meeting',
        start: { dateTime: '2025-10-15T14:00:00Z' },
        end: { dateTime: '2025-10-15T15:00:00Z' },
      };

      await expect(
        client.createEvent('primary', eventData)
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw PermissionError on 403 response', async () => {
      const apiError = new Error('Permission denied');
      apiError.code = 403;

      mockEventsInsert.mockRejectedValue(apiError);

      const eventData = {
        summary: 'Test Meeting',
        start: { dateTime: '2025-10-15T14:00:00Z' },
        end: { dateTime: '2025-10-15T15:00:00Z' },
      };

      await expect(
        client.createEvent('primary', eventData)
      ).rejects.toThrow(PermissionError);
    });

    it('should throw QuotaExceededError on 429 response', async () => {
      const apiError = new Error('Rate limit exceeded');
      apiError.code = 429;

      mockEventsInsert.mockRejectedValue(apiError);

      const eventData = {
        summary: 'Test Meeting',
        start: { dateTime: '2025-10-15T14:00:00Z' },
        end: { dateTime: '2025-10-15T15:00:00Z' },
      };

      await expect(
        client.createEvent('primary', eventData)
      ).rejects.toThrow(QuotaExceededError);
    });

    it('should throw CalendarError on 500 response', async () => {
      const apiError = new Error('Internal server error');
      apiError.code = 500;

      mockEventsInsert.mockRejectedValue(apiError);

      const eventData = {
        summary: 'Test Meeting',
        start: { dateTime: '2025-10-15T14:00:00Z' },
        end: { dateTime: '2025-10-15T15:00:00Z' },
      };

      await expect(
        client.createEvent('primary', eventData)
      ).rejects.toThrow(CalendarError);
    });

    it('should throw AuthenticationError when not initialized', async () => {
      const uninitializedClient = new GoogleCalendarClient({
        clientId: 'test',
        clientSecret: 'test',
      });

      await expect(
        uninitializedClient.createEvent('primary', {})
      ).rejects.toThrow(AuthenticationError);

      await expect(
        uninitializedClient.createEvent('primary', {})
      ).rejects.toThrow('Google Calendar client not initialized');
    });
  });

  describe('updateEvent', () => {
    let client;

    beforeEach(async () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      };
      client = new GoogleCalendarClient(credentials);
      await client.initialize();
    });

    it('should update event successfully', async () => {
      const mockResponse = {
        data: {
          id: 'event-123',
          summary: 'Updated Meeting',
          updated: '2025-10-04T12:05:00Z',
        },
      };

      mockEventsPatch.mockResolvedValue(mockResponse);

      const updates = {
        summary: 'Updated Meeting',
      };

      const result = await client.updateEvent('primary', 'event-123', updates);

      expect(result.summary).toBe('Updated Meeting');
      expect(mockEventsPatch).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'event-123',
        resource: updates,
        sendUpdates: 'all',
      });
    });

    it('should throw EventNotFoundError on 404 response', async () => {
      const apiError = new Error('Event not found');
      apiError.code = 404;

      mockEventsPatch.mockRejectedValue(apiError);

      await expect(
        client.updateEvent('primary', 'non-existent', {})
      ).rejects.toThrow(EventNotFoundError);
    });
  });

  describe('getEvent', () => {
    let client;

    beforeEach(async () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      };
      client = new GoogleCalendarClient(credentials);
      await client.initialize();
    });

    it('should retrieve event successfully', async () => {
      const mockResponse = {
        data: {
          id: 'event-123',
          summary: 'Test Event',
          start: { dateTime: '2025-10-15T14:00:00Z' },
          end: { dateTime: '2025-10-15T15:00:00Z' },
        },
      };

      mockEventsGet.mockResolvedValue(mockResponse);

      const result = await client.getEvent('primary', 'event-123');

      expect(result.id).toBe('event-123');
      expect(result.summary).toBe('Test Event');
      expect(mockEventsGet).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'event-123',
      });
    });

    it('should throw EventNotFoundError when event does not exist', async () => {
      const apiError = new Error('Not found');
      apiError.code = 404;

      mockEventsGet.mockRejectedValue(apiError);

      await expect(
        client.getEvent('primary', 'non-existent')
      ).rejects.toThrow(EventNotFoundError);
    });
  });

  describe('deleteEvent', () => {
    let client;

    beforeEach(async () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      };
      client = new GoogleCalendarClient(credentials);
      await client.initialize();
    });

    it('should delete event successfully', async () => {
      mockEventsDelete.mockResolvedValue({});

      await client.deleteEvent('primary', 'event-123');

      expect(mockEventsDelete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'event-123',
        sendUpdates: 'all',
      });
    });

    it('should throw EventNotFoundError when event does not exist', async () => {
      const apiError = new Error('Not found');
      apiError.code = 404;

      mockEventsDelete.mockRejectedValue(apiError);

      await expect(
        client.deleteEvent('primary', 'non-existent')
      ).rejects.toThrow(EventNotFoundError);
    });
  });

  describe('handleGoogleAPIError', () => {
    let client;

    beforeEach(async () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      };
      client = new GoogleCalendarClient(credentials);
      await client.initialize();
    });

    it('should handle 400 Bad Request', () => {
      const error = new Error('Bad request');
      error.code = 400;

      const result = client.handleGoogleAPIError(error, 'test operation');

      expect(result).toBeInstanceOf(InvalidEventDataError);
      expect(result.context.operation).toBe('test operation');
    });

    it('should handle 401 Unauthorized', () => {
      const error = new Error('Unauthorized');
      error.code = 401;

      const result = client.handleGoogleAPIError(error, 'test operation');

      expect(result).toBeInstanceOf(AuthenticationError);
    });

    it('should handle 403 Forbidden', () => {
      const error = new Error('Forbidden');
      error.code = 403;

      const result = client.handleGoogleAPIError(error, 'test operation');

      expect(result).toBeInstanceOf(PermissionError);
    });

    it('should handle 404 Not Found with eventId', () => {
      const error = new Error('Not found');
      error.code = 404;

      const result = client.handleGoogleAPIError(error, 'test operation', {
        eventId: 'event-123',
      });

      expect(result).toBeInstanceOf(EventNotFoundError);
      expect(result.context.eventId).toBe('event-123');
    });

    it('should handle 429 Rate Limit', () => {
      const error = new Error('Rate limit');
      error.code = 429;

      const result = client.handleGoogleAPIError(error, 'test operation');

      expect(result).toBeInstanceOf(QuotaExceededError);
    });

    it('should handle 500 Server Error', () => {
      const error = new Error('Server error');
      error.code = 500;

      const result = client.handleGoogleAPIError(error, 'test operation');

      expect(result).toBeInstanceOf(CalendarError);
    });

    it('should handle unknown error codes', () => {
      const error = new Error('Unknown error');
      error.code = 999;

      const result = client.handleGoogleAPIError(error, 'test operation');

      expect(result).toBeInstanceOf(CalendarError);
      expect(result.message).toContain('Failed to test operation');
    });
  });
});

