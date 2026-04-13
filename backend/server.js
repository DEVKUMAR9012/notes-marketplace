const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ========== CORS CONFIGURATION ==========
const corsOptions = {
  origin: ['http://localhost:3000', 'https://notes-marketplace-rho.vercel.app'],
  credentials: true
};
app.use(cors(corsOptions));

// ========== IMPORT ROUTES ==========
const authRoutes = require('./routes/authRoutes');

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// ========== AUTH ROUTES ==========
app.use('/api/auth', authRoutes);

// ========== NOTE ROUTES ==========
const noteRoutes = require('./routes/noteRoutes');
app.use('/api/notes', noteRoutes);

// ========== PROFILE ROUTES ==========
const profileRoutes = require('./routes/profileRoutes');
app.use('/api/profile', profileRoutes);

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running', timestamp: new Date().toISOString() });
});

// ========== PAYMENT ROUTES ==========
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

// ========== BUNDLE ROUTES ==========
const bundleRoutes = require('./routes/bundleRoutes');
app.use('/api/bundles', bundleRoutes);

// ========== MONGODB CONNECTION ==========
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB error:', err));

// ========== CREATE UPLOADS FOLDER ==========
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
  console.log('Uploads folder created');
}

// ========== START SERVER ==========
// Use process.env.PORT so Render can assign the port dynamically
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));