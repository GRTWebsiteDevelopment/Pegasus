const express = require('express');
const router = express.Router();
const realCalendarService = require('../services/realCalendarService');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * POST /webhook/calendar
 * Handle incoming calendar webhooks from Google Calendar
 */
router.post('/calendar', async (req, res) => {
  try {
    // In production, verify webhook signature/token
    const channelToken = req.headers['x-goog-channel-token'];
    
    if (channelToken !== config.webhook.secret) {
      logger.warn('Invalid webhook token received', {
        receivedToken: channelToken ? 'present' : 'missing',
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const webhookData = {
      channelId: req.headers['x-goog-channel-id'],
      channelToken: req.headers['x-goog-channel-token'],
      resourceId: req.headers['x-goog-resource-id'],
      resourceState: req.headers['x-goog-resource-state'],
      resourceUri: req.headers['x-goog-resource-uri'],
      messageNumber: req.headers['x-goog-message-number'],
      eventId: req.body.eventId,
    };

    const result = await realCalendarService.handleCalendarWebhook(webhookData);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error in POST /webhook/calendar', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

