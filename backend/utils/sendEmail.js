// ============================================================
// 📧 sendEmail.js — Powered by Nodemailer + Gmail
// Fix: Resend does not allow sending emails from @gmail.com.
// This uses your SMTP credentials to send verified emails.
// ============================================================

const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email via Nodemailer and auto-log to MongoDB.
 *
 * @param {Object} options
 * @param {string}  options.email    - Recipient email address
 * @param {string}  options.subject  - Email subject line
 * @param {string}  [options.html]   - HTML body (preferred)
 * @param {string}  [options.message]- Plain text fallback
 * @param {string}  [options.type]   - Email type for logging (default: 'campaign')
 */
const sendEmail = async (options) => {
  const logEntry = {
    to: options.email,
    subject: options.subject,
    type: options.type || 'campaign',
    status: 'sent',
    resendId: 'nodemailer', // Mock ID for compatibility
    errorMessage: ''
  };

  try {
    const fromName = (process.env.FROM_NAME || 'Notes Marketplace').trim();
    const fromEmail = (process.env.SMTP_USER || process.env.FROM_EMAIL).trim();

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`, 
      to: options.email,
      subject: options.subject,
      text: options.message || '', 
      html: options.html || `<p>${options.message || ''}</p>`, 
    });

    console.log(`✅ Email sent to ${options.email} | MessageId: ${info.messageId}`);
    logEntry.resendId = info.messageId;

  } catch (err) {
    logEntry.status = 'failed';
    logEntry.errorMessage = err.message || 'Unknown error';
    console.error(`❌ Email failed to ${options.email}:`, err.message);
  }

  // Always save log (fire-and-forget — don't let it block)
  EmailLog.create(logEntry).catch(logErr => {
    console.error('⚠️ Email log save failed:', logErr.message);
  });

  return logEntry.status === 'sent';
};

module.exports = sendEmail;
