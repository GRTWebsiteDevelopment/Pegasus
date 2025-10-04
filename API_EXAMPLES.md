# API Examples

This document contains practical examples for using the Pegasus Event Scheduler API.

## Prerequisites

Ensure the server is running:
```bash
npm start
```

Base URL: `http://localhost:3000/api`

---

## Health Check

### Check Server Status

```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-10-04T12:00:00.000Z",
  "service": "pegasus-event-scheduler",
  "version": "1.0.0"
}
```

---

## Calendar Events

### 1. Create a Calendar Event

```bash
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Product Launch Meeting",
    "description": "Discuss Q4 product launch strategy",
    "startDateTime": "2025-10-15T14:00:00Z",
    "endDateTime": "2025-10-15T15:30:00Z",
    "location": "Conference Room B",
    "timeZone": "UTC",
    "attendees": [
      "john.doe@example.com",
      "jane.smith@example.com"
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "summary": "Product Launch Meeting",
    "description": "Discuss Q4 product launch strategy",
    "location": "Conference Room B",
    "start": {
      "dateTime": "2025-10-15T14:00:00Z",
      "timeZone": "UTC"
    },
    "end": {
      "dateTime": "2025-10-15T15:30:00Z",
      "timeZone": "UTC"
    },
    "attendees": [
      { "email": "john.doe@example.com" },
      { "email": "jane.smith@example.com" }
    ],
    "created": "2025-10-04T12:00:00.000Z",
    "updated": "2025-10-04T12:00:00.000Z"
  }
}
```

### 2. Get Event by ID

```bash
curl http://localhost:3000/api/calendar/events/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "summary": "Product Launch Meeting",
    ...
  }
}
```

### 3. Update an Event

```bash
curl -X PUT http://localhost:3000/api/calendar/events/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Product Launch Meeting - UPDATED",
    "location": "Virtual Meeting Room",
    "startDateTime": "2025-10-15T15:00:00Z",
    "endDateTime": "2025-10-15T16:30:00Z"
  }'
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "summary": "Product Launch Meeting - UPDATED",
    "location": "Virtual Meeting Room",
    "start": {
      "dateTime": "2025-10-15T15:00:00Z",
      "timeZone": "UTC"
    },
    "end": {
      "dateTime": "2025-10-15T16:30:00Z",
      "timeZone": "UTC"
    },
    "updated": "2025-10-04T12:05:00.000Z",
    ...
  }
}
```

### 4. Create Simple Event (Minimal Data)

```bash
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Quick Standup",
    "startDateTime": "2025-10-12T09:00:00Z",
    "endDateTime": "2025-10-12T09:15:00Z"
  }'
```

---

## Email Notifications

### 1. Send Simple Email

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Meeting Reminder",
    "body": "Don'\''t forget about tomorrow'\''s meeting at 2 PM!"
  }'
```

**Response:**
```json
{
  "success": true,
  "emailId": "email_1234567890_abc123",
  "sentAt": "2025-10-04T12:00:00.000Z"
}
```

### 2. Send Email to Multiple Recipients

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": [
      "user1@example.com",
      "user2@example.com",
      "user3@example.com"
    ],
    "subject": "Team Update",
    "body": "Please review the updated project timeline."
  }'
```

### 3. Send Email with Event Data (HTML Format)

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "attendee@example.com",
    "subject": "New Event: Product Launch Meeting",
    "body": "You have been invited to a new event.",
    "event": {
      "summary": "Product Launch Meeting",
      "description": "Discuss Q4 product launch",
      "location": "Conference Room B",
      "start": { "dateTime": "2025-10-15T14:00:00Z" },
      "end": { "dateTime": "2025-10-15T15:30:00Z" },
      "attendees": [
        { "email": "john@example.com" },
        { "email": "jane@example.com" }
      ]
    }
  }'
