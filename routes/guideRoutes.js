const express = require('express');
const router = express.Router();
const guideController = require('../controllers/guideController');
const { requireRole } = require('../middleware/auth');

// GET /api/guides
router.get('/', guideController.getAllGuides);

// GET /api/guides/profile/:userId  (must come before /:id)
router.get('/profile/:userId', guideController.getGuideProfileByUserId);

// PUT /api/guides/bookings/:bookingId/accept  (must come before /:id/bookings)
router.put('/bookings/:bookingId/accept', requireRole('TOUR_GUIDE'), guideController.acceptBooking);

// PUT /api/guides/bookings/:bookingId/reject
router.put('/bookings/:bookingId/reject', requireRole('TOUR_GUIDE'), guideController.rejectBooking);

// GET /api/guides/:id
router.get('/:id', guideController.getGuideById);

// PUT /api/guides/:id/availability
router.put('/:id/availability', requireRole('TOUR_GUIDE'), guideController.updateAvailability);

// GET /api/guides/:id/bookings
router.get('/:id/bookings', requireRole('TOUR_GUIDE'), guideController.getGuideBookings);

module.exports = router;
