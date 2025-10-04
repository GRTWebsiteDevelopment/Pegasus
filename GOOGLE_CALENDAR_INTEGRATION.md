# Google Calendar API Integration

This document describes the Google Calendar API integration implementation for the Pegasus Event Scheduler.

## Overview

The application now includes full Google Calendar API integration with:
- **Real Google Calendar API client** using OAuth2 authentication
- **Typed error handling** for different API failure scenarios
- **Comprehensive logging** with context and performance metrics
- **Calendar invite sending** to all attendees
- **Complete unit test coverage** using mocked API responses

## Architecture

### Components

1. **`src/utils/errors.js`** - Typed error classes
   - `AuthenticationError` (401) - OAuth/credential failures
   - `PermissionError` (403) - Insufficient permissions
   - `EventNotFoundError` (404) - Event doesn't exist
   - `InvalidEventDataError` (400) - Validation failures
   - `QuotaExceededError` (429) - Rate limit exceeded
   - `CalendarError` (500) - General API errors

2. **`src/services/googleCalendarClient.js`** - Low-level Google API client
   - OAuth2 authentication initialization
   - Event CRUD operations
   - Error code to typed error mapping
   - Performance tracking and logging

3. **`src/services/realCalendarService.js`** - High-level calendar service
   - Business logic layer
   - Input validation
   - Client initialization management
   - Wrapper functions for clean API

## Features

### 1. OAuth2 Authentication

The client initializes with OAuth2 credentials:

```javascript
const client = await createGoogleCalendarClient({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
});
```

**Error Handling:**
- Throws `AuthenticationError` if credentials are missing or invalid
- Logs initialization status with credential presence indicators

### 2. Event Creation with Calendar Invites

The `createCalendarEvent()` function:
- Validates required fields (summary, start, end times)
- Formats event data for Google Calendar API
- **Automatically sends calendar invites** to all attendees via `sendUpdates: 'all'`
- Logs performance metrics and attendee counts

```javascript
const result = await createCalendarEvent({
  summary: 'Product Launch',
  description: 'Q4 product launch meeting',
  startDateTime: '2025-10-15T14:00:00Z',
  endDateTime: '2025-10-15T15:30:00Z',
  location: 'Conference Room A',
  attendees: ['john@example.com', 'jane@example.com'],
  timeZone: 'UTC',
});
```

**Response:**
```javascript
{
  success: true,
  event: { /* Google Calendar event object */ },
  invitesSent: true,
  metadata: {
    duration: '250ms',
    attendeesNotified: 2
  }
}
```

### 3. Typed Error Handling

All errors include:
- **Error type** (AuthenticationError, PermissionError, etc.)
- **Status code** (401, 403, 404, 429, etc.)
- **Context object** with operation details
- **Stack trace** for debugging
- **`isOperational` flag** to distinguish from programming errors

**Example:**
```javascript
try {
  await createCalendarEvent(eventDetails);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle auth failure (re-authenticate)
  } else if (error instanceof QuotaExceededError) {
    // Handle rate limiting (retry with backoff)
  } else if (error instanceof InvalidEventDataError) {
    // Handle validation error (fix input)
  }
  
  // Error includes context
  console.log(error.context); // { eventId, operation, originalError, ... }
  console.log(error.statusCode); // 401, 403, 404, etc.
}
```

### 4. Comprehensive Logging

All operations log:
- **Start of operation** with input parameters
- **Success** with performance metrics
- **Failure** with error details and context

**Log Example:**
```json
{
  "level": "info",
  "message": "Calendar event created successfully",
  "eventId": "abc123",
  "summary": "Product Launch",
  "duration": "250ms",
  "attendeesCount": 2,
  "invitesSent": true,
  "timestamp": "2025-10-04 12:00:00",
  "service": "pegasus-event-scheduler"
}
```

**Error Log Example:**
```json
{
  "level": "error",
  "message": "Failed to create Google Calendar event",
  "error": "Rate limit exceeded",
  "errorType": "QuotaExceededError",
  "statusCode": 429,
  "context": {
    "operation": "create event",
    "summary": "Product Launch",
    "calendarId": "primary"
  },
  "duration": "150ms",
  "stack": "...",
  "timestamp": "2025-10-04 12:00:00"
}
```

### 5. Calendar Invites

All event operations send calendar invites automatically:
- **Create**: Sends invite to all attendees
- **Update**: Notifies attendees of changes (`sendUpdates: 'all'`)
- **Delete**: Notifies attendees of cancellation

Attendees receive:
- Email notification
- Calendar event (ICS file)
- Link to accept/decline

## API Functions

### createCalendarEvent(eventDetails)

Creates a new calendar event and sends invites.

**Parameters:**
```javascript
{
  summary: string (required),        // Event title
  description: string,                // Event description
  startDateTime: string (required),   // ISO 8601 datetime
  endDateTime: string (required),     // ISO 8601 datetime
  location: string,                   // Event location
  timeZone: string,                   // Timezone (default: 'UTC')
  attendees: string[]                 // Array of email addresses
}
```

**Returns:**
```javascript
{
  success: boolean,
  event: Object,                      // Google Calendar event
  invitesSent: boolean,
  metadata: {
    duration: string,
    attendeesNotified: number
  }
}
```

**Throws:**
- `InvalidEventDataError` - Missing required fields
- `AuthenticationError` - Invalid credentials
- `PermissionError` - Insufficient permissions
- `QuotaExceededError` - Rate limit exceeded
- `CalendarError` - API error

