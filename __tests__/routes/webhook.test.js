const request = require('supertest');
const app = require('../../src/app');
const config = require('../../src/config');
const { WebhookProcessor } = require('../../src/services/webhookProcessor');

// Mock realCalendarService before requiring it
jest.mock('../../src/services/realCalendarService', () => ({
  handleCalendarWebhook: jest.fn(),
  getEventById: jest.fn(),
  createCalendarEvent: jest.fn(),
  updateCalendarEvent: jest.fn(),
}));

const realCalendarService = require('../../src/services/realCalendarService');

describe('Webhook Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    WebhookProcessor.clearProcessedWebhooks();
  });

  describe('POST /api/webhook/calendar', () => {
    const WEBHOOK_SECRET = config.webhook.secret || 'default_webhook_secret_for_testing';

    it('should handle calendar webhook with valid token (sync)', async () => {
      // Mock handleCalendarWebhook to return a successful sync result
      realCalendarService.handleCalendarWebhook.mockResolvedValue({
        success: true,
        cached: false,
        result: {
          action: 'sync',
          event: null,
          notificationsSent: 0,
          webhookId: 'channel-123:resource-456:mock',
        },
      });

      const response = await request(app)
        .post('/api/webhook/calendar')
        .set('x-goog-channel-token', WEBHOOK_SECRET)
        .set('x-goog-channel-id', 'channel-123')
        .set('x-goog-resource-id', 'resource-456')
        .set('x-goog-resource-state', 'sync')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.action).toBe('sync');
    });

    it('should handle webhook for existing event', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Webhook Test Event',
        start: { dateTime: '2025-10-10T10:00:00Z' },
        end: { dateTime: '2025-10-10T11:00:00Z' },
        attendees: [],
      };

      // Mock handleCalendarWebhook to return a successful update result
      realCalendarService.handleCalendarWebhook.mockResolvedValue({
        success: true,
        cached: false,
        result: {
          action: 'created_or_updated',
          event: mockEvent,
          notificationsSent: 0,
          webhookId: 'channel-123:resource-456:mock',
        },
      });

      const response = await request(app)
        .post('/api/webhook/calendar')
        .set('x-goog-channel-token', WEBHOOK_SECRET)
        .set('x-goog-channel-id', 'channel-123')
        .set('x-goog-resource-id', 'resource-456')
        .set('x-goog-resource-state', 'exists')
        .send({ eventId: 'event-123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.action).toBe('created_or_updated');
      expect(response.body.result.event).toBeDefined();
      expect(response.body.result.event.id).toBe('event-123');
    });

    it('should handle webhook for deleted event', async () => {
      // Mock handleCalendarWebhook to return a successful deletion result
      realCalendarService.handleCalendarWebhook.mockResolvedValue({
        success: true,
        cached: false,
        result: {
          action: 'deleted',
          event: null,
          notificationsSent: 0,
          webhookId: 'channel-123:resource-456:mock',
        },
      });

      const response = await request(app)
        .post('/api/webhook/calendar')
        .set('x-goog-channel-token', WEBHOOK_SECRET)
        .set('x-goog-channel-id', 'channel-123')
        .set('x-goog-resource-id', 'resource-456')
        .set('x-goog-resource-state', 'not_exists')
        .send({ eventId: 'deleted-event-id' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.action).toBe('deleted');
    });

    it('should return 401 for invalid webhook token', async () => {
      const response = await request(app)
        .post('/api/webhook/calendar')
        .set('x-goog-channel-token', 'invalid-token')
        .set('x-goog-channel-id', 'channel-123')
        .set('x-goog-resource-id', 'resource-456')
        .set('x-goog-resource-state', 'sync')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 401 for missing webhook token', async () => {
      const response = await request(app)
        .post('/api/webhook/calendar')
        .set('x-goog-channel-id', 'channel-123')
        .set('x-goog-resource-id', 'resource-456')
        .set('x-goog-resource-state', 'sync')
        .send({});

      // When no token is provided, it won't match and should return 401
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should handle duplicate webhooks (idempotency)', async () => {
      const mockEvent = {
        id: 'event-456',
        summary: 'Idempotency Test',
        attendees: [],
      };

      // First call - not cached
      realCalendarService.handleCalendarWebhook
        .mockResolvedValueOnce({
          success: true,
          cached: false,
          result: {
            action: 'created_or_updated',
            event: mockEvent,
            notificationsSent: 0,
            webhookId: 'channel-123:resource-456:1',
          },
        })
        // Second call - cached
        .mockResolvedValueOnce({
          success: true,
          cached: true,
          result: {
            action: 'created_or_updated',
            event: mockEvent,
            notificationsSent: 0,
            webhookId: 'channel-123:resource-456:1',
          },
        });

      // First request
      const response1 = await request(app)
        .post('/api/webhook/calendar')
        .set('x-goog-channel-token', WEBHOOK_SECRET)
        .set('x-goog-channel-id', 'channel-123')
        .set('x-goog-resource-id', 'resource-456')
        .set('x-goog-resource-state', 'exists')
        .set('x-goog-message-number', '1')
        .send({ eventId: 'event-456' })
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response1.body.cached).toBe(false);

      // Second request (duplicate)
      const response2 = await request(app)
        .post('/api/webhook/calendar')
        .set('x-goog-channel-token', WEBHOOK_SECRET)
        .set('x-goog-channel-id', 'channel-123')
        .set('x-goog-resource-id', 'resource-456')
        .set('x-goog-resource-state', 'exists')
        .set('x-goog-message-number', '1')
        .send({ eventId: 'event-456' })
        .expect(200);

      expect(response2.body.success).toBe(true);
      expect(response2.body.cached).toBe(true);

      // handleCalendarWebhook should be called twice
      expect(realCalendarService.handleCalendarWebhook).toHaveBeenCalledTimes(2);
    });

    it('should trigger notifications for events with attendees', async () => {
      const mockEvent = {
        id: 'event-789',
        summary: 'Team Meeting',
        attendees: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' },
        ],
      };

      // Mock handleCalendarWebhook to return a result with notifications sent
      realCalendarService.handleCalendarWebhook.mockResolvedValue({
        success: true,
        cached: false,
        result: {
          action: 'created_or_updated',
          event: mockEvent,
          notificationsSent: 2,
          webhookId: 'channel-789:resource-999:mock',
        },
      });

      const response = await request(app)
        .post('/api/webhook/calendar')
        .set('x-goog-channel-token', WEBHOOK_SECRET)
        .set('x-goog-channel-id', 'channel-789')
        .set('x-goog-resource-id', 'resource-999')
        .set('x-goog-resource-state', 'exists')
        .send({ eventId: 'event-789' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.notificationsSent).toBe(2);
      expect(response.body.result.event.attendees).toHaveLength(2);
    });
  });
});

