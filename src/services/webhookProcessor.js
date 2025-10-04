const logger = require('../utils/logger');
const { getEventById, updateCalendarEvent } = require('./realCalendarService');
const {
  sendEventCreatedNotification,
  sendEventUpdatedNotification,
} = require('./emailService');
const { WebhookError } = require('../utils/errors');

// In-memory store for webhook idempotency
// In production, use Redis or database
const processedWebhooks = new Map();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Webhook processor for Google Calendar events
 * Handles event changes, updates, and notifications with idempotency
 */
class WebhookProcessor {
  /**
   * Check if webhook has been processed (idempotency check)
   * @param {string} webhookId - Unique webhook identifier
   * @returns {boolean} True if already processed
   */
  static isProcessed(webhookId) {
    const record = processedWebhooks.get(webhookId);
    if (!record) {
      return false;
    }

    // Check if record has expired
    if (Date.now() - record.processedAt > WEBHOOK_EXPIRY_MS) {
      processedWebhooks.delete(webhookId);
      return false;
    }

    logger.info('Webhook already processed (idempotency check)', {
      webhookId,
      originalProcessedAt: record.processedAt,
    });

    return true;
  }

  /**
   * Mark webhook as processed
   * @param {string} webhookId - Unique webhook identifier
   * @param {Object} result - Processing result
   */
  static markProcessed(webhookId, result) {
    processedWebhooks.set(webhookId, {
      processedAt: Date.now(),
      result,
    });

    logger.debug('Webhook marked as processed', {
      webhookId,
      processedAt: new Date().toISOString(),
    });
  }

  /**
   * Clear processed webhooks (for testing)
   */
  static clearProcessedWebhooks() {
    processedWebhooks.clear();
  }

  /**
   * Get processed webhook record
   * @param {string} webhookId - Unique webhook identifier
   * @returns {Object|null} Processed webhook record
   */
  static getProcessedWebhook(webhookId) {
    return processedWebhooks.get(webhookId);
  }

  /**
   * Generate unique webhook ID from headers
   * @param {Object} webhookData - Webhook data
   * @returns {string} Unique webhook ID
   */
  static generateWebhookId(webhookData) {
    const { channelId, resourceId, messageNumber } = webhookData;
    return `${channelId}:${resourceId}:${messageNumber || Date.now()}`;
  }

  /**
   * Parse event changes from webhook
   * @param {string} resourceState - Resource state from webhook
   * @param {string} eventId - Event ID (if available)
   * @returns {Object} Parsed change information
   */
  static parseEventChange(resourceState, eventId) {
    const changes = {
      type: 'unknown',
      requiresUpdate: false,
      requiresNotification: false,
      eventId,
    };

    switch (resourceState) {
      case 'exists':
        changes.type = 'created_or_updated';
        changes.requiresUpdate = true;
        changes.requiresNotification = true;
        break;

      case 'not_exists':
        changes.type = 'deleted';
        changes.requiresUpdate = false;
        changes.requiresNotification = true;
        break;

      case 'sync':
        changes.type = 'sync';
        changes.requiresUpdate = false;
        changes.requiresNotification = false;
        break;

      default:
        changes.type = 'unknown';
        changes.requiresUpdate = false;
        changes.requiresNotification = false;
    }

    return changes;
  }

  /**
   * Process event update from webhook
   * @param {string} eventId - Event ID to update
   * @returns {Promise<Object>} Updated event
   */
  static async processEventUpdate(eventId) {
    const startTime = Date.now();

    try {
      logger.info('Processing event update from webhook', { eventId });

      // Fetch latest event data from Google Calendar
      const result = await getEventById(eventId);
      const event = result.event;

      const duration = Date.now() - startTime;
      logger.info('Event update processed successfully', {
        eventId,
        summary: event.summary,
        duration: `${duration}ms`,
        attendeesCount: event.attendees?.length || 0,
      });

      return event;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Failed to process event update', {
        eventId,
        error: error.message,
        errorType: error.name,
        duration: `${duration}ms`,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Send notifications for event changes
   * @param {Object} event - Event data
   * @param {string} changeType - Type of change (created_or_updated, deleted)
   * @returns {Promise<Array>} Notification results
   */
  static async sendNotifications(event, changeType) {
    const startTime = Date.now();

    try {
      if (!event || !event.attendees || event.attendees.length === 0) {
        logger.info('No attendees to notify', {
          eventId: event?.id,
          changeType,
        });
        return [];
      }

      logger.info('Sending notifications for event change', {
        eventId: event.id,
        changeType,
        attendeesCount: event.attendees.length,
      });

      let results;
      if (changeType === 'created_or_updated') {
        // Determine if this is a new event or update
        // For simplicity, we'll send update notification
        results = await sendEventUpdatedNotification(event);
      } else if (changeType === 'deleted') {
        // Send deletion notification
        results = await this.sendDeletionNotification(event);
      } else {
        results = [];
      }

      const duration = Date.now() - startTime;
      logger.info('Notifications sent successfully', {
        eventId: event.id,
        changeType,
        notificationsSent: results.length,
        duration: `${duration}ms`,
      });

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Failed to send notifications', {
        eventId: event?.id,
        changeType,
        error: error.message,
        duration: `${duration}ms`,
        stack: error.stack,
      });

      // Don't throw - notification failures shouldn't break webhook processing
      return [];
    }
  }

