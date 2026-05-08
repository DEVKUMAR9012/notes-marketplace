const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getDashboardStats, getUsers, toggleUserVerification, toggleUserBlock } = require('../controllers/adminController');

router.get('/dashboard', protect, admin, getDashboardStats);

// User Management
router.get('/users', protect, admin, getUsers);
router.put('/users/:id/verify', protect, admin, toggleUserVerification);
router.put('/users/:id/block', protect, admin, toggleUserBlock);

module.exports = router;
