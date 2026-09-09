const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true
  },
  // ─── Amounts ──────────────────────────────────────────────────────────────────
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  sellerEarning: {
    type: Number,
    default: 0,
    min: 0
  },
  platformFeePercent: {
    type: Number,
    default: 10   // 10% platform commission
  },
  // ─── Razorpay IDs ────────────────────────────────────────────────────────────
  razorpayOrderId: {
    type: String,
    required: true,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    default: '',
    index: true
  },
  // ─── Status ───────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  // ─── Denormalized for fast display ────────────────────────────────────────────
  noteTitle:   { type: String, default: '' },
  buyerName:   { type: String, default: '' },
  sellerName:  { type: String, default: '' },
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