### updateCalendarEvent(eventId, updates)

Updates an existing event and notifies attendees.

**Parameters:**
```javascript
{
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string,
  location: string,
  attendees: string[]
}
```

**Throws:**
- `EventNotFoundError` - Event doesn't exist
- Other error types as above

### getEventById(eventId)

Retrieves an event by ID.

**Returns:**
```javascript
{
  success: boolean,
  event: Object
}
```

**Throws:**
- `EventNotFoundError` - Event doesn't exist
- `PermissionError` - No access to event

### handleCalendarWebhook(webhookData)

Processes incoming webhooks from Google Calendar.

**Parameters:**
```javascript
{
  channelToken: string,
  channelId: string,
  resourceId: string,
  resourceState: string,              // 'exists', 'sync', 'not_exists'
  eventId: string
}
```

## Unit Tests

Comprehensive test coverage (48 tests) includes:

### Successful Operations
- ✓ Create event with all fields
- ✓ Create event with minimal data
- ✓ Update event fields
- ✓ Retrieve event by ID
- ✓ Handle webhooks

### Error Scenarios  
- ✓ Invalid credentials (401)
- ✓ Insufficient permissions (403)
- ✓ Event not found (404)
- ✓ Rate limit exceeded (429)
- ✓ Server errors (500)
- ✓ Invalid event data (400)
- ✓ Missing required fields

### Edge Cases
- ✓ Missing attendees
- ✓ Default timezone
- ✓ Partial updates
- ✓ Unknown webhook states
- ✓ Error context preservation

**Run Tests:**
```bash
npm test __tests__/services/googleCalendarClient.test.js
npm test __tests__/services/realCalendarService.test.js
```

## Configuration

### Environment Variables

```env
# Google Calendar API Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

### Getting Google Calendar API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Configure OAuth consent screen
6. Get OAuth refresh token using authorization code flow

**Scopes Required:**
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

## Usage Examples

### Basic Event Creation

```javascript
const { createCalendarEvent } = require('./src/services/realCalendarService');

const event = await createCalendarEvent({
  summary: 'Team Meeting',
  startDateTime: '2025-10-10T14:00:00Z',
  endDateTime: '2025-10-10T15:00:00Z',
  attendees: ['team@example.com'],
});

console.log(`Event created: ${event.event.id}`);
console.log(`Invites sent: ${event.invitesSent}`);
```

### Error Handling

```javascript
const {
  createCalendarEvent
} = require('./src/services/realCalendarService');
const {
  AuthenticationError,
  QuotaExceededError,
  InvalidEventDataError
} = require('./src/utils/errors');

try {
  const event = await createCalendarEvent(eventDetails);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
    // Redirect to OAuth flow
  } else if (error instanceof QuotaExceededError) {
    console.error('Rate limited:', error.message);
    // Implement exponential backoff
    await retryWithBackoff();
  } else if (error instanceof InvalidEventDataError) {
    console.error('Invalid data:', error.message);
    console.error('Details:', error.context);
    // Return validation error to user
  } else {
    console.error('Unexpected error:', error);
    // Log and alert
  }
}
```

### With Retry Logic

```javascript
async function createEventWithRetry(eventDetails, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await createCalendarEvent(eventDetails);
    } catch (error) {
      if (error instanceof QuotaExceededError && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

## Performance Considerations

1. **Client Initialization**: Client is initialized once and reused
2. **Performance Logging**: All operations log duration
3. **Error Context**: Minimal overhead for context tracking
4. **Attendee Limits**: Google Calendar supports up to 200 attendees per event

## Migration from Mock Service

The original mock service (`src/services/calendarService.js`) is still available for:
- Development without API credentials
- Testing without API calls
- Local development

To use the real service:
1. Update imports: `require('./services/realCalendarService')`
2. Configure environment variables
3. Initialize OAuth2 flow for refresh token
4. Deploy with production credentials

## Security Best Practices

1. **Never commit credentials** to version control
2. **Store refresh tokens securely** (encrypted at rest)
3. **Rotate credentials** regularly
4. **Use separate credentials** for dev/staging/production
5. **Monitor API usage** for suspicious activity
6. **Implement rate limiting** at application level
7. **Validate webhook signatures** (channel tokens)

## Monitoring and Alerts

Recommended monitoring:
- **Error rates** by error type
- **API latency** (track duration logs)
- **Quota usage** (track 429 errors)
- **Authentication failures** (track 401 errors)
- **Event creation success rate**

## Troubleshooting

### Authentication Errors
- Verify credentials are correct
- Check refresh token hasn't expired
- Ensure OAuth consent screen is configured
- Verify redirect URI matches

### Permission Errors
- Check API scopes include calendar access
- Verify user has granted permissions
- Check calendar sharing settings

### Rate Limiting
- Implement exponential backoff
- Cache frequently accessed data
- Batch operations when possible
- Monitor quota usage

## Future Enhancements

Potential improvements:
1. **Batch operations** for multiple events
2. **Recurring events** support
3. **Attachment handling** for event files
4. **Calendar list management**
5. **Free/busy queries**
6. **Event search** with filters
7. **Notification channel** management
8. **ACL management** for shared calendars

## References

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Node.js Client Library](https://github.com/googleapis/google-api-nodejs-client)
- [Error Codes](https://developers.google.com/calendar/api/guides/errors)

