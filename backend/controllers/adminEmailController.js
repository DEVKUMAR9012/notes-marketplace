const asyncHandler = require('express-async-handler');

// @desc    Get email campaign stats
// @route   GET /api/admin/email/stats
// @access  Private/Admin
const getEmailStats = asyncHandler(async (req, res) => {
  // Return dummy stats for now to prevent 404
  res.json({
    totalSent: 1250,
    opened: 840,
    clicked: 320,
    bounced: 15,
    lastCampaign: 'Welcome New Users - May 2026',
    activeSubscribers: 4500
  });
});

// @desc    Get email logs
// @route   GET /api/admin/email/logs
// @access  Private/Admin
const getEmailLogs = asyncHandler(async (req, res) => {
  // Return dummy logs for now
  res.json([
    { id: 1, recipient: 'user1@example.com', subject: 'Welcome to Notes Marketplace', status: 'delivered', sentAt: new Date(Date.now() - 3600000) },
    { id: 2, recipient: 'user2@example.com', subject: 'Your download is ready', status: 'opened', sentAt: new Date(Date.now() - 7200000) },
    { id: 3, recipient: 'user3@example.com', subject: 'Weekly Newsletter', status: 'clicked', sentAt: new Date(Date.now() - 86400000) },
    { id: 4, recipient: 'user4@example.com', subject: 'Account Verification', status: 'bounced', sentAt: new Date(Date.now() - 172800000) },
  ]);
});

// @desc    Send marketing campaign
// @route   POST /api/admin/email/campaign
// @access  Private/Admin
const sendMarketingCampaign = asyncHandler(async (req, res) => {
  const { subject, body, target } = req.body;

  if (!subject || !body) {
    res.status(400);
    throw new Error('Please provide subject and body');
  }

  // Simulate campaign sending
  console.log(`Campaign started: ${subject} to ${target || 'all subscribers'}`);

  res.status(200).json({
    success: true,
    message: 'Campaign initiated successfully',
    estimatedReach: 4500
  });
});

module.exports = {
  getEmailStats,
  getEmailLogs,
  sendMarketingCampaign
};
