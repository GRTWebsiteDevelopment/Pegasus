const { WebhookProcessor } = require('../../src/services/webhookProcessor');
const realCalendarService = require('../../src/services/realCalendarService');
const emailService = require('../../src/services/emailService');
const { WebhookError } = require('../../src/utils/errors');

// Mock dependencies
jest.mock('../../src/services/realCalendarService');
jest.mock('../../src/services/emailService');

describe('WebhookProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    WebhookProcessor.clearProcessedWebhooks();
  });

  describe('generateWebhookId', () => {
    it('should generate unique webhook ID from headers', () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '789',
      };

      const id = WebhookProcessor.generateWebhookId(webhookData);
      expect(id).toBe('channel-123:resource-456:789');
    });

    it('should use timestamp if messageNumber is missing', () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
      };

      const id = WebhookProcessor.generateWebhookId(webhookData);
      expect(id).toContain('channel-123:resource-456:');
    });
  });

  describe('parseEventChange', () => {
    it('should parse created/updated event', () => {
      const changes = WebhookProcessor.parseEventChange('exists', 'event-123');

      expect(changes.type).toBe('created_or_updated');
      expect(changes.requiresUpdate).toBe(true);
      expect(changes.requiresNotification).toBe(true);
      expect(changes.eventId).toBe('event-123');
    });

    it('should parse deleted event', () => {
      const changes = WebhookProcessor.parseEventChange('not_exists', 'event-123');

      expect(changes.type).toBe('deleted');
      expect(changes.requiresUpdate).toBe(false);
      expect(changes.requiresNotification).toBe(true);
    });

    it('should parse sync notification', () => {
      const changes = WebhookProcessor.parseEventChange('sync');

      expect(changes.type).toBe('sync');
      expect(changes.requiresUpdate).toBe(false);
      expect(changes.requiresNotification).toBe(false);
    });

    it('should handle unknown resource state', () => {
      const changes = WebhookProcessor.parseEventChange('unknown_state');

      expect(changes.type).toBe('unknown');
      expect(changes.requiresUpdate).toBe(false);
      expect(changes.requiresNotification).toBe(false);
    });
  });

  describe('idempotency', () => {
    it('should detect already processed webhooks', () => {
      const webhookId = 'webhook-123';
      const result = { action: 'test' };

      expect(WebhookProcessor.isProcessed(webhookId)).toBe(false);

      WebhookProcessor.markProcessed(webhookId, result);
      expect(WebhookProcessor.isProcessed(webhookId)).toBe(true);
    });

    it('should return cached result for duplicate webhooks', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '1',
        channelToken: 'valid-token',
        resourceState: 'sync',
      };

      // First call - should process
      const result1 = await WebhookProcessor.process(webhookData);
      expect(result1.cached).toBe(false);
      expect(result1.success).toBe(true);

      // Second call - should return cached
      const result2 = await WebhookProcessor.process(webhookData);
      expect(result2.cached).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should expire old webhook records', () => {
      const webhookId = 'webhook-old';
      const result = { action: 'test' };

      WebhookProcessor.markProcessed(webhookId, result);

      // Manually set old timestamp (25 hours ago)
      const record = WebhookProcessor.getProcessedWebhook(webhookId);
      record.processedAt = Date.now() - (25 * 60 * 60 * 1000);

      expect(WebhookProcessor.isProcessed(webhookId)).toBe(false);
    });
  });

  describe('processEventUpdate', () => {
    it('should fetch and return event data', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Test Event',
        attendees: [{ email: 'user@example.com' }],
      };

      realCalendarService.getEventById.mockResolvedValue({
        success: true,
        event: mockEvent,
      });

      const event = await WebhookProcessor.processEventUpdate('event-123');

      expect(event).toEqual(mockEvent);
      expect(realCalendarService.getEventById).toHaveBeenCalledWith('event-123');
    });

    it('should throw error if event fetch fails', async () => {
      realCalendarService.getEventById.mockRejectedValue(
        new Error('Event not found')
      );

      await expect(
        WebhookProcessor.processEventUpdate('non-existent')
      ).rejects.toThrow('Event not found');
    });
  });

  describe('sendNotifications', () => {
    it('should send update notifications for created_or_updated events', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Test Event',
        attendees: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' },
        ],
      };

      emailService.sendEventUpdatedNotification.mockResolvedValue([
        { success: true },
        { success: true },
      ]);

      const results = await WebhookProcessor.sendNotifications(
        mockEvent,
        'created_or_updated'
      );

      expect(results).toHaveLength(2);
      expect(emailService.sendEventUpdatedNotification).toHaveBeenCalledWith(mockEvent);
    });

    it('should send deletion notifications for deleted events', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Deleted Event',
        attendees: [{ email: 'user@example.com' }],
      };

      emailService.sendEmailNotification.mockResolvedValue({
        success: true,
        emailId: 'email-123',
      });

      const results = await WebhookProcessor.sendNotifications(
        mockEvent,
        'deleted'
      );

      expect(results).toHaveLength(1);
      expect(emailService.sendEmailNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Cancelled'),
        })
      );
    });

    it('should handle events without attendees', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Solo Event',
        attendees: [],
      };

      const results = await WebhookProcessor.sendNotifications(
        mockEvent,
        'created_or_updated'
      );

      expect(results).toHaveLength(0);
      expect(emailService.sendEventUpdatedNotification).not.toHaveBeenCalled();
    });

    it('should not throw if notifications fail', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Test Event',
        attendees: [{ email: 'user@example.com' }],
      };

      emailService.sendEventUpdatedNotification.mockRejectedValue(
        new Error('Email service down')
      );

      const results = await WebhookProcessor.sendNotifications(
        mockEvent,
        'created_or_updated'
      );

      expect(results).toHaveLength(0); // Returns empty array on failure
    });
  });

  describe('process (full pipeline)', () => {
    it('should process event update webhook end-to-end', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '1',
        channelToken: 'valid-token',
        resourceState: 'exists',
        eventId: 'event-123',
      };

      const mockEvent = {
        id: 'event-123',
        summary: 'Updated Event',
        attendees: [{ email: 'user@example.com' }],
      };

      realCalendarService.getEventById.mockResolvedValue({
        success: true,
        event: mockEvent,
      });

      emailService.sendEventUpdatedNotification.mockResolvedValue([
        { success: true, emailId: 'email-123' },
      ]);

      const result = await WebhookProcessor.process(webhookData);

      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
      expect(result.result.action).toBe('created_or_updated');
      expect(result.result.event).toEqual(mockEvent);
      expect(result.result.notificationsSent).toBe(1);

      // Verify pipeline stages
      expect(realCalendarService.getEventById).toHaveBeenCalledWith('event-123');
      expect(emailService.sendEventUpdatedNotification).toHaveBeenCalledWith(mockEvent);
    });

    it('should process event deletion webhook', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '2',
        channelToken: 'valid-token',
        resourceState: 'not_exists',
        eventId: 'event-deleted',
      };

      const result = await WebhookProcessor.process(webhookData);

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('deleted');
      expect(result.result.event).toBeNull();
      expect(realCalendarService.getEventById).not.toHaveBeenCalled();
    });

    it('should process sync notification webhook', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '3',
        channelToken: 'valid-token',
        resourceState: 'sync',
      };

      const result = await WebhookProcessor.process(webhookData);

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('sync');
      expect(result.result.event).toBeNull();
      expect(result.result.notificationsSent).toBe(0);
    });

    it('should throw error for missing channel token', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '4',
        resourceState: 'exists',
        eventId: 'event-123',
      };

      await expect(
        WebhookProcessor.process(webhookData)
      ).rejects.toThrow(WebhookError);

      await expect(
        WebhookProcessor.process(webhookData)
      ).rejects.toThrow('Missing channel token');
    });

    it('should handle errors during event update gracefully', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '5',
        channelToken: 'valid-token',
        resourceState: 'exists',
        eventId: 'failing-event',
      };

      realCalendarService.getEventById.mockRejectedValue(
        new Error('API error')
      );

      await expect(
        WebhookProcessor.process(webhookData)
      ).rejects.toThrow('API error');

      // Should not be marked as processed on failure
      const webhookId = WebhookProcessor.generateWebhookId(webhookData);
      expect(WebhookProcessor.isProcessed(webhookId)).toBe(false);
    });

    it('should log all pipeline stages', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '6',
        channelToken: 'valid-token',
        resourceState: 'exists',
        eventId: 'event-123',
      };

      const mockEvent = {
        id: 'event-123',
        summary: 'Test Event',
        attendees: [],
      };

      realCalendarService.getEventById.mockResolvedValue({
        success: true,
        event: mockEvent,
      });

      await WebhookProcessor.process(webhookData);

      // Verify webhook is marked as processed (applied stage)
      const webhookId = WebhookProcessor.generateWebhookId(webhookData);
      expect(WebhookProcessor.isProcessed(webhookId)).toBe(true);
    });

    it('should return cached result for duplicate webhook (idempotency)', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '7',
        channelToken: 'valid-token',
        resourceState: 'exists',
        eventId: 'event-123',
      };

      const mockEvent = {
        id: 'event-123',
        summary: 'Test Event',
        attendees: [],
      };

      realCalendarService.getEventById.mockResolvedValue({
        success: true,
        event: mockEvent,
      });

      // First call
      const result1 = await WebhookProcessor.process(webhookData);
      expect(result1.cached).toBe(false);
      expect(realCalendarService.getEventById).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await WebhookProcessor.process(webhookData);
      expect(result2.cached).toBe(true);
      expect(result2.result).toEqual(result1.result);
      // getEventById should not be called again
      expect(realCalendarService.getEventById).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple webhooks for same event', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Test Event',
        attendees: [{ email: 'user@example.com' }],
      };

      realCalendarService.getEventById.mockResolvedValue({
        success: true,
        event: mockEvent,
      });

      emailService.sendEventUpdatedNotification.mockResolvedValue([
        { success: true },
      ]);

      // First webhook - message 1
      const webhook1 = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '1',
        channelToken: 'valid-token',
        resourceState: 'exists',
        eventId: 'event-123',
      };

      const result1 = await WebhookProcessor.process(webhook1);
      expect(result1.cached).toBe(false);

      // Second webhook - message 2 (different message number)
      const webhook2 = {
        ...webhook1,
        messageNumber: '2',
      };

      const result2 = await WebhookProcessor.process(webhook2);
      expect(result2.cached).toBe(false); // Different webhook ID, so not cached
      
      // Should have called API twice
      expect(realCalendarService.getEventById).toHaveBeenCalledTimes(2);
    });
  });

  describe('error scenarios', () => {
    it('should handle network failures during event fetch', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '10',
        channelToken: 'valid-token',
        resourceState: 'exists',
        eventId: 'event-123',
      };

      realCalendarService.getEventById.mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(
        WebhookProcessor.process(webhookData)
      ).rejects.toThrow('Network timeout');
    });

    it('should continue processing even if notifications fail', async () => {
      const webhookData = {
        channelId: 'channel-123',
        resourceId: 'resource-456',
        messageNumber: '11',
        channelToken: 'valid-token',
        resourceState: 'exists',
        eventId: 'event-123',
      };

      const mockEvent = {
        id: 'event-123',
        summary: 'Test Event',
        attendees: [{ email: 'user@example.com' }],
      };

      realCalendarService.getEventById.mockResolvedValue({
        success: true,
        event: mockEvent,
      });

      emailService.sendEventUpdatedNotification.mockRejectedValue(
        new Error('Email service unavailable')
      );

      // Should not throw even if notifications fail
      const result = await WebhookProcessor.process(webhookData);

      expect(result.success).toBe(true);
      expect(result.result.notificationsSent).toBe(0);
      expect(result.result.event).toEqual(mockEvent);
    });
  });
});

