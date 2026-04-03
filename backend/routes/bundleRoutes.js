const express = require('express');
const router = express.Router();
const { getBundles, createBundle, getBundle } = require('../controllers/bundleController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getBundles);
router.post('/', protect, createBundle);
router.get('/:id', getBundle);

module.exports = router;
