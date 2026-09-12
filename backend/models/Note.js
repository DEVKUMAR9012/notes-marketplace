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
    required: true,
    index: true
  },
  college: {
    type: String,
    default: '',
    index: true
  },
  semester: {
    type: Number,
    default: null,
    index: true
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
  fileHash: {
    type: String,
    index: true // indexed for fast duplicate lookups
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
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
  },
  // ─── Marketplace fields ───────────────────────────────────────────────────────
  previewImage: {
    type: String,
    default: ''
  },
  course: {
    type: String,
    default: '',
    trim: true
  },
  branch: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    default: '',
    trim: true
  }
}, { timestamps: true });

// Add compound text index for ultra-fast full-text searches across key fields
noteSchema.index({ title: 'text', subject: 'text', category: 'text' });

module.exports = mongoose.model('Note', noteSchema);