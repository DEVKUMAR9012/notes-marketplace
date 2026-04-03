# 📚 Notes Marketplace

A blazing-fast, modern, and beautiful full-stack web application designed for students and educators to easily buy, sell, and discover academic notes.

![Notes Marketplace Cover](https://via.placeholder.com/1000x500.png?text=Notes+Marketplace+-+Next+Gen+Academic+Store)

## ✨ Features

- **Dynamic UI/UX** - Gorgeous dark-themed glassmorphism interface built with TailwindCSS and Framer Motion.
- **Secure Authentication** - Full 2-step registration with email OTP verification. Forgot/Reset password flows included.
- **Integrated Payments** - Frictionless checkout with Razorpay integration.
- **AI-Powered Summaries** - Automatic AI-generated summaries for uploaded notes using Google Gemini 2.5 Flash, helping buyers preview document content instantly!
- **PDF Previews & Downloads** - Secure preview capabilities and access-controlled PDF viewing post-purchase.
- **Interactive Dashboards** - User profiles showing purchased items, uploaded notes, and lifetime earnings.

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI Library
- **TailwindCSS** - Styling & responsive design
- **Framer Motion** - Fluid micro-animations & layout transitions
- **React Router** - Client-side routing

### Backend
- **Node.js & Express.js** - Highly scalable REST API
- **MongoDB & Mongoose** - Document database
- **Google Gemini AI** - Auto-generating document summaries
- **Nodemailer** - SMTP integrations for OTPs
- **Razorpay API** - Payment processing gateway
- **Cloudinary** - Image and file hosting

## 🚀 Quick Setup & Local Development

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/notes-marketplace.git
cd notes-marketplace
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory with the following credentials:
```env
MONGO_URI=your_mongodb_uri
PORT=5000
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_SECRET=your_razorpay_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_gmail
SMTP_PASS=your_gmail_app_password
FROM_EMAIL=your_gmail
FROM_NAME="Notes Marketplace"
GEMINI_API_KEY=your_gemini_api_key
```

Run the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Start the local development server:
```bash
npm start
```

## 📸 Screenshots

*(Replace these with actual screenshots of your application!)*

| Home Page | AI Note Reading |
|---|---|
| ![Home](https://via.placeholder.com/500x300.png?text=Home+Page) | ![AI Features](https://via.placeholder.com/500x300.png?text=AI+Summaries) |

---
*Developed with ❤️ as a modern project to revolutionize student note sharing.*
