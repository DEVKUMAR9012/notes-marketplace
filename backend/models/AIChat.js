const mongoose = require('mongoose');

const aiChatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Chat' },
    mode: { type: String, default: 'summarize' },
    messages: [
      {
        id: { type: String }, // optional id from frontend
        role: { type: String, enum: ['user', 'ai'], required: true },
        text: { type: String, default: '' },
        files: { type: Array, default: [] }, // optional attached files
        mockComponent: { type: mongoose.Schema.Types.Mixed }, // to store quiz JSON if needed
        createdAt: { type: Date, default: Date.now },
      }
    ]
  },
  { timestamps: true }
);

aiChatSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('AIChat', aiChatSchema);
