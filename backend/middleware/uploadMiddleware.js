const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── Allowed MIME types & their extensions ────────────────────────
const ALLOWED_TYPES = {
  // Documents
  'application/pdf':                                                              'pdf',
  'application/msword':                                                           'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':     'docx',
  // Presentations
  'application/vnd.ms-powerpoint':                                               'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':   'pptx',
  // Spreadsheets
  'application/vnd.ms-excel':                                                    'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':           'xlsx',
  // Images
  'image/jpeg':                                                                  'jpg',
  'image/png':                                                                   'png',
  'image/gif':                                                                   'gif',
  'image/webp':                                                                  'webp',
  // Plain text
  'text/plain':                                                                  'txt',
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname).replace('.', '') || 'bin';
    // Use 'image' resource_type for images, 'raw' for everything else
    const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'raw';
    return {
      folder: 'notes-marketplace',
      resource_type: resourceType,
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. ` +
        'Allowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, PNG, GIF, WEBP, TXT'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

module.exports = upload;