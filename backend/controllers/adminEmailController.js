const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const sendEmail = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');

// @desc    Get email campaign stats
// @route   GET /api/admin/email/stats
// @access  Private/Admin
const getEmailStats = asyncHandler(async (req, res) => {
  const stats = await EmailLog.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
      }
    }
  ]);

  const byType = await EmailLog.aggregate([
    { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } }
  ]);

  const dailyVolume = await EmailLog.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 7 }
  ]);

  const data = stats[0] || { total: 0, sent: 0, failed: 0 };
  
  res.json({
    total: data.total,
    sent: data.sent,
    failed: data.failed,
    deliveryRate: data.total > 0 ? ((data.sent / data.total) * 100).toFixed(2) : 0,
    byType,
    dailyVolume: dailyVolume.reverse()
  });
});

// @desc    Get email logs
// @route   GET /api/admin/email/logs
// @access  Private/Admin
const getEmailLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  const filterType = req.query.type || '';
  const filterStatus = req.query.status || '';

  let query = {};
  if (filterType) query.type = filterType;
  if (filterStatus) query.status = filterStatus;

  const [logs, total] = await Promise.all([
    EmailLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    EmailLog.countDocuments(query)
  ]);

  res.json({
    logs,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      total
    }
  });
});

// @desc    Send marketing campaign
// @route   POST /api/admin/email/campaign
// @access  Private/Admin
const sendMarketingCampaign = asyncHandler(async (req, res) => {
  const { subject, htmlBody, audience = 'all' } = req.body;

  if (!subject || !htmlBody) {
    res.status(400);
    throw new Error('Please provide subject and body');
  }

  // Build audience filter
  let filter = { isVerified: true, emailSubscribed: true };
  if (audience === 'buyers') {
    filter.purchasedNotes = { $exists: true, $not: { $size: 0 } };
  } else if (audience === 'sellers') {
    filter.totalSales = { $gt: 0 };
  }

  const users = await User.find(filter).select('name email _id');

  if (!users.length) {
    return res.status(400).json({ success: false, message: 'No users found for this audience' });
  }

  // Send emails in batches of 10 (rate-limit friendly)
  let sent = 0;
  let failed = 0;
  const batchSize = 10;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const promises = batch.map(user =>
      sendEmail({
        email: user.email,
        subject,
        html: templates.campaignEmail(user.name, user._id.toString(), subject, htmlBody),
        type: 'campaign'
      })
    );
    const results = await Promise.allSettled(promises);
    results.forEach(r => r.status === 'fulfilled' && r.value ? sent++ : failed++);

    // Small delay between batches
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  res.status(200).json({
    success: true,
    message: `Campaign sent! ✅ ${sent} delivered, ${failed} failed out of ${users.length} recipients.`,
    stats: { total: users.length, sent, failed }
  });
});

module.exports = {
  getEmailStats,
  getEmailLogs,
  sendMarketingCampaign
};
