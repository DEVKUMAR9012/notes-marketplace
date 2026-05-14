const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getDashboardStats,
  getUsers,
  getUserPurchases,
  blockUser,
  changeUserRole,
  deleteUser,
  forcePasswordReset,
  getNotes,
  moderateNote,
  deleteNote,
  getChats,
  getChatMessages,
  deleteChat,
  getTransactions,
  getWithdrawals,
  moderateWithdrawal,
  getReports,
  moderateReport,
  getContacts,
  replyToContact,
  getSettings,
  updateSettings
} = require('../controllers/adminController');
const { getEmailStats, getEmailLogs, sendMarketingCampaign } = require('../controllers/adminEmailController');
const { bulkUploadNotes, checkDuplicates } = require('../controllers/adminUploadController');
const adminBulkUpload = require('../middleware/adminBulkUpload');
const rateLimit = require('express-rate-limit');

// Rate limiter for duplicate checking to prevent DB probing
const dupCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // limit each IP to 20 requests per windowMs
  message: { success: false, message: 'Too many duplicate checks from this IP, please try again after a minute' }
});

// All routes require protection and admin role
router.use(protect);
router.use(admin);

// Bulk Upload (Admin God Mode)
router.post('/bulk-upload', adminBulkUpload.array('pdfs', 500), bulkUploadNotes);
router.post('/check-duplicates', dupCheckLimiter, checkDuplicates);

// Overview
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.get('/users/:id/purchases', getUserPurchases);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/role', changeUserRole);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/force-reset', forcePasswordReset);

// Content Moderation
router.get('/notes', getNotes);
router.patch('/notes/:id/moderate', moderateNote);
router.delete('/notes/:id', deleteNote);

// Live Chats
router.get('/chats', getChats);
router.get('/chats/:id/messages', getChatMessages);
router.delete('/chats/:id', deleteChat);

// Financials
router.get('/transactions', getTransactions);
router.get('/withdrawals', getWithdrawals);
router.patch('/withdrawals/:id', moderateWithdrawal);

// Support & Reports
router.get('/reports', getReports);
router.patch('/reports/:id', moderateReport);
router.get('/contacts', getContacts);
router.post('/contacts/:id/reply', replyToContact);

// Platform Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Email Dashboard
router.get('/email/stats', getEmailStats);
router.get('/email/logs', getEmailLogs);
router.post('/email/campaign', sendMarketingCampaign);

module.exports = router;
