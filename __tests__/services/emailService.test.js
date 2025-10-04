const emailService = require('../../src/services/emailService');

describe('Email Service', () => {
  beforeEach(() => {
    // Clear mock email queue before each test
    emailService.clearMockEmailQueue();
  });

  describe('sendEmailNotification', () => {
    it('should send email notification successfully', async () => {
      const emailDetails = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
      };

      const result = await emailService.sendEmailNotification(emailDetails);

      expect(result.success).toBe(true);
      expect(result.emailId).toBeDefined();
      expect(result.sentAt).toBeDefined();

      const queue = emailService.getMockEmailQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].to).toContain('recipient@example.com');
      expect(queue[0].subject).toBe('Test Email');
    });

    it('should send email to multiple recipients', async () => {
      const emailDetails = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test Email',
        body: 'This is a test email',
      };

      const result = await emailService.sendEmailNotification(emailDetails);

      expect(result.success).toBe(true);

      const queue = emailService.getMockEmailQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].to).toHaveLength(2);
    });

    it('should generate HTML from event data', async () => {
      const emailDetails = {
        to: 'recipient@example.com',
        subject: 'Event Notification',
        body: 'Event details',
        event: {
          summary: 'Team Meeting',
          description: 'Weekly sync',
          location: 'Room A',
          start: { dateTime: '2025-10-10T10:00:00Z' },
          end: { dateTime: '2025-10-10T11:00:00Z' },
          attendees: [{ email: 'user1@example.com' }],
        },
      };

      const result = await emailService.sendEmailNotification(emailDetails);

      expect(result.success).toBe(true);

      const queue = emailService.getMockEmailQueue();
      expect(queue[0].html).toContain('Team Meeting');
      expect(queue[0].html).toContain('Room A');
    });

    it('should throw error when recipient is missing', async () => {
      const emailDetails = {
        subject: 'Test Email',
        body: 'This is a test email',
      };

      await expect(
        emailService.sendEmailNotification(emailDetails)
      ).rejects.toThrow('Recipient email address is required');
    });

    it('should throw error when subject is missing', async () => {
      const emailDetails = {
        to: 'recipient@example.com',
        body: 'This is a test email',
      };

      await expect(
        emailService.sendEmailNotification(emailDetails)
      ).rejects.toThrow('Email subject is required');
    });

    it('should throw error when body and html are missing', async () => {
      const emailDetails = {
        to: 'recipient@example.com',
        subject: 'Test Email',
      };

      await expect(
        emailService.sendEmailNotification(emailDetails)
      ).rejects.toThrow('Email body or HTML content is required');
    });
  });

  describe('sendEventCreatedNotification', () => {
    it('should send notification to all attendees', async () => {
      const event = {
        id: 'event-123',
        summary: 'New Meeting',
        attendees: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' },
        ],
      };

      const results = await emailService.sendEventCreatedNotification(event);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);

      const queue = emailService.getMockEmailQueue();
      expect(queue).toHaveLength(2);
    });

    it('should return empty array when no attendees', async () => {
      const event = {
        id: 'event-123',
        summary: 'New Meeting',
        attendees: [],
      };

      const results = await emailService.sendEventCreatedNotification(event);

      expect(results).toHaveLength(0);
    });
  });

  describe('sendEventUpdatedNotification', () => {
    it('should send update notification to all attendees', async () => {
      const event = {
        id: 'event-123',
        summary: 'Updated Meeting',
        attendees: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' },
        ],
      };

      const results = await emailService.sendEventUpdatedNotification(event);

      expect(results).toHaveLength(2);

      const queue = emailService.getMockEmailQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].subject).toContain('Event Updated');
    });

    it('should return empty array when no attendees', async () => {
      const event = {
        id: 'event-123',
        summary: 'Updated Meeting',
      };

      const results = await emailService.sendEventUpdatedNotification(event);

      expect(results).toHaveLength(0);
    });
  });
});

