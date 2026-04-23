const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],

    lastMessage: {
      text:     { type: String, default: '' },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      sentAt:   { type: Date, default: Date.now },
      type:     { type: String, enum: ['text', 'file', 'quickReply'], default: 'text' },
    },

    unreadCounts: { type: Map, of: Number, default: {} },

    // Student features
    tags:       [{ type: String, trim: true }],
    pinnedNote: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', default: null },

    // Safety
    blockedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isReported:   { type: Boolean, default: false },
    reportReason: { type: String, default: null },
    reportedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);
