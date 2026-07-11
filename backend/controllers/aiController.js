// ============================================================
// 🤖 aiController.js — All AI Feature Controllers
// Features: Summarizer, PDF Chat, Quiz, Ask AI,
//           Code Explainer, Roadmap, Interview Prep
// ============================================================

const pdfParseModule = require('pdf-parse');
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule.default || pdfParseModule);
const mammoth = require('mammoth');
const fs       = require('fs');
const AIChat   = require('../models/AIChat');
const { safeAIRequest, safeAIStream, prompts } = require('../utils/aiHelpers');

// ── In-memory stores ─────────────────────────────────────────
global.pdfStore  = global.pdfStore  || {};
global.quizStore = global.quizStore || {};

// Auto-purge quiz sessions older than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const id in global.quizStore) {
    if (global.quizStore[id].createdAt < cutoff) delete global.quizStore[id];
  }
}, 30 * 60 * 1000);

// ═══════════════════════════════════════════════════════════
// 1️⃣  NOTE SUMMARIZER
// ═══════════════════════════════════════════════════════════
exports.summarizeNotes = async (req, res) => {
  try {
    const { text, type = 'balanced', image } = req.body;
    if (!text && !image)
      return res.status(400).json({ success: false, message: 'Please provide at least 50 characters or an image.' });

    const summary = await safeAIRequest(prompts.summarize(text || 'Summarize the attached image', type), null, image);
    res.json({ success: true, summary, type, generatedAt: new Date() });
  } catch (err) {
    console.error('Summarize error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to summarize. Please try again.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 2️⃣  PDF CHAT (RAG)
// ═══════════════════════════════════════════════════════════
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    let fileBuffer;
    if (req.file.path.startsWith('http')) {
      const response = await fetch(req.file.path);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      fileBuffer = fs.readFileSync(req.file.path);
      fs.unlinkSync(req.file.path); // Only unlink if local
    }

    let fileText = '';
    let numPages = 1;
    const ext = req.file.originalname.toLowerCase().split('.').pop();

    if (ext === 'pdf') {
      const pdfData = await pdfParse(fileBuffer);
      fileText = pdfData.text;
      numPages = pdfData.numpages;
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      fileText = result.value;
    } else if (['txt', 'md'].includes(ext)) {
      fileText = fileBuffer.toString('utf8');
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file type. Please upload PDF, DOCX, TXT, or MD.' });
    }

    const fileId = `file_${Date.now()}_${req.user._id}`;

    global.pdfStore[fileId] = {
      filename:   req.file.originalname,
      text:       fileText.substring(0, 50000),
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
      pages:      numPages,
      type:       ext,
    };

    res.json({ success: true, message: 'File uploaded successfully', pdfId: fileId, pages: numPages, filename: req.file.originalname });
  } catch (err) {
    console.error('File upload error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to upload file', error: err.message });
  }
};

