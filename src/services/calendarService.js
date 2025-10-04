const { calendar } = require('../utils/googleClient');
const config = require('../config');
const logger = require('../utils/logger');
const { EventCreationError } = require('../utils/errors');
const emailService = require('../services/emailService');
const idempotencyCache = require('../utils/idempotencyCache');

const createCalendarEvent = async (eventData) => {
  const { title, description, startTime, endTime, attendees } = eventData;

  const event = {
    summary: title,
    description,
    start: {
      dateTime: startTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: endTime,
      timeZone: 'UTC',
    },
    attendees: attendees.map(email => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `hangouts-meeting-${Date.now()}`,
      },
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: config.GOOGLE_CALENDAR_ID,
      resource: event,
      sendNotifications: true,
      conferenceDataVersion: 1,
    });
    logger.info(`Event created: ${response.data.htmlLink}`);
    return response.data;
  } catch (error) {
    logger.error('Error creating Google Calendar event:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw new EventCreationError('Failed to create Google Calendar event');
  }
};

const updateCalendarEvent = async (eventId, eventData) => {
  try {
    const response = await calendar.events.update({
      calendarId: config.GOOGLE_CALENDAR_ID,
      eventId,
      resource: eventData,
    });
    return response.data;
  } catch (error) {
    logger.error(`Error updating event ${eventId}:`, {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    return null;
  }
};

const handleCalendarWebhook = async (headers, body) => {
  const messageId = headers['x-goog-message-number'];
  if (idempotencyCache.hasMessage(messageId)) {
    logger.info(`Webhook message ${messageId} already processed.`);
    return;
  }
  logger.info(`Processing webhook message ${messageId}...`);
  idempotencyCache.addMessage(messageId);

  const resourceId = headers['x-goog-resource-id'];
  const event = await module.exports.getEventById(resourceId);

  if (!event) {
    logger.warn(`Event with resource ID ${resourceId} not found.`);
    return;
  }

  const declinedAttendees = event.attendees?.filter(
    (attendee) => attendee.responseStatus === 'declined'
  );

  if (declinedAttendees && declinedAttendees.length > 0) {
    const organizer = event.organizer?.email;
    if (organizer) {
      const declinedEmails = declinedAttendees.map((a) => a.email).join(', ');
      await emailService.sendEmailNotification(
        organizer,
        `Attendee declined event: ${event.summary}`,
        `The following attendees have declined the event "${event.summary}": ${declinedEmails}`
      );
      logger.info(`Sent notification to organizer ${organizer} about declined attendees.`);
    }
  }
  logger.info(`Webhook message ${messageId} applied.`);
};

const getEventById = async (eventId) => {
  try {
    const response = await calendar.events.get({
      calendarId: config.GOOGLE_CALENDAR_ID,
      eventId,
    });
    return response.data;
  } catch (error) {
    logger.error(`Error getting event ${eventId}:`, {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    return null;
  }
};

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  handleCalendarWebhook,
  getEventById,
};
