const logger = require('../utils/logger');
const config = require('../config');

// Mock email queue to simulate sent emails
const mockEmailQueue = [];

/**
 * Mock Email Service Client
 * In production, this would use services like SendGrid, AWS SES, or Nodemailer
 */
class MockEmailClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    logger.info('Mock Email Service initialized', {
      apiKey: apiKey ? 'present' : 'missing',
    });
  }

  async sendEmail(emailData) {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const email = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body,
      html: emailData.html,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };

    mockEmailQueue.push(email);
    logger.info('Mock Email: Email sent', {
      emailId: email.id,
      to: email.to,
      subject: email.subject,
    });

    return email;
  }
}

// Initialize the mock email client
const emailClient = new MockEmailClient(config.email.apiKey);

/**
 * Sends an email notification
 * @param {Object} emailDetails - Email details
 * @param {string|Array} emailDetails.to - Recipient email address(es)
 * @param {string} emailDetails.subject - Email subject
 * @param {string} emailDetails.body - Plain text email body
 * @param {string} emailDetails.html - HTML email body (optional)
 * @param {Object} emailDetails.event - Event data for notification (optional)
 * @returns {Promise<Object>} Email send result
 */
async function sendEmailNotification(emailDetails) {
  try {
    logger.info('Sending email notification', {
      to: emailDetails.to,
      subject: emailDetails.subject,
    });

    // Validate email details
    if (!emailDetails.to) {
      throw new Error('Recipient email address is required');
    }

    if (!emailDetails.subject) {
      throw new Error('Email subject is required');
    }

    if (!emailDetails.body && !emailDetails.html) {
      throw new Error('Email body or HTML content is required');
    }

    const emailData = {
      from: config.email.from,
      to: Array.isArray(emailDetails.to) ? emailDetails.to : [emailDetails.to],
      subject: emailDetails.subject,
      body: emailDetails.body || '',
      html: emailDetails.html || generateEventEmailHTML(emailDetails),
    };

    const result = await emailClient.sendEmail(emailData);

    logger.info('Email notification sent successfully', { emailId: result.id });
    return {
      success: true,
      emailId: result.id,
      sentAt: result.sentAt,
    };
  } catch (error) {
    logger.error('Failed to send email notification', {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Email notification failed: ${error.message}`);
  }
}

/**
 * Generates HTML content for event notification emails
 * @param {Object} emailDetails - Email details with event data
 * @returns {string} HTML email content
 */
function generateEventEmailHTML(emailDetails) {
  const { event, body } = emailDetails;

  if (!event) {
    return `<html><body><p>${body || ''}</p></body></html>`;
  }

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4285f4; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .event-details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #666; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Calendar Event Notification</h1>
          </div>
          <div class="content">
            <div class="event-details">
              <h2>${event.summary || 'Event'}</h2>
              ${event.description ? `<p>${event.description}</p>` : ''}
              
              <div class="detail-row">
                <span class="label">📍 Location:</span> ${event.location || 'Not specified'}
              </div>
              
              ${event.start ? `
              <div class="detail-row">
                <span class="label">🕐 Start:</span> ${event.start.dateTime || event.start}
              </div>
              ` : ''}
              
              ${event.end ? `
              <div class="detail-row">
                <span class="label">🕐 End:</span> ${event.end.dateTime || event.end}
              </div>
              ` : ''}
              
              ${event.attendees && event.attendees.length > 0 ? `
              <div class="detail-row">
                <span class="label">👥 Attendees:</span>
                <ul>
                  ${event.attendees.map(a => `<li>${a.email}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
            </div>
            
            ${body ? `<p>${body}</p>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from Pegasus Event Scheduler</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Sends event creation notification to attendees
 * @param {Object} event - Event object
 * @returns {Promise<Array>} Results of email sends
 */
async function sendEventCreatedNotification(event) {
  const attendees = event.attendees || [];
  
  if (attendees.length === 0) {
    logger.info('No attendees to notify for event', { eventId: event.id });
    return [];
  }

  const emailPromises = attendees.map((attendee) =>
    sendEmailNotification({
      to: attendee.email,
      subject: `New Event: ${event.summary}`,
      body: `You have been invited to a new event: ${event.summary}`,
      event,
    })
  );

  return Promise.all(emailPromises);
}

/**
 * Sends event update notification to attendees
 * @param {Object} event - Updated event object
 * @returns {Promise<Array>} Results of email sends
 */
async function sendEventUpdatedNotification(event) {
  const attendees = event.attendees || [];
  
  if (attendees.length === 0) {
    logger.info('No attendees to notify for event update', { eventId: event.id });
    return [];
  }

  const emailPromises = attendees.map((attendee) =>
    sendEmailNotification({
      to: attendee.email,
      subject: `Event Updated: ${event.summary}`,
      body: `An event you are attending has been updated: ${event.summary}`,
      event,
    })
  );

  return Promise.all(emailPromises);
}

// Test helpers
function getMockEmailQueue() {
  return mockEmailQueue;
}

function clearMockEmailQueue() {
  mockEmailQueue.length = 0;
}

module.exports = {
  sendEmailNotification,
  sendEventCreatedNotification,
  sendEventUpdatedNotification,
  // Test helpers
  getMockEmailQueue,
  clearMockEmailQueue,
};

