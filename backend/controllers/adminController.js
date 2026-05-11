const User = require('../models/User');
const Note = require('../models/Note');
const Bundle = require('../models/Bundle');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Report = require('../models/Report');
const Contact = require('../models/Contact');
const Setting = require('../models/Setting');
const AuditLog = require('../models/AuditLog');
const sendEmail = require('../utils/sendEmail');

// ─── Utility: Log Admin Action ──────────────────────────────────────────────
const logAction = async (adminId, adminName, action, targetType, targetId, details) => {
  try {
    await AuditLog.create({
      admin: adminId,
      adminName,
      action,
      targetType,
      targetId,
      details
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};

// ─── Dashboard Overview ───────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalNotes = await Note.countDocuments();
    const totalBundles = await Bundle.countDocuments();

    // Calculate sales metrics
    const notes = await Note.find({}, 'totalEarnings');
    const grossSales = notes.reduce((acc, note) => acc + (note.totalEarnings || 0), 0);
    
    // Get platform revenue (from settings or default 10%)
    const settings = await Setting.findOne();
    const platformFeePercent = settings ? settings.platformFee : 10;
    const platformRevenue = Math.round(grossSales * (platformFeePercent / 100));

    // Recent Activity
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).select('name email avatar profileImage createdAt role isBlocked');
    const recentNotes = await Note.find().sort({ createdAt: -1 }).limit(10).select('title price createdAt uploadedBy').populate('uploadedBy', 'name');
    
    // Transactions - from unified Transaction model if exists, otherwise aggregate from Users
    let recentTransactions = await Transaction.find().sort({ date: -1 }).limit(10);
    
    if (recentTransactions.length === 0) {
      // Fallback to aggregation if model is new/empty
      recentTransactions = await User.aggregate([
        { $unwind: '$transactions' },
        { $sort: { 'transactions.date': -1 } },
        { $limit: 10 },
        { $project: {
            userName: '$name',
            description: '$transactions.description',
            type: '$transactions.type',
            amount: '$transactions.amount',
            date: '$transactions.date'
        }}
      ]);
    }

    res.json({
      success: true,
      metrics: { totalUsers, totalNotes, totalBundles, grossSales, platformRevenue },
      recentActivity: { users: recentUsers, transactions: recentTransactions, notes: recentNotes }
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ─── User Management ─────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = '', role = '', status = '' } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status) query.isBlocked = status === 'blocked';

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, users, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

exports.getUserPurchases = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate({
      path: 'purchasedNotes',
      select: 'title price createdAt'
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.purchasedNotes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchases' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { blocked } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: blocked }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    await logAction(req.user._id, req.user.name, blocked ? 'BLOCK_USER' : 'UNBLOCK_USER', 'User', user._id, { email: user.email });
    res.json({ success: true, message: `User ${blocked ? 'blocked' : 'unblocked'}` });
  } catch (error) {
    res.status(500).json({ message: 'Action failed' });
  }
};

exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    await logAction(req.user._id, req.user.name, 'CHANGE_ROLE', 'User', user._id, { oldRole: user.role, newRole: role });
    res.json({ success: true, message: 'Role updated' });
  } catch (error) {
    res.status(500).json({ message: 'Role update failed' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin' });

    await logAction(req.user._id, req.user.name, 'DELETE_USER', 'User', user._id, { name: user.name, email: user.email });
    await user.deleteOne();
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
};

exports.forcePasswordReset = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `Admin has requested a password reset for your account. Please visit: ${resetUrl}`;

    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      message,
      type: 'transactional'
    });

    res.json({ success: true, message: 'Reset email triggered' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send reset email' });
  }
};

// ─── Content Moderation ───────────────────────────────────────────────────────
exports.getNotes = async (req, res) => {
  try {
    const { status = 'all', search = '' } = req.query;
    const query = {};
    if (status !== 'all') query.status = status;
    if (search) query.title = { $regex: search, $options: 'i' };

    const notes = await Note.find(query).populate('uploadedBy', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
};

exports.moderateNote = async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const status = action === 'approve' ? 'approved' : 'rejected';
    const note = await Note.findByIdAndUpdate(req.params.id, { status }, { new: true });
    
    await logAction(req.user._id, req.user.name, `MODERATE_NOTE_${action.toUpperCase()}`, 'Note', note._id, { title: note.title });
    res.json({ success: true, message: `Note ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Action failed' });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    await logAction(req.user._id, req.user.name, 'DELETE_NOTE', 'Note', note._id, { title: note.title });
    await note.deleteOne();
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
};

// ─── Live Chats ───────────────────────────────────────────────────────────────
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find().populate('participants', 'name avatar').sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch chats' });
  }
};

exports.getChatMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.id }).populate('sender', 'name avatar').sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.id);
    await Message.deleteMany({ chat: req.params.id });
    res.json({ success: true, message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
};

// ─── Financials ───────────────────────────────────────────────────────────────
exports.getTransactions = async (req, res) => {
  try {
    const txs = await Transaction.find().sort({ date: -1 });
    res.json(txs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
};

exports.getWithdrawals = async (req, res) => {
  try {
    const wds = await Withdrawal.find().sort({ createdAt: -1 });
    res.json(wds);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch withdrawals' });
  }
};

exports.moderateWithdrawal = async (req, res) => {
  try {
    const { action } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';
    const wd = await Withdrawal.findByIdAndUpdate(req.params.id, { status, processedAt: new Date() }, { new: true });
    
    await logAction(req.user._id, req.user.name, `WITHDRAWAL_${action.toUpperCase()}`, 'Withdrawal', wd._id, { amount: wd.amount });
    res.json({ success: true, message: `Withdrawal ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Action failed' });
  }
};

// ─── Support & Reports ────────────────────────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find().populate('reportedBy reportedUser', 'name email').sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

exports.moderateReport = async (req, res) => {
  try {
    const { status } = req.body;
    await Report.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true, message: 'Report updated' });
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

exports.replyToContact = async (req, res) => {
  try {
    const { message } = req.body;
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    await sendEmail({
      email: contact.email,
      subject: `RE: ${contact.subject}`,
      message,
      type: 'support'
    });

    contact.replied = true;
    contact.replyMessage = message;
    contact.repliedAt = new Date();
    await contact.save();
    
    res.json({ success: true, message: 'Reply sent via email' });
  } catch (error) {
    res.status(500).json({ message: 'Reply failed' });
  }
};

// ─── Platform Settings ────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await Setting.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    await logAction(req.user._id, req.user.name, 'UPDATE_SETTINGS', 'Setting', settings._id, req.body);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
};
