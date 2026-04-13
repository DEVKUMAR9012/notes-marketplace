require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing SMTP connection...');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection successful!');

    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: process.env.SMTP_USER, // send to self
      subject: 'Test Email from Notes Marketplace',
      text: 'If you see this, your SMTP configuration is working!'
    });
    
    console.log('✅ Email sent successfully! ID:', info.messageId);
  } catch (error) {
    console.error('❌ Email test failed!');
    console.error(error);
  }
}

testEmail();