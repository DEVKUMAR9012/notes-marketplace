const User = require('../models/User');
const Note = require('../models/Note');
const Order = require('../models/Order');
const Withdrawal = require('../models/Withdrawal');

// ── 1. Onboard Seller ────────────────────────────────────────────────────────
exports.onboardSeller = async (req, res) => {
  try {
    const { name, collegeName, course, branch, year, bio, upiId } = req.body;
    const userId = req.user._id;

    if (!course || !branch || !upiId) {
      return res.status(400).json({
        success: false,
        message: 'Course, Branch, and UPI ID for payouts are required.'
      });
    }

    // Basic UPI ID format validation (e.g., username@bank)
    const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(upiId.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid UPI ID (e.g. yourname@oksbi, mobile@paytm).'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name && name.trim()) user.name = name.trim();
    if (collegeName && collegeName.trim()) user.collegeName = collegeName.trim();
    if (bio !== undefined) user.bio = bio.trim();

    user.role = 'seller';
    user.sellerStatus = 'active';
    user.sellerProfile = {
      course: course.trim(),
      branch: branch.trim(),
      year: (year || '').trim(),
      upiId: upiId.trim(),
      completedAt: new Date()
    };

    await user.save();

    // Return sanitized user object
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: '🎉 Congratulations! You are now a verified seller.',
      user: userObj
    });
  } catch (err) {
    console.error('Seller onboarding error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete seller onboarding' });
  }
};

// ── 2. Seller Dashboard Stats & Overview ────────────────────────────────────
exports.getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const user = await User.findById(sellerId).select(
      'name email avatar collegeName walletBalance totalEarnings totalSales sellerProfile sellerStatus role'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Seller's listed notes
    const notes = await Note.find({ uploadedBy: sellerId })
      .select('title subject course branch price downloads totalEarnings rating reviews status previewImage pdfUrl createdAt')
      .sort({ createdAt: -1 });

    // Recent orders where this user is seller
    const orders = await Order.find({ seller: sellerId })
      .populate('buyer', 'name avatar email')
      .populate('note', 'title price previewImage')
      .sort({ createdAt: -1 })
      .limit(30);

    // Withdrawals
    const withdrawals = await Withdrawal.find({ user: sellerId })
      .sort({ createdAt: -1 })
      .limit(20);

    const pendingWithdrawalSum = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + w.amount, 0);

    // Compute monthly earnings for chart
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyAggregation = await Order.aggregate([
      {
        $match: {
          seller: sellerId,
          status: 'paid',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          earnings: { $sum: '$sellerEarning' },
          sales: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = monthlyAggregation.map(e => ({
      month: monthNames[e._id.month - 1],
      earnings: e.earnings,
      sales: e.sales
    }));

    res.json({
      success: true,
      stats: {
        totalEarnings: user.totalEarnings || 0,
        walletBalance: user.walletBalance || 0,
        totalSales: user.totalSales || 0,
        totalMaterials: notes.length,
        pendingWithdrawals: pendingWithdrawalSum,
        sellerStatus: user.sellerStatus,
        upiId: user.sellerProfile?.upiId || ''
      },
      user,
      notes,
      orders,
      withdrawals,
      chartData
    });
  } catch (err) {
    console.error('Seller dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch seller dashboard data' });
  }
};

// ── 3. Seller Orders ────────────────────────────────────────────────────────
exports.getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user._id })
      .populate('buyer', 'name avatar email')
      .populate('note', 'title price previewImage course branch')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error('Get seller orders error:', err);
    res.status(500).json({ success: false, message: 'Failed to load seller orders' });
  }
};

// ── 4. Seller Withdrawals ───────────────────────────────────────────────────
exports.getSellerWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, withdrawals });
  } catch (err) {
    console.error('Get seller withdrawals error:', err);
    res.status(500).json({ success: false, message: 'Failed to load withdrawals' });
  }
};

// ── 5. Request Payout / Withdrawal ──────────────────────────────────────────
exports.requestPayout = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, upiId } = req.body;

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount < 50) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹50' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (withdrawAmount > user.walletBalance) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    const finalUpiId = (upiId || user.sellerProfile?.upiId || '').trim();
    if (!finalUpiId) {
      return res.status(400).json({ success: false, message: 'UPI ID is required for payout' });
    }

    // Deduct from wallet balance & record transaction
    user.walletBalance -= withdrawAmount;
    user.transactions.push({
      type: 'debit',
      amount: withdrawAmount,
      description: `Payout request to UPI: ${finalUpiId}`,
      date: new Date()
    });
    await user.save();

    // Create persistent Withdrawal record
    const withdrawal = await Withdrawal.create({
      user: userId,
      userName: user.name,
      amount: withdrawAmount,
      upiId: finalUpiId,
      status: 'pending'
    });

    res.json({
      success: true,
      message: `Payout request for ₹${withdrawAmount} submitted successfully. It will be credited to ${finalUpiId} within 24-48 hours.`,
      walletBalance: user.walletBalance,
      withdrawal
    });
  } catch (err) {
    console.error('Request payout error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit payout request' });
  }
};
