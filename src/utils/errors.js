/**
 * Custom Error Classes for Typed Error Handling
 */

/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * Calendar API related errors
 */
class CalendarError extends AppError {
  constructor(message, context = {}) {
    super(message, 500, context);
  }
}

/**
 * OAuth/Authentication errors
 */
class AuthenticationError extends AppError {
  constructor(message, context = {}) {
    super(message, 401, context);
  }
}

/**
 * Calendar event not found error
 */
class EventNotFoundError extends AppError {
  constructor(eventId, context = {}) {
    super(`Calendar event not found: ${eventId}`, 404, { eventId, ...context });
  }
}

/**
 * Invalid event data error
 */
class InvalidEventDataError extends AppError {
  constructor(message, context = {}) {
    super(message, 400, context);
  }
}

/**
 * Calendar API quota exceeded error
 */
class QuotaExceededError extends AppError {
  constructor(message, context = {}) {
    super(message, 429, context);
  }
}

/**
 * Calendar API permission error
 */
class PermissionError extends AppError {
  constructor(message, context = {}) {
    super(message, 403, context);
  }
}

/**
 * Email service error
 */
class EmailError extends AppError {
  constructor(message, context = {}) {
    super(message, 500, context);
  }
}

/**
 * Webhook processing error
 */
class WebhookError extends AppError {
  constructor(message, context = {}) {
    super(message, 500, context);
  }
}

module.exports = {
  AppError,
  CalendarError,
  AuthenticationError,
  EventNotFoundError,
  InvalidEventDataError,
  QuotaExceededError,
  PermissionError,
  EmailError,
  WebhookError,
};

