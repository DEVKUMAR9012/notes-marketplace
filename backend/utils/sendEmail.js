const nodemailer = require('nodemailer');

// ✅ Helper: Retry with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      console.log(`⏳ Email retry in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const sendEmail = async (options) => {
  try {
    let transporter;

    // If no legitimate SMTP_HOST is in .env, fallback to automatic test email (Ethereal)
    if (!process.env.SMTP_HOST) {
      console.log('⚠️ No SMTP configured - Using Ethereal test account');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } else {
      // Standard setup for when the user adds real credentials in .env
      transporter = nodemailer.createTransport({
        host: (process.env.SMTP_HOST || '').trim(),
        port: parseInt(process.env.SMTP_PORT, 10) || 465,
        secure: parseInt(process.env.SMTP_PORT, 10) === 465,
        auth: {
          user: (process.env.SMTP_USER || '').trim(),
          pass: (process.env.SMTP_PASS || '').trim()
        }
      });
    }

    const message = {
      from: `${(process.env.FROM_NAME || 'Notes Marketplace').trim()} <${(process.env.FROM_EMAIL || 'noreply@notesmarketplace.com').trim()}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message
    };

    // ✅ Retry email sending with timeout
    const info = await retryWithBackoff(async () => {
      return new Promise((resolve, reject) => {
        // 10-second timeout for email sending
        const timeout = setTimeout(() => {
          reject(new Error('Email send timeout (10s)'));
        }, 10000);

        transporter.sendMail(message, (err, res) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve(res);
        });
      });
    }, 3);

    console.log('✅ Email sent successfully to:', options.email);
    
    if (!process.env.SMTP_HOST) {
      console.log('📬 DEV MODE TEST URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('❌ Failed to send email after retries:', error.message);
    // Don't throw - let it fail gracefully
    // The background task won't block the user
    return null;
  }
};

module.exports = sendEmail;
