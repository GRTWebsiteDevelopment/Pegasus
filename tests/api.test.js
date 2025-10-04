const request = require('supertest');
const app = require('../src/app');
const { calendar } = require('../src/utils/googleClient');

jest.mock('../src/utils/googleClient', () => ({
  calendar: {
    events: {
      insert: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Health Endpoint', () => {
  it('should return 200 OK and status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
  });
});

describe('Calendar API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an event', async () => {
    const mockEvent = { id: 'mock-event-id', title: 'Test Event', htmlLink: 'link' };
    calendar.events.insert.mockResolvedValue({ data: mockEvent });

    const res = await request(app)
      .post('/api/events')
      .send({
        title: 'Test Event',
        startTime: '2025-12-25T10:00:00Z',
        endTime: '2025-12-25T11:00:00Z',
        attendees: ['test@example.com'],
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual(mockEvent);
    expect(calendar.events.insert).toHaveBeenCalledTimes(1);
  });

  it('should get an event by ID', async () => {
    const mockEvent = { id: 'mock-event-id', title: 'Test Event' };
    calendar.events.get.mockResolvedValue({ data: mockEvent });

    const res = await request(app).get('/api/events/mock-event-id');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', 'mock-event-id');
  });

  it('should update an event', async () => {
    const mockEvent = { id: 'mock-event-id', title: 'Updated Test Event' };
    calendar.events.update.mockResolvedValue({ data: mockEvent });

    const res = await request(app)
      .put('/api/events/mock-event-id')
      .send({
        title: 'Updated Test Event',
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('title', 'Updated Test Event');
  });

  it('should handle a webhook', async () => {
    // This test doesn't involve googleClient, so no mock setup needed here.
    const res = await request(app)
      .post('/api/webhook')
      .send({
        type: 'event.updated',
        data: {},
      });
    expect(res.statusCode).toEqual(200);
  });
});
