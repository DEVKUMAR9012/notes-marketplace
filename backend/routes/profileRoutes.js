const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { getProfile, getPublicProfile, updateProfile, getWallet } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// ✅ Cloudinary config (uses env vars automatically)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Memory storage — file goes to RAM then straight to Cloudinary (no local disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(file.mimetype) || allowed.test(file.originalname.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  },
});

// ✅ Middleware: upload buffer → Cloudinary, attach result to req
const uploadToCloudinary = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'notes-marketplace/profiles',
          public_id: `user_${req.user.id}_${Date.now()}`,
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
          overwrite: true,
        },
        (err, result) => err ? reject(err) : resolve(result)
      );
      stream.end(req.file.buffer);
    });
    req.cloudinaryUrl = result.secure_url; // ✅ Pass URL to controller
    next();
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    return res.status(500).json({ message: 'Image upload failed' });
  }
};

router.get('/me', protect, getProfile);
router.get('/:id', protect, getPublicProfile);
router.put('/update', protect, upload.single('profileImage'), uploadToCloudinary, updateProfile);
router.get('/wallet', protect, getWallet);

const { toggleCartItem, toggleWishlistItem, toggleFollow } = require('../controllers/profileController');
router.post('/cart/toggle', protect, toggleCartItem);
router.post('/wishlist/toggle', protect, toggleWishlistItem);
router.post('/follow/toggle', protect, toggleFollow);

module.exports = router;