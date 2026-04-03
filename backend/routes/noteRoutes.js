const express = require('express');
const router = express.Router();
const {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  getMyNotes,
  downloadNote,
  checkPurchase,
  addReview,
  getReviews,
  addQuestion,
  getQuestions,
  answerQuestion,
  bulkGenerateAISummaries
} = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ✅ FIXED: Route ordering - SPECIFIC routes BEFORE dynamic routes!
// This prevents /:id from matching /my-notes

// 1️⃣ SPECIFIC/PROTECTED ROUTES FIRST
router.get('/my-notes', protect, getMyNotes);
router.post('/', protect, upload.single('pdf'), createNote);
router.post('/generate-summaries', bulkGenerateAISummaries); // AI bulk summarizer

// 2️⃣ PUBLIC LIST ROUTE
router.get('/', getNotes);

// 3️⃣ DYNAMIC ROUTES LAST (must come after /my-notes)
router.get('/:id', getNote);
router.get('/:id/download', protect, downloadNote);
router.get('/:id/check-purchase', protect, checkPurchase);
// Note: purchase is handled by POST /api/payments/verify (Razorpay verified)
router.put('/:id', protect, updateNote);
router.delete('/:id', protect, deleteNote);

router.post('/:id/reviews', protect, addReview);
router.get('/:id/reviews', getReviews);

router.post('/:id/questions', protect, addQuestion);
router.get('/:id/questions', getQuestions);
router.post('/:id/questions/:qId/answers', protect, answerQuestion);

module.exports = router;