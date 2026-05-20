// ============================================================
// 🤖 aiController.js — AI Study Assistant Features
// Features: Summarizer, PDF Chat, Quiz Generator
// ============================================================

const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ═══════════════════════════════════════════════════════════════
// 1️⃣ AI NOTE SUMMARIZER
// ═══════════════════════════════════════════════════════════════
exports.summarizeNotes = async (req, res) => {
  try {
    const { text, type = "balanced" } = req.body;

    if (!text || text.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least 50 characters of text to summarize",
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = `Analyze the following notes and provide:
1. A short 2-3 line summary
2. Top 5 key concepts (bullet points)
3. Important formulas/definitions (if applicable)
4. 3 potential exam questions with answers

Notes:
${text}

Format your response in clear sections with headers.`;

    if (type === "beginner") {
      prompt = `Simplify these notes for a beginner and provide:
1. Simple 2-line summary (use simple words)
2. Key concepts explained simply
3. Real-world examples
4. Quick revision points

Notes:
${text}`;
    } else if (type === "exam") {
      prompt = `Create an exam-focused summary of these notes:
1. Most important points (likely to appear in exam)
2. Key formulas and definitions
3. Common misconceptions to avoid
4. 5 probable exam questions with answers

Notes:
${text}`;
    }

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.json({
      success: true,
      summary,
      type,
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error("Summarize error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to summarize notes",
      error: err.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// 2️⃣ PDF CHAT (RAG - Retrieval Augmented Generation)
// ═══════════════════════════════════════════════════════════════
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No PDF file uploaded",
      });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Parse PDF
    const pdfData = await pdfParse(fileBuffer);
    const text = pdfData.text;

    // Store PDF text in memory (in production: use vector DB like Pinecone)
    const pdfId = `pdf_${Date.now()}_${req.user._id}`;

    // For now, store in a simple structure (later: move to Redis or MongoDB)
    global.pdfStore = global.pdfStore || {};
    global.pdfStore[pdfId] = {
      filename: req.file.originalname,
      text: text.substring(0, 50000), // Limit to 50k chars for API limits
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
      pages: pdfData.numpages,
    };

    // Clean up temp file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: "PDF uploaded successfully",
      pdfId,
      pages: pdfData.numpages,
      filename: req.file.originalname,
    });
  } catch (err) {
    console.error("PDF upload error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload PDF",
      error: err.message,
    });
  }
};

exports.chatWithPDF = async (req, res) => {
  try {
    const { pdfId, question } = req.body;

    if (!pdfId || !question) {
      return res.status(400).json({
        success: false,
        message: "Please provide pdfId and question",
      });
    }

    const pdf = global.pdfStore?.[pdfId];
    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: "PDF not found. Please upload a PDF first.",
      });
    }

    // Check ownership
    if (pdf.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this PDF",
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an AI assistant helping students understand documents.

Based on this document content:
"${pdf.text}"

Answer this question: "${question}"

Provide:
1. Direct answer from the document
2. Relevant context
3. Page reference if possible`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await model.generateContentStream(prompt);

    for await (const chunk of stream.stream) {
      const chunkText = chunk.candidates[0]?.content?.parts[0]?.text || "";
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error("Chat PDF error:", err);
    res.write(
      `data: ${JSON.stringify({ error: "Failed to process question" })}\n\n`
    );
    res.end();
  }
};

exports.getPDFList = async (req, res) => {
  try {
    const userPDFs = Object.entries(global.pdfStore || {})
      .filter(([_, pdf]) => pdf.uploadedBy.toString() === req.user._id.toString())
      .map(([id, pdf]) => ({
        id,
        filename: pdf.filename,
        pages: pdf.pages,
        uploadedAt: pdf.uploadedAt,
      }));

    res.json({
      success: true,
      pdfs: userPDFs,
      total: userPDFs.length,
    });
  } catch (err) {
    console.error("Get PDF list error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch PDFs",
    });
  }
};

exports.deletePDF = async (req, res) => {
  try {
    const { pdfId } = req.params;
    const pdf = global.pdfStore?.[pdfId];

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    if (pdf.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to delete this PDF",
      });
    }

    delete global.pdfStore[pdfId];

    res.json({
      success: true,
      message: "PDF deleted successfully",
    });
  } catch (err) {
    console.error("Delete PDF error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete PDF",
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// 3️⃣ AI QUIZ GENERATOR
// ═══════════════════════════════════════════════════════════════
exports.generateQuiz = async (req, res) => {
  try {
    const { text, numQuestions = 5, difficulty = "medium" } = req.body;

    if (!text || text.trim().length < 100) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least 100 characters of text",
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = `Create a quiz with ${numQuestions} questions based on this content:

"${text}"

For each question, provide:
1. Question (clear and specific)
2. Four options (A, B, C, D)
3. Correct answer
4. Explanation

Difficulty: ${difficulty}

Format as JSON array like:
[
  {
    "question": "Question text?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "Why this is correct..."
  }
]`;

    const result = await model.generateContent(prompt);
    let quizText = result.response.text();

    // Extract JSON from response
    const jsonMatch = quizText.match(/\[[\s\S]*\]/);
    let quizData = [];

    if (jsonMatch) {
      quizData = JSON.parse(jsonMatch[0]);
    }

    res.json({
      success: true,
      quiz: quizData,
      totalQuestions: quizData.length,
      difficulty,
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error("Generate quiz error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate quiz",
      error: err.message,
    });
  }
};

exports.evaluateQuiz = async (req, res) => {
  try {
    const { answers, quiz } = req.body;

    if (!answers || !quiz) {
      return res.status(400).json({
        success: false,
        message: "Please provide answers and quiz",
      });
    }

    let correctCount = 0;
    const results = quiz.map((question, idx) => {
      const userAnswer = answers[idx];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) correctCount++;

      return {
        questionIndex: idx,
        question: question.question,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
      };
    });

    const score = Math.round((correctCount / quiz.length) * 100);

    res.json({
      success: true,
      score,
      correctCount,
      totalQuestions: quiz.length,
      results,
      performance: score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Improvement",
    });
  } catch (err) {
    console.error("Evaluate quiz error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to evaluate quiz",
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// BONUS: AI DOUBT SOLVER
// ═══════════════════════════════════════════════════════════════
exports.solveDoubt = async (req, res) => {
  try {
    const { question, context = "general", language = "english" } = req.body;

    if (!question || question.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid question",
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = `You are an expert tutor helping a student understand a concept.

Question: ${question}

Context: ${context}

Provide:
1. Simple explanation (beginner-friendly)
2. Key concepts
3. Real-world examples
4. Viva questions that might be asked
5. Quick formula/rule if applicable

Language: ${language}`;

    if (language === "hindi") {
      prompt = `आप एक विशेषज्ञ शिक्षक हैं जो छात्र को अवधारणा समझने में मदद कर रहे हैं।

प्रश्न: ${question}

संदर्भ: ${context}

कृपया दें:
1. सरल व्याख्या
2. मुख्य अवधारणाएं
3. वास्तविक उदाहरण
4. संभावित परीक्षा प्रश्न
5. सूत्र/नियम यदि लागू हो`;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await model.generateContentStream(prompt);

    for await (const chunk of stream.stream) {
      const chunkText = chunk.candidates[0]?.content?.parts[0]?.text || "";
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error("Solve doubt error:", err);
    res.write(
      `data: ${JSON.stringify({ error: "Failed to process your doubt" })}\n\n`
    );
    res.end();
  }
};

module.exports = exports;