exports.chatWithPDF = async (req, res) => {
  try {
    const { pdfId, question } = req.body;
    if (!pdfId || !question) return res.status(400).json({ success: false, message: 'Provide pdfId and question' });

    const pdf = global.pdfStore?.[pdfId];
    if (!pdf) return res.status(404).json({ success: false, message: 'PDF not found. Please re-upload.' });
    if (pdf.uploadedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Access denied" });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const streamResult = await safeAIStream(prompts.pdfChat(question, pdf.text));

    for await (const chunk of streamResult.stream) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat PDF error:', err.message);
    if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ error: 'Failed to process question' })}\n\n`);
    res.end();
  }
};

exports.getPDFList = async (req, res) => {
  try {
    const userPDFs = Object.entries(global.pdfStore || {})
      .filter(([, pdf]) => pdf.uploadedBy.toString() === req.user._id.toString())
      .map(([id, pdf]) => ({ id, filename: pdf.filename, pages: pdf.pages, uploadedAt: pdf.uploadedAt }));
    res.json({ success: true, pdfs: userPDFs, total: userPDFs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch PDFs' });
  }
};

exports.deletePDF = async (req, res) => {
  try {
    const { pdfId } = req.params;
    const pdf = global.pdfStore?.[pdfId];
    if (!pdf) return res.status(404).json({ success: false, message: 'PDF not found' });
    if (pdf.uploadedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });
    delete global.pdfStore[pdfId];
    res.json({ success: true, message: 'PDF deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete PDF' });
  }
};

// ═══════════════════════════════════════════════════════════
// 3️⃣  QUIZ GENERATOR
// ═══════════════════════════════════════════════════════════
exports.generateQuiz = async (req, res) => {
  try {
    const { text, numQuestions = 5, difficulty = 'medium', image } = req.body;
    if (!text && !image)
      return res.status(400).json({ success: false, message: 'Please provide at least 100 characters or an image.' });

    const raw = await safeAIRequest(prompts.quiz(text || 'Generate quiz from the attached image', numQuestions, difficulty), null, image);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI did not return valid quiz JSON');

    const quizData = JSON.parse(jsonMatch[0]);
    const quizId   = `quiz_${Date.now()}_${req.user._id}`;
    global.quizStore[quizId] = { quiz: quizData, createdAt: Date.now(), userId: req.user._id.toString() };

    res.json({ success: true, quizId, quiz: quizData, totalQuestions: quizData.length, difficulty, generatedAt: new Date() });
  } catch (err) {
    console.error('Generate quiz error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate quiz. Please try again.', error: err.message });
  }
};

exports.evaluateQuiz = async (req, res) => {
  try {
    const { quizId, answers } = req.body;
    if (!quizId || !answers)
      return res.status(400).json({ success: false, message: 'Provide quizId and answers' });

    const session = global.quizStore?.[quizId];
    if (!session) return res.status(404).json({ success: false, message: 'Quiz session expired. Generate a new quiz.' });
    if (session.userId !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    const { quiz } = session;
    let correctCount = 0;
    const results = quiz.map((q, idx) => {
      const isCorrect = answers[idx] === q.correctAnswer;
      if (isCorrect) correctCount++;
      return { questionIndex: idx, question: q.question, userAnswer: answers[idx], correctAnswer: q.correctAnswer, isCorrect, explanation: q.explanation };
    });

    const score = Math.round((correctCount / quiz.length) * 100);
    delete global.quizStore[quizId];

    res.json({
      success: true, score, correctCount, totalQuestions: quiz.length, results,
      performance: score >= 80 ? 'Excellent 🎉' : score >= 60 ? 'Good 👍' : 'Needs Improvement 📚',
    });
  } catch (err) {
    console.error('Evaluate quiz error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to evaluate quiz' });
  }
};

// ═══════════════════════════════════════════════════════════
// 4️⃣  DOUBT SOLVER — Ask AI (Streaming)
// ═══════════════════════════════════════════════════════════
exports.solveDoubt = async (req, res) => {
  try {
    const { question, context = 'general', language = 'english', image } = req.body;
    if (!question && !image)
      return res.status(400).json({ success: false, message: 'Please provide a valid question or an image' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const streamResult = await safeAIStream(prompts.askAI(question || 'Explain the attached image', context, language), image);

    for await (const chunk of streamResult.stream) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Solve doubt error:', err.message);
    if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ error: 'Failed to process your doubt. Please try again.' })}\n\n`);
    res.end();
  }
};

