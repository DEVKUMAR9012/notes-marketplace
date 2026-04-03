// ── paymentRoutes.js ──────────────────────────────────────────────────────────
// Place this file at: backend/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPurchaseStatus,
  withdrawRequest
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/status/:noteId', protect, getPurchaseStatus);
router.post('/withdraw', protect, withdrawRequest);

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// ── profileRoutes.js ──────────────────────────────────────────────────────────
// Place this file at: backend/routes/profileRoutes.js
// (Create this as a separate file — shown here together for convenience)

/*
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getProfile, updateProfile, getWallet } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// Multer for profile images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/profiles';
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

router.get('/me', protect, getProfile);
router.put('/update', protect, upload.single('profileImage'), updateProfile);
router.get('/wallet', protect, getWallet);

module.exports = router;
*/