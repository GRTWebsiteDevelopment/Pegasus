const request = require('supertest');
const app = require('../../src/app');
const calendarService = require('../../src/services/calendarService');

describe('Calendar Routes', () => {
  beforeEach(() => {
    calendarService.clearMockDB();
  });

  describe('POST /api/calendar/events', () => {
    it('should create a new calendar event', async () => {
      const eventData = {
        summary: 'API Test Meeting',
        description: 'Testing the API',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
        location: 'Virtual',
        attendees: ['test@example.com'],
      };

      const response = await request(app)
        .post('/api/calendar/events')
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.event).toBeDefined();
      expect(response.body.event.summary).toBe(eventData.summary);
      expect(response.body.event.id).toBeDefined();
    });

    it('should return 400 for invalid event data', async () => {
      const invalidData = {
        summary: 'Test',
        // Missing required startDateTime and endDateTime
      };

      const response = await request(app)
        .post('/api/calendar/events')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toBeDefined();
    });

    it('should validate email format for attendees', async () => {
      const eventData = {
        summary: 'Test Meeting',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
        attendees: ['invalid-email'],
      };

      const response = await request(app)
        .post('/api/calendar/events')
        .send(eventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('GET /api/calendar/events/:eventId', () => {
    it('should retrieve an existing event', async () => {
      // First create an event
      const eventData = {
        summary: 'Test Event',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
      };

      const createResponse = await request(app)
        .post('/api/calendar/events')
        .send(eventData);

      const eventId = createResponse.body.event.id;

      // Now retrieve it
      const response = await request(app)
        .get(`/api/calendar/events/${eventId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.event.id).toBe(eventId);
      expect(response.body.event.summary).toBe(eventData.summary);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/calendar/events/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/calendar/events/:eventId', () => {
    it('should update an existing event', async () => {
      // First create an event
      const eventData = {
        summary: 'Original Event',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
      };

      const createResponse = await request(app)
        .post('/api/calendar/events')
        .send(eventData);

      const eventId = createResponse.body.event.id;

      // Now update it
      const updates = {
        summary: 'Updated Event',
        location: 'New Location',
      };

      const response = await request(app)
        .put(`/api/calendar/events/${eventId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.event.summary).toBe('Updated Event');
      expect(response.body.event.location).toBe('New Location');
    });

    it('should return 400 for invalid update data', async () => {
      const eventData = {
        summary: 'Test Event',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
      };

      const createResponse = await request(app)
        .post('/api/calendar/events')
        .send(eventData);

      const eventId = createResponse.body.event.id;

      const invalidUpdates = {
        attendees: ['invalid-email'],
      };

      const response = await request(app)
        .put(`/api/calendar/events/${eventId}`)
        .send(invalidUpdates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return error for non-existent event', async () => {
      const updates = {
        summary: 'Updated Event',
      };

      const response = await request(app)
        .put('/api/calendar/events/non-existent-id')
        .send(updates)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});

