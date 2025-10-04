const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');
const config = require('./config');
const calendarRoutes = require('./routes/calendarRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.use('/api', calendarRoutes);

module.exports = app;
