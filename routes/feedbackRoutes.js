const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { requireRole } = require('../middleware/auth');

// POST /api/feedback
router.post('/', requireRole('TOURIST'), feedbackController.submitFeedback);

// GET /api/feedback/site/:siteId
router.get('/site/:siteId', feedbackController.getFeedbackBySite);

module.exports = router;
