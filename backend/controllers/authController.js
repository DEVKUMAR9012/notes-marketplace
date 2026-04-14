const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('ERROR: JWT_SECRET missing in .env');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' });
};

// ✅ HELPER: Send email in background (non-blocking)
const sendEmailAsync = (emailOptions) => {
  // Fire-and-forget: don't await, let it run in background
  sendEmail(emailOptions).catch(err => {
    console.error('❌ Background email error:', err.message);
    // Error is logged but doesn't break the user's experience
  });
};

// ✅ HELPER: Generate email HTML
const generateOTPEmailHTML = (otp) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">📚 Notes Marketplace - Email Verification</h2>
      <p>Hello,</p>
      <p>Thank you for signing up at Notes Marketplace!</p>
      <p>Your 6-digit verification code is:</p>
      <div style="background: #f0f0f0; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
        <h1 style="color: #7c3aed; font-kerning: 2px; letter-spacing: 5px;">${otp}</h1>
      </div>
      <p><strong>⏰ This code expires in 10 minutes.</strong></p>
      <p>If you didn't request this code, please ignore this email.</p>
      <p>Best regards,<br/>Notes Marketplace Team</p>
    </div>
  `;
};

// ========== REGISTER ==========
exports.register = async (req, res) => {
  const { name, email, password, college } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const userExists = await User.findOne({ email });

    if (userExists && userExists.isVerified) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists. Please login.' });
    }

    let user;
    if (userExists && !userExists.isVerified) {
      userExists.name = name;
      userExists.college = college || '';
      userExists.password = password;
      user = userExists;
    } else {
      user = await User.create({ name, email, password, college: college || '' });
    }

    const otp = user.generateAuthOTP();
    await user.save({ validateBeforeSave: false });

    // ✅ FIRE-AND-FORGET: Send email in background, return to user immediately
    sendEmailAsync({
      email: user.email,
      subject: '📚 Notes Marketplace - Your Verification Code',
      message: `Your verification code is: ${otp}. It expires in 10 minutes.`,
      html: generateOTPEmailHTML(otp)
    });

    // ✅ Return success immediately (email sends in background)
    res.status(201).json({ 
      success: true, 
      message: 'Account created! Check your email for verification code. It may take a few moments to arrive.',
      emailSent: true 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== LOGIN (with isVerified check) ==========
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // ✅ IMPROVEMENT 1: Block unverified users
    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: 'Please verify your email before logging in.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        earnings: user.earnings || 0,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== VERIFY EMAIL ==========
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email and code' });
    }

    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    const user = await User.findOne({
      email: email.toLowerCase(),
      otpCode: hashedOTP,
      otpExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, college: user.college, earnings: user.earnings || 0, role: user.role || 'user' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== RESEND OTP ==========
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found. Please register first.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified. Please login.' });
    }

    const otp = user.generateAuthOTP();
    await user.save({ validateBeforeSave: false });

    // ✅ FIRE-AND-FORGET: Send email in background
    sendEmailAsync({
      email: user.email,
      subject: '📚 Notes Marketplace - Resend Verification Code',
      message: `Your new verification code is: ${otp}. It expires in 10 minutes.`,
      html: generateOTPEmailHTML(otp)
    });

    res.status(200).json({ 
      success: true, 
      message: 'New verification code sent! Check your email.' 
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ========== GET ME ==========
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ========== UPDATE PROFILE ==========
exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      college: req.body.college
    };
    const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, { new: true, runValidators: true });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ========== FORGOT PASSWORD ==========
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Please provide email' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const otp = user.generateAuthOTP();
    await user.save({ validateBeforeSave: false });

    // ✅ FIRE-AND-FORGET: Send password reset email in background
    sendEmailAsync({
      email: user.email,
      subject: '📚 Notes Marketplace - Password Reset Code',
      message: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
      html: generateOTPEmailHTML(otp)
    });

    res.status(200).json({ 
      success: true, 
      message: 'Check your email for password reset code!' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Error processing request' });
  }
};

// ========== RESET PASSWORD ==========
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide email, otp, and new password' });
    }

    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    const user = await User.findOne({
      email: email.toLowerCase(),
      otpCode: hashedOTP,
      otpExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired code' });

    user.password = newPassword;
    user.otpCode = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};