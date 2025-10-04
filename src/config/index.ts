import dotenv from 'dotenv';
import { cleanEnv, port, str, bool, url } from 'envalid';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ default: 'development' }),
  PORT: port({ default: 3000 }),
  LOG_LEVEL: str({ default: 'info' }),
  GOOGLE_API_KEY: str({ default: 'mock-google-api-key' }),
  GOOGLE_OAUTH_TOKEN: str({ default: 'mock-google-oauth-token' }),
  EMAIL_API_KEY: str({ default: 'mock-email-api-key' }),
  BASE_URL: url({ default: 'http://localhost:3000' }),
  ENABLE_PRETTY_LOGS: bool({ default: true }),
});

export type AppConfig = typeof env;

