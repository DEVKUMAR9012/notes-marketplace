const Note = require('../models/Note');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const Review = require('../models/Review');
const Question = require('../models/Question');
const { generateAISummary } = require('../utils/aiSummary');

// @desc    Get all notes with filters
// @route   GET /api/notes
// @access  Public
exports.getNotes = async (req, res) => {
  try {
    const { search, semester, subject, college, priceType, itemType } = req.query;

    let query = { isApproved: true };
    
    if (itemType === 'note') {
      // Legacy notes may not have itemType field, so we fetch anything that is NOT a book
      query.itemType = { $ne: 'book' };
    } else if (itemType) {
      query.itemType = itemType;
    }

    if (search) {
      query.$or = [
        { title:   { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } }
      ];
    }

    if (semester) query.semester = Number(semester);
    if (subject)  query.subject  = { $regex: subject, $options: 'i' };
    if (college)  query.college  = { $regex: college, $options: 'i' };

    if (priceType === 'free')  query.price = 0;
    if (priceType === 'paid')  query.price = { $gt: 0 };

    const notes = await Note.find(query)
      .populate('uploadedBy', 'name email college isVerified')
      .sort('-createdAt')
      .lean();

    // ✅ Format for frontend
    const formattedNotes = notes.map(note => ({
      ...note,
      sellerName: note.uploadedBy?.name || 'Anonymous',
      reviews:    note.reviews || 0,
      verified:   note.uploadedBy?.isVerified || false
    }));

    res.status(200).json(formattedNotes);

  } catch (error) {
    console.error('Get Notes Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notes',
      error: error.message
    });
  }
};

// @desc    Get single note by ID
// @route   GET /api/notes/:id
// @access  Public
exports.getNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('uploadedBy', 'name email college isVerified');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Increment views
    note.views += 1;
    await note.save();

    res.status(200).json({
      success: true,
      data: note
    });

  } catch (error) {
    console.error('Get Note Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching note',
      error: error.message
    });
  }
};

// @desc    Create new note
// @route   POST /api/notes
// @access  Private
exports.createNote = async (req, res) => {
  try {
    const { title, description, subject, college, semester, price, itemType } = req.body;

    // ✅ Validation
    if (!title || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and subject'
      });
    }

    // ✅ req.user set by protect middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // ✅ Handle uploaded PDF (if using multer)
    const pdfUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const note = await Note.create({
      title,
      description:  description || '',
      itemType:     itemType || 'note',
      subject,
      college:      college || '',
      semester:     semester ? Number(semester) : null,
      price:        Number(price) || 0,
      pdfUrl,
      uploadedBy:   req.user._id,   // ✅ Fixed: was using wrong field name
      isApproved:   true
    });

    // ✅ Populate uploadedBy before sending response
    await note.populate('uploadedBy', 'name email college');

    res.status(201).json({
      success: true,
      message: 'Note uploaded successfully',
      data: note
    });

    // 🤖 Generate AI Summary async (non-blocking, after response sent)
    if (req.file) {
      const absolutePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      generateAISummary(absolutePath, title, subject, itemType || 'note')
        .then(async (summary) => {
          if (summary) {
            await Note.findByIdAndUpdate(note._id, { aiSummary: summary });
            console.log('✅ AI Summary generated for:', title);
          }
        })
        .catch(err => console.error('AI summary background error:', err.message));
    }

  } catch (error) {
    console.error('Create Note Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating note',
      error: error.message
    });
  }
};

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Private
exports.updateNote = async (req, res) => {
  try {
    let note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // ✅ Check ownership
    if (
      note.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this note'
      });
    }

    const { title, description, subject, college, semester, price, itemType } = req.body;

    note = await Note.findByIdAndUpdate(
      req.params.id,
      { title, description, subject, college, semester, price, itemType },
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'name email college');

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: note
    });

  } catch (error) {
    console.error('Update Note Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating note',
      error: error.message
    });
  }
};

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // ✅ Check ownership
    if (
      note.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this note'
      });
    }

    // ✅ Delete PDF file from disk if it exists
    if (note.pdfUrl) {
      const filePath = path.join(__dirname, '..', note.pdfUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await note.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Delete Note Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting note',
      error: error.message
    });
  }
};

// @desc    Get my uploaded notes
// @route   GET /api/notes/my-notes
// @access  Private
exports.getMyNotes = async (req, res) => {
  try {
    const notes = await Note.find({ uploadedBy: req.user._id })
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes
    });

  } catch (error) {
    console.error('Get My Notes Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching your notes',
      error: error.message
    });
  }
};

