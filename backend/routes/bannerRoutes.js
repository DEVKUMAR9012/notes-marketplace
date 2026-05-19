const express = require('express');
const router = express.Router();
const { getActiveBannersForUser } = require('../controllers/bannerController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/banners/active - Fetch active targeted banners
router.get('/active', protect, getActiveBannersForUser);

module.exports = router;