```

---

## Webhooks

### Handle Calendar Webhook

**Note:** This endpoint is typically called by Google Calendar, not manually. Here's an example for testing:

```bash
curl -X POST http://localhost:3000/api/webhook/calendar \
  -H "Content-Type: application/json" \
  -H "x-goog-channel-token: your_webhook_secret_here" \
  -H "x-goog-channel-id: channel-123" \
  -H "x-goog-resource-id: resource-456" \
  -H "x-goog-resource-state: sync" \
  -d '{}'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "action": "sync_notification",
    "resourceId": "resource-456"
  }
}
```

---

## Error Handling Examples

### 1. Validation Error - Missing Required Field

```bash
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test Meeting"
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "field": "startDateTime",
      "message": "\"startDateTime\" is required"
    },
    {
      "field": "endDateTime",
      "message": "\"endDateTime\" is required"
    }
  ]
}
```

### 2. Validation Error - Invalid Email

```bash
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test Meeting",
    "startDateTime": "2025-10-15T14:00:00Z",
    "endDateTime": "2025-10-15T15:00:00Z",
    "attendees": ["invalid-email"]
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "field": "attendees.0",
      "message": "\"attendees[0]\" must be a valid email"
    }
  ]
}
```

### 3. Not Found Error

```bash
curl http://localhost:3000/api/calendar/events/non-existent-id
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Calendar event retrieval failed: Event not found: non-existent-id"
}
```

### 4. Unauthorized Webhook

```bash
curl -X POST http://localhost:3000/api/webhook/calendar \
  -H "Content-Type: application/json" \
  -H "x-goog-channel-token: wrong_token" \
  -d '{}'
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## JavaScript/Node.js Examples

### Using Fetch API

```javascript
// Create a calendar event
async function createEvent() {
  const response = await fetch('http://localhost:3000/api/calendar/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: 'Team Standup',
      startDateTime: '2025-10-12T09:00:00Z',
      endDateTime: '2025-10-12T09:15:00Z',
      attendees: ['team@example.com']
    })
  });
  
  const data = await response.json();
  console.log('Event created:', data.event.id);
  return data;
}

// Get event by ID
async function getEvent(eventId) {
  const response = await fetch(
    `http://localhost:3000/api/calendar/events/${eventId}`
  );
  const data = await response.json();
  return data.event;
}

// Send email notification
async function sendEmail(to, subject, body) {
  const response = await fetch('http://localhost:3000/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, body })
  });
  
  const data = await response.json();
  console.log('Email sent:', data.emailId);
  return data;
}
```

### Using Axios

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Create event
const createEvent = async (eventData) => {
  try {
    const response = await axios.post(`${API_BASE}/calendar/events`, eventData);
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error.response.data);
    throw error;
  }
};

// Update event
const updateEvent = async (eventId, updates) => {
  try {
    const response = await axios.put(
      `${API_BASE}/calendar/events/${eventId}`,
      updates
    );
    return response.data;
  } catch (error) {
    console.error('Error updating event:', error.response.data);
    throw error;
  }
};

// Example usage
(async () => {
  const event = await createEvent({
    summary: 'Test Meeting',
    startDateTime: '2025-10-15T10:00:00Z',
    endDateTime: '2025-10-15T11:00:00Z'
  });
  
  console.log('Created event:', event.event.id);
  
  const updated = await updateEvent(event.event.id, {
    summary: 'Updated Test Meeting',
    location: 'Room 101'
  });
  
  console.log('Updated event:', updated.event);
})();
```

---

## Postman Collection

You can import these examples into Postman by creating a new collection with the following structure:

1. **Health Check** - GET `{{base_url}}/health`
2. **Create Event** - POST `{{base_url}}/calendar/events`
3. **Get Event** - GET `{{base_url}}/calendar/events/:eventId`
4. **Update Event** - PUT `{{base_url}}/calendar/events/:eventId`
5. **Send Email** - POST `{{base_url}}/email/send`
6. **Webhook** - POST `{{base_url}}/webhook/calendar`

Set the environment variable:
- `base_url` = `http://localhost:3000/api`

---

## Testing with Mock Data

Since the application uses mock implementations, you can test all endpoints without requiring real API credentials. The mock services:

- **Calendar Service**: Stores events in memory (resets on restart)
- **Email Service**: Logs emails to queue (viewable in application logs)

All created events are accessible until the server restarts.

