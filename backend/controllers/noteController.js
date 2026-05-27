const Note = require('../models/Note');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const Review = require('../models/Review');
const Question = require('../models/Question');
const { generateAISummary } = require('../utils/aiSummary');
const sendEmail = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');

// @desc    Get category stats for university and school sections
// @route   GET /api/notes/category-stats
// @access  Public
exports.getCategoryStats = async (req, res) => {
  try {
    const allApprovedNotes = await Note.find({ status: 'approved' }).populate('uploadedBy', 'name');
    
    // Define our categories (match what's on frontend)
    const universityCategories = [
      { id: 'dei', filterType: 'college', filterValue: 'DEI Dayalbagh', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
      { id: 'du', filterType: 'college', filterValue: 'Delhi University', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
      { id: 'jnu', filterType: 'college', filterValue: 'JNU New Delhi', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
      { id: 'btech', filterType: 'search', filterValue: 'B.Tech', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
      { id: 'cs', filterType: 'search', filterValue: 'Computer', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
      { id: 'gaming', filterType: 'search', filterValue: 'Gaming', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
      { id: 'first_year', filterType: 'search', filterValue: 'First Year', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
    ];
    
    const schoolCategories = [
      { id: '9th', filterType: 'search', filterValue: '9th', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
      { id: '10th', filterType: 'search', filterValue: '10th', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
      { id: '11th', filterType: 'search', filterValue: '11th', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
      { id: '12th', filterType: 'search', filterValue: '12th', notesCount: 0, _subjects: new Set(), _contributors: new Set() },
    ];
    
    // Process all notes to count
    allApprovedNotes.forEach(note => {
      // Check university categories
      universityCategories.forEach(cat => {
        let match = false;
        const collegeName = note.college?.toLowerCase() || '';
        const titleText = note.title?.toLowerCase() || '';
        const subjectText = note.subject?.toLowerCase() || '';
        
        if (cat.filterType === 'college') {
          if (cat.id === 'dei') {
            match = collegeName.includes('dei') || collegeName.includes('dayalbagh');
          } else if (cat.id === 'du') {
            match = collegeName.includes('du') || collegeName.includes('delhi university');
          } else if (cat.id === 'jnu') {
            match = collegeName.includes('jnu') || collegeName.includes('jawaharlal');
          } else {
            match = collegeName.includes(cat.filterValue.toLowerCase());
          }
        } else if (cat.filterType === 'search') {
          if (cat.id === 'btech') {
            match = titleText.includes('b.tech') || titleText.includes('btech') ||
                    subjectText.includes('b.tech') || subjectText.includes('btech') ||
                    collegeName.includes('b.tech') || collegeName.includes('btech');
          } else if (cat.id === 'cs') {
            match = titleText.includes('computer') || titleText.includes('cs') ||
                    subjectText.includes('computer') || subjectText.includes('cs') ||
                    collegeName.includes('computer') || collegeName.includes('cs');
          } else if (cat.id === 'gaming') {
            match = titleText.includes('gaming') || subjectText.includes('gaming') || collegeName.includes('gaming');
          } else if (cat.id === 'first_year') {
            match = titleText.includes('first year') || titleText.includes('1st year') || titleText.includes('sem 1') || titleText.includes('sem 2') ||
                    subjectText.includes('first year') || subjectText.includes('1st year') || subjectText.includes('sem 1') || subjectText.includes('sem 2') ||
                    collegeName.includes('first year') || collegeName.includes('1st year');
          } else {
            const searchStr = cat.filterValue.toLowerCase();
            match = titleText.includes(searchStr) || subjectText.includes(searchStr) || collegeName.includes(searchStr);
          }
        }
        
        if (match) {
          cat.notesCount++;
          if (note.subject) cat._subjects.add(note.subject.toLowerCase().trim());
          if (note.uploadedBy?._id) cat._contributors.add(note.uploadedBy._id.toString());
        }
      });
      
      // Check school categories
      schoolCategories.forEach(cat => {
        const titleText = note.title?.toLowerCase() || '';
        const subjectText = note.subject?.toLowerCase() || '';
        const collegeName = note.college?.toLowerCase() || '';
        
        let match = false;
        if (cat.id === '9th') {
          match = titleText.includes('9th') || titleText.includes('class 9') || subjectText.includes('9th') || collegeName.includes('9th');
        } else if (cat.id === '10th') {
          match = titleText.includes('10th') || titleText.includes('class 10') || subjectText.includes('10th') || collegeName.includes('10th');
        } else if (cat.id === '11th') {
          match = titleText.includes('11th') || titleText.includes('class 11') || subjectText.includes('11th') || collegeName.includes('11th');
        } else if (cat.id === '12th') {
          match = titleText.includes('12th') || titleText.includes('class 12') || subjectText.includes('12th') || collegeName.includes('12th');
        } else {
          const searchStr = cat.filterValue.toLowerCase();
          match = titleText.includes(searchStr) || subjectText.includes(searchStr) || collegeName.includes(searchStr);
        }
        
        if (match) {
          cat.notesCount++;
          if (note.subject) cat._subjects.add(note.subject.toLowerCase().trim());
          if (note.uploadedBy?._id) cat._contributors.add(note.uploadedBy._id.toString());
        }
      });
    });
    
    const formattedUniversityCategories = universityCategories.map(cat => ({
      id: cat.id, filterType: cat.filterType, filterValue: cat.filterValue,
      notesCount: cat.notesCount,
      subjectsCount: cat._subjects.size,
      contributorsCount: cat._contributors.size
    }));
    
    const formattedSchoolCategories = schoolCategories.map(cat => ({
      id: cat.id, filterType: cat.filterType, filterValue: cat.filterValue,
      notesCount: cat.notesCount,
      subjectsCount: cat._subjects.size,
      contributorsCount: cat._contributors.size
    }));
    
    res.json({
      success: true,
      universityCategories: formattedUniversityCategories,
      schoolCategories: formattedSchoolCategories
    });
  } catch (error) {
    console.error('Category Stats Error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch category stats' });
  }
};

// @desc    Public platform stats (no auth) — used by home page stats bar
// @route   GET /api/notes/stats
// @access  Public
exports.getPublicStats = async (req, res) => {
  try {
    const [totalNotes, totalStudents, downloadsAgg, ratingAgg] = await Promise.all([
      // Approved notes count
      Note.countDocuments({ status: 'approved' }),
      // Real students (exclude admin & guest)
      User.countDocuments({ role: { $nin: ['admin'] }, isGuest: { $ne: true } }),
      // Sum of all downloads across all notes
      Note.aggregate([{ $group: { _id: null, total: { $sum: '$downloads' } } }]),
      // Average rating across all rated notes
      Note.aggregate([
        { $match: { rating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ])
    ]);

    const totalDownloads = downloadsAgg[0]?.total || 0;
    const avgRating      = ratingAgg[0]?.avg ? parseFloat(ratingAgg[0].avg.toFixed(1)) : 4.8;

    res.json({
      success: true,
      stats: {
        totalNotes,
        totalStudents,
        totalDownloads,
        avgRating
      }
    });
  } catch (error) {
    console.error('Public Stats Error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch stats' });
  }
};


// @desc    Get notes with filters + server-side pagination
// @route   GET /api/notes?page=1&limit=12&search=&semester=&subject=&priceType=&itemType=
// @access  Public
exports.getNotes = async (req, res) => {
  try {
    const { search, semester, subject, college, priceType, itemType } = req.query;
    
    // ── Pagination ──────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12); // max 50 per request
    const skip  = (page - 1) * limit;

    let query = { status: 'approved' };
    
    if (itemType === 'note') {
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
    if (college) {
      const collegeLower = college.toLowerCase().trim();
      if (collegeLower === 'dei' || collegeLower === 'dei dayalbagh') {
        query.college = { $regex: '^(dei|dayalbagh)', $options: 'i' };
      } else if (collegeLower === 'du' || collegeLower === 'delhi university') {
        query.college = { $regex: '^(du|delhi university)', $options: 'i' };
      } else if (collegeLower === 'jnu' || collegeLower === 'jnu new delhi') {
        query.college = { $regex: '^(jnu|jawaharlal)', $options: 'i' };
      } else {
        query.college = { $regex: college, $options: 'i' };
      }
    }

    if (priceType === 'free')  query.price = 0;
    if (priceType === 'paid')  query.price = { $gt: 0 };

    // Run query + count in parallel
    const [notes, totalCount] = await Promise.all([
      Note.find(query)
        .populate('uploadedBy', 'name email college isVerified')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Note.countDocuments(query)
    ]);

    const formattedNotes = notes.map(note => ({
      ...note,
      sellerName: note.uploadedBy?.name || 'Anonymous',
      reviews:    note.reviews || 0,
      verified:   note.uploadedBy?.isVerified || false
    }));

    res.status(200).json({
      notes: formattedNotes,
      pagination: {
        total:      totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore:    page * limit < totalCount
      }
    });

  } catch (error) {
    console.error('Get Notes Error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching notes', error: error.message });
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
    const { title, description, subject, college, semester, price, itemType, fileHash } = req.body;

    // ✅ Validation
    if (!title || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and subject'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please attach a file before uploading.'
      });
    }

    // ✅ Duplicate check using fileHash
    if (fileHash) {
      const existing = await Note.findOne({ fileHash });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Duplicate file detected. This file has already been uploaded to the marketplace.'
        });
      }
    }

    // ✅ req.user set by protect middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // ✅ Handle uploaded PDF from Cloudinary
    const pdfUrl = req.file.path;

    const note = await Note.create({
      title,
      description:  description || '',
      itemType:     itemType || 'note',
      subject,
      college:      college || '',
      semester:     semester ? Number(semester) : null,
      price:        Number(price) || 0,
      pdfUrl,
      fileHash,
      uploadedBy:   req.user._id,   // ✅ Fixed: was using wrong field name
      status:       'approved'
    });

    // ✅ Populate uploadedBy before sending response
    await note.populate('uploadedBy', 'name email college');

    // ✅ Grant +1 Star for uploading a note
    await User.findByIdAndUpdate(req.user._id, { $inc: { stars: 1 } });

    res.status(201).json({
      success: true,
      message: 'Note uploaded successfully',
      data: note
    });

    // 🤖 Generate AI Summary async (non-blocking, after response sent)
    if (pdfUrl) {
      generateAISummary(pdfUrl, title, subject, itemType || 'note')
        .then(async (summary) => {
          if (summary) {
            await Note.findByIdAndUpdate(note._id, { aiSummary: summary });
            console.log('✅ AI Summary generated for:', title);
          }
        })
        .catch(err => console.error('AI summary background error:', err.message));
    }

    // 📧 Notify all followers of this seller (fire-and-forget)
    User.findById(req.user._id)
      .select('name followers')
      .populate('followers', 'name email _id emailSubscribed')
      .then(async (seller) => {
        if (!seller || !seller.followers.length) return;
        const subscribers = seller.followers.filter(f => f.emailSubscribed !== false);
        for (const follower of subscribers) {
          await sendEmail({
            email: follower.email,
            subject: `📚 New Note by ${seller.name}: ${title}`,
            html: templates.newNoteAlertEmail(
              follower.name,
              follower._id.toString(),
              title,
              seller.name,
              note._id.toString(),
              Number(price) || 0
            ),
            type: 'note_alert'
          });
        }
        console.log(`📧 Notified ${subscribers.length} follower(s) about new note: ${title}`);
      })
      .catch(err => console.error('Follower notification error:', err.message));

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

    // ✅ Grant +3 Stars for downloading, if not already downloaded
    const userDoc = await User.findById(req.user._id);
    if (userDoc && !userDoc.downloadedNotes.includes(note._id)) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { stars: 3 },
        $push: { downloadedNotes: note._id }
      });
    }

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
        const summary = await generateAISummary(note.pdfUrl, note.title, note.subject, note.itemType || 'note');
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
