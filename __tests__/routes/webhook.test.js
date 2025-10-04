const request = require('supertest');
const app = require('../../src/app');
const calendarService = require('../../src/services/calendarService');
const config = require('../../src/config');

describe('Webhook Routes', () => {
  beforeEach(() => {
    calendarService.clearMockDB();
  });

  describe('POST /api/webhook/calendar', () => {
    const WEBHOOK_SECRET = config.webhook.secret || 'default_webhook_secret_for_testing';

    it('should handle calendar webhook with valid token', async () => {
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
    });

    it('should handle webhook for existing event', async () => {
      // Create an event first
      const eventData = {
        summary: 'Webhook Test Event',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
      };

      const created = await calendarService.createCalendarEvent(eventData);

      const response = await request(app)
        .post('/api/webhook/calendar')
        .set('x-goog-channel-token', WEBHOOK_SECRET)
        .set('x-goog-channel-id', 'channel-123')
        .set('x-goog-resource-id', 'resource-456')
        .set('x-goog-resource-state', 'exists')
        .send({ eventId: created.event.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.action).toBe('synced');
      expect(response.body.result.event).toBeDefined();
    });

    it('should handle webhook for deleted event', async () => {
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
  });
});

