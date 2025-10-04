const calendarService = require('../services/calendarService');
const emailService = require('../services/emailService');
const {
  EventCreationError,
  EventUpdateError,
  EventRetrievalError,
} = require('../utils/errors');

const createEvent = async (req, res) => {
  try {
    const event = await calendarService.createCalendarEvent(req.body);
    await emailService.sendEmailNotification('admin@example.com', 'New Event Created', `Event ${event.id} has been created.`);
    res.status(201).json(event);
  } catch (error) {
    if (error instanceof EventCreationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create event' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const event = await calendarService.updateCalendarEvent(req.params.id, req.body);
    res.status(200).json(event);
  } catch (error) {
    if (error instanceof EventUpdateError || error instanceof EventRetrievalError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update event' });
  }
};

const getEvent = async (req, res) => {
  try {
    const event = await calendarService.getEventById(req.params.id);
    res.status(200).json(event);
  } catch (error) {
    if (error instanceof EventRetrievalError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to get event' });
  }
};

const handleWebhook = async (req, res) => {
  try {
    await calendarService.handleCalendarWebhook(req.headers, req.body);
    res.status(200).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to handle webhook' });
  }
};

module.exports = {
  createEvent,
  updateEvent,
  getEvent,
  handleWebhook,
};
