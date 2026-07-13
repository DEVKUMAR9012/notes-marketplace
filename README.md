<div align="center">

<img src="./screenshots/Screenshot 2026-07-13 145311.png" alt="Notes Marketplace Banner" width="100%"/>

# Notes Marketplace

**A full-stack platform where students buy, sell, and share academic notes — with AI-powered insights, real-time chat, and a powerful admin dashboard.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payments-3395FF?style=for-the-badge&logo=razorpay)](https://razorpay.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Storage-3448C5?style=for-the-badge&logo=cloudinary)](https://cloudinary.com/)

Live: [noteshere.site](https://noteshere.site) | [Report Bug](https://github.com/DEVKUMAR9012/notes-marketplace/issues) | [Request Feature](https://github.com/DEVKUMAR9012/notes-marketplace/issues)

</div>

---

## Table of Contents

- [Screenshots](#screenshots)
  - [Auth](#auth)
  - [Home](#home)
  - [Explorer](#explorer)
  - [Note Preview](#note-preview)
  - [Upload](#upload)
  - [AI Assistant](#ai-assistant)
  - [Chat](#chat)
  - [Profile](#profile)
  - [Contact](#contact)
  - [Admin Dashboard](#admin-dashboard)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Contributing](#contributing)

---

## Screenshots

### Auth

#### Login Page
Multi-method sign-in: Google OAuth, Guest mode — clean centered card UI.

![Login](<./screenshots/Screenshot 2026-07-13 145137.png>)

---

### Home

#### Home Dashboard
Live stats (317+ notes, 41+ students, 120+ downloads), college category cards with notes, subjects, and contributor counts.

![Home Dashboard](<./screenshots/Screenshot 2026-07-13 145311.png>)

---

### Explorer

#### Notes Grid
Browse and filter notes by college, subject, semester. Cards show AI Summary toggle, price badge, and quick Preview / Add-to-Cart / Save actions.

![Explorer Notes Grid](<./screenshots/Screenshot 2026-07-13 145335.png>)

#### AI Summary Expanded
One click expands the auto-generated Gemini AI summary directly on the note card.

![AI Summary on Card](<./screenshots/Screenshot 2026-07-13 145453.png>)

#### Academic Explorer — Search & Filter
Full-text search with filter tabs: All Notes · Trending · Top Rated · New · Saved.

![Explorer Search](<./screenshots/Screenshot 2026-07-13 150242.png>)

---

### Note Preview

#### PDF Viewer
In-browser PDF rendering with page navigation. Right sidebar shows uploader profile, Follow and Direct Chat buttons, note metadata (subject, semester, college), and rating section.

![Note Preview PDF Viewer](<./screenshots/Screenshot 2026-07-13 145356.png>)

#### Reviews and Ratings
Read community reviews and submit your own star rating and comment.

![Note Reviews](<./screenshots/Screenshot 2026-07-13 145504.png>)

---

### Upload

#### Upload a Note
Drag and drop PDF / DOCX / PPT upload with subject, college, and semester fields. AI summary is auto-generated on publish.

![Upload Note](<./screenshots/Screenshot 2026-07-13 145532.png>)

#### Publish a Book
Separate flow for uploading textbooks and reference books with genre and category selection.

![Upload Book](<./screenshots/Screenshot 2026-07-13 145522.png>)

---

### AI Assistant

#### DEVAI — Gemini Powered Chat
Upload a PDF or query from My Notes. Get detailed structured answers. Summarize Mode available.

![AI Assistant](<./screenshots/Screenshot 2026-07-13 145649.png>)

---

### Chat

#### Conversations
Socket.io powered 1-on-1 messaging. Conversation list, emoji reactions, quick reply chips (Is this available? Share sample. Discuss price).

![Real-time Chat](<./screenshots/Screenshot 2026-07-13 145718.png>)

#### PDF File Sharing in Chat
Share PDFs directly in chat with inline preview and download buttons.

![Chat File Sharing](<./screenshots/Screenshot 2026-07-13 145735.png>)

#### User Info Panel
View any user's profile, followers, rating, and uploaded notes from a chat sidebar.

![Chat User Info](<./screenshots/Screenshot 2026-07-13 150406.png>)

---

### Profile

#### User Profile Header
Cover banner, avatar, Verified / Active / Student badges, star count, college, social links.

![User Profile](<./screenshots/Screenshot 2026-07-13 145929.png>)

#### Uploaded Notes Tab
View all uploaded notes with download counts. Tabs for Purchased, Wishlist, Activity, and Wallet.

![Profile Uploads](<./screenshots/Screenshot 2026-07-13 145940.png>)

---

### Contact

#### Contact and Support Page
Issue search bar, contact form, and support info (email, phone, address).

![Contact Page](<./screenshots/Screenshot 2026-07-13 145755.png>)

---

### Admin Dashboard

#### Overview
Real-time metrics: Total Users (271), Notes Uploaded (323), Platform Revenue. Revenue Snapshot and Quick Actions.

![Admin Overview](<./screenshots/Screenshot 2026-07-13 145845.png>)

#### User Security and Session Details
Per-user modal: User ID, join date, last login, wallet balance, status, IP address, location, browser info. Block, Force Reset Password, View Purchases actions.

![Admin User Security](<./screenshots/Screenshot 2026-07-13 150636.png>)

#### Support and Reports — User Reports
Handle abuse reports and flags. Take Action / Resolve / Dismiss controls per report.

![Admin User Reports](<./screenshots/Screenshot 2026-07-13 150654.png>)

#### Support and Reports — Contact Messages
View and reply to contact form messages directly from the dashboard via email.

![Admin Contact Messages](<./screenshots/Screenshot 2026-07-13 150701.png>)

#### Live Chat Monitor
Read-only view of all platform conversations. Search users, inspect messages, delete chats.

![Admin Live Chats](<./screenshots/Screenshot 2026-07-13 150729.png>)

#### Elite Bulk Uploader
Admin-only: Upload up to 500 PDFs at once with SHA-256 dedup, chunked pipeline, and smart detection.

![Admin Bulk Upload](<./screenshots/Screenshot 2026-07-13 150737.png>)

---

## Features

| Category | Features |
|---|---|
| Auth | Email + OTP, Google OAuth, GitHub OAuth, Guest mode, JWT |
| Explorer | Search, filter by college / subject / semester / price, Trending / Top Rated / New / Saved tabs |
| PDF Viewer | In-browser page-by-page rendering, paywall for paid notes |
| AI | Auto Gemini summary on every note, DEVAI chat with PDF context, Summarize Mode |
| Payments | Razorpay cart and checkout, wallet system, withdrawal |
| Chat | Socket.io 1-on-1 messaging, emoji reactions, PDF sharing, user info panel |
| Profile | Cover banner, badges, social links, uploaded / purchased / wishlist / wallet tabs |
| Admin | User management, session tracking, notes moderation, live chat monitor, support and reports, bulk upload, email dashboard, broadcast banners |
| Upload | Notes and books (PDF / DOCX / PPT), drag and drop, auto AI summary |
| Contact | Issue search, contact form, support info |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Framer Motion, Zustand |
| Styling | Tailwind CSS, Custom CSS, Glassmorphism |
| PDF | pdfjs-dist |
| Real-time | Socket.io |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT, Google OAuth, OTP via Email |
| Storage | Cloudinary |
| Payments | Razorpay |
| AI | Google Gemini API |
| Email | Nodemailer, Resend |
| Charts | Recharts |

---

## Getting Started

### 1. Clone the repo
`
git clone https://github.com/DEVKUMAR9012/notes-marketplace.git
cd notes-marketplace
`

### 2. Backend Setup
`
cd backend
npm install
`

Create backend/.env:
`
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GEMINI_API_KEY=xxx
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
`

`
npm run dev
`

### 3. Frontend Setup
`
cd frontend
npm install
`

Create frontend/.env:
`
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxx
REACT_APP_GOOGLE_CLIENT_ID=xxx
`

`
npm start
`

---

## Project Structure

`
notes-marketplace/
├── frontend/src/
│   ├── pages/          # Home, Explorer, NotePreviewPage, Upload, Profile, Chat, AI, AdminDashboard, Contact, Login
│   ├── components/     # Navbar, BuyModal, ProtectedRoute, Toast...
│   ├── context/        # AuthContext, CartContext, SocketContext
│   ├── store/          # Zustand (adminStore)
│   └── utils/          # api.js, downloadPdf.js
│
└── backend/
    ├── controllers/    # noteController, authController, paymentController, adminController
    ├── models/         # User, Note, Review, Message, Transaction, AIChat, Withdrawal
    ├── routes/         # /api/notes, /api/auth, /api/payments, /api/admin, /api/profile
    ├── middleware/     # protect, adminOnly, upload
    ├── utils/          # aiSummary, sendEmail, emailTemplates
    └── server.js       # Express + Socket.io entry point
`

---

## User Roles

| Role | Permissions |
|---|---|
| user | Browse, buy, chat, use AI, review |
| seller | All above plus upload and sell notes |
| admin | Full dashboard: manage users, notes, transactions, chats, reports, bulk upload |

---

## Contributing

1. Fork the project
2. Create your branch: git checkout -b feature/MyFeature
3. Commit: git commit -m 'feat: add MyFeature'
4. Push: git push origin feature/MyFeature
5. Open a Pull Request

---

## License

Open source under the [MIT License](LICENSE).

---

<div align="center">

Made with heart by [Dev Kumar](https://github.com/DEVKUMAR9012)

Star this repo if you found it helpful!

</div>
