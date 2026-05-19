const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ ERROR: Missing Cloudinary credentials. Check your .env file.');
  console.error('Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

// ── Admin-Specific Cloudinary Storage ─────────────────────────────────────────
// We use 'raw' resource_type for PDFs to handle larger sizes/academic docs
const adminStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = 'pdf'; 
    const publicId = `bulk_${crypto.randomBytes(8).toString('hex')}_${Date.now()}.${ext}`;
    console.log(`📤 Uploading to Cloudinary: ${file.originalname} -> ${publicId}`);
    
    return {
      folder: 'admin-bulk-uploads',
      resource_type: 'raw',
      public_id: publicId,
      allowed_formats: ['pdf'],
    };
  },
});

const adminBulkUpload = multer({
  storage: adminStorage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB per file (Admin Superpower)
    files: 500                   // Up to 500 files in one batch
  },
  fileFilter: (req, file, cb) => {
    // Allow both standard PDF mimetype and fallback
    const allowedMimes = ['application/pdf', 'application/x-pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      console.error(`❌ Rejected file: ${file.originalname} (mimetype: ${file.mimetype})`);
      return cb(new Error('Admin Bulk Upload only supports PDF files for integrity.'), false);
    }
    console.log(`✅ Accepted file: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    cb(null, true);
  }
});

module.exports = adminBulkUpload;
