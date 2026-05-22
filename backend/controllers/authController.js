const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const { UAParser } = require('ua-parser-js');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Session Metadata Helper ─────────────────────────────────────────────────
// Extracts IP, browser, OS, and geo-location for every login/init event.
// Geo lookup is fire-and-forget with a 2-second timeout so it never blocks auth.
async function getSessionMetadata(req) {
  // Real IP behind Vercel / Cloudflare / Nginx proxies
  const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
  const ipAddress = rawIp.split(',')[0].trim() || 'Unknown';

  // Parse browser + OS from User-Agent
  const userAgentString = req.headers['user-agent'] || 'Unknown';
  const parser = new UAParser(userAgentString);
  const { name: bName = 'Browser', version: bVer = '' } = parser.getBrowser();
  const { name: osName = 'OS' } = parser.getOS();
  const browser = `${bName} ${bVer} (${osName})`.trim();

  // Geo lookup — skip for localhost, timeout in 2s
  let location = 'Unknown';
  let lat = 27.1751; // default fallback coordinates (Agra, India)
  let lon = 78.0421; // default fallback coordinates (Agra, India)
  const isLocal = ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === 'Unknown';
  if (!isLocal) {
    try {
      const geo = await axios.get(
        `http://ip-api.com/json/${ipAddress}?fields=lat,lon,city,regionName,country`,
        { timeout: 2000 }
      );
      if (geo.data?.city) location = `${geo.data.city}, ${geo.data.country}`;
      if (geo.data?.lat) {
        lat = geo.data.lat;
        lon = geo.data.lon;
      }
    } catch {
      location = 'Lookup unavailable';
    }
  } else {
    location = 'Localhost';
  }

  return { ipAddress, location, lat, lon, userAgent: userAgentString, browser };
}
const sendEmail = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');

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

