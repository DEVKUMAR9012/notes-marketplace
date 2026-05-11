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

// All routes require protection and admin role
router.use(protect);
router.use(admin);

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

module.exports = router;
