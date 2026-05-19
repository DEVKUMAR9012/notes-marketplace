const Banner = require('../models/Banner');
const User = require('../models/User');

// @desc    Create banner (Admin only)
// @route   POST /api/admin/banners
// @access  Private/Admin
exports.createBanner = async (req, res) => {
  try {
    const { text, targetGroup, specificUsersEmails, isActive } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Banner text is required' });
    }

    let specificUsers = [];
    if (targetGroup === 'specific' && specificUsersEmails && specificUsersEmails.length > 0) {
      // Find matching user IDs based on list of emails (comma-separated or array)
      const emailList = Array.isArray(specificUsersEmails) 
        ? specificUsersEmails 
        : String(specificUsersEmails).split(',').map(e => e.trim());
        
      const users = await User.find({ email: { $in: emailList } }).select('_id');
      specificUsers = users.map(u => u._id);
    }

    const banner = await Banner.create({
      text,
      targetGroup,
      specificUsers,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ success: true, data: banner });
  } catch (err) {
    console.error('Create Banner error:', err);
    res.status(500).json({ success: false, message: 'Server error while creating banner' });
  }
};

// @desc    Get all banners (Admin only)
// @route   GET /api/admin/banners
// @access  Private/Admin
exports.getBannersAdmin = async (req, res) => {
  try {
    const banners = await Banner.find()
      .populate('specificUsers', 'name email')
      .sort('-createdAt');
    res.status(200).json({ success: true, data: banners });
  } catch (err) {
    console.error('Get Admin Banners error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching banners' });
  }
};

// @desc    Delete banner (Admin only)
// @route   DELETE /api/admin/banners/:id
// @access  Private/Admin
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    res.status(200).json({ success: true, message: 'Banner deleted successfully' });
  } catch (err) {
    console.error('Delete Banner error:', err);
    res.status(500).json({ success: false, message: 'Server error while deleting banner' });
  }
};

// @desc    Toggle banner active status (Admin only)
// @route   PATCH /api/admin/banners/:id/toggle
// @access  Private/Admin
exports.toggleBannerActive = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    banner.isActive = !banner.isActive;
    await banner.save();
    res.status(200).json({ success: true, data: banner });
  } catch (err) {
    console.error('Toggle Banner error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get active banners for currently logged-in user
// @route   GET /api/banners/active
// @access  Public/Private
exports.getActiveBannersForUser = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      // Return only 'all' targeted banners for public/guests
      const banners = await Banner.find({ isActive: true, targetGroup: 'all' }).sort('-createdAt');
      return res.status(200).json({ success: true, data: banners });
    }

    // Determine if the user is "new" (registered in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const isNewUser = new Date(user.createdAt) >= sevenDaysAgo;

    // Fetch banners targeting all, new/old status, or specific user ID
    const query = {
      isActive: true,
      $or: [
        { targetGroup: 'all' },
        { targetGroup: isNewUser ? 'new' : 'old' },
        { targetGroup: 'specific', specificUsers: user._id }
      ]
    };

    const banners = await Banner.find(query).sort('-createdAt');
    res.status(200).json({ success: true, data: banners });
  } catch (err) {
    console.error('Get Active Banners error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching active banners' });
  }
};
