const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  amount: {
    type: Number,
    required: true,
    min: [100, 'Minimum withdrawal amount is ₹100']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  bankDetails: {
    accountNumber: String,
    ifsc: String,
    bankName: String,
    holderName: String
  },
  upiId: String,
  processedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
