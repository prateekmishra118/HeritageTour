const express = require('express');
const router = express.Router();
const heritageController = require('../controllers/heritageController');

// GET /api/heritage
router.get('/', heritageController.getAllSites);

// GET /api/heritage/:id
router.get('/:id', heritageController.getSiteById);

module.exports = router;
