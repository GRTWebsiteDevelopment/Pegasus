const logger = require('../utils/logger');
const config = require('../config');
const { createGoogleCalendarClient } = require('./googleCalendarClient');
const {
  CalendarError,
  InvalidEventDataError,
} = require('../utils/errors');

// Google Calendar client instance
let calendarClient = null;

/**
 * Initialize Google Calendar client
 * @returns {Promise<void>}
 */
async function initializeCalendarClient() {
  if (!calendarClient) {
    logger.info('Initializing Google Calendar service');
    
    try {
      calendarClient = await createGoogleCalendarClient({
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        redirectUri: config.google.redirectUri,
        refreshToken: config.google.refreshToken,
      });
      
      logger.info('Google Calendar service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Calendar service', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
  
  return calendarClient;
}

/**
 * Creates a calendar event using Google Calendar API
 * @param {Object} eventDetails - Event details
 * @param {string} eventDetails.summary - Event title
 * @param {string} eventDetails.description - Event description
 * @param {string} eventDetails.startDateTime - Start date/time (ISO 8601)
 * @param {string} eventDetails.endDateTime - End date/time (ISO 8601)
 * @param {Array} eventDetails.attendees - Array of attendee email addresses
 * @param {string} eventDetails.location - Event location
 * @param {string} eventDetails.timeZone - Event timezone (default: UTC)
 * @returns {Promise<Object>} Created event object
 */
async function createCalendarEvent(eventDetails) {
  const startTime = Date.now();
  
  try {
    logger.info('Creating calendar event', { 
      summary: eventDetails.summary,
      startDateTime: eventDetails.startDateTime,
      attendeesCount: eventDetails.attendees?.length || 0,
    });

    // Validate required fields
    if (!eventDetails.summary) {
      throw new InvalidEventDataError('Event summary is required', {
        providedFields: Object.keys(eventDetails),
      });
    }

    if (!eventDetails.startDateTime || !eventDetails.endDateTime) {
      throw new InvalidEventDataError('Event start and end times are required', {
        startDateTime: !!eventDetails.startDateTime,
        endDateTime: !!eventDetails.endDateTime,
      });
    }

    // Ensure client is initialized
    const client = await initializeCalendarClient();

    // Prepare event data for Google Calendar API
    const eventData = {
      summary: eventDetails.summary,
      description: eventDetails.description || '',
      location: eventDetails.location || '',
      start: {
        dateTime: eventDetails.startDateTime,
        timeZone: eventDetails.timeZone || 'UTC',
      },
      end: {
        dateTime: eventDetails.endDateTime,
        timeZone: eventDetails.timeZone || 'UTC',
      },
      attendees: (eventDetails.attendees || []).map((email) => ({
        email,
        responseStatus: 'needsAction',
      })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
      // Enable sending calendar invites
      guestsCanInviteOthers: true,
      guestsCanSeeOtherGuests: true,
    };

    // Create event via Google Calendar API
    const event = await client.createEvent('primary', eventData);

    const duration = Date.now() - startTime;
    logger.info('Calendar event created successfully', {
      eventId: event.id,
      summary: event.summary,
      duration: `${duration}ms`,
      attendeesCount: event.attendees?.length || 0,
      invitesSent: true,
    });

    return {
      success: true,
      event,
      invitesSent: true,
      metadata: {
        duration: `${duration}ms`,
        attendeesNotified: event.attendees?.length || 0,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Failed to create calendar event', {
      error: error.message,
      errorType: error.name,
      statusCode: error.statusCode,
      context: error.context,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    // Re-throw typed errors
    if (error.isOperational) {
      throw error;
    }

    // Wrap unknown errors
    throw new CalendarError(`Calendar event creation failed: ${error.message}`, {
      originalError: error.message,
      summary: eventDetails.summary,
    });
  }
}

/**
 * Updates an existing calendar event
 * @param {string} eventId - ID of the event to update
 * @param {Object} updates - Updated event details
 * @returns {Promise<Object>} Updated event object
 */
async function updateCalendarEvent(eventId, updates) {
  const startTime = Date.now();
  
  try {
    logger.info('Updating calendar event', { eventId, updates: Object.keys(updates) });

    const client = await initializeCalendarClient();

    // Prepare update data
    const updateData = {};
    
    if (updates.summary) updateData.summary = updates.summary;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.location !== undefined) updateData.location = updates.location;
    
    if (updates.startDateTime) {
      updateData.start = {
        dateTime: updates.startDateTime,
        timeZone: updates.timeZone || 'UTC',
      };
    }
    
    if (updates.endDateTime) {
      updateData.end = {
        dateTime: updates.endDateTime,
        timeZone: updates.timeZone || 'UTC',
      };
    }
    
    if (updates.attendees) {
      updateData.attendees = updates.attendees.map((email) => ({
        email,
        responseStatus: 'needsAction',
      }));
    }

    // Update event via Google Calendar API
    const event = await client.updateEvent('primary', eventId, updateData);

    const duration = Date.now() - startTime;
    logger.info('Calendar event updated successfully', {
      eventId,
      duration: `${duration}ms`,
      updatedFields: Object.keys(updateData),
    });

    return {
      success: true,
      event,
      metadata: {
        duration: `${duration}ms`,
        updatedFields: Object.keys(updateData),
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Failed to update calendar event', {
      eventId,
      error: error.message,
      errorType: error.name,
      statusCode: error.statusCode,
      context: error.context,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    if (error.isOperational) {
      throw error;
    }

    throw new CalendarError(`Calendar event update failed: ${error.message}`, {
      originalError: error.message,
      eventId,
    });
  }
}

/**
 * Retrieves an event by ID
 * @param {string} eventId - ID of the event to retrieve
 * @returns {Promise<Object>} Event object
 */
async function getEventById(eventId) {
  const startTime = Date.now();
  
  try {
    logger.info('Retrieving calendar event', { eventId });

    const client = await initializeCalendarClient();
    const event = await client.getEvent('primary', eventId);

    const duration = Date.now() - startTime;
    logger.info('Calendar event retrieved successfully', {
      eventId,
      duration: `${duration}ms`,
    });

    return {
      success: true,
      event,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Failed to retrieve calendar event', {
      eventId,
      error: error.message,
      errorType: error.name,
      statusCode: error.statusCode,
      context: error.context,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    if (error.isOperational) {
      throw error;
    }

    throw new CalendarError(`Calendar event retrieval failed: ${error.message}`, {
      originalError: error.message,
      eventId,
    });
  }
}

/**
 * Handles incoming calendar webhooks from Google Calendar
 * Uses WebhookProcessor for full pipeline: parse, update, notify
 * @param {Object} webhookData - Webhook payload
 * @returns {Promise<Object>} Processing result
 */
async function handleCalendarWebhook(webhookData) {
  const { WebhookProcessor } = require('./webhookProcessor');
  
  try {
    // Use webhook processor for full pipeline
    return await WebhookProcessor.process(webhookData);
  } catch (error) {
    logger.error('Failed to process calendar webhook', {
      error: error.message,
      errorType: error.name,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
    });

    if (error.isOperational) {
      throw error;
    }

    throw new CalendarError(`Webhook processing failed: ${error.message}`, {
      originalError: error.message,
    });
  }
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  getEventById,
  handleCalendarWebhook,
  initializeCalendarClient,
};

