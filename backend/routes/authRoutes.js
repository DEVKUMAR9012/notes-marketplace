const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, verifyEmail, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/login', login);

// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, getMe);

// @route   PUT /api/auth/update
// @access  Private
router.put('/update', protect, updateProfile);

module.exports = router;