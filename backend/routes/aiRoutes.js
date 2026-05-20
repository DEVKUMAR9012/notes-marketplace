// ============================================================
// 🤖 aiRoutes.js — AI Study Assistant Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const {
  summarizeNotes,
  uploadPDF,
  chatWithPDF,
  getPDFList,
  deletePDF,
  generateQuiz,
  evaluateQuiz,
  solveDoubt,
} = require('../controllers/aiController');

// ── Middleware: User must be authenticated ──
router.use(protect);

// ═══════════════════════════════════════════════════════════════
// 1️⃣ NOTE SUMMARIZER ROUTES
// ═══════════════════════════════════════════════════════════════
router.post('/summarize', summarizeNotes);

// ═══════════════════════════════════════════════════════════════
// 2️⃣ PDF CHAT (RAG) ROUTES
// ═══════════════════════════════════════════════════════════════
router.post('/pdf/upload', upload.single('pdf'), uploadPDF);
router.get('/pdf/list', getPDFList);
router.post('/pdf/chat', chatWithPDF);
router.delete('/pdf/:pdfId', deletePDF);

// ═══════════════════════════════════════════════════════════════
// 3️⃣ QUIZ GENERATOR ROUTES
// ═══════════════════════════════════════════════════════════════
router.post('/quiz/generate', generateQuiz);
router.post('/quiz/evaluate', evaluateQuiz);

// ═══════════════════════════════════════════════════════════════
// 4️⃣ DOUBT SOLVER ROUTE
// ═══════════════════════════════════════════════════════════════
router.post('/doubt', solveDoubt);

module.exports = router;
