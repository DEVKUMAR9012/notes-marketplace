const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Text content (optional if file message)
    text: { type: String, trim: true, maxlength: 2000, default: '' },

    // File attachment
    fileUrl:  { type: String, default: null },
    fileType: { type: String, enum: ['image', 'pdf', 'other', null], default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },

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
