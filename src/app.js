const express = require('express');
const logger = require('./utils/logger');
const routes = require('./routes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Mount routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path });
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

module.exports = app;

