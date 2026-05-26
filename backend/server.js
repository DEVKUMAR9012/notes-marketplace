const http    = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors    = require('cors');
const fs      = require('fs');
const { Server } = require('socket.io');
const jwt     = require('jsonwebtoken');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);

// ========== CORS ==========
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://noteshere.site', 'https://www.noteshere.site'],
  credentials: true,
};
app.use(cors(corsOptions));

// ========== SOCKET.IO ==========
const io = new Server(server, {
  cors: { origin: corsOptions.origin, credentials: true },
  pingTimeout: 60000,       // 60s before considering connection dead
  pingInterval: 25000,      // ping every 25s to keep alive
  upgradeTimeout: 30000,    // time allowed to upgrade from polling to ws
  allowUpgrades: true,
  transports: ['polling', 'websocket'], // polling first (reliable), then upgrade to ws
  maxHttpBufferSize: 1e6,   // 1MB max message size
  connectTimeout: 45000,
});
app.set('io', io);

const User    = require('./models/User');
const Chat    = require('./models/Chat');
const Message = require('./models/Message');

// Track online users:  userId -> socketId
const onlineUsers = new Map();

// ── Socket Auth Middleware ────────────────────────────────────────────────────
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// ── Socket Events ─────────────────────────────────────────────────────────────
io.on('connection', async (socket) => {
  const userId = String(socket.user._id);
  console.log(`🟢 ${socket.user.name} connected`);

  // Mark user online
  onlineUsers.set(userId, socket.id);
  await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
  socket.join(userId); // personal room

  // Broadcast online status to everyone
  io.emit('user_status', { userId, isOnline: true });

  // ── Join chat room
  socket.on('join_chat', (chatId) => socket.join(chatId));
  socket.on('leave_chat', (chatId) => socket.leave(chatId));

  // ── Send message
  socket.on('send_message', async ({ chatId, text, quickReply, replyTo, tempId }, ack) => {
    try {
      if (!text?.trim() && !quickReply) return;

      const chat = await Chat.findOne({ _id: chatId, participants: socket.user._id });
      if (!chat) {
        ack?.({ success: false, message: 'Access denied' });
        return socket.emit('error', { message: 'Access denied' });
      }
      if (chat.blockedBy) {
        ack?.({ success: false, message: 'Chat is blocked' });
        return socket.emit('error', { message: 'Chat is blocked' });
      }

      // Personal info warning — detect phone / UPI before saving
      const phoneRegex = /(?:^|\s)(\+91|0)?[6-9]\d{9}(?:\s|$)/;
      const upiRegex   = /[a-zA-Z0-9._-]+@[a-zA-Z]{3,}/;
      if (phoneRegex.test(text) || upiRegex.test(text)) {
        socket.emit('personal_info_warning', { text });
        return; // block save — frontend will ask user to confirm
      }

      const msgData = {
        chat: chatId,
        sender: socket.user._id,
        text: quickReply || text.trim(),
        quickReply: quickReply || null,
        replyTo: replyTo || null,
      };

      const msg = await Message.create(msgData);
      await msg.populate('sender', 'name avatar profileImage');
      if (replyTo) {
        await msg.populate({ path: 'replyTo', select: 'text sender fileUrl fileType isDeleted', populate: { path: 'sender', select: 'name' } });
      }

      // Update chat lastMessage + unread counts
      chat.lastMessage = { text: msg.text, senderId: socket.user._id, sentAt: new Date(), type: quickReply ? 'quickReply' : 'text' };
      chat.participants.forEach(pId => {
        if (String(pId) !== userId) {
          chat.unreadCounts.set(String(pId), (chat.unreadCounts.get(String(pId)) || 0) + 1);
        }
      });
      await chat.save();

      // Mark as delivered to all currently-online participants
      const deliveredTo = [];
      for (const pId of chat.participants) {
        if (String(pId) !== userId && onlineUsers.has(String(pId))) {
          deliveredTo.push(pId);
        }
      }
      if (deliveredTo.length) {
        await Message.findByIdAndUpdate(msg._id, { $addToSet: { deliveredTo: { $each: deliveredTo } } });
        msg.deliveredTo = deliveredTo;
      }

      // Broadcast to chat room (attach tempId if provided)
      const msgObj = msg.toObject();
      if (tempId) msgObj.tempId = tempId;
      io.to(chatId).emit('new_message', msgObj);

      // Notify non-active participants via personal room
      chat.participants.forEach(pId => {
        if (String(pId) !== userId) {
          io.to(String(pId)).emit('conversation_updated', {
            chatId,
            lastMessage: chat.lastMessage,
            unreadCount: chat.unreadCounts.get(String(pId)) || 0,
          });
        }
      });
    } catch (err) {
      console.error('send_message error:', err);
      socket.emit('error', { message: 'Failed to send' });
    }
  });

  // ── Force-send (user confirmed despite personal info warning)
  socket.on('force_send_message', async ({ chatId, text, tempId }) => {
    try {
      const chat = await Chat.findOne({ _id: chatId, participants: socket.user._id });
      if (!chat) return;

      const msg = await Message.create({ chat: chatId, sender: socket.user._id, text: text.trim() });
      await msg.populate('sender', 'name avatar profileImage');

      chat.lastMessage = { text: msg.text, senderId: socket.user._id, sentAt: new Date() };
      chat.participants.forEach(pId => {
        if (String(pId) !== userId) chat.unreadCounts.set(String(pId), (chat.unreadCounts.get(String(pId)) || 0) + 1);
      });
      await chat.save();

      const msgObj = msg.toObject();
      if (tempId) msgObj.tempId = tempId;
      io.to(chatId).emit('new_message', msgObj);
    } catch (err) {
      console.error('force_send error:', err);
    }
  });

  // ── Typing
  socket.on('typing_start', ({ chatId }) =>
    socket.to(chatId).emit('user_typing', { userId, name: socket.user.name }));
  socket.on('typing_stop', ({ chatId }) =>
    socket.to(chatId).emit('user_stopped_typing', { userId }));

  // ── Message delivered (when recipient opens chat)
  socket.on('messages_delivered', async ({ chatId }) => {
    try {
      await Message.updateMany(
        { chat: chatId, sender: { $ne: socket.user._id }, deliveredTo: { $ne: socket.user._id } },
        { $addToSet: { deliveredTo: socket.user._id } }
      );
      // Notify sender in chat room
      socket.to(chatId).emit('messages_delivery_update', { chatId, deliveredTo: userId });
    } catch (err) { /* ignore */ }
  });

  // ── Interactive Group Chat Polls
  socket.on('create_poll', async ({ chatId, question, options, tempId }, ack) => {
    try {
      const cleanQuestion = question?.trim();
      const cleanOptions = Array.isArray(options)
        ? options.map((option) => option?.trim()).filter(Boolean)
        : [];

      if (!cleanQuestion) return ack?.({ success: false, message: 'Poll question is required.' });
      if (cleanOptions.length < 2) return ack?.({ success: false, message: 'At least 2 poll options are required.' });

      const chat = await Chat.findOne({ _id: chatId, participants: socket.user._id });
      if (!chat) {
        ack?.({ success: false, message: 'Access denied' });
        return socket.emit('error', { message: 'Access denied' });
      }
      if (chat.blockedBy) {
        ack?.({ success: false, message: 'Chat is blocked' });
        return socket.emit('error', { message: 'Chat is blocked' });
      }

      const msgData = {
        chat: chatId,
        sender: socket.user._id,
        text: `📊 Poll: ${question.trim()}`,
        fileType: 'poll',
        poll: {
          question: cleanQuestion,
          options: cleanOptions.map((optionText) => ({ optionText, votes: [] }))
        }
      };

      const msg = await Message.create(msgData);
      await msg.populate('sender', 'name avatar profileImage');

      // Update chat lastMessage
      chat.lastMessage = { text: `📊 Poll: ${msg.poll.question}`, senderId: socket.user._id, sentAt: new Date(), type: 'poll' };
      chat.participants.forEach(pId => {
        if (String(pId) !== userId) {
          chat.unreadCounts.set(String(pId), (chat.unreadCounts.get(String(pId)) || 0) + 1);
        }
      });
      await chat.save();

      // Broadcast to room
      const msgObj = msg.toObject();
      if (tempId) msgObj.tempId = tempId;
      io.to(chatId).emit('new_message', msgObj);

      // Notify conversation update
      chat.participants.forEach(pId => {
        if (String(pId) !== userId) {
          io.to(String(pId)).emit('conversation_updated', {
            chatId,
            lastMessage: chat.lastMessage,
            unreadCount: chat.unreadCounts.get(String(pId)) || 0,
          });
        }
      });
      ack?.({ success: true, message: msgObj });
    } catch (err) {
      console.error('create_poll error:', err);
      ack?.({ success: false, message: 'Failed to create poll.' });
    }
  });

  socket.on('vote_poll', async ({ chatId, messageId, optionIndex }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || msg.fileType !== 'poll' || !msg.poll) return;

      // Check access
      const chat = await Chat.findOne({ _id: msg.chat, participants: socket.user._id });
      if (!chat) return;

      // Cast vote: remove user ID from all options first, then push to index option
      msg.poll.options.forEach((opt) => {
        opt.votes = opt.votes.filter(vId => String(vId) !== userId);
      });

      if (optionIndex >= 0 && optionIndex < msg.poll.options.length) {
        msg.poll.options[optionIndex].votes.push(socket.user._id);
      }

      await msg.save();
      await msg.populate('sender', 'name avatar profileImage');
      if (msg.replyTo) {
        await msg.populate({ path: 'replyTo', select: 'text sender fileUrl fileType isDeleted', populate: { path: 'sender', select: 'name' } });
      }

      // Broadcast updated poll object
      io.to(chatId).emit('poll_updated', msg.toObject());
    } catch (err) {
      console.error('vote_poll error:', err);
    }
  });

  // ── Geolocation Sharing & Live Opponent Tracker
  socket.on('request_live_location', ({ targetUserId }) => {
    io.to(targetUserId).emit('capture_live_location', { requesterUserId: userId });
  });

  socket.on('respond_live_location', ({ requesterUserId, coordinates }) => {
    io.to(requesterUserId).emit('opponent_location_captured', { coordinates });
  });

  // ── Disconnect
  socket.on('disconnect', async () => {
    onlineUsers.delete(userId);
    await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    io.emit('user_status', { userId, isOnline: false, lastSeen: new Date() });
    console.log(`🔴 ${socket.user.name} disconnected`);
  });
});

