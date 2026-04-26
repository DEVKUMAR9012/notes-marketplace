const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    // Remove required true to allow phone-only signup
    sparse: true,
    unique: true
  },
  phone: {
    type: String,
    sparse: true,
    unique: true
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false  // Never returned in queries unless explicitly requested with .select('+password')
  },
  college: {
    type: String,
    default: '',
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: '',
    trim: true
  },
  phoneNumber: {
    type: String,
    default: '',
    trim: true
  },
  socialLinks: {
    whatsapp: { type: String, default: '' },
    telegram: { type: String, default: '' },
    email: { type: String, default: '' },
    instagram: { type: String, default: '' },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' }
  },
  expertise: {
    type: String,
    default: '',
    trim: true
  },
  stream: {
    type: String,
    default: '',
    trim: true
  },
  headerImage: {
    type: String,
    default: ''
  },
  earnings: {
    type: Number,
    default: 0,
    min: 0
  },
  walletBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSales: {
    type: Number,
    default: 0,
    min: 0
  },
  purchasedNotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  transactions: [{
    type: {
      type: String,
      enum: ['debit', 'credit'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      required: true
    },
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  cart: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailSubscribed: {
    type: Boolean,
    default: true  // Set to false when user clicks unsubscribe link
  },
  otpCode: String,
  otpExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // ─── Chat / Presence ────────────────────────────────────────────────────────
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: true  // Automatically adds createdAt and updatedAt
});

// ─── Hash password before saving ────────────────────────────────────────────
userSchema.pre('save', async function(next) {
  // Only hash if password was modified (or is new)
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
// ─── Compare entered password with hashed password ──────────────────────────
userSchema.methods.comparePassword = async function(enteredPassword) {
  // ✅ FIXED: Return false instead of throwing error
  if (!enteredPassword || !this.password) {
    return false; // Gracefully handle missing values
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ FIXED: Added alias for compatibility with authController
userSchema.methods.matchPassword = userSchema.methods.comparePassword;

// ─── Generate password reset token ──────────────────────────────────────────
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expiry (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken; // Return the unhashed token (to send via email)
};

// ─── Generate 6-digit OTP ───────────────────────────────────────────────────
userSchema.methods.generateAuthOTP = function() {
  // Generate a random 6-digit string
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the OTP
  this.otpCode = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expiry (10 minutes)
  this.otpExpire = Date.now() + 10 * 60 * 1000;

  return otp; // Return the unhashed otp to email
};

module.exports = mongoose.model('User', userSchema);