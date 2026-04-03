const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ========== IMPORT ROUTES ==========
const authRoutes = require('./routes/authRoutes');  // ✅ authRoutes.js hai // 👈 YEH SAHI TARIKA HAI

// ========== MIDDLEWARE ==========
app.use(cors());
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

// Note model now in models/Note.js - server.js schema removed

// Old notes routes removed - now using noteRoutes.js

// ========== CREATE UPLOADS FOLDER ==========
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
  console.log('Uploads folder created');
}

// ========== START SERVER ==========
app.listen(5000, () => console.log('Server running on port 5000'));