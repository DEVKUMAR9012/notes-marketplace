// ============================================================
// 🤖 aiRoutes.js — All AI Feature Routes (7 Features)
// ============================================================

const express = require('express');
const router  = express.Router();
const { protect }           = require('../middleware/authMiddleware');
const upload                = require('../middleware/uploadMiddleware');
const { getKeyHealthStatus } = require('../utils/geminiKeyManager');

const {
  summarizeNotes,
  uploadPDF, chatWithPDF, getPDFList, deletePDF,
  generateQuiz, evaluateQuiz,
  solveDoubt,
  explainCode,
  generateRoadmap,
  interviewPrep,
  saveAIChat, getAIChats, getAIChat
} = require('../controllers/aiController');

// ── All routes require authentication ────────────────────────
router.use(protect);

// ── Key health debug endpoint ─────────────────────────────────
router.get('/status', (req, res) => {
  res.json({ keys: getKeyHealthStatus() });
});

// ═══════════════════════════════════════════════════════════
// 1️⃣  NOTE SUMMARIZER
// ═══════════════════════════════════════════════════════════
router.post('/summarize', summarizeNotes);

// ═══════════════════════════════════════════════════════════
// 2️⃣  PDF CHAT (RAG)
// ═══════════════════════════════════════════════════════════
router.post('/pdf/upload', upload.single('pdf'), uploadPDF);
router.get('/pdf/list',                          getPDFList);
router.post('/pdf/chat',                         chatWithPDF);
router.delete('/pdf/:pdfId',                     deletePDF);

// ═══════════════════════════════════════════════════════════
// 3️⃣  QUIZ GENERATOR
// ═══════════════════════════════════════════════════════════
router.post('/quiz/generate',  generateQuiz);
router.post('/quiz/evaluate',  evaluateQuiz);

// ═══════════════════════════════════════════════════════════
// 4️⃣  ASK AI / DOUBT SOLVER (streaming)
// ═══════════════════════════════════════════════════════════
router.post('/doubt', solveDoubt);

// ═══════════════════════════════════════════════════════════
// 5️⃣  CODE EXPLAINER
// ═══════════════════════════════════════════════════════════
router.post('/explain-code', explainCode);

// ═══════════════════════════════════════════════════════════
// 6️⃣  STUDY ROADMAP
// ═══════════════════════════════════════════════════════════
router.post('/roadmap', generateRoadmap);

// ═══════════════════════════════════════════════════════════
// 7️⃣  INTERVIEW PREP
// ═══════════════════════════════════════════════════════════
router.post('/interview-prep', interviewPrep);

// ═══════════════════════════════════════════════════════════
// 8️⃣  AI CHAT HISTORY
// ═══════════════════════════════════════════════════════════
router.post('/chats', saveAIChat);
router.get('/chats', getAIChats);
router.get('/chats/:chatId', getAIChat);

module.exports = router;
