const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  purchasedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  coverImage: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Bundle', bundleSchema);
