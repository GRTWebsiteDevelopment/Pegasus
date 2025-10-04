const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validates request body against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn('Request validation failed', {
        path: req.path,
        errors: error.details.map((detail) => detail.message),
      });

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    req.validatedBody = value;
    next();
  };
}

/**
 * Validates request params against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn('Params validation failed', {
        path: req.path,
        errors: error.details.map((detail) => detail.message),
      });

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    req.validatedParams = value;
    next();
  };
}

// Validation schemas
const schemas = {
  createEvent: Joi.object({
    summary: Joi.string().required().min(1).max(200),
    description: Joi.string().allow('').max(1000),
    startDateTime: Joi.string().isoDate().required(),
    endDateTime: Joi.string().isoDate().required(),
    location: Joi.string().allow('').max(500),
    timeZone: Joi.string().default('UTC'),
    attendees: Joi.array().items(Joi.string().email()).default([]),
  }),

  updateEvent: Joi.object({
    summary: Joi.string().min(1).max(200),
    description: Joi.string().allow('').max(1000),
    startDateTime: Joi.string().isoDate(),
    endDateTime: Joi.string().isoDate(),
    location: Joi.string().allow('').max(500),
    timeZone: Joi.string(),
    attendees: Joi.array().items(Joi.string().email()),
  }).min(1),

  eventId: Joi.object({
    eventId: Joi.string().required(),
  }),

  sendEmail: Joi.object({
    to: Joi.alternatives().try(
      Joi.string().email(),
      Joi.array().items(Joi.string().email()).min(1)
    ).required(),
    subject: Joi.string().required().min(1).max(200),
    body: Joi.string().allow(''),
    html: Joi.string().allow(''),
    event: Joi.object().unknown(true),
  }),
};

module.exports = {
  validateBody,
  validateParams,
  schemas,
};

