# Pegasus Event Scheduler

A robust Node.js Express application for event scheduling with Google Calendar integration and email notifications.

## Features

- 🗓️ **Calendar Event Management**: Create, update, and retrieve calendar events
- 📧 **Email Notifications**: Send automated email notifications for events
- 🔔 **Webhook Support**: Handle incoming webhooks from Google Calendar
- 📝 **Structured Logging**: Winston-based logging with JSON format
- ⚙️ **Environment-Driven Configuration**: Manage API keys, OAuth tokens, and settings via environment variables
- ✅ **Comprehensive Testing**: Full unit test coverage with Jest
- 🏥 **Health Check Endpoint**: Monitor application status

## Project Structure

```
pegasus-event-scheduler/
├── src/
│   ├── config/          # Configuration management
│   ├── middleware/      # Express middleware (validation, etc.)
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic (calendar, email)
│   ├── utils/           # Utility functions (logger)
│   ├── app.js           # Express app configuration
│   └── server.js        # Server entry point
├── __tests__/           # Test files
│   ├── services/        # Service tests
│   └── routes/          # Route tests
├── logs/                # Application logs
├── .gitignore           # Git ignore rules
├── package.json         # Project dependencies
└── README.md            # This file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Pegasus
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory (or copy from `.env.example`):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Google Calendar API Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token_here

# Email Service Configuration
EMAIL_SERVICE_API_KEY=your_email_api_key_here
EMAIL_FROM=noreply@yourdomain.com

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret_here

# Logging
LOG_LEVEL=info
```

### Running the Application

#### Development Mode (with auto-reload):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

### Running Tests

Run all tests with coverage:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## API Documentation

### Health Check

**GET** `/api/health`

Check if the server is running.

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

### Calendar Events

#### Create Event

**POST** `/api/calendar/events`

Create a new calendar event.

**Request Body:**
```json
{
  "summary": "Team Meeting",
  "description": "Weekly team sync",
  "startDateTime": "2025-10-10T10:00:00Z",
  "endDateTime": "2025-10-10T11:00:00Z",
  "location": "Conference Room A",
  "timeZone": "UTC",
  "attendees": ["user1@example.com", "user2@example.com"]
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "event-uuid",
    "summary": "Team Meeting",
    "description": "Weekly team sync",
    "start": {
      "dateTime": "2025-10-10T10:00:00Z",
      "timeZone": "UTC"
    },
    "end": {
      "dateTime": "2025-10-10T11:00:00Z",
      "timeZone": "UTC"
    },
    "location": "Conference Room A",
    "attendees": [
      { "email": "user1@example.com" },
      { "email": "user2@example.com" }
    ],
    "created": "2025-10-04T12:00:00.000Z",
    "updated": "2025-10-04T12:00:00.000Z"
  }
}
```

#### Get Event

**GET** `/api/calendar/events/:eventId`

Retrieve an event by ID.

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "event-uuid",
    "summary": "Team Meeting",
    ...
  }
}
```

#### Update Event

**PUT** `/api/calendar/events/:eventId`

Update an existing event.

**Request Body:**
```json
{
  "summary": "Updated Meeting Title",
  "location": "New Location"
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "event-uuid",
    "summary": "Updated Meeting Title",
    "location": "New Location",
    "updated": "2025-10-04T12:05:00.000Z",
    ...
  }
}
```

### Email Notifications

#### Send Email

**POST** `/api/email/send`

Send an email notification.

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Event Notification",
  "body": "You have a new event",
  "event": {
    "summary": "Team Meeting",
    "location": "Room A",
    "start": { "dateTime": "2025-10-10T10:00:00Z" }
  }
}
```

**Response:**
```json
{
  "success": true,
  "emailId": "email_1234567890_abc123",
  "sentAt": "2025-10-04T12:00:00.000Z"
}
```

### Webhooks

#### Calendar Webhook

**POST** `/api/webhook/calendar`

Handle incoming webhooks from Google Calendar.

**Headers:**
- `x-goog-channel-token`: Webhook authentication token
- `x-goog-channel-id`: Channel ID
- `x-goog-resource-id`: Resource ID
- `x-goog-resource-state`: Resource state (exists, sync, not_exists)

**Request Body:**
```json
{
  "eventId": "event-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "action": "synced",
    "event": { ... }
  }
}
```

## Core Functions

### Calendar Service (`src/services/calendarService.js`)

- **`createCalendarEvent(eventDetails)`**: Creates a new calendar event
- **`updateCalendarEvent(eventId, updates)`**: Updates an existing event
- **`getEventById(eventId)`**: Retrieves an event by ID
- **`handleCalendarWebhook(webhookData)`**: Processes calendar webhooks

### Email Service (`src/services/emailService.js`)

- **`sendEmailNotification(emailDetails)`**: Sends an email notification
- **`sendEventCreatedNotification(event)`**: Sends creation notification to attendees
- **`sendEventUpdatedNotification(event)`**: Sends update notification to attendees

## Mock API Data

The application uses mock API clients for development and testing:

- **Mock Google Calendar API**: Simulates calendar operations with in-memory storage
- **Mock Email Service**: Simulates email sending with a mock queue

These mock implementations allow you to develop and test without actual API credentials.

## Logging

The application uses Winston for structured logging:

- **Logs Directory**: `logs/`
- **Log Files**:
  - `error.log`: Error-level logs only
  - `combined.log`: All logs
- **Console Output**: Colorized logs in development mode
- **Log Format**: JSON with timestamps

Example log entry:
```json
{
  "level": "info",
  "message": "Calendar event created successfully",
  "eventId": "event-uuid",
  "timestamp": "2025-10-04 12:00:00",
  "service": "pegasus-event-scheduler"
}
```

## Testing

The project includes comprehensive unit tests:

- **Service Tests**: Test business logic in isolation
- **Route Tests**: Test API endpoints with supertest
- **Coverage**: Automated code coverage reporting

Test files are located in `__tests__/` directory and mirror the `src/` structure.

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Validation errors include detailed information:

```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "field": "startDateTime",
      "message": "\"startDateTime\" is required"
    }
  ]
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI | - |
| `GOOGLE_REFRESH_TOKEN` | Google refresh token | - |
| `EMAIL_SERVICE_API_KEY` | Email service API key | - |
| `EMAIL_FROM` | Sender email address | `noreply@example.com` |
| `WEBHOOK_SECRET` | Webhook authentication secret | - |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | `info` |

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Configure real Google Calendar API credentials
3. Set up a real email service (SendGrid, AWS SES, etc.)
4. Configure webhook secrets securely
5. Use a process manager like PM2 or Docker
6. Set up log rotation for production logs
7. Configure HTTPS and secure headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue on the repository.

