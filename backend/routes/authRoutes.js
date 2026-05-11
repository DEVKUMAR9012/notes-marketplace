const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getMe,
    updateProfile,
    verifyEmail,
    forgotPassword,
    resetPassword,
    resendOtp,
    verifyPhoneAuth,
    phoneRegister,
    phoneLogin,
    guestInit,
    convertGuestToUser,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-phone', verifyPhoneAuth);
router.post('/phone-register', phoneRegister);
router.post('/phone-login', phoneLogin);

// ── Guest Flow ──────────────────────────────────────────────────────────────
router.post('/guest-init', guestInit);           // Silent background session
router.post('/convert-guest', convertGuestToUser); // Upgrade guest → permanent user

router.post('/login', login);

// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, getMe);

// @route   PUT /api/auth/update
// @access  Private
router.put('/update', protect, updateProfile);

module.exports = router;