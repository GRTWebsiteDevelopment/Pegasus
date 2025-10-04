# Quick Start Guide

## Installation

```bash
npm install
```

## Environment Configuration

Create a `.env` file in the project root with the following variables:

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

**Note:** For development/testing, you can use mock values. The application includes mock implementations for Google Calendar API and email services.

## Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Testing

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

## Quick API Test

Once the server is running, test the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-10-04T12:00:00.000Z",
  "service": "pegasus-event-scheduler",
  "version": "1.0.0"
}
```

## Example: Create a Calendar Event

```bash
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Team Meeting",
    "description": "Weekly team sync",
    "startDateTime": "2025-10-10T10:00:00Z",
    "endDateTime": "2025-10-10T11:00:00Z",
    "location": "Conference Room A",
    "attendees": ["user@example.com"]
  }'
```

## Example: Send Email Notification

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Event Notification",
    "body": "You have a new event scheduled"
  }'
```

## Project Structure

```
pegasus-event-scheduler/
├── src/
│   ├── config/              # Configuration management
│   ├── middleware/          # Express middleware
│   ├── routes/              # API route handlers
│   │   ├── calendar.js      # Calendar event endpoints
│   │   ├── email.js         # Email notification endpoints
│   │   ├── webhook.js       # Webhook handlers
│   │   └── index.js         # Route aggregator
│   ├── services/            # Business logic
│   │   ├── calendarService.js  # Calendar operations
│   │   └── emailService.js     # Email operations
│   ├── utils/               # Utility functions
│   │   └── logger.js        # Structured logging
│   ├── app.js               # Express app setup
│   └── server.js            # Server entry point
├── __tests__/               # Test files
├── logs/                    # Application logs
├── package.json             # Dependencies
└── README.md                # Full documentation
```

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/calendar/events` | Create calendar event |
| GET | `/api/calendar/events/:eventId` | Get event by ID |
| PUT | `/api/calendar/events/:eventId` | Update event |
| POST | `/api/email/send` | Send email notification |
| POST | `/api/webhook/calendar` | Handle calendar webhook |

## Development Tips

1. **Logs**: Check `logs/combined.log` for all logs, `logs/error.log` for errors only
2. **Testing**: Tests use mock implementations - no real API calls are made
3. **Validation**: Request validation errors return detailed field-level feedback
4. **Hot Reload**: Use `npm run dev` for automatic restart on file changes

## Troubleshooting

### Port already in use
Change the `PORT` variable in your `.env` file

### Dependencies not found
Run `npm install` again

### Test failures
Ensure you're in the project root and run `npm test`

## Next Steps

1. Configure real Google Calendar API credentials for production
2. Set up a real email service (SendGrid, AWS SES, etc.)
3. Implement OAuth2 flow for user authentication
4. Add rate limiting and security headers
5. Set up CI/CD pipeline
6. Deploy to your preferred hosting platform

For detailed API documentation, see [README.md](./README.md)

