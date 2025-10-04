# Google Calendar Webhook Integration Guide

## Overview

This guide documents the Google Calendar webhook integration in the Pegasus Event Scheduler. The implementation handles incoming webhook notifications from Google Calendar, processes event changes, updates internal records, and triggers email notifications with full idempotency support.

## Architecture

### Components

1. **WebhookProcessor** (`src/services/webhookProcessor.js`)
   - Core webhook processing logic
   - Idempotency management
   - Event change parsing
   - Notification orchestration

2. **Webhook Route** (`src/routes/webhook.js`)
   - HTTP endpoint for receiving webhooks
   - Token validation
   - Request/response handling

3. **Real Calendar Service** (`src/services/realCalendarService.js`)
   - Integration with Google Calendar API
   - Event CRUD operations
   - Webhook delegation to processor

## Webhook Processing Pipeline

### Stage 1: Received
Webhook is received via POST to `/api/webhook/calendar` with Google Calendar headers:
- `x-goog-channel-token`: Authentication token
- `x-goog-channel-id`: Channel identifier
- `x-goog-resource-id`: Resource identifier
- `x-goog-resource-state`: State (exists, not_exists, sync)
- `x-goog-message-number`: Message number for idempotency

### Stage 2: Validation
- Token authentication against configured `WEBHOOK_SECRET`
- Header validation
- Returns 401 if invalid

### Stage 3: Idempotency Check
- Generates unique webhook ID from headers
- Checks if webhook was already processed
- Returns cached result if found (24-hour TTL)

### Stage 4: Parse Changes
Determines action based on `resourceState`:
- `exists`: Event created or updated
- `not_exists`: Event deleted
- `sync`: Synchronization notification
- `unknown`: Unknown state (logged, no action)

### Stage 5: Process Updates
For `exists` state:
1. Fetches latest event data via `getEventById()`
2. Updates internal records
3. Logs event details

### Stage 6: Send Notifications
For events requiring notifications:
1. Checks for attendees
2. Sends appropriate notification type:
   - **created_or_updated**: `sendEventUpdatedNotification()`
   - **deleted**: Custom deletion notification to all attendees
3. Failures are logged but don't break pipeline

### Stage 7: Applied
- Marks webhook as processed
- Stores result in cache
- Returns success response

## API Endpoints

### POST /api/webhook/calendar

Handles incoming Google Calendar webhooks.

**Headers:**
```http
x-goog-channel-token: your-webhook-secret
x-goog-channel-id: channel-123
x-goog-resource-id: resource-456
x-goog-resource-state: exists|not_exists|sync
x-goog-message-number: 1
```

**Request Body:**
```json
{
  "eventId": "event-123"  // Optional, present for event-specific notifications
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "cached": false,
  "result": {
    "action": "created_or_updated",
    "event": {
      "id": "event-123",
      "summary": "Team Meeting",
      "start": { "dateTime": "2025-10-15T14:00:00Z" },
      "end": { "dateTime": "2025-10-15T15:30:00Z" },
      "attendees": [
        { "email": "user@example.com" }
      ]
    },
    "notificationsSent": 1,
    "webhookId": "channel-123:resource-456:1"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## Idempotency

### How It Works

1. **Unique Webhook ID** is generated from:
   ```
   ${channelId}:${resourceId}:${messageNumber}
   ```

2. **In-Memory Cache** stores processed webhooks
   - Key: Webhook ID
   - Value: Processing result + timestamp
   - TTL: 24 hours

3. **On Duplicate Detection**:
   - Returns cached result immediately
   - Skips event fetching and notifications
   - Logs idempotency hit

### Benefits

- **Prevents duplicate processing** of same webhook
- **Reduces API calls** to Google Calendar
- **Prevents duplicate notifications** to attendees
- **Handles retry scenarios** gracefully

### Production Considerations

For production deployments, replace in-memory cache with:
- **Redis**: Distributed cache across multiple servers
- **Database**: Persistent storage with TTL cleanup
- **Memcached**: Distributed memory cache

Example Redis integration:
```javascript
// In production
const redis = require('redis');
const client = redis.createClient();

