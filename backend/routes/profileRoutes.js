const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getProfile, updateProfile, getWallet } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// Multer config for profile images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/profiles';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.get('/me', protect, getProfile);
router.put('/update', protect, upload.single('profileImage'), updateProfile);
router.get('/wallet', protect, getWallet);

const { toggleCartItem, toggleWishlistItem, toggleFollow } = require('../controllers/profileController');
router.post('/cart/toggle', protect, toggleCartItem);
router.post('/wishlist/toggle', protect, toggleWishlistItem);
router.post('/follow/toggle', protect, toggleFollow);

module.exports = router;