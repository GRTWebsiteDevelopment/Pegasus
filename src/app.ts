import express from 'express';
import { logger } from './logger';
import { env } from './config';
import healthRouter from './routes/health';
import eventsRouter from './routes/events';
import webhookRouter from './routes/webhook';

const app = express();

app.use(express.json());

// request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      },
      'request completed'
    );
  });
  next();
});

app.use('/health', healthRouter);
app.use('/events', eventsRouter);
app.use('/webhook', webhookRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

export default app;

