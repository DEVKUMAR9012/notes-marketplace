const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const chatUpload   = require('../middleware/chatUploadMiddleware');
const {
  getConversations, getOrCreateConversation,
  getMessages, markAsRead, searchUsers,
  editMessage, deleteMessage, reactToMessage,
  searchMessages, reportChat, blockUser, unblockUser,
  updateTags, uploadFile,
} = require('../controllers/chatController');

router.use(protect);

// ── User search (new conversation)
router.get('/users/search', searchUsers);

// ── Conversations
router.get('/',  getConversations);
router.post('/', getOrCreateConversation);

// ── Messages
router.get( '/:chatId/messages', getMessages);
router.put( '/:chatId/read',     markAsRead);
router.get( '/:chatId/search',   searchMessages);

// ── File upload in chat
router.post('/:chatId/upload', chatUpload.single('file'), uploadFile);

// ── Tags
router.put('/:chatId/tags', updateTags);

// ── Safety
router.post('/:chatId/report', reportChat);
router.post('/:chatId/block',  blockUser);
router.delete('/:chatId/block', unblockUser);

// ── Message level
router.put(   '/messages/:msgId',       editMessage);
router.delete('/messages/:msgId',       deleteMessage);
router.post(  '/messages/:msgId/react', reactToMessage);

module.exports = router;
