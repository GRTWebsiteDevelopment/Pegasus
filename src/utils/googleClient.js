const { google } = require('googleapis');
const config = require('../config');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const auth = new google.auth.JWT(
  config.GOOGLE_CLIENT_EMAIL,
  null,
  (config.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  SCOPES
);

const calendar = google.calendar({ version: 'v3', auth });

module.exports = { auth, calendar };
