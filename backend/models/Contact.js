const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  replied: {
    type: Boolean,
    default: false
  },
  replyMessage: String,
  repliedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Contact', contactSchema);
