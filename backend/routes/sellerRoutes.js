const express = require('express');
const router = express.Router();
const {
  onboardSeller,
  getSellerDashboard,
  getSellerOrders,
  getSellerWithdrawals,
  requestPayout
} = require('../controllers/sellerController');
const { protect, requireSeller } = require('../middleware/authMiddleware');

// Onboard user to become a seller (any authenticated user can onboard)
router.post('/onboard', protect, onboardSeller);

// Seller dashboard & management endpoints (restricted to sellers)
router.get('/dashboard', protect, requireSeller, getSellerDashboard);
router.get('/orders', protect, requireSeller, getSellerOrders);
router.get('/withdrawals', protect, requireSeller, getSellerWithdrawals);
router.post('/withdraw', protect, requireSeller, requestPayout);

module.exports = router;
