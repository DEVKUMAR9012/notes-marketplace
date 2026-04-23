require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log("Testing SMTP Connection...");
  console.log("User:", process.env.SMTP_USER);
  console.log("Pass exists?", !!process.env.SMTP_PASS);

  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: process.env.SMTP_PORT == 465, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    // verify connection configuration
    await transporter.verify();
    console.log("✅ Server is ready to take our messages");
    
    // Try sending a test email to the user's own email
    let info = await transporter.sendMail({
      from: `Test <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // send to themselves
      subject: "Test Email from Notes Marketplace",
      text: "This is a test to see if nodemailer is working.",
    });

    console.log("✅ Test email sent! Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ SMTP Error:", error);
  }
}

testEmail();
