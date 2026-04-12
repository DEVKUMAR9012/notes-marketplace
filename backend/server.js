const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ========== CORS CONFIGURATION ========== ⭐ UPDATED
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://notes-marketplace-rho.vercel.app'  // ⭐ ADD YOUR VERCEL URL
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));  // ⭐ Use configured CORS

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
app.listen(5000, () => console.log('Server running on port 5000'));