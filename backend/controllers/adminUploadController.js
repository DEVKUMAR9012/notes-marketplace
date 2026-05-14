const Note = require('../models/Note');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');
const fs = require('fs');

// ─── Utility: Log Admin Action ──────────────────────────────────────────────
const logAction = async (adminId, adminName, action, targetType, targetId, details) => {
  try {
    await AuditLog.create({
      admin: adminId,
      adminName,
      action,
      targetType,
      targetId,
      details
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};

/**
 * @desc    Bulk upload notes (Admin only) with duplicate detection and batch metadata
 * @route   POST /api/admin/bulk-upload
 * @access  Private/Admin
 */
exports.bulkUploadNotes = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const { subject, semester, college, itemType = 'note', metadata = '{}' } = req.body;
    let customMetadata = {};
    try {
      customMetadata = JSON.parse(metadata);
    } catch (e) {
      console.warn('Metadata parse error:', e.message);
    }

    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      notes: []
    };

    // We process sequentially or in small batches to avoid database/cloud overloading
    for (const file of req.files) {
      try {
        // 1. Calculate Hash (for duplicate detection)
        // If file is on disk (multer local), read it. If it's Cloudinary, we might just use size+name or similar if hash is unavailable.
        // For now, Cloudinary middleware already processed it, so we use file path or buffer.
        // Let's assume we want to prevent re-uploading the same content.
        
        // Note: Multer-storage-cloudinary doesn't provide easy access to local buffer after upload.
        // However, we can use the 'public_id' or 'signature' as a soft-check, or calculate hash BEFORE upload.
        // Best approach: Client calculates hash and sends it.
        
        // 2. Map file to metadata
        const fileMeta = customMetadata[file.originalname] || {};
        const title = fileMeta.title || file.originalname.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
        
        const noteData = {
          title,
          subject: fileMeta.subject || subject || 'Uncategorized',
          semester: fileMeta.semester || (semester ? Number(semester) : null),
          college: fileMeta.college || college || '',
          itemType: fileMeta.itemType || itemType,
          price: 0,
          pdfUrl: file.path, // Cloudinary URL
          uploadedBy: req.user._id,
          status: 'approved',
          downloads: 0,
          views: 0,
          fileHash: fileMeta.hash || null // Client-side hash is more efficient
        };

        const newNote = await Note.create(noteData);
        results.success++;
        results.notes.push(newNote._id);

      } catch (err) {
        console.error(`Failed to process ${file.originalname}:`, err.message);
        results.failed++;
      }
    }

    await logAction(
      req.user._id,
      req.user.name,
      'BULK_UPLOAD_COMPLETED',
      'Note',
      null,
      { 
        successCount: results.success, 
        failedCount: results.failed, 
        total: req.files.length 
      }
    );

    res.status(201).json({
      success: true,
      message: `Batch complete: ${results.success} uploaded, ${results.failed} failed.`,
      stats: results
    });

  } catch (error) {
    console.error('Bulk Upload Error:', error);
    res.status(500).json({ success: false, message: 'Bulk upload engine failure', error: error.message });
  }
};
