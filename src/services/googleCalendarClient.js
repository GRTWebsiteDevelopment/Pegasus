const { google } = require('googleapis');
const logger = require('../utils/logger');
const config = require('../config');
const {
  CalendarError,
  AuthenticationError,
  EventNotFoundError,
  InvalidEventDataError,
  QuotaExceededError,
  PermissionError,
} = require('../utils/errors');

/**
 * Google Calendar API Client
 * Handles OAuth2 authentication and calendar operations
 */
class GoogleCalendarClient {
  constructor(credentials) {
    this.credentials = credentials;
    this.oauth2Client = null;
    this.calendar = null;
    this.initialized = false;
  }

  /**
   * Initialize OAuth2 client with credentials
   */
  async initialize() {
    try {
      logger.info('Initializing Google Calendar API client', {
        clientId: this.credentials.clientId ? 'present' : 'missing',
        clientSecret: this.credentials.clientSecret ? 'present' : 'missing',
        refreshToken: this.credentials.refreshToken ? 'present' : 'missing',
      });

      if (!this.credentials.clientId || !this.credentials.clientSecret) {
        throw new AuthenticationError('Missing Google Calendar API credentials', {
          clientId: !!this.credentials.clientId,
          clientSecret: !!this.credentials.clientSecret,
        });
      }

      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        this.credentials.clientId,
        this.credentials.clientSecret,
        this.credentials.redirectUri
      );

      // Set refresh token if available
      if (this.credentials.refreshToken) {
        this.oauth2Client.setCredentials({
          refresh_token: this.credentials.refreshToken,
        });
      }

      // Initialize Calendar API
      this.calendar = google.calendar({
        version: 'v3',
        auth: this.oauth2Client,
      });

      this.initialized = true;
      logger.info('Google Calendar API client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Calendar API client', {
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError('Failed to initialize Google Calendar client', {
        originalError: error.message,
      });
    }
  }

  /**
   * Ensure client is initialized before making API calls
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new AuthenticationError('Google Calendar client not initialized');
    }
  }

  /**
   * Create a calendar event
   * @param {string} calendarId - Calendar ID (usually 'primary')
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  async createEvent(calendarId, eventData) {
    this.ensureInitialized();

    const startTime = Date.now();
    const context = {
      calendarId,
      summary: eventData.summary,
      startDateTime: eventData.start?.dateTime,
    };

    try {
      logger.info('Creating Google Calendar event', context);

      // Validate event data
      if (!eventData.summary) {
        throw new InvalidEventDataError('Event summary is required', context);
      }

      if (!eventData.start || !eventData.end) {
        throw new InvalidEventDataError('Event start and end times are required', context);
      }

      // Make API call
      const response = await this.calendar.events.insert({
        calendarId,
        resource: eventData,
        sendUpdates: 'all', // Send calendar invites to all attendees
      });

      const duration = Date.now() - startTime;
      logger.info('Google Calendar event created successfully', {
        ...context,
        eventId: response.data.id,
        duration: `${duration}ms`,
        attendeesCount: eventData.attendees?.length || 0,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Failed to create Google Calendar event', {
        ...context,
        error: error.message,
        statusCode: error.code,
        duration: `${duration}ms`,
        stack: error.stack,
      });

      // If error is already operational (from our validation), re-throw it
      if (error.isOperational) {
        throw error;
      }

      throw this.handleGoogleAPIError(error, 'create event', context);
    }
  }

  /**
   * Update a calendar event
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID to update
   * @param {Object} eventData - Updated event data
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(calendarId, eventId, eventData) {
    this.ensureInitialized();

    const startTime = Date.now();
    const context = { calendarId, eventId };

    try {
      logger.info('Updating Google Calendar event', context);

      const response = await this.calendar.events.patch({
        calendarId,
        eventId,
        resource: eventData,
        sendUpdates: 'all', // Send update notifications to all attendees
      });

      const duration = Date.now() - startTime;
      logger.info('Google Calendar event updated successfully', {
        ...context,
        duration: `${duration}ms`,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Failed to update Google Calendar event', {
        ...context,
        error: error.message,
        statusCode: error.code,
        duration: `${duration}ms`,
        stack: error.stack,
      });

      // If error is already operational (from our validation), re-throw it
      if (error.isOperational) {
        throw error;
      }

      throw this.handleGoogleAPIError(error, 'update event', context);
    }
  }

  /**
   * Get an event by ID
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID to retrieve
   * @returns {Promise<Object>} Event data
   */
  async getEvent(calendarId, eventId) {
    this.ensureInitialized();

    const startTime = Date.now();
    const context = { calendarId, eventId };

    try {
      logger.info('Retrieving Google Calendar event', context);

      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      });

      const duration = Date.now() - startTime;
      logger.info('Google Calendar event retrieved successfully', {
        ...context,
        duration: `${duration}ms`,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Failed to retrieve Google Calendar event', {
        ...context,
        error: error.message,
        statusCode: error.code,
        duration: `${duration}ms`,
        stack: error.stack,
      });

      // If error is already operational (from our validation), re-throw it
      if (error.isOperational) {
        throw error;
      }

      throw this.handleGoogleAPIError(error, 'get event', context);
    }
  }

  /**
   * Delete an event
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID to delete
   * @returns {Promise<void>}
   */
  async deleteEvent(calendarId, eventId) {
    this.ensureInitialized();

    const startTime = Date.now();
    const context = { calendarId, eventId };

    try {
      logger.info('Deleting Google Calendar event', context);

      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all',
      });

      const duration = Date.now() - startTime;
      logger.info('Google Calendar event deleted successfully', {
        ...context,
        duration: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Failed to delete Google Calendar event', {
        ...context,
        error: error.message,
        statusCode: error.code,
        duration: `${duration}ms`,
        stack: error.stack,
      });

      // If error is already operational (from our validation), re-throw it
      if (error.isOperational) {
        throw error;
      }

      throw this.handleGoogleAPIError(error, 'delete event', context);
    }
  }

  /**
   * Handle Google API errors and convert to typed errors
   * @param {Error} error - Original error from Google API
   * @param {string} operation - Operation being performed
   * @param {Object} context - Additional context
   * @returns {Error} Typed error
   */
  handleGoogleAPIError(error, operation, context = {}) {
    const errorContext = {
      operation,
      ...context,
      originalError: error.message,
      statusCode: error.code,
    };

    // Handle specific error codes
    switch (error.code) {
      case 400:
        return new InvalidEventDataError(
          `Invalid event data for ${operation}: ${error.message}`,
          errorContext
        );

      case 401:
        return new AuthenticationError(
          `Authentication failed for ${operation}: ${error.message}`,
          errorContext
        );

      case 403:
        return new PermissionError(
          `Permission denied for ${operation}: ${error.message}`,
          errorContext
        );

      case 404:
        if (context.eventId) {
          return new EventNotFoundError(context.eventId, errorContext);
        }
        return new CalendarError(
          `Resource not found for ${operation}: ${error.message}`,
          errorContext
        );

      case 429:
        return new QuotaExceededError(
          `Rate limit exceeded for ${operation}: ${error.message}`,
          errorContext
        );

      case 500:
      case 503:
        return new CalendarError(
          `Google Calendar API error for ${operation}: ${error.message}`,
          errorContext
        );

      default:
        return new CalendarError(
          `Failed to ${operation}: ${error.message}`,
          errorContext
        );
    }
  }
}

/**
 * Create and initialize a Google Calendar client
 * @param {Object} credentials - OAuth credentials
 * @returns {Promise<GoogleCalendarClient>} Initialized client
 */
async function createGoogleCalendarClient(credentials) {
  const client = new GoogleCalendarClient(credentials);
  await client.initialize();
  return client;
}

module.exports = {
  GoogleCalendarClient,
  createGoogleCalendarClient,
};

