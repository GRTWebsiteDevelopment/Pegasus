require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
  email: {
    apiKey: process.env.EMAIL_SERVICE_API_KEY,
    from: process.env.EMAIL_FROM || 'noreply@example.com',
  },
  webhook: {
    secret: process.env.WEBHOOK_SECRET || 'default_webhook_secret_for_testing',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

module.exports = config;

