Event Scheduling API Skeleton (Express + TypeScript)

Minimal Express skeleton for event scheduling with env-driven configs, structured logging, mock Google Calendar and Email clients, and full unit tests.

Scripts

- npm run dev: Start dev server with ts-node-dev
- npm run build: Compile TypeScript to dist/
- npm start: Run compiled server
- npm test: Run Jest tests

Environment

Create a .env file with:

NODE_ENV=development
PORT=3000
LOG_LEVEL=info
ENABLE_PRETTY_LOGS=true
BASE_URL=http://localhost:3000
GOOGLE_API_KEY=mock-google-api-key
GOOGLE_OAUTH_TOKEN=mock-google-oauth-token
EMAIL_API_KEY=mock-email-api-key

Endpoints

- GET /health -> { status: 'ok' }
- POST /events -> create event
- PUT /events/:id -> update event
- GET /events/:id -> fetch event
- POST /webhook -> handle calendar webhook (mock)

Notes

- Logging uses pino with pretty transport in development.
- Google Calendar and Email integrations are mocked for local dev and testing.

Project Layout

- src/app.ts Express app and routes
- src/server.ts entry point
- src/config env-driven configuration (envalid + dotenv)
- src/logger structured logger (pino)
- src/routes API routes
- src/services business logic and integrations
- src/clients mock external clients
- tests Jest test suites

