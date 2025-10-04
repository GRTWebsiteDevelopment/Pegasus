import { Router } from 'express';
import { handleCalendarWebhook } from '../services/calendarService';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    await handleCalendarWebhook(req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

