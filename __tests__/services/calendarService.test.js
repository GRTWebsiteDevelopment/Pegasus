const calendarService = require('../../src/services/calendarService');

describe('Calendar Service', () => {
  beforeEach(() => {
    // Clear mock database before each test
    calendarService.clearMockDB();
  });

  describe('createCalendarEvent', () => {
    it('should create a calendar event successfully', async () => {
      const eventDetails = {
        summary: 'Team Meeting',
        description: 'Weekly team sync',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
        location: 'Conference Room A',
        attendees: ['user1@example.com', 'user2@example.com'],
      };

      const result = await calendarService.createCalendarEvent(eventDetails);

      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event.id).toBeDefined();
      expect(result.event.summary).toBe(eventDetails.summary);
      expect(result.event.description).toBe(eventDetails.description);
      expect(result.event.attendees).toHaveLength(2);
    });

    it('should create event with default empty values', async () => {
      const eventDetails = {
        summary: 'Simple Event',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
      };

      const result = await calendarService.createCalendarEvent(eventDetails);

      expect(result.success).toBe(true);
      expect(result.event.description).toBe('');
      expect(result.event.location).toBe('');
    });

    it('should handle errors during event creation', async () => {
      // Pass invalid data to trigger an error
      const eventDetails = null;

      await expect(
        calendarService.createCalendarEvent(eventDetails)
      ).rejects.toThrow();
    });
  });

  describe('updateCalendarEvent', () => {
    it('should update an existing calendar event', async () => {
      // First create an event
      const eventDetails = {
        summary: 'Initial Meeting',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
      };

      const created = await calendarService.createCalendarEvent(eventDetails);
      const eventId = created.event.id;

      // Now update it
      const updates = {
        summary: 'Updated Meeting',
        location: 'New Location',
      };

      const result = await calendarService.updateCalendarEvent(eventId, updates);

      expect(result.success).toBe(true);
      expect(result.event.summary).toBe('Updated Meeting');
      expect(result.event.location).toBe('New Location');
      expect(result.event.id).toBe(eventId);
    });

    it('should throw error when updating non-existent event', async () => {
      const updates = {
        summary: 'Updated Meeting',
      };

      await expect(
        calendarService.updateCalendarEvent('non-existent-id', updates)
      ).rejects.toThrow('Event not found');
    });

    it('should update only specified fields', async () => {
      const eventDetails = {
        summary: 'Original Meeting',
        description: 'Original Description',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
      };

      const created = await calendarService.createCalendarEvent(eventDetails);
      const eventId = created.event.id;

      const updates = {
        summary: 'New Summary',
      };

      const result = await calendarService.updateCalendarEvent(eventId, updates);

      expect(result.event.summary).toBe('New Summary');
      expect(result.event.description).toBe('Original Description');
    });
  });

  describe('getEventById', () => {
    it('should retrieve an event by ID', async () => {
      const eventDetails = {
        summary: 'Test Event',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
      };

      const created = await calendarService.createCalendarEvent(eventDetails);
      const eventId = created.event.id;

      const result = await calendarService.getEventById(eventId);

      expect(result.success).toBe(true);
      expect(result.event.id).toBe(eventId);
      expect(result.event.summary).toBe(eventDetails.summary);
    });

    it('should throw error when event not found', async () => {
      await expect(
        calendarService.getEventById('non-existent-id')
      ).rejects.toThrow('Event not found');
    });
  });

  describe('handleCalendarWebhook', () => {
    it('should handle webhook for existing event', async () => {
      const eventDetails = {
        summary: 'Webhook Test Event',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
      };

      const created = await calendarService.createCalendarEvent(eventDetails);

      const webhookData = {
        channelToken: 'test-token',
        resourceState: 'exists',
        resourceId: 'resource-123',
        eventId: created.event.id,
      };

      const result = await calendarService.handleCalendarWebhook(webhookData);

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('synced');
      expect(result.result.event).toBeDefined();
    });

    it('should handle webhook for deleted event', async () => {
      const webhookData = {
        channelToken: 'test-token',
        resourceState: 'not_exists',
        resourceId: 'resource-123',
        eventId: 'deleted-event-id',
      };

      const result = await calendarService.handleCalendarWebhook(webhookData);

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('deleted');
    });

    it('should handle sync notification', async () => {
      const webhookData = {
        channelToken: 'test-token',
        resourceState: 'sync',
        resourceId: 'resource-123',
      };

      const result = await calendarService.handleCalendarWebhook(webhookData);

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('sync_notification');
    });

    it('should throw error when channel token is missing', async () => {
      const webhookData = {
        resourceState: 'exists',
        resourceId: 'resource-123',
      };

      await expect(
        calendarService.handleCalendarWebhook(webhookData)
      ).rejects.toThrow('Missing channel token');
    });
  });
});

