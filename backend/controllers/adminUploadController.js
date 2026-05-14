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
    try { customMetadata = JSON.parse(metadata); } catch (e) { console.warn('Meta parse error'); }

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
        const fileMeta = customMetadata[file.originalname] || {};
        const hash = fileMeta.hash || null;

        // 1. DUPLICATE CHECK (By Hash)
        if (!hash) {
          throw new Error("Missing fileHash from frontend (Duplicate check bypassed)");
        }
        
        const existing = await Note.findOne({ fileHash: hash });
        if (existing) {
          results.duplicates++;
          results.duplicateFiles.push({ name: file.originalname, hash });
          continue; // Skip this file
        }

        // 2. DATA PREP
        const title = fileMeta.title || file.originalname.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
        
        const noteData = {
          title,
          subject: fileMeta.subject || subject || 'Uncategorized',
          semester: (fileMeta.semester ? Number(fileMeta.semester) : null) || (semester ? Number(semester) : null),
          college: fileMeta.college || college || '',
          itemType: fileMeta.itemType || itemType,
          price: 0,
          pdfUrl: file.secure_url || file.path, 
          uploadedBy: req.user._id,
          status: 'approved',
          fileHash: hash
        };

        // 3. SAVE
        const newNote = await Note.create(noteData);
        results.success++;
        results.successFiles.push({ id: newNote._id, name: file.originalname });

      } catch (err) {
        console.error(`Failed ${file.originalname}:`, err.message);
        results.failed++;
        results.failedFiles.push({ name: file.originalname, error: err.message });
      }
    }

    await logAction(
      req.user._id, req.user.name, 'BULK_UPLOAD_COMPLETED', 'Note', null,
      { success: results.success, failed: results.failed, duplicates: results.duplicates }
    );

    res.status(201).json({
      success: true,
      message: `Batch processed: ${results.success} Success, ${results.duplicates} Duplicates, ${results.failed} Failed.`,
      stats: results
    });

  } catch (error) {
    console.error('Bulk Upload Error:', error);
    res.status(500).json({ success: false, message: 'Bulk upload engine failure', error: error.message });
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
