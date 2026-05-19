const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  targetGroup: {
    type: String,
    enum: ['all', 'new', 'old', 'specific'],
    default: 'all'
  },
  specificUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Banner', bannerSchema);
