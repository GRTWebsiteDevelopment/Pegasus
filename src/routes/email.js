const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { validateBody, schemas } = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * POST /email/send
 * Send an email notification
 */
router.post('/send', validateBody(schemas.sendEmail), async (req, res) => {
  try {
    const result = await emailService.sendEmailNotification(req.validatedBody);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error in POST /email/send', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

