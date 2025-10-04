import { Router } from 'express';
import { createCalendarEvent, updateCalendarEvent, getEventById } from '../services/calendarService';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const event = await createCalendarEvent(req.body);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const event = await updateCalendarEvent(req.params.id, req.body);
    res.json(event);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not Found' });
    res.json(event);
  } catch (err) {
    next(err);
  }
});

export default router;

