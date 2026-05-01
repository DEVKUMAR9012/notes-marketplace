const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
