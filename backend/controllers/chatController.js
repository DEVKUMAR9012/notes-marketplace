const Chat    = require('../models/Chat');
const Message = require('../models/Message');
const User    = require('../models/User');

// ─── GET /api/chat ────────────────────────────────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'name avatar profileImage isOnline lastSeen totalSales')
      .sort({ 'lastMessage.sentAt': -1 });
    res.json({ success: true, chats });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/chat ───────────────────────────────────────────────────────────
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const myId = req.user._id;
    if (!recipientId) return res.status(400).json({ success: false, message: 'recipientId required' });
    if (String(myId) === String(recipientId)) return res.status(400).json({ success: false, message: 'Cannot chat with yourself' });

    let chat = await Chat.findOne({ participants: { $all: [myId, recipientId], $size: 2 } })
      .populate('participants', 'name avatar profileImage isOnline lastSeen totalSales');

    if (!chat) {
      chat = await Chat.create({ participants: [myId, recipientId], unreadCounts: { [String(myId)]: 0, [String(recipientId)]: 0 } });
      chat = await chat.populate('participants', 'name avatar profileImage isOnline lastSeen totalSales');
    }
    res.json({ success: true, chat });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /api/chat/:chatId/messages ──────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name avatar profileImage')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ success: true, messages: messages.reverse() });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PUT /api/chat/:chatId/read ───────────────────────────────────────────────
exports.markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const myId = String(req.user._id);
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

    await Message.updateMany(
      { chat: chatId, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    chat.unreadCounts.set(myId, 0);
    await chat.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /api/chat/users/search?q= ───────────────────────────────────────────
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ success: false, message: 'Query too short' });
    const users = await User.find({ _id: { $ne: req.user._id }, name: { $regex: q, $options: 'i' } })
      .select('name avatar profileImage college totalSales isOnline lastSeen')
      .limit(10);
    res.json({ success: true, users });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PUT /api/chat/messages/:msgId ─── Edit message ──────────────────────────
exports.editMessage = async (req, res) => {
  try {
    const { msgId } = req.params;
    const { text }  = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Text required' });

    const msg = await Message.findOne({ _id: msgId, sender: req.user._id, isDeleted: false });
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    msg.text     = text.trim();
    msg.isEdited = true;
    await msg.save();
    await msg.populate('sender', 'name avatar profileImage');

    // Notify room via socket
    const io = req.app.get('io');
    io.to(String(msg.chat)).emit('message_edited', msg);

    res.json({ success: true, message: msg });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /api/chat/messages/:msgId ─── Soft-delete ────────────────────────
exports.deleteMessage = async (req, res) => {
  try {
    const { msgId } = req.params;
    const msg = await Message.findOne({ _id: msgId, sender: req.user._id });
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    msg.isDeleted = true;
    msg.text      = '';
    msg.fileUrl   = null;
    await msg.save();

    const io = req.app.get('io');
    io.to(String(msg.chat)).emit('message_deleted', { msgId, chatId: msg.chat });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/chat/messages/:msgId/react ─── Add / toggle reaction ──────────
exports.reactToMessage = async (req, res) => {
  try {
    const { msgId }  = req.params;
    const { emoji }  = req.body;
    const myId       = String(req.user._id);

    const msg = await Message.findById(msgId);
    if (!msg) return res.status(404).json({ success: false, message: 'Not found' });

    // Toggle — if same emoji, remove it
    if (msg.reactions.get(myId) === emoji) msg.reactions.delete(myId);
    else msg.reactions.set(myId, emoji);
    await msg.save();

    const io = req.app.get('io');
    io.to(String(msg.chat)).emit('message_reacted', { msgId, reactions: Object.fromEntries(msg.reactions) });

    res.json({ success: true, reactions: Object.fromEntries(msg.reactions) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /api/chat/:chatId/search?q= ─── Search within messages ──────────────
exports.searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q }      = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'Query required' });

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

    const messages = await Message.find({
      chat: chatId,
      isDeleted: false,
      text: { $regex: q, $options: 'i' },
    }).populate('sender', 'name avatar profileImage').limit(30);

    res.json({ success: true, messages });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/chat/:chatId/report ────────────────────────────────────────────
exports.reportChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { reason } = req.body;

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

    chat.isReported   = true;
    chat.reportReason = reason || 'No reason given';
    chat.reportedBy   = req.user._id;
    await chat.save();

    res.json({ success: true, message: 'Reported successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/chat/:chatId/block ─────────────────────────────────────────────
exports.blockUser = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

    chat.blockedBy = req.user._id;
    await chat.save();

    // Also add to user's blockedUsers list
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: chat.participants.find(p => String(p) !== String(req.user._id)) },
    });

    res.json({ success: true, message: 'User blocked' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /api/chat/:chatId/block ─── Unblock ───────────────────────────────
exports.unblockUser = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

    const otherId = chat.participants.find(p => String(p) !== String(req.user._id));
    chat.blockedBy = null;
    await chat.save();
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: otherId } });

    res.json({ success: true, message: 'User unblocked' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PUT /api/chat/:chatId/tags ───────────────────────────────────────────────
exports.updateTags = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { tags }   = req.body; // array of strings

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

    chat.tags = (tags || []).slice(0, 5); // max 5 tags
    await chat.save();
    res.json({ success: true, tags: chat.tags });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/chat/:chatId/upload ─── File message ──────────────────────────
exports.uploadFile = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const isPdf  = req.file.mimetype === 'application/pdf';
    const fileType = isPdf ? 'pdf' : 'image';

    const msg = await Message.create({
      chat:     chatId,
      sender:   req.user._id,
      text:     req.body.caption || '',
      fileUrl:  req.file.path,
      fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
    await msg.populate('sender', 'name avatar profileImage');

    // Update chat lastMessage
    chat.lastMessage = { text: `📎 ${fileType === 'pdf' ? 'PDF' : 'Image'}`, senderId: req.user._id, sentAt: new Date(), type: 'file' };
    chat.participants.forEach(p => {
      if (String(p) !== String(req.user._id)) {
        const cur = chat.unreadCounts.get(String(p)) || 0;
        chat.unreadCounts.set(String(p), cur + 1);
      }
    });
    await chat.save();

    // Broadcast via socket
    const io = req.app.get('io');
    io.to(chatId).emit('new_message', msg);
    chat.participants.forEach(p => {
      if (String(p) !== String(req.user._id))
        io.to(String(p)).emit('conversation_updated', { chatId, lastMessage: chat.lastMessage });
    });

    res.json({ success: true, message: msg });
  } catch (e) {
    console.error('uploadFile error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