static async isProcessed(webhookId) {
  const cached = await client.get(`webhook:${webhookId}`);
  return cached !== null;
}

static async markProcessed(webhookId, result) {
  await client.setex(`webhook:${webhookId}`, 86400, JSON.stringify(result));
}
```

## Logging

### Log Levels

The webhook processor logs key events at each stage:

**INFO**: Normal operations
```json
{
  "message": "Webhook received",
  "webhookId": "channel-123:resource-456:1",
  "channelId": "channel-123",
  "resourceState": "exists",
  "timestamp": "2025-10-04T12:00:00Z"
}
```

**ERROR**: Failures
```json
{
  "message": "Webhook processing failed",
  "webhookId": "channel-123:resource-456:1",
  "error": "Event not found",
  "errorType": "EventNotFoundError",
  "duration": "150ms",
  "stack": "..."
}
```

### Key Metrics Logged

- **Duration**: Processing time for each stage
- **notificationsSent**: Count of notifications sent
- **attendeesCount**: Number of attendees
- **action**: Type of change (created_or_updated, deleted, sync)
- **cached**: Whether result was from cache

## Error Handling

### Error Types

1. **WebhookError** (400)
   - Missing channel token
   - Invalid webhook data
   - Validation failures

2. **EventNotFoundError** (404)
   - Event deleted between notification and fetch
   - Invalid event ID

3. **AuthenticationError** (401)
   - Google API authentication failure
   - Invalid OAuth credentials

4. **QuotaExceededError** (429)
   - Google API rate limit hit
   - Too many requests

5. **CalendarError** (500)
   - General Google Calendar API errors
   - Network failures

### Error Recovery

1. **Event Fetch Failures**: 
   - Logged and thrown
   - Webhook marked as not processed
   - Can be retried by Google

2. **Notification Failures**:
   - Logged but not thrown
   - Webhook still marked as processed
   - Returns success to Google

3. **Validation Failures**:
   - Immediate 400/401 response
   - Not marked as processed
   - Can be retried with correct data

## Configuration

### Environment Variables

```bash
# Webhook Secret (match Google Calendar channel token)
WEBHOOK_SECRET=your-secure-webhook-secret

# Google Calendar OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Email Service (for notifications)
EMAIL_SERVICE_API_KEY=your-email-api-key
EMAIL_FROM=noreply@example.com

# Logging
LOG_LEVEL=info
```

### Webhook Registration

To receive webhooks from Google Calendar:

```javascript
const { google } = require('googleapis');

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

const channel = await calendar.events.watch({
  calendarId: 'primary',
  requestBody: {
    id: 'unique-channel-id',
    type: 'web_hook',
    address: 'https://your-domain.com/api/webhook/calendar',
    token: process.env.WEBHOOK_SECRET,
    expiration: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
  },
});

console.log('Webhook registered:', channel.data);
```

## Testing

### Unit Tests

Webhook processor is comprehensively tested:

```bash
npm test -- __tests__/services/webhookProcessor.test.js
```

**Test Coverage:**
- ✅ Webhook ID generation
- ✅ Event change parsing (all states)
- ✅ Idempotency detection and caching
- ✅ Event update processing
- ✅ Notification sending (updates, deletions)
- ✅ Full pipeline end-to-end
- ✅ Error handling (missing token, network failures)
- ✅ Notification failure resilience

### Integration Tests

Webhook routes tested with Express:

```bash
npm test -- __tests__/routes/webhook.test.js
```

**Test Coverage:**
- ✅ Valid webhook handling (sync, exists, not_exists)
- ✅ Token validation (401 on invalid/missing)
- ✅ Duplicate webhook handling (idempotency)
- ✅ Notification triggering for events with attendees

### Manual Testing

```bash
# Start server
npm start