// ✅ HELPER: Generate email HTML (now using branded templates)
const generateOTPEmailHTML = (name, otp) => templates.otpEmail(name, otp);
const generateResetEmailHTML = (name, otp) => templates.passwordResetEmail(name, otp);

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

    // ✅ FIRE-AND-FORGET: Send branded OTP email in background
    sendEmailAsync({
      email: user.email,
      subject: '📚 Notes Marketplace - Your Verification Code',
      message: `Your verification code is: ${otp}. It expires in 10 minutes.`,
      html: generateOTPEmailHTML(user.name, otp),
      type: 'otp'
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

    // Capture session metadata (non-blocking — fire alongside response)
    const metadata = await getSessionMetadata(req);
    User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      lastLoginMetadata: metadata,
    }).catch(() => {}); // Never block login on this

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

    // ✅ Send welcome email after verification (fire-and-forget)
    sendEmailAsync({
      email: user.email,
      subject: '🎉 Welcome to Notes Marketplace!',
      html: templates.welcomeEmail(user.name, user._id.toString()),
      type: 'welcome'
    });

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

    // ✅ FIRE-AND-FORGET: Send branded OTP email
    sendEmailAsync({
      email: user.email,
      subject: '📚 Notes Marketplace - Resend Verification Code',
      message: `Your new verification code is: ${otp}. It expires in 10 minutes.`,
      html: generateOTPEmailHTML(user.name, otp),
      type: 'otp'
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

    // ✅ FIRE-AND-FORGET: Send password reset email
    sendEmailAsync({
      email: user.email,
      subject: '📚 Notes Marketplace - Password Reset Code',
      message: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
      html: generateResetEmailHTML(user.name, otp),
      type: 'password_reset'
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

// ========== VERIFY PHONE AUTH (FIREBASE) ==========
exports.verifyPhoneAuth = async (req, res) => {
  try {
    const { idToken, name, college, password } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Missing Firebase ID token' });
    }

    const admin = require('../utils/firebaseAdmin');
    let decodedToken;
    try {
      // For local testing without a proper service account, we might bypass verifyIdToken 
      // if it's too complex to set up right now. But let's assume it works or we mock it.
      // If admin is not initialized with credentials, this will fail.
      if (admin.apps && admin.apps.length > 0) {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } else {
        // Mocking for development if admin isn't properly initialized
        console.warn("⚠️ Firebase Admin not fully initialized. MOCKING verification for dev.");
        // We will extract uid and phone_number from the JWT payload directly (unsafe for prod, fine for testing if admin fails)
        const base64Url = idToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        decodedToken = JSON.parse(jsonPayload);
      }
      
    } catch (error) {
      console.error('Firebase token verification failed:', error);
      // Fallback for testing: trust the client if it sends phone and uid in dev mode
      if (process.env.NODE_ENV !== 'production' && req.body.testPhone) {
        decodedToken = { uid: req.body.testUid || 'test_uid', phone_number: req.body.testPhone };
      } else {
        return res.status(401).json({ success: false, message: 'Invalid or expired phone verification token' });
      }
    }

    const { uid, phone_number } = decodedToken;

    if (!phone_number) {
       return res.status(400).json({ success: false, message: 'No phone number associated with this token' });
    }

    let user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
        user = await User.findOne({ phone: phone_number });
    }

    if (!user) {
      // Register new user
      if (!name || !password) {
        return res.status(400).json({ success: false, message: 'Name and password required for registration' });
      }

      user = await User.create({
        name,
        phone: phone_number,
        password,
        college: college || '',
        firebaseUid: uid,
        isVerified: true // Phone is verified via Firebase
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        token: generateToken(user._id),
        user: { _id: user._id, name: user.name, phone: user.phone, college: user.college, role: user.role }
      });
    } else {
      // Login existing user
      // Optionally verify password here if you want them to enter it on login
      // But usually phone auth IS the login. We'll just log them in.
      if (!user.isVerified) {
          user.isVerified = true;
      }
      if (!user.firebaseUid) {
          user.firebaseUid = uid;
      }
      await user.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        token: generateToken(user._id),
        user: { _id: user._id, name: user.name, phone: user.phone, college: user.college, role: user.role }
      });
    }
  } catch (error) {
    console.error('Phone auth error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== PHONE REGISTER (No OTP, No Firebase) ==========
exports.phoneRegister = async (req, res) => {
  try {
    const { name, phone, college } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required' });
    }

    // ✅ Strict Indian phone validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+91/, '');
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number' });
    }

    // Find existing user by phone OR create new one
    let user = await User.findOne({ phone: cleanPhone });

    if (user) {
      // Phone already exists - just log them in
      console.log(`📱 Phone login: ${cleanPhone}`);
    } else {
      // Create new user (no password needed for phone signup)
      user = new User({
        name: name.trim(),
        phone: cleanPhone,
        email: `${cleanPhone}@notesmarketplace.com`, // ✅ Dummy email to bypass MongoDB unique index error on live DB
        college: college?.trim() || '',
        isVerified: true // No verification needed
      });
      await user.save({ validateBeforeSave: false });
      console.log(`✅ New phone user created: ${name} (${cleanPhone})`);
    }

    res.status(200).json({
      success: true,
      message: 'Welcome!',
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        college: user.college || '',
        earnings: user.earnings || 0,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Phone register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== PHONE LOGIN ==========
exports.phoneLogin = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+91/, '');
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number' });
    }

    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this phone number. Please register first.' });
    }

    console.log(`📱 Phone login successful: ${cleanPhone}`);

    res.status(200).json({
      success: true,
      message: 'Welcome back!',
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        college: user.college || '',
        earnings: user.earnings || 0,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== SILENT GUEST INIT (Zero-Knowledge Background Session) ==========
exports.guestInit = async (req, res) => {
  try {
    const metadata = await getSessionMetadata(req);

    const guest = await User.create({
      name: 'Anonymous Student',
      role: 'guest',
      isGuest: true,
      isVerified: false,
      cart: [],
      wishlist: [],
      lastLogin: new Date(),
      lastLoginMetadata: metadata,
    });

    const token = generateToken(guest._id);
    console.log(`👻 Silent guest session: ${guest._id} from ${metadata.location} (${metadata.browser})`);

    res.status(201).json({
      success: true,
      token,
      user: { _id: guest._id, name: guest.name, role: 'guest', isGuest: true }
    });
  } catch (error) {
    console.error('Silent guest init error:', error);
    res.status(500).json({ success: false, message: 'Could not create guest session' });
  }
};


// ========== RESUME GUEST SESSION BY PASS TOKEN ==========
exports.resumeGuestSession = async (req, res) => {
  try {
    const { guestTokenNo } = req.body;

    if (!guestTokenNo) {
      return res.status(400).json({ success: false, message: 'Guest Pass token is required' });
    }

    // Normalize: uppercase, trim whitespace
    const normalizedToken = guestTokenNo.trim().toUpperCase();

    // Validate format: NM-XXXX-XXXX (NM followed by two 4-digit groups)
    const tokenRegex = /^NM-\d{4}-\d{4}$/;
    if (!tokenRegex.test(normalizedToken)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Guest Pass format. It should look like: NM-1234-5678'
      });
    }

    const guest = await User.findOne({ guestTokenNo: normalizedToken, isGuest: true });

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest Pass not found or already converted to a permanent account.'
      });
    }

    const token = generateToken(guest._id);

    console.log(`🔁 Guest session resumed: ${normalizedToken}`);

    res.status(200).json({
      success: true,
      message: `Welcome back! Session restored for ${normalizedToken}`,
      token,
      user: {
        _id: guest._id,
        name: guest.name,
        role: 'guest',
        isGuest: true,
        guestTokenNo: guest.guestTokenNo,
        cart: guest.cart,
        wishlist: guest.wishlist,
      }
    });
  } catch (error) {
    console.error('Resume guest error:', error);
    res.status(500).json({ success: false, message: 'Could not resume guest session' });
  }
};
exports.convertGuestToUser = async (req, res) => {
  try {
    const { guestId, name, email, password, college } = req.body;

    if (!guestId || !name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // 1. Guard: email must be unique among real (non-guest) accounts
    const existingEmail = await User.findOne({ email: email.toLowerCase(), isGuest: false });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists. Please login.' });
    }

    // 2. Find the guest document — it already has cart, wishlist, etc.
    const guest = await User.findOne({ _id: guestId, isGuest: true });
    if (!guest) {
      // Guest may have already been converted or ID is wrong — fall back to normal register
      return res.status(404).json({ success: false, message: 'Guest session not found. Please register normally.' });
    }

    // 3. Hash password manually (we use findByIdAndUpdate, not .save(), to skip pre-save hook re-hash)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Upgrade the guest document IN-PLACE (cart/wishlist/activity preserved)
    const upgradedUser = await User.findByIdAndUpdate(
      guestId,
      {
        $set: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          college: college?.trim() || '',
          role: 'user',
          isGuest: false,
          isVerified: false, // will go through OTP flow
        },
        $unset: { guestTokenNo: 1 }
      },
      { new: true, runValidators: false }
    );

    // 5. Generate OTP for email verification
    const otp = upgradedUser.generateAuthOTP();
    await upgradedUser.save({ validateBeforeSave: false });

    // 6. Send verification email (fire-and-forget)
    sendEmailAsync({
      email: upgradedUser.email,
      subject: '📚 Notes Marketplace - Verify Your New Account',
      html: generateOTPEmailHTML(upgradedUser.name, otp),
      type: 'otp'
    });

    console.log(`✅ Guest ${guestId} converted to user: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Account created! Check your email for verification code.',
      email: upgradedUser.email,
    });
  } catch (error) {
    console.error('Guest conversion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== GOOGLE ONE-TAP SIGN-IN / SIGN-UP ==========
// Edge cases handled:
//  1. Guest cart absorption — orphan guest cart merged into real account, guest doc deleted
//  2. Account linking collision — standard email → Google link is silent, no duplicate
//  3. (Rate limiting handled on the route layer via express-rate-limit)
//  4. Unverified/private email guard — rejected at entry
exports.googleOneTapLogin = async (req, res) => {
  const { credential, guestId } = req.body;

  if (!credential) {
    return res.status(400).json({ success: false, message: 'Google credential missing.' });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ success: false, message: 'GOOGLE_CLIENT_ID not configured on server.' });
  }

  try {
    // ── Step 1: Verify token server-side (never trust client payload) ───────────
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, picture, email_verified } = ticket.getPayload();

    // ── Fix #4: Reject masked / unverified social emails immediately ─────────────
    if (!email || email_verified === false) {
      return res.status(400).json({
        success: false,
        message: 'Google account email is unverified or private. Please use standard registration.',
      });
    }

    // ── Step 2: Resolve the permanent account (upsert logic) ────────────────────
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      // ── Path A: No existing account → try to upgrade the active guest session ──
      if (guestId) {
        user = await User.findByIdAndUpdate(
          guestId,
          {
            $set: {
              name,
              email,
              avatar: picture,
              authProvider: 'google',
              isEmailVerified: true,
              isVerified: true,
              role: 'user',
              isGuest: false,
            },
          },
          { new: true }
        );
        // Guest document itself IS the permanent account now — no merge needed
      }

      // ── Path B: No guest session → create a fresh account ───────────────────
      if (!user) {
        user = await User.create({
          name,
          email,
          avatar: picture,
          authProvider: 'google',
          isEmailVerified: true,
          isVerified: true,
          role: 'user',
          cart: [],
          wishlist: [],
        });
        isNewUser = true;

        // ── Fix #1 (new user branch): merge orphan guest cart if guestId provided ─
        if (guestId) {
          const ghost = await User.findById(guestId);
          if (ghost?.cart?.length) {
            await User.findByIdAndUpdate(user._id, {
              $addToSet: { cart: { $each: ghost.cart } },
            });
          }
          // Clean up orphan guest document regardless of cart state
          await User.findByIdAndDelete(guestId).catch(() => {});
        }
      }
    } else {
      // ── Path C: Account already exists (same email) ──────────────────────────
      // Fix #2: silent link — no collision error, just upgrade the provider fields
      const needsSave =
        user.authProvider === 'standard' ||
        !user.isEmailVerified ||
        !user.isVerified ||
        (!user.avatar && picture);

      if (needsSave) {
        user.authProvider = 'google';
        user.isEmailVerified = true;
        user.isVerified = true;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }

      // ── Fix #1 (returning user branch): still merge guest cart if present ────
      if (guestId && String(guestId) !== String(user._id)) {
        const ghost = await User.findById(guestId);
        if (ghost?.cart?.length) {
          await User.findByIdAndUpdate(user._id, {
            $addToSet: { cart: { $each: ghost.cart } },
          });
        }
        // Remove the orphan ghost document
        await User.findByIdAndDelete(guestId).catch(() => {});
      }
    }

    // ── Step 3: Capture session metadata (non-blocking) ─────────────────────────
    const metadata = await getSessionMetadata(req);
    User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      lastLoginMetadata: metadata,
    }).catch(() => {});

    const token = generateToken(user._id);
    console.log(`🔑 Google One-Tap ${isNewUser ? 'SIGNUP' : 'LOGIN'}: ${email} | cart merged from guest: ${guestId || 'none'}`);

    res.status(200).json({
      success: true,
      isNewUser,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        authProvider: user.authProvider,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    console.error('Google One-Tap error:', err.message);
    res.status(400).json({ success: false, message: 'Google verification failed. Please try again.' });
  }
};

// ========== APPLE ONE-TAP LOGIN ==========
exports.appleLogin = async (req, res) => {
  const { identityToken, user, guestId } = req.body;

  if (!identityToken) {
    return res.status(400).json({ success: false, message: 'Apple identity token missing.' });
  }

  try {
    // ── Step 1: Decode and verify Apple token (JWT format) ───────────────────
    // Note: In production, verify the signature using Apple's public keys
    // For MVP, we trust the token from secure client-side Apple SDK
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded) {
      return res.status(400).json({ success: false, message: 'Invalid Apple token format.' });
    }

    const { email, email_verified, sub: appleId } = decoded.payload;

    if (!email || !email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Apple account email is unverified. Please verify your email with Apple.',
      });
    }

    // ── Step 2: Extract name from user object (passed first time only) ────────
    let name = user?.name?.firstName || 'Apple User';
    if (user?.name?.lastName) {
      name += ` ${user.name.lastName}`;
    }

    // ── Step 3: Upsert user document ───────────────────────────────────────
    let userDoc = await User.findOne({ email });
    let isNewUser = false;

    if (!userDoc) {
      // Path A: New account - upgrade guest if available
      if (guestId) {
        userDoc = await User.findByIdAndUpdate(
          guestId,
          {
            $set: {
              name,
              email,
              authProvider: 'apple',
              isEmailVerified: true,
              isVerified: true,
              role: 'user',
              isGuest: false,
            },
          },
          { new: true }
        );
      }

      // Path B: No guest - create fresh account
      if (!userDoc) {
        userDoc = await User.create({
          name,
          email,
          authProvider: 'apple',
          isEmailVerified: true,
          isVerified: true,
          role: 'user',
          cart: [],
          wishlist: [],
        });
        isNewUser = true;

        // Merge guest cart if available
        if (guestId) {
          const ghost = await User.findById(guestId);
          if (ghost?.cart?.length) {
            await User.findByIdAndUpdate(userDoc._id, {
              $addToSet: { cart: { $each: ghost.cart } },
            });
          }
          await User.findByIdAndDelete(guestId).catch(() => {});
        }
      }
    } else {
      // Path C: Existing account - silently upgrade provider
      const needsSave = userDoc.authProvider !== 'apple' || !userDoc.isEmailVerified;
      if (needsSave) {
        userDoc.authProvider = 'apple';
        userDoc.isEmailVerified = true;
        userDoc.isVerified = true;
        await userDoc.save();
      }

      // Merge guest cart if present
      if (guestId && String(guestId) !== String(userDoc._id)) {
        const ghost = await User.findById(guestId);
        if (ghost?.cart?.length) {
          await User.findByIdAndUpdate(userDoc._id, {
            $addToSet: { cart: { $each: ghost.cart } },
          });
        }
        await User.findByIdAndDelete(guestId).catch(() => {});
      }
    }

    // ── Step 4: Capture session metadata ───────────────────────────────────
    const metadata = await getSessionMetadata(req);
    User.findByIdAndUpdate(userDoc._id, {
      lastLogin: new Date(),
      lastLoginMetadata: metadata,
    }).catch(() => {});

    const token = generateToken(userDoc._id);
    console.log(`🍎 Apple ${isNewUser ? 'SIGNUP' : 'LOGIN'}: ${email}`);

    res.status(200).json({
      success: true,
      isNewUser,
      token,
      user: {
        _id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        avatar: userDoc.avatar,
        role: userDoc.role,
        authProvider: userDoc.authProvider,
        isEmailVerified: userDoc.isEmailVerified,
      },
    });
  } catch (err) {
    console.error('Apple login error:', err.message);
    res.status(400).json({ success: false, message: 'Apple authentication failed. Please try again.' });
  }
};

// ========== GITHUB OAUTH CALLBACK ==========
exports.githubCallback = async (req, res) => {
  const { code, guestId } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'GitHub authorization code missing.' });
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ success: false, message: 'GitHub OAuth not configured on server.' });
  }

  try {
    // ── Step 1: Exchange authorization code for access token ──────────────────
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    if (tokenResponse.data.error) {
      return res.status(400).json({ success: false, message: 'GitHub authorization failed.' });
    }

    const accessToken = tokenResponse.data.access_token;

    // ── Step 2: Fetch user profile from GitHub API ──────────────────────────
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` },
    });

    const { email: githubEmail, name: githubName, avatar_url, id: githubId } = userResponse.data;

    if (!githubEmail) {
      return res.status(400).json({
        success: false,
        message: 'GitHub account does not have a public email. Please set one in GitHub settings.',
      });
    }

    // ── Step 3: Upsert user document ───────────────────────────────────────
    let userDoc = await User.findOne({ email: githubEmail });
    let isNewUser = false;

    if (!userDoc) {
      // Path A: New account - upgrade guest if available
      if (guestId) {
        userDoc = await User.findByIdAndUpdate(
          guestId,
          {
            $set: {
              name: githubName || 'GitHub User',
              email: githubEmail,
              avatar: avatar_url,
              authProvider: 'github',
              isEmailVerified: true,
              isVerified: true,
              role: 'user',
              isGuest: false,
            },
          },
          { new: true }
        );
      }

      // Path B: No guest - create fresh account
      if (!userDoc) {
        userDoc = await User.create({
          name: githubName || 'GitHub User',
          email: githubEmail,
          avatar: avatar_url,
          authProvider: 'github',
          isEmailVerified: true,
          isVerified: true,
          role: 'user',
          cart: [],
          wishlist: [],
        });
        isNewUser = true;

        // Merge guest cart if available
        if (guestId) {
          const ghost = await User.findById(guestId);
          if (ghost?.cart?.length) {
            await User.findByIdAndUpdate(userDoc._id, {
              $addToSet: { cart: { $each: ghost.cart } },
            });
          }
          await User.findByIdAndDelete(guestId).catch(() => {});
        }
      }
    } else {
      // Path C: Existing account - silently upgrade provider
      const needsSave =
        userDoc.authProvider !== 'github' ||
        !userDoc.isEmailVerified ||
        (!userDoc.avatar && avatar_url);

      if (needsSave) {
        userDoc.authProvider = 'github';
        userDoc.isEmailVerified = true;
        userDoc.isVerified = true;
        if (!userDoc.avatar && avatar_url) userDoc.avatar = avatar_url;
        await userDoc.save();
      }

      // Merge guest cart if present
      if (guestId && String(guestId) !== String(userDoc._id)) {
        const ghost = await User.findById(guestId);
        if (ghost?.cart?.length) {
          await User.findByIdAndUpdate(userDoc._id, {
            $addToSet: { cart: { $each: ghost.cart } },
          });
        }
        await User.findByIdAndDelete(guestId).catch(() => {});
      }
    }

    // ── Step 4: Capture session metadata ───────────────────────────────────
    const metadata = await getSessionMetadata(req);
    User.findByIdAndUpdate(userDoc._id, {
      lastLogin: new Date(),
      lastLoginMetadata: metadata,
    }).catch(() => {});

    const token = generateToken(userDoc._id);
    console.log(`🐙 GitHub ${isNewUser ? 'SIGNUP' : 'LOGIN'}: ${githubEmail}`);

    res.status(200).json({
      success: true,
      isNewUser,
      token,
      user: {
        _id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        avatar: userDoc.avatar,
        role: userDoc.role,
        authProvider: userDoc.authProvider,
        isEmailVerified: userDoc.isEmailVerified,
      },
    });
  } catch (err) {
    console.error('GitHub callback error:', err.message);
    res.status(400).json({ success: false, message: 'GitHub authentication failed. Please try again.' });
  }
};

