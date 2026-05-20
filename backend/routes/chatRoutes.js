const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const chatUpload   = require('../middleware/chatUploadMiddleware');
const {
  getConversations, getOrCreateConversation, createGroupChat,
  getMessages, markAsRead, searchUsers, getSuggestedUsers,
  editMessage, deleteMessage, reactToMessage,
  searchMessages, reportChat, blockUser, unblockUser,
  updateTags, uploadFile,
} = require('../controllers/chatController');

router.use(protect);

// ── User search & suggestions
router.get('/users/search', searchUsers);
router.get('/users/suggestions', getSuggestedUsers);

// ── Conversations
router.get('/',  getConversations);
router.post('/', getOrCreateConversation);
router.post('/group', createGroupChat);

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

// ── File Download Proxy (bypasses Cloudinary CORS for raw files)
router.get('/download-proxy', async (req, res) => {
  const { url, filename } = req.query;
  if (!url || !url.startsWith('https://res.cloudinary.com')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const https = require('https');
    const safeFilename = (filename || 'file').replace(/[^\w.\-\s]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    https.get(url, (cloudRes) => {
      const contentType = cloudRes.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      cloudRes.pipe(res);
    }).on('error', (err) => {
      console.error('Proxy download error:', err);
      res.status(500).json({ error: 'Download failed' });
    });
  } catch (err) {
    console.error('Proxy download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

module.exports = router;
