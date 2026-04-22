// ============================================================
// 📧 emailController.js — Admin Email System
// SendGrid-like controls: campaigns, logs, stats, unsubscribe
// ============================================================

const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const sendEmail = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');

// ═══════════════════════════════════════════════════════════════
// POST /api/email/campaign   (Admin only)
// Send a bulk marketing email to a filtered group of users
// Body: { subject, htmlBody, audience: 'all' | 'buyers' | 'sellers' }
// ═══════════════════════════════════════════════════════════════
exports.sendCampaign = async (req, res) => {
  try {
    const { subject, htmlBody, audience = 'all' } = req.body;

    if (!subject || !htmlBody) {
      return res.status(400).json({ success: false, message: 'subject and htmlBody are required' });
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

    res.json({
      success: true,
      message: `Campaign sent! ✅ ${sent} delivered, ${failed} failed out of ${users.length} recipients.`,
      stats: { total: users.length, sent, failed }
    });

  } catch (err) {
    console.error('Campaign error:', err);
    res.status(500).json({ success: false, message: 'Failed to send campaign' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/email/logs   (Admin only)
// Paginated list of all sent emails
// Query: ?page=1&limit=20&type=campaign&status=sent
// ═══════════════════════════════════════════════════════════════
exports.getEmailLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const [logs, total] = await Promise.all([
      EmailLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      EmailLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get logs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/email/stats   (Admin only)
// Dashboard overview: total sent, delivery rate, per-type breakdown
// ═══════════════════════════════════════════════════════════════
exports.getEmailStats = async (req, res) => {
  try {
    const [total, sent, failed, byType] = await Promise.all([
      EmailLog.countDocuments(),
      EmailLog.countDocuments({ status: 'sent' }),
      EmailLog.countDocuments({ status: 'failed' }),
      EmailLog.aggregate([
        { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } },
        { $sort: { '_id.type': 1 } }
      ])
    ]);

    // Get last 7 days volume
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyVolume = await EmailLog.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const deliveryRate = total > 0 ? ((sent / total) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      stats: {
        total,
        sent,
        failed,
        deliveryRate: `${deliveryRate}%`,
        byType,
        dailyVolume
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/email/unsubscribe?uid=<userId>   (Public)
// One-click unsubscribe — sets emailSubscribed: false
// ═══════════════════════════════════════════════════════════════
exports.unsubscribe = async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).send('<h2>Invalid unsubscribe link.</h2>');
    }

    await User.findByIdAndUpdate(uid, { emailSubscribed: false });

    // Return a nice HTML confirmation page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed - Notes Marketplace</title>
        <style>
          body { font-family: Arial, sans-serif; background: #0f0f1a; color: #fff;
                 display: flex; align-items: center; justify-content: center;
                 min-height: 100vh; margin: 0; }
          .box { text-align: center; padding: 48px; background: #1a1a2e;
                 border-radius: 16px; border: 1px solid rgba(124,58,237,0.3);
                 max-width: 480px; }
          h1 { color: #7c3aed; }
          p  { color: rgba(255,255,255,0.6); }
          a  { color: #7c3aed; }
        </style>
      </head>
      <body>
        <div class="box">
          <div style="font-size:64px;">✅</div>
          <h1>Unsubscribed</h1>
          <p>You have been successfully unsubscribed from marketing emails.<br/>
             You will still receive important account-related emails (OTP, purchase receipts).</p>
          <p><a href="${process.env.FRONTEND_URL || '/'}">← Back to Notes Marketplace</a></p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).send('<h2>Something went wrong. Please try again.</h2>');
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/email/test   (Admin only)
// Send yourself a test email to preview templates
// Body: { template: 'welcome' | 'purchase' | 'campaign', email }
// ═══════════════════════════════════════════════════════════════
exports.sendTestEmail = async (req, res) => {
  try {
    const { template = 'welcome', email } = req.body;
    const to = email || req.user.email;

    const htmlMap = {
      welcome: templates.welcomeEmail('Test User', 'test-id'),
      purchase: templates.purchaseEmail('Test User', 'test-id', 'Advanced Data Structures Notes', 99, 'note-123'),
      follower: templates.newFollowerEmail('Test User', 'test-id', 'John Doe'),
      campaign: templates.campaignEmail('Test User', 'test-id', 'Test Campaign', '<p>This is a <strong>test campaign</strong> email body.</p>')
    };

    const html = htmlMap[template] || htmlMap.welcome;

    await sendEmail({
      email: to,
      subject: `[TEST] Notes Marketplace - ${template} template`,
      html,
      type: 'campaign'
    });

    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
