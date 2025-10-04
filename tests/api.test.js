const request = require('supertest');
const app = require('../src/app');

describe('Health Endpoint', () => {
  it('should return 200 OK and status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
  });
});

describe('Calendar API', () => {
  it('should create an event', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({
        title: 'Test Event',
        startTime: '2025-12-25T10:00:00Z',
        endTime: '2025-12-25T11:00:00Z',
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title', 'Test Event');
  });

  it('should get an event by ID', async () => {
    const res = await request(app).get('/api/events/mock-event-id');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', 'mock-event-id');
  });

  it('should update an event', async () => {
    const res = await request(app)
      .put('/api/events/mock-event-id')
      .send({
        title: 'Updated Test Event',
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('title', 'Updated Test Event');
  });

  it('should handle a webhook', async () => {
    const res = await request(app)
      .post('/api/webhook')
      .send({
        type: 'event.updated',
        data: {},
      });
    expect(res.statusCode).toEqual(200);
  });
});
