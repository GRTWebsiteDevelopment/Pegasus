class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class GoogleApiError extends ApiError {
  constructor(message = 'Google API error', statusCode = 500) {
    super(message, statusCode);
  }
}

class EventCreationError extends GoogleApiError {
  constructor(message = 'Failed to create event', statusCode = 500) {
    super(message, statusCode);
  }
}

class EventUpdateError extends GoogleApiError {
  constructor(message = 'Failed to update event', statusCode = 500) {
    super(message, statusCode);
  }
}

class EventRetrievalError extends GoogleApiError {
  constructor(message = 'Failed to retrieve event', statusCode = 404) {
    super(message, statusCode);
  }
}

module.exports = {
  ApiError,
  GoogleApiError,
  EventCreationError,
  EventUpdateError,
  EventRetrievalError,
};
