const dotenv = require('dotenv');
const path = require('path');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

dotenv.config({ path: path.resolve(__dirname, `../../${envFile}`) });

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
};
