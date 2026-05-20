const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const crypto = require('crypto');
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

const EXTENSION_TO_MIME = Object.entries(ALLOWED_TYPES).reduce((acc, [mime, ext]) => {
  acc[ext] = mime;
  return acc;
}, {});

const resolveMimeType = (file) => {
  if (ALLOWED_TYPES[file.mimetype]) return file.mimetype;

  const ext = path.extname(file.originalname || '').replace('.', '').toLowerCase();
  return EXTENSION_TO_MIME[ext] || null;
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const resolvedMimeType = resolveMimeType(file);
    const ext = ALLOWED_TYPES[resolvedMimeType] || path.extname(file.originalname).replace('.', '') || 'bin';
    // Use 'image' resource_type for images, 'raw' for everything else
    const resourceType = resolvedMimeType?.startsWith('image/') ? 'image' : 'raw';
    return {
      folder: 'notes-marketplace',
      resource_type: resourceType,
      public_id: `up_${crypto.randomBytes(12).toString('hex')}_${Date.now()}.${ext}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const resolvedMimeType = resolveMimeType(file);
  if (resolvedMimeType) {
    file.normalizedMimeType = resolvedMimeType;
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype || 'unknown'}. ` +
        'Allowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, PNG, GIF, WEBP, TXT'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max for normal users
});

module.exports = upload;
