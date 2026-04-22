const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  sendCampaign,
  getEmailLogs,
  getEmailStats,
  unsubscribe,
  sendTestEmail
} = require('../controllers/emailController');

// ── Admin-only middleware ──────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
};

// ── Public routes ─────────────────────────────────────────────
router.get('/unsubscribe', unsubscribe);

// ── Admin routes ──────────────────────────────────────────────
router.post('/campaign', protect, adminOnly, sendCampaign);
router.get('/logs', protect, adminOnly, getEmailLogs);
router.get('/stats', protect, adminOnly, getEmailStats);
router.post('/test', protect, adminOnly, sendTestEmail);

module.exports = router;
