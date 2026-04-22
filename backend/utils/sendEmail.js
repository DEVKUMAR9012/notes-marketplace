// ============================================================
// 📧 sendEmail.js — Powered by Resend.com
// Replaces Nodemailer. Uses Resend SDK for production-grade
// email delivery with automatic logging to MongoDB.
// ============================================================

const { Resend } = require('resend');
const EmailLog = require('../models/EmailLog');

// Lazy-init Resend client (safe if API key not set yet)
let resendClient = null;
const getClient = () => {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in .env');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

/**
 * Send an email via Resend and auto-log to MongoDB.
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
    resendId: '',
    errorMessage: ''
  };

  try {
    const client = getClient();

    const fromName = (process.env.FROM_NAME || 'Notes Marketplace').trim();
    const fromEmail = (process.env.FROM_EMAIL || 'onboarding@resend.dev').trim();

    const { data, error } = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [options.email],
      subject: options.subject,
      html: options.html || `<p>${options.message || ''}</p>`,
      text: options.message || ''
    });

    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }

    logEntry.resendId = data?.id || '';
    console.log(`✅ Email sent via Resend to ${options.email} | ID: ${data?.id}`);

  } catch (err) {
    logEntry.status = 'failed';
    logEntry.errorMessage = err.message || 'Unknown error';
    console.error(`❌ Resend email failed to ${options.email}:`, err.message);
  }

  // Always save log (fire-and-forget — don't let it block)
  EmailLog.create(logEntry).catch(logErr => {
    console.error('⚠️ Email log save failed:', logErr.message);
  });

  return logEntry.status === 'sent';
};

module.exports = sendEmail;