// @desc    Download note (requires purchase for paid notes)
// @route   GET /api/notes/:id/download
// @access  Private
exports.downloadNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    const user = await User.findById(req.user._id).select('purchasedNotes');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    const isOwner    = note.uploadedBy.toString() === req.user._id.toString();
    const isFree     = note.price === 0;
    const isPurchased = user.purchasedNotes.some(
      id => id.toString() === note._id.toString()
    );

    if (!isFree && !isOwner && !isPurchased) {
      return res.status(403).json({
        success: false,
        message: 'Please purchase this note to download'
      });
    }

    // ✅ Increment downloads
    note.downloads += 1;
    await note.save();

    res.status(200).json({
      success: true,
      pdfUrl: note.pdfUrl
    });

  } catch (error) {
    console.error('Download Note Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while downloading note',
      error: error.message
    });
  }
};

// @desc    Check if user has purchased a note
// @route   GET /api/notes/:id/check-purchase
// @access  Private
exports.checkPurchase = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    const user = await User.findById(req.user._id).select('purchasedNotes');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    const isOwner     = note.uploadedBy.toString() === req.user._id.toString();
    const isFree      = note.price === 0;
    const isPurchased = user.purchasedNotes.some(
      id => id.toString() === note._id.toString()
    );

    res.status(200).json({
      success: true,
      purchased: isFree || isOwner || isPurchased
    });

  } catch (error) {
    console.error('Check Purchase Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// NOTE: purchaseNote removed — use POST /api/payments/verify (Razorpay) to purchase paid notes.
// This prevents bypassing payment verification.

// ── Reviews ─────────────────────────────────────────────────────────────
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const noteId = req.params.id;
    
    const user = await User.findById(req.user._id);
    const note = await Note.findById(noteId);
    
    if (!note) return res.status(404).json({ message: 'Note not found' });
    
    const isOwner = note.uploadedBy.toString() === req.user._id.toString();
    const isPurchased = user.purchasedNotes.includes(noteId);
    
    if (!isOwner && !isPurchased && note.price > 0) {
      return res.status(403).json({ message: 'Must purchase note to review' });
    }

    const existingReview = await Review.findOne({ note: noteId, user: req.user._id });
    if (existingReview) {
      return res.status(400).json({ message: 'You already reviewed this note' });
    }

    await Review.create({
      user: req.user._id,
      note: noteId,
      rating: Number(rating),
      comment
    });

    const reviews = await Review.find({ note: noteId });
    const avgRating = reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length;
    
    note.rating = avgRating;
    note.numReviews = reviews.length;
    await note.save();

    res.status(201).json({ message: 'Review added' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ note: req.params.id }).populate('user', 'name profileImage');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// ── Q&A ─────────────────────────────────────────────────────────────
exports.addQuestion = async (req, res) => {
  try {
    const { text } = req.body;
    const noteId = req.params.id;
    
    await Question.create({
      user: req.user._id,
      note: noteId,
      text
    });
    
    res.status(201).json({ message: 'Question posted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ note: req.params.id })
      .populate('user', 'name profileImage')
      .populate('answers.user', 'name profileImage');
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.answerQuestion = async (req, res) => {
  try {
    const { text } = req.body;
    const questionId = req.params.qId;
    
    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    
    question.answers.push({
      user: req.user._id,
      text
    });
    
    await question.save();
    res.status(201).json({ message: 'Answer posted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Bulk generate AI summaries for all notes that don't have one
// @route   POST /api/notes/generate-summaries
// @access  Public (temporary, no auth for ease of use)
exports.bulkGenerateAISummaries = async (req, res) => {
  try {
    // Find all notes missing a summary
    const notes = await Note.find({ 
      $or: [{ aiSummary: '' }, { aiSummary: null }, { aiSummary: { $exists: false } }]
    });

    res.status(200).json({ 
      success: true, 
      message: `Starting AI summary generation for ${notes.length} notes. Check server console for progress.`,
      count: notes.length
    });

    // Run async in background
    let done = 0;
    for (const note of notes) {
      try {
        let filePath = null;
        if (note.pdfUrl) {
          filePath = path.join(__dirname, '..', note.pdfUrl.startsWith('/') ? note.pdfUrl.slice(1) : note.pdfUrl);
          if (!require('fs').existsSync(filePath)) filePath = null;
        }

        const summary = await generateAISummary(filePath, note.title, note.subject, note.itemType || 'note');
        if (summary) {
          await Note.findByIdAndUpdate(note._id, { aiSummary: summary });
          done++;
          console.log(`✅ [${done}/${notes.length}] Summarized: ${note.title}`);
        }
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        console.error(`❌ Failed for ${note.title}:`, err.message);
      }
    }
    console.log(`🎉 Bulk AI summary complete! ${done}/${notes.length} notes updated.`);
  } catch (error) {
    console.error('Bulk summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};