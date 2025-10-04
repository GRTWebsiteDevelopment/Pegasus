const express = require('express');
const router = express.Router();
const calendarRoutes = require('./calendar');
const emailRoutes = require('./email');
const webhookRoutes = require('./webhook');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'pegasus-event-scheduler',
    version: '1.0.0',
  });
});

// Mount route modules
router.use('/calendar', calendarRoutes);
router.use('/email', emailRoutes);
router.use('/webhook', webhookRoutes);

module.exports = router;