  /**
   * Send deletion notification
   * @param {Object} event - Deleted event data
   * @returns {Promise<Array>} Notification results
   */
  static async sendDeletionNotification(event) {
    const { sendEmailNotification } = require('./emailService');

    const attendees = event.attendees || [];
    if (attendees.length === 0) {
      return [];
    }

    const emailPromises = attendees.map((attendee) =>
      sendEmailNotification({
        to: attendee.email,
        subject: `Event Cancelled: ${event.summary}`,
        body: `The following event has been cancelled: ${event.summary}`,
        event: {
          ...event,
          status: 'cancelled',
        },
      })
    );

    return Promise.all(emailPromises);
  }

  /**
   * Process webhook with full pipeline
   * @param {Object} webhookData - Webhook payload
   * @returns {Promise<Object>} Processing result
   */
  static async process(webhookData) {
    const startTime = Date.now();
    const webhookId = this.generateWebhookId(webhookData);

    try {
      // Stage 1: Received
      logger.info('Webhook received', {
        webhookId,
        channelId: webhookData.channelId,
        resourceState: webhookData.resourceState,
        resourceId: webhookData.resourceId,
        eventId: webhookData.eventId,
      });

      // Stage 2: Idempotency check
      if (this.isProcessed(webhookId)) {
        const existingResult = this.getProcessedWebhook(webhookId);
        logger.info('Returning cached webhook result (idempotent)', {
          webhookId,
        });
        return {
          success: true,
          cached: true,
          result: existingResult.result,
        };
      }

      // Stage 3: Validation
      logger.info('Webhook validated', {
        webhookId,
        resourceState: webhookData.resourceState,
      });

      if (!webhookData.channelToken) {
        throw new WebhookError('Missing channel token in webhook', {
          webhookId,
          channelId: webhookData.channelId,
        });
      }

      // Stage 4: Parse changes
      const changes = this.parseEventChange(
        webhookData.resourceState,
        webhookData.eventId
      );

      logger.info('Webhook changes parsed', {
        webhookId,
        changeType: changes.type,
        requiresUpdate: changes.requiresUpdate,
        requiresNotification: changes.requiresNotification,
      });

      // Stage 5: Process updates
      let event = null;
      if (changes.requiresUpdate && changes.eventId) {
        event = await this.processEventUpdate(changes.eventId);
        logger.info('Webhook event updated', {
          webhookId,
          eventId: event.id,
          summary: event.summary,
        });
      }

      // Stage 6: Send notifications
      let notifications = [];
      if (changes.requiresNotification && event) {
        notifications = await this.sendNotifications(event, changes.type);
        logger.info('Webhook notifications sent', {
          webhookId,
          notificationCount: notifications.length,
        });
      }

      // Stage 7: Applied - Mark as processed
      const result = {
        action: changes.type,
        event,
        notificationsSent: notifications.length,
        webhookId,
      };

      this.markProcessed(webhookId, result);

      const duration = Date.now() - startTime;
      logger.info('Webhook processed successfully (applied)', {
        webhookId,
        action: changes.type,
        duration: `${duration}ms`,
        notificationsSent: notifications.length,
      });

      return {
        success: true,
        cached: false,
        result,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Webhook processing failed', {
        webhookId,
        error: error.message,
        errorType: error.name,
        duration: `${duration}ms`,
        stack: error.stack,
      });

      throw error;
    }
  }
}

module.exports = {
  WebhookProcessor,
};

