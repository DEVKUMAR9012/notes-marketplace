const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  let transporter;

  // If no legitimate SMTP_HOST is in .env, fallback to automatic test email (Ethereal)
  if (!process.env.SMTP_HOST) {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass  // generated ethereal password
      }
    });
  } else {
    // Standard setup for when the user adds real credentials in .env
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // true for 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  const message = {
    from: `${process.env.FROM_NAME || 'Notes Marketplace'} <${process.env.FROM_EMAIL || 'noreply@notesmarketplace.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
  
  if (!process.env.SMTP_HOST) {
    // Log the Ethereal testing URL so the developer can click it in the terminal!
    console.log('📬 DEV MODE EMAIL URL: %s', nodemailer.getTestMessageUrl(info));
  }
};

module.exports = sendEmail;
