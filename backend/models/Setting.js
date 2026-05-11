const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  platformFee: {
    type: Number,
    default: 10
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  allowRegistrations: {
    type: Boolean,
    default: true
  },
  announcementBanner: {
    type: String,
    default: ''
  },
  minWithdrawalAmount: {
    type: Number,
    default: 100
  },
  maxFileSize: {
    type: Number,
    default: 10 // MB
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);
