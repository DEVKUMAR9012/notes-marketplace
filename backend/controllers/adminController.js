const User = require('../models/User');
const Note = require('../models/Note');
const Bundle = require('../models/Bundle');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalNotes = await Note.countDocuments();
    const totalBundles = await Bundle.countDocuments();

    // Calculate gross sales from all notes
    const notes = await Note.find({}, 'totalEarnings');
    const grossSales = notes.reduce((acc, note) => acc + (note.totalEarnings || 0), 0);
    const platformRevenue = Math.round(grossSales * 0.10);

    // Recent activity
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt avatar profileImage');
    const recentNotes = await Note.find().sort({ createdAt: -1 }).limit(5).select('title price uploadedBy createdAt').populate('uploadedBy', 'name email');

    const recentTransactions = await User.aggregate([
      { $unwind: '$transactions' },
      { $sort: { 'transactions.date': -1 } },
      { $limit: 10 },
      { $project: {
          userName: '$name',
          userEmail: '$email',
          type: '$transactions.type',
          amount: '$transactions.amount',
          description: '$transactions.description',
          date: '$transactions.date'
      }}
    ]);

    res.json({
      success: true,
      metrics: {
        totalUsers,
        totalNotes,
        totalBundles,
        grossSales,
        platformRevenue
      },
      recentActivity: {
        transactions: recentTransactions,
        users: recentUsers,
        notes: recentNotes
      }
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ─── User Management ─────────────────────────────────────────────────────────

exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -otpCode')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get note counts for these users
    const userIds = users.map(u => u._id);
    const noteCounts = await Note.aggregate([
      { $match: { uploadedBy: { $in: userIds } } },
      { $group: { _id: '$uploadedBy', count: { $sum: 1 } } }
    ]);

    const usersWithCounts = users.map(u => {
      const userObj = u.toObject();
      const countObj = noteCounts.find(n => String(n._id) === String(u._id));
      userObj.uploadedNotesCount = countObj ? countObj.count : 0;
      return userObj;
    });

    res.json({
      success: true,
      users: usersWithCounts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

exports.toggleUserVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    user.isVerified = !user.isVerified;
    await user.save();
    
    res.json({ success: true, isVerified: user.isVerified, message: `User ${user.isVerified ? 'verified' : 'unverified'} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle verification' });
  }
};

exports.toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot block an admin' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();
    
    res.json({ success: true, isBlocked: user.isBlocked, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle block status' });
  }
};