// ========== MIDDLEWARE ==========
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// ========== ROUTES ==========
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/notes',    require('./routes/noteRoutes'));
app.use('/api/profile',  require('./routes/profileRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/bundles',  require('./routes/bundleRoutes'));
app.use('/api/email',    require('./routes/emailRoutes'));
app.use('/api/chat',     require('./routes/chatRoutes'));
app.use('/api/ai',       require('./routes/aiRoutes'));   // ✅ AI Chat
app.use('/api/admin',    require('./routes/adminRoutes'));// ✅ Admin Dashboard
app.use('/api/banners',  require('./routes/bannerRoutes'));// ✅ Banners System

app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', message: 'Backend running', timestamp: new Date().toISOString() }));

// ========== MONGODB ==========
// Connect to MongoDB Atlas with robust options
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 30000, // 30 seconds
  maxPoolSize: 10,
  ssl: true,
  authSource: 'admin',
  retryWrites: true,
  w: 'majority',
})
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Sync indexes only after the connection is fully open and stable
mongoose.connection.once('open', () => {
  setTimeout(async () => {
    try {
      await User.syncIndexes();
      console.log('✅ Mongoose indexes synced');
    } catch (err) {
      // Non-fatal warning, safe to suppress to keep console clean
    }
  }, 2000);
});

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ========== GLOBAL ERROR HANDLER ==========
app.use((err, req, res, next) => {
  if (err instanceof require('multer').MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'One or more files exceed the size limit (Max 30MB for Admin, 10MB for Users).' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: 'Too many files uploaded in one batch (Max 500).' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server on port ${PORT}`);
});
