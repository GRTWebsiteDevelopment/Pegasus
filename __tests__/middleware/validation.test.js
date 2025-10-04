const { validateBody, validateParams, schemas } = require('../../src/middleware/validation');

describe('Validation Middleware', () => {
  describe('validateBody', () => {
    it('should pass validation for valid data', () => {
      const req = {
        body: {
          summary: 'Test Event',
          startDateTime: '2025-10-10T10:00:00Z',
          endDateTime: '2025-10-10T11:00:00Z',
        },
        path: '/test',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = validateBody(schemas.createEvent);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.validatedBody).toBeDefined();
    });

    it('should fail validation for invalid data', () => {
      const req = {
        body: {
          summary: 'Test Event',
          // Missing required fields
        },
        path: '/test',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = validateBody(schemas.createEvent);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation error',
          details: expect.any(Array),
        })
      );
    });

    it('should strip unknown fields', () => {
      const req = {
        body: {
          summary: 'Test Event',
          startDateTime: '2025-10-10T10:00:00Z',
          endDateTime: '2025-10-10T11:00:00Z',
          unknownField: 'should be removed',
        },
        path: '/test',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = validateBody(schemas.createEvent);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedBody.unknownField).toBeUndefined();
    });
  });

  describe('validateParams', () => {
    it('should pass validation for valid params', () => {
      const req = {
        params: {
          eventId: 'test-event-id',
        },
        path: '/test',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = validateParams(schemas.eventId);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.validatedParams).toBeDefined();
      expect(req.validatedParams.eventId).toBe('test-event-id');
    });

    it('should fail validation for missing params', () => {
      const req = {
        params: {},
        path: '/test',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = validateParams(schemas.eventId);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Schema: createEvent', () => {
    it('should validate required fields', () => {
      const validData = {
        summary: 'Test Event',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
      };

      const { error } = schemas.createEvent.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should accept optional fields', () => {
      const validData = {
        summary: 'Test Event',
        description: 'Event description',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
        location: 'Room A',
        attendees: ['user@example.com'],
      };

      const { error } = schemas.createEvent.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        summary: 'Test Event',
        startDateTime: '2025-10-10T10:00:00Z',
        endDateTime: '2025-10-10T11:00:00Z',
        attendees: ['invalid-email'],
      };

      const { error } = schemas.createEvent.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Schema: updateEvent', () => {
    it('should allow partial updates', () => {
      const validData = {
        summary: 'Updated Event',
      };

      const { error } = schemas.updateEvent.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should require at least one field', () => {
      const invalidData = {};

      const { error } = schemas.updateEvent.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Schema: sendEmail', () => {
    it('should accept single email recipient', () => {
      const validData = {
        to: 'user@example.com',
        subject: 'Test Email',
        body: 'Test body',
      };

      const { error } = schemas.sendEmail.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should accept multiple email recipients', () => {
      const validData = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test Email',
        body: 'Test body',
      };

      const { error } = schemas.sendEmail.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should require valid email format', () => {
      const invalidData = {
        to: 'invalid-email',
        subject: 'Test Email',
        body: 'Test body',
      };

      const { error } = schemas.sendEmail.validate(invalidData);
      expect(error).toBeDefined();
    });
  });
});

