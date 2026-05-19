const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Text content (optional if file message)
    text: { type: String, trim: true, maxlength: 2000, default: '' },

    // Reply to another message
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

    // File attachment
    fileUrl:  { type: String, default: null },
    fileType: { type: String, enum: ['image', 'pdf', 'audio', 'poll', 'other', null], default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },

    // Interactive Polls
    poll: {
      question: { type: String, trim: true },
      options: [
        {
          optionText: { type: String, required: true },
          votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
        }
      ]
    },

    // Quick reply preset text used
    quickReply: { type: String, default: null },

    // Emoji reactions  { userId: emoji }
    reactions: { type: Map, of: String, default: {} },

    // Delivery & Read tracking
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Edit & soft-delete
    isEdited:  { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
