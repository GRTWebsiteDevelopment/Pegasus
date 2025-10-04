const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendarService');
const { validateBody, validateParams, schemas } = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * POST /calendar/events
 * Create a new calendar event
 */
router.post('/events', validateBody(schemas.createEvent), async (req, res) => {
  try {
    const result = await calendarService.createCalendarEvent(req.validatedBody);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error in POST /calendar/events', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /calendar/events/:eventId
 * Retrieve an event by ID
 */
router.get('/events/:eventId', validateParams(schemas.eventId), async (req, res) => {
  try {
    const result = await calendarService.getEventById(req.validatedParams.eventId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error in GET /calendar/events/:eventId', { error: error.message });
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /calendar/events/:eventId
 * Update an existing calendar event
 */
router.put(
  '/events/:eventId',
  validateParams(schemas.eventId),
  validateBody(schemas.updateEvent),
  async (req, res) => {
    try {
      const result = await calendarService.updateCalendarEvent(
        req.validatedParams.eventId,
        req.validatedBody
      );
      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in PUT /calendar/events/:eventId', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

module.exports = router;

