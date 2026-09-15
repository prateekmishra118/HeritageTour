const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { requireRole } = require('../middleware/auth');

// GET /api/events
router.get('/', eventController.getAllEvents);

// GET /api/events/:id
router.get('/:id', eventController.getEventById);

// POST /api/events/:id/register
router.post('/:id/register', requireRole('TOURIST'), eventController.registerForEvent);

module.exports = router;
