const User = require('../models/User');
const Note = require('../models/Note');
const path = require('path');
const fs = require('fs');
const sendEmail = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');

// ── Get My Profile ─────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('purchasedNotes', 'title subject price pdfUrl createdAt')
      .populate('cart', 'title subject price pdfUrl uploadedBy')
      .populate('wishlist', 'title subject price pdfUrl');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ✅ FIXED: Use uploadedBy instead of seller
    const uploadedNotes = await Note.find({ uploadedBy: req.user._id })
      .select('title subject price downloads totalEarnings rating totalReviews createdAt pdfUrl');

    // Earnings per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // ✅ FIXED: Use uploadedBy instead of seller in aggregation
    const earningsChart = await Note.aggregate([
      { $match: { uploadedBy: user._id, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          earnings: { $sum: '$totalEarnings' },
          sales: { $sum: '$downloads' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const chartData = earningsChart.map(e => ({
      month: monthNames[e._id.month - 1],
      earnings: e.earnings,
      sales: e.sales,
    }));

    res.json({
      user: {
        ...user.toObject(),
        uploadedNotes,
        chartData,
      },
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Update Profile ─────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, college, bio } = req.body;
    const updateData = {};

    // Validate input
    if (name) {
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({ message: 'Name must be 2-50 characters' });
      }
      updateData.name = name;
    }
    
    if (college !== undefined) updateData.college = college;
    if (bio !== undefined) updateData.bio = bio;

    // Profile image upload
    if (req.file) {
      const user = await User.findById(req.user._id);  // ✅ FIXED: Use _id
      
      // Delete old image if exists
      if (user && user.profileImage) {
        const oldPath = path.join(__dirname, '..', user.profileImage);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (unlinkErr) {
            console.error('Error deleting old image:', unlinkErr);
          }
        }
      }
      updateData.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Update failed' });
  }
};

// ── Get Wallet ─────────────────────────────────────────────────────────────────
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)  // ✅ FIXED: Use _id
      .select('walletBalance transactions totalEarnings totalSales');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ✅ FIXED: Handle cases where transactions is undefined
    const transactions = (user.transactions || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50);

    res.json({
      balance: user.walletBalance || 0,
      totalEarnings: user.totalEarnings || 0,
      totalSales: user.totalSales || 0,
      transactions,
    });
  } catch (err) {
    console.error('Get wallet error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Cart & Wishlist ─────────────────────────────────────────────────────────────
exports.toggleCartItem = async (req, res) => {
  try {
    const { noteId } = req.body;
    const user = await User.findById(req.user._id);
    
    const index = user.cart.indexOf(noteId);
    if (index > -1) {
      user.cart.splice(index, 1);
    } else {
      user.cart.push(noteId);
    }
    
    await user.save();
    res.json({ message: index > -1 ? 'Removed from cart' : 'Added to cart', cart: user.cart });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleWishlistItem = async (req, res) => {
  try {
    const { noteId } = req.body;
    const user = await User.findById(req.user._id);
    
    const index = user.wishlist.indexOf(noteId);
    if (index > -1) {
      user.wishlist.splice(index, 1);
    } else {
      user.wishlist.push(noteId);
    }
    
    await user.save();
    res.json({ message: index > -1 ? 'Removed from wishlist' : 'Added to wishlist', wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Follow System ─────────────────────────────────────────────────────────────
exports.toggleFollow = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }
    
    const me = await User.findById(req.user._id);
    const target = await User.findById(targetUserId);
    
    if (!target) return res.status(404).json({ message: 'User not found' });

    const followingIndex = me.following.indexOf(targetUserId);
    if (followingIndex > -1) {
      me.following.splice(followingIndex, 1);
      target.followers.splice(target.followers.indexOf(me._id), 1);
    } else {
      me.following.push(targetUserId);
      target.followers.push(me._id);
    }
    
    await me.save();
    await target.save();

    // ✅ Send 'new follower' email if just followed (not unfollow)
    if (followingIndex === -1) {
      sendEmail({
        email: target.email,
        subject: `👥 ${me.name} started following you on Notes Marketplace!`,
        html: templates.newFollowerEmail(target.name, target._id.toString(), me.name),
        type: 'follower'
      }).catch(() => {});
    }
    
    res.json({ message: followingIndex > -1 ? 'Unfollowed' : 'Followed', following: me.following });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};