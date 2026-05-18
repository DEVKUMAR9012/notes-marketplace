const Note = require('../models/Note');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

const logAction = async (adminId, adminName, action, targetType, targetId, details) => {
  try {
    await AuditLog.create({ admin: adminId, adminName, action, targetType, targetId, details });
  } catch (err) { console.error('Audit Log Error:', err); }
};

/**
 * @desc    Enhanced Bulk upload with detailed error reporting & duplicate detection
 * @route   POST /api/admin/bulk-upload
 */
exports.bulkUploadNotes = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const { subject, semester, college, itemType = 'note', metadata = '{}' } = req.body;
    let customMetadata = {};
    try { customMetadata = JSON.parse(metadata); } catch (e) { console.warn('Meta parse error:', e.message); }

    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      successFiles: [],
      failedFiles: [],
      duplicateFiles: []
    };

    for (const file of req.files) {
      try {
        // ✅ Robust hash lookup — multiple fallbacks
        const fileMeta = 
          customMetadata[file.originalname] ||
          customMetadata[file.originalname.trim()] ||
          customMetadata[file.originalname.trim().toLowerCase()] ||
          {};

        const hash = fileMeta.hash || fileMeta.Hash || null;

        // Duplicate check sirf tab karo jab hash mile
        if (hash) {
          const existing = await Note.findOne({ fileHash: hash });
          if (existing) {
            results.duplicates++;
            results.duplicateFiles.push({ name: file.originalname, hash });
            continue;
          }
        }

        // ✅ Better Cloudinary URL handling with validation
        const pdfUrl = file.secure_url || file.path || file.url;
        if (!pdfUrl) {
          throw new Error('No valid URL returned from Cloudinary');
        }
        
        const title = fileMeta.title || fileMeta.Title ||
          file.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        
        console.log(`Processing: ${file.originalname} -> ${pdfUrl}`);

        const noteData = {
          title,
          subject: fileMeta.subject || fileMeta.Subject || subject || 'Uncategorized',
          semester: fileMeta.semester ? Number(fileMeta.semester) : semester ? Number(semester) : null,
          college: fileMeta.college || fileMeta.College || college || '',
          itemType: fileMeta.itemType || fileMeta.ItemType || itemType,
          price: 0,
          pdfUrl,
          fileHash: hash,
          fileSize: file.size || 0,
          uploadedBy: req.user._id,
          status: 'approved',
        };
        
        // Validate required fields before creation
        if (!noteData.title || !noteData.subject || !noteData.pdfUrl) {
          throw new Error('Missing required fields: title, subject, or pdfUrl');
        }
        
        await Note.create(noteData);

        results.success++;
        results.successFiles.push({ name: file.originalname });

      } catch (err) {
        console.error(`Failed ${file.originalname}:`, err.message, err.stack);
        results.failed++;
        results.failedFiles.push({ name: file.originalname, error: err.message });
      }
    }

    await logAction(
      req.user._id, req.user.name,
      'BULK_UPLOAD_COMPLETED', 'AdminAction',
      req.user._id, 
      { success: results.success, failed: results.failed, duplicates: results.duplicates }
    );

    res.status(201).json({
      success: true,
      message: `Batch processed: ${results.success} Success, ${results.duplicates} Duplicates, ${results.failed} Failed.`,
      stats: results
    });

  } catch (error) {
    console.error('Bulk Upload Engine Failure:', error);
    console.error('Error stack:', error.stack);
    console.error('Request files count:', req.files?.length || 0);
    console.error('Request body keys:', Object.keys(req.body));
    
    res.status(500).json({ 
      success: false, 
      message: 'Bulk upload engine failure', 
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

/**
 * @desc    Check which hashes already exist in the DB
 * @route   POST /api/admin/check-duplicates
 */
exports.checkDuplicates = async (req, res) => {
  try {
    const { hashes } = req.body; // Array of hashes
    if (!hashes || !Array.isArray(hashes)) {
      return res.status(400).json({ success: false, message: 'Invalid hashes array' });
    }

    const existingNotes = await Note.find({ fileHash: { $in: hashes } }).select('fileHash title');
    const existingHashes = existingNotes.map(n => n.fileHash);

    res.json({
      success: true,
      existingHashes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
