const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  itemType: {
    type: String,
    enum: ['note', 'book'],
    default: 'note'
  },
  description: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    required: true
  },
  college: {
    type: String,
    default: ''
  },
  semester: {
    type: Number,
    default: null
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  pdfUrl: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ✅ Array of users who purchased this note
  purchasedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downloads: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  reviews: {
    type: Number,
    default: 0
  },
  aiSummary: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);