# Send test webhook
curl -X POST http://localhost:3000/api/webhook/calendar \
  -H "x-goog-channel-token: default_webhook_secret_for_testing" \
  -H "x-goog-channel-id: test-channel" \
  -H "x-goog-resource-id: test-resource" \
  -H "x-goog-resource-state: sync" \
  -H "Content-Type: application/json"

# Expected response
{
  "success": true,
  "cached": false,
  "result": {
    "action": "sync",
    "event": null,
    "notificationsSent": 0,
    "webhookId": "test-channel:test-resource:..."
  }
}
```

## Monitoring

### Health Checks

Monitor webhook processing health:

1. **Processing Rate**: Number of webhooks/minute
2. **Cache Hit Rate**: Percentage of duplicate webhooks
3. **Error Rate**: Percentage of failed webhooks
4. **Processing Duration**: Average/p95/p99 latency
5. **Notification Success Rate**: Percentage of successful notifications

### Alerts

Set up alerts for:
- **High error rate** (>5%)
- **Slow processing** (p95 >1s)
- **Authentication failures** (any)
- **Quota exceeded** (any)

## Best Practices

### 1. Security
- ✅ **Validate webhook token** on every request
- ✅ **Use HTTPS** in production
- ✅ **Rotate secrets** regularly
- ✅ **Rate limit** webhook endpoint

### 2. Reliability
- ✅ **Implement idempotency** (done via cache)
- ✅ **Log all stages** for debugging
- ✅ **Handle failures gracefully**
- ✅ **Use exponential backoff** for retries

### 3. Performance
- ✅ **Cache processed webhooks** (24h TTL)
- ✅ **Async notification sending**
- ✅ **Batch database updates** if applicable
- ✅ **Monitor processing duration**

### 4. Observability
- ✅ **Structured logging** (JSON format)
- ✅ **Include context** in logs (webhookId, eventId)
- ✅ **Track metrics** (duration, counts)
- ✅ **Set up dashboards** for monitoring

## Troubleshooting

### Webhook Not Received

1. **Check webhook registration**:
   ```javascript
   const channels = await calendar.channels.list();
   console.log(channels.data);
   ```

2. **Verify endpoint is publicly accessible**:
   - Use ngrok for local testing
   - Check firewall rules
   - Verify SSL certificate

3. **Check logs** for incoming requests:
   ```bash
   grep "Incoming request.*webhook" logs/*.log
   ```

### Duplicate Notifications

1. **Verify idempotency** is working:
   ```bash
   grep "idempotency check" logs/*.log
   ```

2. **Check cache TTL** (should be 24h)

3. **Ensure message numbers** are included in webhooks

### Authentication Errors

1. **Refresh OAuth tokens**:
   ```bash
   node scripts/refresh-oauth-token.js
   ```

2. **Verify credentials** in `.env`

3. **Check token expiration**:
   ```javascript
   const tokens = oAuth2Client.credentials;
   console.log('Expires at:', new Date(tokens.expiry_date));
   ```

### Performance Issues

1. **Check processing duration**:
   ```bash
   grep "duration" logs/*.log | grep "Webhook processed"
   ```

2. **Monitor API calls** to Google Calendar

3. **Consider caching** event data

4. **Use database connection pooling**

## Future Enhancements

### Planned Features

1. **Distributed Idempotency**
   - Redis cache for multi-server deployments
   - Shared cache across instances

2. **Retry Logic**
   - Automatic retry for transient failures
   - Exponential backoff strategy

3. **Webhook Queue**
   - Queue incoming webhooks for processing
   - Handle burst traffic

4. **Advanced Monitoring**
   - Prometheus metrics
   - Grafana dashboards
   - Real-time alerting

5. **Event Replay**
   - Replay failed webhooks
   - Manual webhook reprocessing

## References

- [Google Calendar API - Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [OAuth 2.0 for Server-Side Web Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Winston Logging Best Practices](https://github.com/winstonjs/winston#readme)

## Support

For issues or questions:
- Check logs: `logs/*.log`
- Run tests: `npm test`
- Review documentation: `README.md`, `API_EXAMPLES.md`

---

**Last Updated**: October 4, 2025
**Version**: 1.0.0

