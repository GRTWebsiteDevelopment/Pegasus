import request from 'supertest';
import app from '../src/app';

describe('POST /webhook', () => {
  it('accepts webhook payload', async () => {
    const res = await request(app)
      .post('/webhook')
      .send({ eventId: '123', action: 'created', timestampIso: new Date().toISOString() });
    expect(res.status).toBe(204);
  });
});

