const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
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
    resumeGuestSession,
    googleOneTapLogin,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ── Rate Limiters ────────────────────────────────────────────────────────────
// Fix #3: Prevent OTP inbox spam / quota exhaustion on sensitive email routes
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1-hour window
  max: 3,                    // max 3 OTP requests per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many code requests. Please try again in an hour.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 20,                   // 20 login attempts per IP — generous but blocks bots
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
});

// ── Standard Auth ────────────────────────────────────────────────────────────
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', otpLimiter, resendOtp);          // OTP spam guard
router.post('/forgot-password', otpLimiter, forgotPassword); // OTP spam guard
router.post('/reset-password', resetPassword);
router.post('/verify-phone', verifyPhoneAuth);
router.post('/phone-register', phoneRegister);
router.post('/phone-login', phoneLogin);
router.post('/login', loginLimiter, login);                  // Brute-force guard

// ── Guest Flow ───────────────────────────────────────────────────────────────
router.post('/guest-init', guestInit);             // Silent background session
router.post('/resume-guest', resumeGuestSession);  // Resume by Guest Pass token
router.post('/convert-guest', convertGuestToUser); // Upgrade guest → permanent user

// ── Social Auth ──────────────────────────────────────────────────────────────
router.post('/google-one-tap', loginLimiter, googleOneTapLogin); // Google One-Tap

// ── Protected ────────────────────────────────────────────────────────────────
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);

module.exports = router;