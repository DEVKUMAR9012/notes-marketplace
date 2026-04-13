const nodemailer = require('nodemailer');

async function testTrailingSpace() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com ', // Trailing space
    port: 465,
    secure: true,
    auth: {
      user: 'dk25042008@gmail.com ', // Trailing space
      pass: 'ovaownkahhyidvkq ' // Trailing space
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `Notes Marketplace <dk25042008@gmail.com>`,
      to: 'dk25042008@gmail.com',
      subject: 'Test Email Trailing Space',
      text: 'Testing.'
    });
    console.log('✅ Success:', info.messageId);
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

testTrailingSpace();