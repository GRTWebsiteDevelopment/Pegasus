const express = require('express');
const calendarController = require('../controllers/calendarController');

const router = express.Router();

router.post('/events', calendarController.createEvent);
router.put('/events/:id', calendarController.updateEvent);
router.get('/events/:id', calendarController.getEvent);
router.post('/webhook', calendarController.handleWebhook);

module.exports = router;
