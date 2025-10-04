# Pegasus-1: Event Scheduling API

This is a Node.js Express skeleton for an event scheduling application. It includes structured logging, environment-driven configurations, and a set of mock services for scheduling events and sending notifications.

## Features

- **Express Server**: A robust and minimalist web framework for Node.js.
- **/health endpoint**: For monitoring the application's status.
- **Structured Logging**: Using Winston for clear and consistent logs.
- **Environment-driven Configurations**: Manage your application's configuration for different environments.
- **Mock Services**: Mock implementations for calendar and email services.
- **Unit Tests**: A full suite of unit tests to ensure the application's stability.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/your-username/Pegasus-1.git
    ```
2.  Install the dependencies:
    ```sh
    npm install
    ```
3.  Create a `.env` file in the root directory and add the following environment variables:
    ```
    NODE_ENV=development
    PORT=3000

    GOOGLE_API_KEY=your_google_api_key
    GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
    GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret

    EMAIL_PROVIDER=mock
    SENDGRID_API_KEY=your_sendgrid_api_key
    ```

### Running the Application

-   **Development mode**:
    ```sh
    npm run dev
    ```
    This will start the server with nodemon, which will automatically restart the server on file changes.

-   **Production mode**:
    ```sh
    npm start
    ```

### Running the Tests

To run the unit tests, use the following command:

```sh
npm test
```

## API Endpoints

-   `GET /health`: Checks the health of the application.
-   `POST /api/events`: Creates a new event.
-   `GET /api/events/:id`: Retrieves an event by its ID.
-   `PUT /api/events/:id`: Updates an event.
-   `POST /api/webhook`: Handles calendar webhooks.
