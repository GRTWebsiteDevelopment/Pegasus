const request = require('supertest');
const app = require('../../src/app');
const emailService = require('../../src/services/emailService');

describe('Email Routes', () => {
  beforeEach(() => {
    emailService.clearMockEmailQueue();
  });

  describe('POST /api/email/send', () => {
    it('should send email notification successfully', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        body: 'This is a test email body',
      };

      const response = await request(app)
        .post('/api/email/send')
        .send(emailData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.emailId).toBeDefined();
      expect(response.body.sentAt).toBeDefined();

      const queue = emailService.getMockEmailQueue();
      expect(queue).toHaveLength(1);
    });

    it('should send email to multiple recipients', async () => {
      const emailData = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test Email',
        body: 'This is a test email body',
      };

      const response = await request(app)
        .post('/api/email/send')
        .send(emailData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should send email with event data', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Event Notification',
        body: 'You have a new event',
        event: {
          summary: 'Team Meeting',
          location: 'Room A',
          start: { dateTime: '2025-10-10T10:00:00Z' },
        },
      };

      const response = await request(app)
        .post('/api/email/send')
        .send(emailData)
        .expect(200);

      expect(response.body.success).toBe(true);

      const queue = emailService.getMockEmailQueue();
      expect(queue[0].html).toContain('Team Meeting');
    });

    it('should return 400 for missing recipient', async () => {
      const emailData = {
        subject: 'Test Email',
        body: 'Test body',
      };

      const response = await request(app)
        .post('/api/email/send')
        .send(emailData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 for invalid email format', async () => {
      const emailData = {
        to: 'invalid-email',
        subject: 'Test Email',
        body: 'Test body',
      };

      const response = await request(app)
        .post('/api/email/send')
        .send(emailData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 for missing subject', async () => {
      const emailData = {
        to: 'recipient@example.com',
        body: 'Test body',
      };

      const response = await request(app)
        .post('/api/email/send')
        .send(emailData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

