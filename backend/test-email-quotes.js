const nodemailer = require('nodemailer');

async function testEmailQuotes() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'dk25042008@gmail.com',
      pass: 'ovaownkahhyidvkq'
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `""Notes Marketplace"" <dk25042008@gmail.com>`, // Testing double quotes
      to: 'dk25042008@gmail.com',
      subject: 'Test Email Quotes',
      text: 'Testing if quotes break it.'
    });
    console.log('✅ Success:', info.messageId);
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

testEmailQuotes();