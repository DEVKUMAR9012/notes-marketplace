const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// ✅ Ensure JWT_SECRET exists
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('ERROR: JWT_SECRET is not defined in .env file!');
}

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },  // Changed back to { id } for consistency with authMiddleware
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { name, email, password, college } = req.body;
  
  try {
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide name, email, and password' 
      });
    }

    const userExists = await User.findOne({ email });

    // If user exists but is NOT verified, allow re-registration (resend OTP)
    if (userExists && userExists.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: 'An account with this email already exists. Please login.' 
      });
    }

    // Either create new user OR update the unverified existing one
    let user;
    if (userExists && !userExists.isVerified) {
      // Update existing unverified user with new details
      userExists.name = name;
      userExists.college = college || '';
      userExists.password = password; // Will be re-hashed by pre-save hook
      user = userExists;
    } else {
      // Create brand new user
      user = await User.create({ 
        name, 
        email, 
        password, 
        college: college || '' 
      });
    }

    const otp = user.generateAuthOTP();
    await user.save({ validateBeforeSave: false });

    // Beautiful HTML email
    const htmlEmail = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #0f0f1a; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #7c3aed, #db2777); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📚 Notes Marketplace</h1>
        </div>
        <div style="padding: 32px; color: #e2e8f0;">
          <h2 style="color: white; margin-top: 0;">Verify Your Email</h2>
          <p style="color: #94a3b8;">Hi <strong style="color: white;">${name}</strong>, welcome! Use this code to verify your account:</p>
          <div style="background: #1e1b4b; border: 2px solid #7c3aed; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #a78bfa; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px; text-align: center;">⏳ This code expires in <strong>10 minutes</strong></p>
        </div>
      </div>
    `;
    
    try {
      await sendEmail({
        email: user.email,
        subject: '📚 Notes Marketplace - Your Verification Code',
        message: `Your verification code is: ${otp}. It expires in 10 minutes.`,
        html: htmlEmail
      });

      res.status(201).json({
        success: true,
        message: 'Verification code sent to email',
        emailSent: true
      });
    } catch (error) {
      console.error('Email error:', error);
      user.otpCode = undefined;
      user.otpExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email. Please check your email address.'
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide email and password' 
      });
    }

    // Get user with password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // ✅ FIXED: Match AuthContext expected format
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
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      college: req.body.college
    };

    const user = await User.findByIdAndUpdate(
      req.user._id, 
      fieldsToUpdate, 
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email and code' });
    }

    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    
    // Find user with valid OTP
    const user = await User.findOne({
      email: email.toLowerCase(),
      otpCode: hashedOTP,
      otpExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    // Set as verified
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpire = undefined;
    await user.save();

    // Login user
    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, college: user.college, earnings: user.earnings || 0, role: user.role || 'user' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot Password - send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Please provide email' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const otp = user.generateAuthOTP();
    await user.save({ validateBeforeSave: false });

    const message = `You requested a password reset.\n\nPlease use this 6-digit code to reset your password:\n\n${otp}\n\nThis code is valid for 10 minutes.`;
    
    await sendEmail({ email: user.email, subject: 'Password Reset Code', message });
    res.status(200).json({ success: true, message: 'Reset code sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Email could not be sent' });
  }
};

// @desc    Reset Password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
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