const logger = require('./logger');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 3, initialDelay = 1000, operationName = 'operation') => {
  let attempt = 1;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) {
        logger.error(`[Retry] ${operationName} failed after ${retries} attempts.`);
        throw error;
      }
      const delayTime = initialDelay * 2 ** (attempt - 1);
      logger.warn(
        `[Retry] ${operationName} failed on attempt ${attempt}. Retrying in ${delayTime}ms...`
      );
      await delay(delayTime);
      attempt++;
    }
  }
};

module.exports = { withRetry };