// ═══════════════════════════════════════════════════════════
// 5️⃣  CODE EXPLAINER
// ═══════════════════════════════════════════════════════════
exports.explainCode = async (req, res) => {
  try {
    const { code, language = 'auto' } = req.body;
    if (!code || code.trim().length < 10)
      return res.status(400).json({ success: false, message: 'Please provide valid code to explain' });

    const explanation = await safeAIRequest(prompts.codeExplainer(code, language));
    res.json({ success: true, explanation, language, generatedAt: new Date() });
  } catch (err) {
    console.error('Code explain error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to explain code. Please try again.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 6️⃣  STUDY ROADMAP
// ═══════════════════════════════════════════════════════════
exports.generateRoadmap = async (req, res) => {
  try {
    const { topic, duration = '4 weeks', level = 'beginner' } = req.body;
    if (!topic || topic.trim().length < 3)
      return res.status(400).json({ success: false, message: 'Please provide a valid topic' });

    const roadmap = await safeAIRequest(prompts.roadmap(topic, duration, level));
    res.json({ success: true, roadmap, topic, duration, level, generatedAt: new Date() });
  } catch (err) {
    console.error('Roadmap error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate roadmap. Please try again.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 7️⃣  INTERVIEW PREP
// ═══════════════════════════════════════════════════════════
exports.interviewPrep = async (req, res) => {
  try {
    const { subject, role = 'student', type = 'technical' } = req.body;
    if (!subject || subject.trim().length < 3)
      return res.status(400).json({ success: false, message: 'Please provide a valid subject' });

    const questions = await safeAIRequest(prompts.interviewPrep(subject, role, type));
    res.json({ success: true, questions, subject, role, type, generatedAt: new Date() });
  } catch (err) {
    console.error('Interview prep error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate interview questions. Please try again.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 🎤  STREAMING CHAT (Summarize, Explain, Roadmap)
// ═══════════════════════════════════════════════════════════
exports.chatStream = async (req, res) => {
  try {
    const { messages, mode = 'summarize', image } = req.body;
    if (!messages || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'No messages provided' });
    }

    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage.content || '';

    let finalPrompt = prompt;
    if (mode === 'summarize') {
      finalPrompt = `Summarize the following notes:\n${prompt}`;
    } else if (mode === 'explain') {
      finalPrompt = `Explain this concept simply:\n${prompt}`;
    } else if (mode === 'roadmap') {
      finalPrompt = `Generate a study roadmap for: ${prompt}`;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const streamResult = await safeAIStream(finalPrompt, image);

    for await (const chunk of streamResult.stream) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat stream error:', err.message);
    if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ error: 'Failed to process your request. Please try again.' })}\n\n`);
    res.end();
  }
};

// ═══════════════════════════════════════════════════════════
// 8️⃣  AI CHAT HISTORY
// ═══════════════════════════════════════════════════════════
exports.saveAIChat = async (req, res) => {
  try {
    const { chatId, mode, messages } = req.body;
    let chat;

    if (chatId) {
      chat = await AIChat.findOneAndUpdate(
        { _id: chatId, user: req.user._id },
        { messages, updatedAt: Date.now() },
        { new: true }
      );
      if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    } else {
      // Create new chat, set title to first 4-5 words of the first message
      const firstMsgText = messages[0]?.text || 'New Chat';
      const title = firstMsgText.split(' ').slice(0, 5).join(' ') + (firstMsgText.split(' ').length > 5 ? '...' : '');
      
      chat = new AIChat({
        user: req.user._id,
        title,
        mode,
        messages
      });
      await chat.save();
    }

    res.json({ success: true, chat });
  } catch (err) {
    console.error('Save AI chat error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save chat', error: err.message });
  }
};

exports.getAIChats = async (req, res) => {
  try {
    const chats = await AIChat.find({ user: req.user._id })
      .select('_id title mode updatedAt createdAt')
      .sort({ updatedAt: -1 });
    res.json({ success: true, chats });
  } catch (err) {
    console.error('Fetch AI chats error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch chats' });
  }
};

exports.getAIChat = async (req, res) => {
  try {
    const chat = await AIChat.findOne({ _id: req.params.chatId, user: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    res.json({ success: true, chat });
  } catch (err) {
    console.error('Fetch AI chat error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch chat' });
  }
};

module.exports = exports;
