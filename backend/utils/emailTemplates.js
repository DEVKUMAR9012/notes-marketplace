// ============================================================
// 📧 Notes Marketplace — Email Template Library
// All templates are mobile-responsive, dark-themed HTML emails
// ============================================================

const BASE_URL = process.env.FRONTEND_URL || 'https://notes-marketplace-rho.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://notes-marketplace-backend.onrender.com';

// ── Shared email wrapper (header + footer) ─────────────────────────────────────
const wrap = (title, content, userId = '') => {
  const unsubLink = userId
    ? `${BACKEND_URL}/api/email/unsubscribe?uid=${userId}`
    : `${BASE_URL}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
                📚 Notes Marketplace
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">
                Your Academic Knowledge Hub
              </p>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="background:#1a1a2e;padding:40px;border-left:1px solid rgba(124,58,237,0.2);border-right:1px solid rgba(124,58,237,0.2);">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#12122b;border-radius:0 0 16px 16px;border:1px solid rgba(124,58,237,0.2);border-top:none;padding:24px 40px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">
                © ${new Date().getFullYear()} Notes Marketplace · All rights reserved
              </p>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.3);font-size:12px;">
                <a href="${BASE_URL}" style="color:#7c3aed;text-decoration:none;">Visit Website</a>
                &nbsp;·&nbsp;
                <a href="${unsubLink}" style="color:rgba(255,255,255,0.3);text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ── Helper: button ─────────────────────────────────────────────────────────────
const btn = (text, url) => `
  <div style="text-align:center;margin:32px 0;">
    <a href="${url}"
       style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;
              text-decoration:none;padding:14px 36px;border-radius:8px;
              font-weight:700;font-size:16px;display:inline-block;">
      ${text}
    </a>
  </div>`;

// ── Helper: info card ──────────────────────────────────────────────────────────
const card = (content) => `
  <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.25);
              border-radius:12px;padding:24px;margin:24px 0;">
    ${content}
  </div>`;

// ── Helper: stat row ──────────────────────────────────────────────────────────
const stat = (label, value) => `
  <tr>
    <td style="color:rgba(255,255,255,0.5);font-size:14px;padding:6px 0;">${label}</td>
    <td style="color:#fff;font-size:14px;font-weight:600;text-align:right;">${value}</td>
  </tr>`;

// =============================================================================
// 1. OTP / EMAIL VERIFICATION
// =============================================================================
exports.otpEmail = (name, otp) => wrap(
  'Verify Your Email',
  `<h2 style="color:#fff;margin:0 0 8px;font-size:24px;">Hi ${name}! 👋</h2>
   <p style="color:rgba(255,255,255,0.65);margin:0 0 24px;font-size:16px;line-height:1.6;">
     Welcome to Notes Marketplace! Use the code below to verify your email address.
   </p>
   ${card(`
     <p style="color:rgba(255,255,255,0.5);font-size:13px;text-align:center;margin:0 0 16px;">
       YOUR VERIFICATION CODE
     </p>
     <div style="text-align:center;font-size:48px;font-weight:800;letter-spacing:12px;color:#7c3aed;">
       ${otp}
     </div>
     <p style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;margin:16px 0 0;">
       ⏰ Expires in 10 minutes
     </p>
   `)}
   <p style="color:rgba(255,255,255,0.45);font-size:13px;text-align:center;">
     If you didn't request this, you can safely ignore this email.
   </p>`
);

// =============================================================================
// 2. WELCOME EMAIL (after verification)
// =============================================================================
exports.welcomeEmail = (name, userId) => wrap(
  `Welcome to Notes Marketplace, ${name}!`,
  `<h2 style="color:#fff;margin:0 0 8px;font-size:24px;">Welcome aboard, ${name}! 🎉</h2>
   <p style="color:rgba(255,255,255,0.65);margin:0 0 24px;font-size:16px;line-height:1.6;">
     Your email is verified and your account is ready. Here's what you can do:
   </p>
   ${card(`
     <table width="100%" cellpadding="0" cellspacing="0">
       <tr>
         <td style="padding:8px 0;">
           <span style="color:#7c3aed;font-size:20px;">📖</span>
           <span style="color:#fff;font-size:15px;margin-left:12px;">Browse thousands of student notes</span>
         </td>
       </tr>
       <tr>
         <td style="padding:8px 0;">
           <span style="color:#7c3aed;font-size:20px;">💰</span>
           <span style="color:#fff;font-size:15px;margin-left:12px;">Sell your own notes and earn money</span>
         </td>
       </tr>
       <tr>
         <td style="padding:8px 0;">
           <span style="color:#7c3aed;font-size:20px;">🤖</span>
           <span style="color:#fff;font-size:15px;margin-left:12px;">AI-powered summaries on every note</span>
         </td>
       </tr>
     </table>
   `)}
   ${btn('Start Exploring →', BASE_URL)}`,
  userId
);

// =============================================================================
// 3. PURCHASE RECEIPT
// =============================================================================
exports.purchaseEmail = (name, userId, noteTitle, amount, noteId) => wrap(
  `Purchase Confirmed - ${noteTitle}`,
  `<h2 style="color:#fff;margin:0 0 8px;font-size:24px;">Purchase Confirmed! ✅</h2>
   <p style="color:rgba(255,255,255,0.65);margin:0 0 24px;font-size:16px;line-height:1.6;">
     Hi ${name}, your purchase was successful. Here are your order details:
   </p>
   ${card(`
     <table width="100%" cellpadding="0" cellspacing="0">
       ${stat('Note Title', noteTitle)}
       ${stat('Amount Paid', `₹${amount}`)}
       ${stat('Status', '<span style="color:#22c55e;">✓ Paid</span>')}
       ${stat('Date', new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}
     </table>
   `)}
   <p style="color:rgba(255,255,255,0.65);font-size:14px;text-align:center;">
     You can access your note anytime from your dashboard.
   </p>
   ${btn('View My Notes →', `${BASE_URL}/dashboard`)}`,
  userId
);

// =============================================================================
// 4. NEW FOLLOWER NOTIFICATION
// =============================================================================
exports.newFollowerEmail = (name, userId, followerName) => wrap(
  `${followerName} started following you!`,
  `<h2 style="color:#fff;margin:0 0 8px;font-size:24px;">You have a new follower! 🎯</h2>
   <p style="color:rgba(255,255,255,0.65);margin:0 0 24px;font-size:16px;line-height:1.6;">
     Hi ${name}, <strong style="color:#a78bfa;">${followerName}</strong> just started following you
     on Notes Marketplace. They'll be notified every time you upload new notes!
   </p>
   ${card(`
     <div style="text-align:center;padding:16px 0;">
       <div style="width:64px;height:64px;background:linear-gradient(135deg,#7c3aed,#4f46e5);
                   border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
                   font-size:28px;margin-bottom:12px;">
         👤
       </div>
       <p style="color:#fff;font-size:18px;font-weight:700;margin:0;">${followerName}</p>
       <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:4px 0 0;">New Follower</p>
     </div>
   `)}
   <p style="color:rgba(255,255,255,0.55);font-size:14px;text-align:center;">
     Keep uploading great notes to grow your audience! 🚀
   </p>
   ${btn('View My Profile →', `${BASE_URL}/dashboard`)}`,
  userId
);

// =============================================================================
// 5. NEW NOTE FROM FOLLOWED SELLER
// =============================================================================
exports.newNoteAlertEmail = (name, userId, noteTitle, sellerName, noteId, price) => wrap(
  `New Note: ${noteTitle} by ${sellerName}`,
  `<h2 style="color:#fff;margin:0 0 8px;font-size:24px;">New Note Available! 📚</h2>
   <p style="color:rgba(255,255,255,0.65);margin:0 0 24px;font-size:16px;line-height:1.6;">
     Hi ${name}, <strong style="color:#a78bfa;">${sellerName}</strong> — someone you follow —
     just uploaded a new note!
   </p>
   ${card(`
     <table width="100%" cellpadding="0" cellspacing="0">
       ${stat('Note Title', `<span style="color:#a78bfa;">${noteTitle}</span>`)}
       ${stat('By', sellerName)}
       ${stat('Price', price === 0 ? '<span style="color:#22c55e;">FREE</span>' : `₹${price}`)}
     </table>
   `)}
   ${btn('View Note →', `${BASE_URL}/notes/${noteId}`)}`,
  userId
);

// =============================================================================
// 6. PASSWORD RESET
// =============================================================================
exports.passwordResetEmail = (name, otp) => wrap(
  'Password Reset Code',
  `<h2 style="color:#fff;margin:0 0 8px;font-size:24px;">Reset Your Password 🔐</h2>
   <p style="color:rgba(255,255,255,0.65);margin:0 0 24px;font-size:16px;line-height:1.6;">
     Hi ${name}, use the code below to reset your password.
   </p>
   ${card(`
     <p style="color:rgba(255,255,255,0.5);font-size:13px;text-align:center;margin:0 0 16px;">
       YOUR RESET CODE
     </p>
     <div style="text-align:center;font-size:48px;font-weight:800;letter-spacing:12px;color:#f59e0b;">
       ${otp}
     </div>
     <p style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;margin:16px 0 0;">
       ⏰ Expires in 10 minutes
     </p>
   `)}
   <p style="color:rgba(255,255,255,0.45);font-size:13px;text-align:center;">
     If you didn't request a password reset, please ignore this email.
   </p>`
);

// =============================================================================
// 7. CAMPAIGN / MARKETING EMAIL
// =============================================================================
exports.campaignEmail = (name, userId, subject, htmlBody) => wrap(
  subject,
  `<h2 style="color:#fff;margin:0 0 16px;font-size:24px;">Hi ${name}! 👋</h2>
   <div style="color:rgba(255,255,255,0.75);font-size:15px;line-height:1.8;">
     ${htmlBody}
   </div>
   ${btn('Visit Notes Marketplace →', BASE_URL)}`,
  userId
);
