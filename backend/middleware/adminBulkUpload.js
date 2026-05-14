const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

// ── Admin-Specific Cloudinary Storage ─────────────────────────────────────────
// We use 'raw' resource_type for PDFs to handle larger sizes/academic docs
const adminStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = 'pdf'; 
    return {
      folder: 'admin-bulk-uploads',
      resource_type: 'raw',
      public_id: `bulk_${crypto.randomBytes(8).toString('hex')}_${Date.now()}.${ext}`,
    };
  },
});

const adminBulkUpload = multer({
  storage: adminStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file (Admin Superpower)
    files: 500                   // Up to 500 files in one batch
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Admin Bulk Upload only supports PDF files for integrity.'), false);
    }
    cb(null, true);
  }
});

module.exports = adminBulkUpload;
