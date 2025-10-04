const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const config = require('../config');

// Mock database to simulate calendar events storage
const mockCalendarDB = new Map();

/**
 * Mock Google Calendar API Client
 * In production, this would use the official Google Calendar API
 */
class MockGoogleCalendarAPI {
  constructor(credentials) {
    this.credentials = credentials;
    logger.info('Mock Google Calendar API initialized', {
      clientId: credentials.clientId ? 'present' : 'missing',
    });
  }

  async insertEvent(calendarId, eventData) {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    const event = {
      id: uuidv4(),
      calendarId,
      ...eventData,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    mockCalendarDB.set(event.id, event);
    logger.info('Mock API: Event created', { eventId: event.id });
    return event;
  }

  async updateEvent(calendarId, eventId, eventData) {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const existingEvent = mockCalendarDB.get(eventId);
    if (!existingEvent) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const updatedEvent = {
      ...existingEvent,
      ...eventData,
      updated: new Date().toISOString(),
    };

    mockCalendarDB.set(eventId, updatedEvent);
    logger.info('Mock API: Event updated', { eventId });
    return updatedEvent;
  }

  async getEvent(calendarId, eventId) {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const event = mockCalendarDB.get(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    logger.info('Mock API: Event retrieved', { eventId });
    return event;
  }

  async deleteEvent(calendarId, eventId) {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const deleted = mockCalendarDB.delete(eventId);
    if (!deleted) {
      throw new Error(`Event not found: ${eventId}`);
    }

    logger.info('Mock API: Event deleted', { eventId });
    return { success: true };
  }
}

// Initialize the mock API client
const calendarClient = new MockGoogleCalendarAPI({
  clientId: config.google.clientId,
  clientSecret: config.google.clientSecret,
  redirectUri: config.google.redirectUri,
  refreshToken: config.google.refreshToken,
});

/**
 * Creates a calendar event
 * @param {Object} eventDetails - Event details
 * @param {string} eventDetails.summary - Event title
 * @param {string} eventDetails.description - Event description
 * @param {string} eventDetails.startDateTime - Start date/time (ISO 8601)
 * @param {string} eventDetails.endDateTime - End date/time (ISO 8601)
 * @param {Array} eventDetails.attendees - Array of attendee email addresses
 * @param {string} eventDetails.location - Event location
 * @returns {Promise<Object>} Created event object
 */
async function createCalendarEvent(eventDetails) {
  try {
    logger.info('Creating calendar event', { summary: eventDetails.summary });

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
      attendees: (eventDetails.attendees || []).map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const event = await calendarClient.insertEvent('primary', eventData);
    
    logger.info('Calendar event created successfully', { eventId: event.id });
    return {
      success: true,
      event,
    };
  } catch (error) {
    logger.error('Failed to create calendar event', {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Calendar event creation failed: ${error.message}`);
  }
}

/**
 * Updates an existing calendar event
 * @param {string} eventId - ID of the event to update
 * @param {Object} updates - Updated event details
 * @returns {Promise<Object>} Updated event object
 */
async function updateCalendarEvent(eventId, updates) {
  try {
    logger.info('Updating calendar event', { eventId });

    const updateData = {};
    
    if (updates.summary) updateData.summary = updates.summary;
    if (updates.description) updateData.description = updates.description;
    if (updates.location) updateData.location = updates.location;
    
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
      updateData.attendees = updates.attendees.map((email) => ({ email }));
    }

    const event = await calendarClient.updateEvent('primary', eventId, updateData);
    
    logger.info('Calendar event updated successfully', { eventId });
    return {
      success: true,
      event,
    };
  } catch (error) {
    logger.error('Failed to update calendar event', {
      eventId,
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Calendar event update failed: ${error.message}`);
  }
}

/**
 * Retrieves an event by ID
 * @param {string} eventId - ID of the event to retrieve
 * @returns {Promise<Object>} Event object
 */
async function getEventById(eventId) {
  try {
    logger.info('Retrieving calendar event', { eventId });

    const event = await calendarClient.getEvent('primary', eventId);
    
    logger.info('Calendar event retrieved successfully', { eventId });
    return {
      success: true,
      event,
    };
  } catch (error) {
    logger.error('Failed to retrieve calendar event', {
      eventId,
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Calendar event retrieval failed: ${error.message}`);
  }
}

/**
 * Handles incoming calendar webhooks from Google Calendar
 * @param {Object} webhookData - Webhook payload
 * @returns {Promise<Object>} Processing result
 */
async function handleCalendarWebhook(webhookData) {
  try {
    logger.info('Processing calendar webhook', {
      resourceId: webhookData.resourceId,
      resourceState: webhookData.resourceState,
    });

    // Validate webhook authenticity (in production, verify X-Goog-Channel-Token)
    const channelToken = webhookData.channelToken;
    if (!channelToken) {
      throw new Error('Missing channel token in webhook');
    }

    const { resourceState, resourceId, eventId } = webhookData;

    let result;
    switch (resourceState) {
      case 'exists':
      case 'sync':
        // Event was created or updated
        if (eventId) {
          const event = await getEventById(eventId);
          result = {
            action: 'synced',
            event: event.event,
          };
        } else {
          result = {
            action: 'sync_notification',
            resourceId,
          };
        }
        break;

      case 'not_exists':
        // Event was deleted
        result = {
          action: 'deleted',
          eventId,
        };
        break;

      default:
        result = {
          action: 'unknown',
          resourceState,
        };
    }

    logger.info('Calendar webhook processed successfully', { result });
    return {
      success: true,
      result,
    };
  } catch (error) {
    logger.error('Failed to process calendar webhook', {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Webhook processing failed: ${error.message}`);
  }
}

// Export mock DB for testing purposes
function clearMockDB() {
  mockCalendarDB.clear();
}

function getMockDB() {
  return mockCalendarDB;
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  getEventById,
  handleCalendarWebhook,
  // Test helpers
  clearMockDB,
  getMockDB,
};

