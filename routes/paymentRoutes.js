const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireRole } = require('../middleware/auth');

// POST /api/payments
router.post('/', requireRole('TOURIST'), paymentController.processPayment);

// GET /api/payments/:bookingId
router.get('/:bookingId', paymentController.getPaymentByBooking);

module.exports = router;
