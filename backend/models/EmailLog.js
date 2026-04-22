const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  subject: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['otp', 'welcome', 'purchase', 'follower', 'note_alert', 'password_reset', 'campaign'],
    default: 'campaign'
  },
  status: {
    type: String,
    enum: ['sent', 'failed'],
    default: 'sent'
  },
  resendId: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true  // createdAt = time email was sent
});

// Index for fast admin dashboard queries
emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
