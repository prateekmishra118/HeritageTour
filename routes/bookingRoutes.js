const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireRole } = require('../middleware/auth');

// POST /api/bookings
router.post('/', requireRole('TOURIST'), bookingController.createBooking);

// GET /api/bookings/tourist/:touristId  (must come before /:id)
router.get('/tourist/:touristId', requireRole('TOURIST'), bookingController.getBookingsByTourist);

// GET /api/bookings/:id
router.get('/:id', bookingController.getBookingById);

module.exports = router;
