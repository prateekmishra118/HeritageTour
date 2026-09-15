const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const heritageController = require('../controllers/heritageController');
const eventController = require('../controllers/eventController');
const guideController = require('../controllers/guideController');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('ADMIN'));

// ---- Dashboard & reports ----
// GET /api/admin/dashboard
router.get('/dashboard', adminController.getDashboardStats);

// GET /api/admin/reports
router.get('/reports', adminController.getReports);

// ---- Users ----
// GET /api/admin/users
router.get('/users', adminController.getAllUsers);

// ---- Bookings ----
// GET /api/admin/bookings
router.get('/bookings', adminController.getAllBookings);

// ---- Heritage sites ----
// GET /api/admin/heritage
router.get('/heritage', heritageController.getAllSites);

// POST /api/admin/heritage
router.post('/heritage', heritageController.createSite);

// PUT /api/admin/heritage/:id
router.put('/heritage/:id', heritageController.updateSite);

// DELETE /api/admin/heritage/:id
router.delete('/heritage/:id', heritageController.deleteSite);

// ---- Tour guides ----
// GET /api/admin/guides
router.get('/guides', guideController.getAllGuides);

// PUT /api/admin/guides/:id/availability
router.put('/guides/:id/availability', guideController.updateAvailability);

// ---- Events ----
// POST /api/admin/events
router.post('/events', eventController.createEvent);

// PUT /api/admin/events/:id
router.put('/events/:id', eventController.updateEvent);

// DELETE /api/admin/events/:id
router.delete('/events/:id', eventController.deleteEvent);

module.exports = router;
