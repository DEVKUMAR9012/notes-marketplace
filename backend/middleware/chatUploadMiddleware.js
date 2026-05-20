const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    const isAudio = file.mimetype.startsWith('audio/') || file.originalname.endsWith('.webm') || file.originalname.endsWith('.mp3');
    return {
      folder: 'chat-files',
      resource_type: isImage ? 'image' : (isAudio ? 'video' : 'raw'),
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'webm', 'mp3', 'wav', 'ogg', 'mpeg'],
      transformation: isImage ? [{ width: 1200, quality: 'auto' }] : undefined,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'audio/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/webm'
  ];
  if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) cb(null, true);
  else cb(new Error('Invalid file format. Allowed: Images, Docs, PDFs, and Audio.'), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});
