const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: config.server.env,
  });
  console.log(`🚀 Pegasus Event Scheduler running on port ${PORT}`);
  console.log(`📊 Environment: ${config.server.env}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;

